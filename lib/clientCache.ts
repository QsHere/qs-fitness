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

/** Fire-and-forget prefetch of the months adjacent to the one being viewed. */
export function prefetchNeighborMonths(year: number, month: number) {
  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  for (const { y, m } of [prev, next]) {
    if (getCachedMonth(y, m)) continue;
    getMonthCalendar(y, m)
      .then((result) => setCachedMonth(y, m, result))
      .catch(() => {});
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
 * Fire-and-forget prefetch of every date already known to have a session
 * (from the month calendar's dot data) so tapping into any of them feels
 * instant - this is the common case (browsing the month you're looking at),
 * versus tapping an as-yet-unseen date, which still costs one fetch.
 */
export function prefetchDayDetails(dates: string[]) {
  for (const date of dates) {
    if (getCachedDayDetail(date)) continue;
    getDayDetail(date)
      .then((result) => setCachedDayDetail(date, result))
      .catch(() => {});
  }
}
