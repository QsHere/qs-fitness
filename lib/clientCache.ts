import { getDayDetail, getMonthCalendar } from "@/lib/actions";
import type { CalendarDaySummary, DaySessionDetail } from "@/lib/types";

// Short TTL rather than precise invalidation: this is a pure perf cache, not
// a source of truth, so it's fine (and much simpler) to just let entries go
// stale after a short window instead of trying to track every mutation path
// that could affect them. 90s is long enough to make realistic swipe/tap
// patterns within a session feel instant, short enough that a genuinely
// stale view is essentially never noticed in normal use.
const TTL_MS = 90_000;

class TTLCache<T> {
  private map = new Map<string, { value: T; expiresAt: number }>();

  get(key: string): T | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return undefined;
    }
    return entry.value;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  set(key: string, value: T) {
    this.map.set(key, { value, expiresAt: Date.now() + TTL_MS });
  }
}

// ---------------------------------------------------------------------------
// A tiny concurrency-limited queue for background prefetching.
//
// The previous version of this file fired every prefetch simultaneously with
// no limit at all - for a busy month that meant dozens of concurrent
// requests competing for the same handful of database connections, which is
// what actually caused the 30+ second delays: not "no caching", but a
// self-inflicted thundering herd. This runner caps how many prefetch
// requests are ever in flight at once, and - just as importantly - is
// cancelable, so swiping through several months quickly discards the
// now-irrelevant queued work for months you've already moved past, instead
// of letting it pile up in the background and compete with whatever you're
// actively waiting on.
// ---------------------------------------------------------------------------

class PrefetchQueue {
  private concurrency: number;
  private queue: Array<() => Promise<void>> = [];
  private active = 0;
  private generation = 0;

  constructor(concurrency: number) {
    this.concurrency = concurrency;
  }

  /** Discards any not-yet-started work from earlier batches. */
  reset() {
    this.generation++;
    this.queue = [];
  }

  add(task: () => Promise<void>) {
    const gen = this.generation;
    this.queue.push(async () => {
      if (gen !== this.generation) return; // superseded before it even started
      await task();
    });
    this.drain();
  }

  private drain() {
    while (this.active < this.concurrency && this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task) continue;
      this.active++;
      task().finally(() => {
        this.active--;
        this.drain();
      });
    }
  }
}

const dayDetailQueue = new PrefetchQueue(3);
const monthQueue = new PrefetchQueue(2);

// ---------------------------------------------------------------------------
// Month calendar cache
// ---------------------------------------------------------------------------

type MonthResult = { days: CalendarDaySummary[]; sessionsCount: number };

const monthCache = new TTLCache<MonthResult>();

export function monthKey(year: number, month: number) {
  return `${year}-${month}`;
}

export function getCachedMonth(year: number, month: number): MonthResult | undefined {
  return monthCache.get(monthKey(year, month));
}

export function setCachedMonth(year: number, month: number, result: MonthResult) {
  monthCache.set(monthKey(year, month), result);
}

/**
 * Queues (does not fire immediately) a prefetch of the months adjacent to
 * the one being viewed. Call this on every navigation - it automatically
 * discards any still-queued prefetch from a previous call, so rapid
 * swiping only ever chases the month you've actually landed on.
 */
export function prefetchNeighborMonths(year: number, month: number) {
  monthQueue.reset();
  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  for (const { y, m } of [prev, next]) {
    if (getCachedMonth(y, m)) continue;
    monthQueue.add(async () => {
      try {
        const result = await getMonthCalendar(y, m);
        setCachedMonth(y, m, result);
      } catch {
        // best-effort - a real request will just fetch it fresh later
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Day detail cache
// ---------------------------------------------------------------------------

const dayDetailCache = new TTLCache<DaySessionDetail[]>();

export function getCachedDayDetail(dateKey: string): DaySessionDetail[] | undefined {
  return dayDetailCache.get(dateKey);
}

export function setCachedDayDetail(dateKey: string, result: DaySessionDetail[]) {
  dayDetailCache.set(dateKey, result);
}

/**
 * Queues a background prefetch (max 3 at a time) of every date already
 * known to have a session, so tapping into one you haven't opened yet still
 * has a decent chance of already being cached. Each getDayDetail call is now
 * a single query (see actions.ts), so even a handful running concurrently is
 * cheap - the concurrency cap here is a safety margin, not a workaround for
 * a slow query.
 */
export function prefetchDayDetails(dates: string[]) {
  dayDetailQueue.reset();
  for (const date of dates) {
    if (getCachedDayDetail(date)) continue;
    dayDetailQueue.add(async () => {
      try {
        const result = await getDayDetail(date);
        setCachedDayDetail(date, result);
      } catch {
        // best-effort - tapping the date will just fetch it fresh
      }
    });
  }
}
