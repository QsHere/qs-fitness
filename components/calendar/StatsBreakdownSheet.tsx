"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { GymLoader } from "@/components/ui/GymLoader";
import type { StatsBreakdown } from "@/lib/actions";

// Matches the calendar's lower-body (blue) / cardio (grey) dot colors in
// lib/constants.ts - inlined here rather than imported since those are the
// same literal values and this avoids a dependency on that file's exact
// export names.
const LEG_COLOR = "#0A84FF";
const CARDIO_COLOR = "#8E8E93";

export interface BreakdownTarget {
  title: string;
  totalSessions: number;
  fetcher: () => Promise<StatsBreakdown>;
}

export function StatsBreakdownSheet({
  target,
  onClose,
}: {
  target: BreakdownTarget | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<StatsBreakdown | null>(null);

  useEffect(() => {
    if (!target) {
      setData(null);
      return;
    }
    let cancelled = false;
    setData(null);
    target.fetcher().then((result) => {
      if (!cancelled) setData(result);
    });
    return () => {
      cancelled = true;
    };
  }, [target]);

  return (
    <BottomSheet open={!!target} onClose={onClose}>
      <div className="px-5 pb-10 pt-4">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold tracking-tight">
              {target?.title}
            </h3>
            {target && (
              <p className="mt-0.5 text-sm text-ink-soft">
                {target.totalSessions} {target.totalSessions === 1 ? "session" : "sessions"} total
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-paper text-ink-soft"
          >
            <X size={16} />
          </button>
        </div>

        {!data && <GymLoader label="Counting..." />}

        {data && (
          <div className="grid grid-cols-2 gap-3">
            <BreakdownCard label="Leg days" value={data.legDays} color={LEG_COLOR} />
            <BreakdownCard label="Cardio days" value={data.cardioDays} color={CARDIO_COLOR} />
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

function BreakdownCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <span
        className="mb-2 inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      <p className="font-display text-2xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium text-ink-faint">{label}</p>
    </div>
  );
}
