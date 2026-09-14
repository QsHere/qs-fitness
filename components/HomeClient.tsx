"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, TrendingUp } from "lucide-react";
import { MonthCalendar } from "@/components/calendar/MonthCalendar";
import { Legend } from "@/components/calendar/Legend";
import { DaySheet } from "@/components/calendar/DaySheet";
import { getMonthCalendar } from "@/lib/actions";
import type { BodyPartRow, CalendarDaySummary, OverviewStats } from "@/lib/types";

export function HomeClient({
  initialYear,
  initialMonth,
  initialDays,
  overviewStats,
  bodyParts,
}: {
  initialYear: number;
  initialMonth: number;
  initialDays: CalendarDaySummary[];
  overviewStats: OverviewStats;
  bodyParts: BodyPartRow[];
}) {
  const router = useRouter();
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [days, setDays] = useState(initialDays);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Note: overviewStats (all-time / this-month / this-week) intentionally
  // does NOT change when browsing other months below - it always reflects
  // real "today", regardless of which month the calendar is showing.
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
    startTransition(async () => {
      const result = await getMonthCalendar(newYear, newMonth);
      setDays(result.days);
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
        <StatCard label="This month" value={overviewStats.thisMonth} />
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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-4 text-center shadow-soft">
      <p className="font-display text-2xl font-semibold tracking-tight">
        {value}
      </p>
      <p className="mt-0.5 text-[11px] font-medium text-ink-faint">{label}</p>
    </div>
  );
}
