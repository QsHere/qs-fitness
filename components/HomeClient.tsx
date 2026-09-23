"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, TrendingUp } from "lucide-react";
import { MonthCalendar } from "@/components/calendar/MonthCalendar";
import { Legend } from "@/components/calendar/Legend";
import { DaySheet } from "@/components/calendar/DaySheet";
import { getMonthCalendar } from "@/lib/actions";
import {
  getCachedMonth,
  prefetchDayDetails,
  prefetchNeighborMonths,
  setCachedMonth,
} from "@/lib/clientCache";
import type { BodyPartRow, CalendarDaySummary, OverviewStats } from "@/lib/types";

export function HomeClient({
  initialYear,
  initialMonth,
  initialDays,
  initialMonthSessionsCount,
  overviewStats,
  bodyParts,
}: {
  initialYear: number;
  initialMonth: number;
  initialDays: CalendarDaySummary[];
  initialMonthSessionsCount: number;
  overviewStats: OverviewStats;
  bodyParts: BodyPartRow[];
}) {
  const router = useRouter();
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [days, setDays] = useState(initialDays);
  const [monthSessionsCount, setMonthSessionsCount] = useState(initialMonthSessionsCount);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isMonthPending, startTransition] = useTransition();
  const requestToken = useRef(0);

  // The initial month was already fetched server-side for first paint -
  // seed the cache with it and warm up neighbours + this month's day
  // details in the background, so the very first swipe and the very first
  // date tap both have a real shot at being instant rather than waiting on
  // a fresh round trip every time.
  useEffect(() => {
    setCachedMonth(initialYear, initialMonth, {
      days: initialDays,
      sessionsCount: initialMonthSessionsCount,
    });
    prefetchNeighborMonths(initialYear, initialMonth);
    prefetchDayDetails(initialDays.map((d) => d.date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "This month" follows whichever month the calendar is showing (updates
  // on every navigate below). "All time" and "this week" intentionally stay
  // fixed to real today regardless of what's being browsed.
  const navigate = (direction: -1 | 1) => {
    let newMonth = month + direction;
    let newYear = year;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    setMonth(newMonth);
    setYear(newYear);

    const cached = getCachedMonth(newYear, newMonth);
    if (cached) {
      // No network wait at all - this is what makes repeat swiping across
      // the same handful of months feel instant instead of laggy.
      setDays(cached.days);
      setMonthSessionsCount(cached.sessionsCount);
      prefetchNeighborMonths(newYear, newMonth);
      prefetchDayDetails(cached.days.map((d) => d.date));
      return;
    }

    const token = ++requestToken.current;
    startTransition(async () => {
      const result = await getMonthCalendar(newYear, newMonth);
      // A faster swipe/click after this one may have already resolved and
      // moved us further along - if so, this now-stale response should not
      // overwrite the newer month's data.
      if (token !== requestToken.current) return;
      setDays(result.days);
      setMonthSessionsCount(result.sessionsCount);
      setCachedMonth(newYear, newMonth, result);
      prefetchNeighborMonths(newYear, newMonth);
      prefetchDayDetails(result.days.map((d) => d.date));
    });
  };

  return (
    <div>
      <header className="flex items-start justify-between px-5 pb-2 pt-8">
        <div>
          <p className="text-sm font-medium text-ink-faint">
            {new Date().toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          <h1 className="font-display text-[28px] font-semibold tracking-tight">
            Your training
          </h1>
        </div>
        <button
          onClick={() => router.push("/analytics")}
          className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink-soft shadow-soft"
          aria-label="Progress and personal records"
        >
          <TrendingUp size={17} />
        </button>
      </header>

      <div className="px-5 pt-3">
        <MonthCalendar
          year={year}
          month={month}
          days={days}
          onNavigate={navigate}
          onSelectDay={setSelectedDate}
          selectedDate={selectedDate}
        />
      </div>

      <Legend />

      <div className="grid grid-cols-3 gap-3 px-5 pt-3">
        <StatCard label="All time" value={overviewStats.allTime} />
        <StatCard label="This month" value={monthSessionsCount} loading={isMonthPending} />
        <StatCard label="This week" value={overviewStats.thisWeek} />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md px-5 pb-6 pt-10 [background:linear-gradient(to_top,#F6F5F2_60%,transparent)]">
        <button
          onClick={() => router.push("/log")}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-ink text-[15px] font-semibold text-white shadow-soft transition-transform active:scale-[0.98]"
        >
          <Plus size={18} /> Log workout
        </button>
      </div>

      <DaySheet dateKey={selectedDate} onClose={() => setSelectedDate(null)} />
    </div>
  );
}

function StatCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: number;
  loading?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 text-center shadow-soft">
      <p
        className={`font-display text-2xl font-semibold tracking-tight transition-opacity ${
          loading ? "opacity-40" : "opacity-100"
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[11px] font-medium text-ink-faint">{label}</p>
    </div>
  );
}
