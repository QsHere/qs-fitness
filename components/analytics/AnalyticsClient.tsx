"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BodyweightBanner } from "@/components/analytics/BodyweightBanner";
import { CardioCard, PRCard } from "@/components/analytics/PRCard";
import { CollapsibleSection } from "@/components/analytics/CollapsibleSection";
import { ExerciseDetailSheet, type DetailTarget } from "@/components/analytics/ExerciseDetailSheet";
import type { CardioSummary, ExercisePRSummary } from "@/lib/types";

export function AnalyticsClient({
  prs,
  cardio,
  bodyweightKg,
}: {
  prs: ExercisePRSummary[];
  cardio: CardioSummary[];
  bodyweightKg: number | null;
}) {
  const router = useRouter();
  const [bw, setBw] = useState(bodyweightKg);
  const [detailTarget, setDetailTarget] = useState<DetailTarget | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; items: ExercisePRSummary[] }>();
    for (const pr of prs) {
      if (!map.has(pr.body_part_id)) {
        map.set(pr.body_part_id, { name: pr.body_part_name, items: [] });
      }
      map.get(pr.body_part_id)!.items.push(pr);
    }
    for (const group of map.values()) {
      group.items.sort((a, b) => a.exercise_name.localeCompare(b.exercise_name));
    }
    return Array.from(map.values());
  }, [prs]);

  const hasAnyBodyweightExercise = prs.some((p) => p.is_bodyweight);

  return (
    <div className="pb-16">
      <header className="flex items-center gap-3 px-5 pb-2 pt-8">
        <button
          onClick={() => router.push("/")}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink-soft shadow-soft"
        >
          <ArrowLeft size={17} />
        </button>
        <h1 className="font-display text-[22px] font-semibold tracking-tight">
          Progress & PRs
        </h1>
      </header>

      <div className="space-y-5 px-5 pt-4">
        {hasAnyBodyweightExercise && (
          <BodyweightBanner currentKg={bw} onSaved={setBw} />
        )}

        {prs.length === 0 && cardio.length === 0 && (
          <p className="pt-10 text-center text-sm text-ink-faint">
            Log a few workouts and your progress will show up here.
          </p>
        )}

        {grouped.map((group, i) => (
          <CollapsibleSection
            key={group.name}
            title={group.name}
            count={group.items.length}
            defaultOpen={i === 0}
          >
            {group.items.map((pr) => (
              <PRCard
                key={pr.exercise_id}
                pr={pr}
                onClick={() =>
                  setDetailTarget({
                    exerciseId: pr.exercise_id,
                    isCardio: false,
                    colorHex: pr.color_hex,
                    exerciseName: pr.exercise_name,
                  })
                }
              />
            ))}
          </CollapsibleSection>
        ))}

        {cardio.length > 0 && (
          <CollapsibleSection
            title="Cardio"
            count={cardio.length}
            defaultOpen={grouped.length === 0}
          >
            {cardio.map((c) => (
              <CardioCard
                key={c.exercise_id}
                summary={c}
                onClick={() =>
                  setDetailTarget({
                    exerciseId: c.exercise_id,
                    isCardio: true,
                    colorHex: c.color_hex,
                    exerciseName: c.exercise_name,
                  })
                }
              />
            ))}
          </CollapsibleSection>
        )}
      </div>

      <ExerciseDetailSheet target={detailTarget} onClose={() => setDetailTarget(null)} />
    </div>
  );
}
