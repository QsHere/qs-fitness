"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CardioSummary, ExercisePRSummary } from "@/lib/types";

function TrendBadge({ delta, unit }: { delta: number | null; unit: string }) {
  if (delta == null) {
    return <span className="text-[11px] font-medium text-ink-faint">First record</span>;
  }
  if (delta === 0) {
    return (
      <span className="flex items-center gap-0.5 text-[11px] font-medium text-ink-faint">
        <Minus size={11} /> same
      </span>
    );
  }
  const up = delta > 0;
  return (
    <span
      className={cn(
        "flex items-center gap-0.5 text-[11px] font-semibold",
        up ? "text-emerald-600" : "text-danger"
      )}
    >
      {up ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
      {Math.abs(delta)} {unit}
    </span>
  );
}

export function PRCard({
  pr,
  onClick,
}: {
  pr: ExercisePRSummary;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl border border-line bg-white p-4 text-left transition-transform active:scale-[0.98]"
      style={{ borderLeft: `3px solid ${pr.color_hex}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{pr.exercise_name}</p>
          <p className="mt-0.5 text-[11px] text-ink-faint">
            {pr.usesEstimatedOneRepMax ? "Est. 1RM" : "Best reps"} · {pr.sessionsCount}{" "}
            {pr.sessionsCount === 1 ? "session" : "sessions"}
          </p>
        </div>
        {pr.isNewPR && (
          <span className="shrink-0 rounded-full bg-pulse/20 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
            NEW PR
          </span>
        )}
      </div>
      <div className="mt-2.5 flex items-end justify-between">
        <div>
          <p className="font-display text-[22px] font-semibold tracking-tight text-ink">
            {pr.bestSetLabel}
          </p>
          {pr.usesEstimatedOneRepMax && (
            <p className="mt-0.5 text-[11px] text-ink-faint">
              ≈ {pr.bestValue} kg est. 1RM
            </p>
          )}
        </div>
        <TrendBadge delta={pr.trendDelta} unit={pr.bestUnit} />
      </div>
    </button>
  );
}

export function CardioCard({
  summary,
  onClick,
}: {
  summary: CardioSummary;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl border border-line bg-white p-4 text-left transition-transform active:scale-[0.98]"
      style={{ borderLeft: `3px solid ${summary.color_hex}` }}
    >
      <p className="text-sm font-semibold text-ink">{summary.exercise_name}</p>
      <p className="mt-0.5 text-[11px] text-ink-faint">
        {summary.sessionsCount} {summary.sessionsCount === 1 ? "session" : "sessions"}
      </p>
      <div className="mt-2.5 flex gap-5">
        {summary.bestDistanceKm != null && (
          <div>
            <p className="font-display text-lg font-semibold text-ink">
              {summary.bestDistanceKm} km
            </p>
            <p className="text-[10px] font-medium text-ink-faint">best distance</p>
          </div>
        )}
        <div>
          <p className="font-display text-lg font-semibold text-ink">
            {summary.bestDurationMin} min
          </p>
          <p className="text-[10px] font-medium text-ink-faint">best duration</p>
        </div>
      </div>
      {summary.lastSessionLabel && (
        <p className="mt-1.5 text-[11px] text-ink-faint">
          Last time: {summary.lastSessionLabel}
        </p>
      )}
    </button>
  );
}
