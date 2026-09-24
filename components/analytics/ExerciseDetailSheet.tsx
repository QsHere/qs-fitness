"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { GymLoader } from "@/components/ui/GymLoader";
import { ExerciseTrendChart, type ChartPoint } from "@/components/analytics/ExerciseTrendChart";
import { getCardioHistory, getExerciseHistory } from "@/lib/actions";
import { cn, formatFriendlyDate } from "@/lib/utils";
import type { CardioHistoryPoint, ExerciseHistoryResult } from "@/lib/types";

export interface DetailTarget {
  exerciseId: string;
  isCardio: boolean;
  colorHex: string;
  exerciseName: string;
}

export function ExerciseDetailSheet({
  target,
  onClose,
}: {
  target: DetailTarget | null;
  onClose: () => void;
}) {
  const [strength, setStrength] = useState<ExerciseHistoryResult | null>(null);
  const [cardio, setCardio] = useState<CardioHistoryPoint[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!target) {
      setStrength(null);
      setCardio(null);
      return;
    }
    setLoading(true);
    if (target.isCardio) {
      getCardioHistory(target.exerciseId).then((data) => {
        setCardio(data);
        setLoading(false);
      });
    } else {
      getExerciseHistory(target.exerciseId).then((data) => {
        setStrength(data);
        setLoading(false);
      });
    }
  }, [target]);

  const strengthPoints: ChartPoint[] =
    strength?.points.map((p) => ({
      date: p.session_date,
      value: p.value,
      label: p.setLabel,
      isPR: p.isAllTimeBestSoFar,
    })) ?? [];

  const cardioPoints: ChartPoint[] =
    cardio?.map((p) => ({
      date: p.session_date,
      value: p.duration_min,
      label: p.label,
    })) ?? [];

  return (
    <BottomSheet open={!!target} onClose={onClose}>
      <div className="px-5 pb-10 pt-4">
        <div className="mb-4 flex items-start justify-between">
          <h3 className="font-display text-lg font-semibold tracking-tight">
            {target?.exerciseName}
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-paper text-ink-soft"
          >
            <X size={16} />
          </button>
        </div>

        {loading && <GymLoader label="Crunching the numbers..." />}

        {!loading && target && !target.isCardio && strength && (
          <div className="space-y-4">
            <p className="text-[13px] leading-relaxed text-ink-soft">
              {strength.usesEstimatedOneRepMax
                ? "Tracked by estimated 1-rep-max, not volume - lifting heavier for fewer reps still counts as progress."
                : strength.is_bodyweight
                ? "This is a bodyweight exercise. Set your bodyweight above for full 1RM tracking - for now, progress is tracked by best reps."
                : "Tracked by best reps."}
            </p>

            <ExerciseTrendChart
              points={strengthPoints}
              color={strength.color_hex}
              unit={strength.unit}
            />

            <div className="space-y-2">
              <p className="text-[11px] font-medium text-ink-faint">Recent sessions</p>
              {[...strength.points]
                .reverse()
                .slice(0, 6)
                .map((p) => (
                  <div key={p.session_date} className="rounded-xl bg-paper px-3 py-2.5">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-[12px] font-medium text-ink-faint">
                        {formatFriendlyDate(p.session_date)}
                      </span>
                      {p.isAllTimeBestSoFar && (
                        <span className="text-[10px] font-bold text-emerald-600">PR</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {p.allSets.map((s, i) => {
                        const chipLabel = strength.usesEstimatedOneRepMax
                          ? `${s.weight ?? 0}×${s.reps ?? 0}`
                          : `${s.reps ?? 0} reps`;
                        const isBest = i === p.bestSetIndex;
                        return (
                          <span
                            key={i}
                            className={cn(
                              "rounded-full px-2.5 py-1 text-[12px] font-semibold",
                              isBest ? "text-white" : "bg-white text-ink-soft"
                            )}
                            style={isBest ? { backgroundColor: strength.color_hex } : undefined}
                          >
                            {chipLabel}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {!loading && target && target.isCardio && cardio && (
          <div className="space-y-4">
            <p className="text-[13px] leading-relaxed text-ink-soft">
              Duration trend over time - tap a point for the full detail (speed, distance, incline).
            </p>
            <ExerciseTrendChart points={cardioPoints} color={target.colorHex} unit="min" />
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-ink-faint">Recent sessions</p>
              {[...cardio]
                .reverse()
                .slice(0, 6)
                .map((p) => (
                  <div
                    key={p.session_date}
                    className="flex items-center justify-between rounded-xl bg-paper px-3 py-2"
                  >
                    <span className="text-[13px] text-ink-soft">
                      {formatFriendlyDate(p.session_date)}
                    </span>
                    <span className="text-[13px] font-medium text-ink">{p.label}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
