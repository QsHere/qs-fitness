"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn, toDateKey } from "@/lib/utils";
import type { CalendarDaySummary } from "@/lib/types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function MonthCalendar({
  year,
  month, // 1-12
  days,
  onNavigate,
  onSelectDay,
  selectedDate,
}: {
  year: number;
  month: number;
  days: CalendarDaySummary[];
  onNavigate: (direction: -1 | 1) => void;
  onSelectDay: (dateKey: string) => void;
  selectedDate: string | null;
}) {
  const colorsByDate = new Map(days.map((d) => [d.date, d.bodyPartColors]));
  const firstOfMonth = new Date(year, month - 1, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const todayKey = toDateKey(new Date());

  const cells: (string | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      toDateKey(new Date(year, month - 1, i + 1))
    ),
  ];

  return (
    <div className="rounded-3xl bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          {MONTH_NAMES[month - 1]} {year}
        </h2>
        <div className="flex gap-1">
          <button
            onClick={() => onNavigate(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-paper"
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => onNavigate(1)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-paper"
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="text-center text-[11px] font-medium text-ink-faint"
          >
            {d}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${year}-${month}`}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.16 }}
          className="grid grid-cols-7 gap-y-1.5"
        >
          {cells.map((dateKey, i) => {
            if (!dateKey) return <div key={`empty-${i}`} />;
            const colors = colorsByDate.get(dateKey) ?? [];
            const isToday = dateKey === todayKey;
            const isSelected = dateKey === selectedDate;
            const dayNum = Number(dateKey.slice(-2));

            return (
              <button
                key={dateKey}
                onClick={() => onSelectDay(dateKey)}
                className="flex flex-col items-center gap-1 py-0.5"
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-medium transition-colors",
                    isSelected && "bg-ink text-white",
                    !isSelected && isToday && "ring-1 ring-ink text-ink",
                    !isSelected && !isToday && "text-ink"
                  )}
                >
                  {dayNum}
                </span>
                <div className="flex h-1.5 items-center gap-0.5">
                  {colors.slice(0, 3).map((c, idx) => (
                    <span
                      key={idx}
                      className="h-1 w-1 rounded-full"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
