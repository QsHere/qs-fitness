"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BodyweightBanner } from "@/components/analytics/BodyweightBanner";
import { CardioCard, PRCard } from "@/components/analytics/PRCard";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { ExerciseDetailSheet, type DetailTarget } from "@/components/analytics/ExerciseDetailSheet";
import type { CardioSummary, ExercisePRSummary } from "@/lib/types";

// Fixed display order. Anything not listed here (custom body parts you've
// added) falls in after these, in whatever order they first appear.
const BODY_PART_ORDER = ["Chest", "Back", "Shoulder", "Arm", "Abs", "Cardio", "Lower Body"];

type Section =
  | { kind: "strength"; name: string; items: ExercisePRSummary[] }
  | { kind: "cardio"; name: "Cardio"; items: CardioSummary[] };

export function AnalyticsClient({
  prs,
  cardio,
  bodyweightKg,
  bodyweightUpdatedAt,
}: {
  prs: ExercisePRSummary[];
  cardio: CardioSummary[];
  bodyweightKg: number | null;
  bodyweightUpdatedAt: string | null;
}) {
  const router = useRouter();
  const [bw, setBw] = useState(bodyweightKg);
  const [bwUpdatedAt, setBwUpdatedAt] = useState(bodyweightUpdatedAt);
  const [detailTarget, setDetailTarget] = useState<DetailTarget | null>(null);

  const sections = useMemo(() => {
    const strengthMap = new Map<string, { name: string; items: ExercisePRSummary[] }>();
    for (const pr of prs) {
      if (!strengthMap.has(pr.body_part_name)) {
        strengthMap.set(pr.body_part_name, { name: pr.body_part_name, items: [] });
      }
      strengthMap.get(pr.body_part_name)!.items.push(pr);
    }
    for (const group of strengthMap.values()) {
      group.items.sort((a, b) => a.exercise_name.localeCompare(b.exercise_name));
    }

    const all: Section[] = Array.from(strengthMap.values()).map((g) => ({
      kind: "strength" as const,
      name: g.name,
      items: g.items,
    }));
    if (cardio.length > 0) {
      all.push({ kind: "cardio", name: "Cardio", items: cardio });
    }

    all.sort((a, b) => {
      const ai = BODY_PART_ORDER.indexOf(a.name);
      const bi = BODY_PART_ORDER.indexOf(b.name);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

    return all;
  }, [prs, cardio]);

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

      <div className="space-y-3 px-5 pt-4">
        {hasAnyBodyweightExercise && (
          <BodyweightBanner
            currentKg={bw}
            updatedAt={bwUpdatedAt}
            onSaved={(kg, updatedAt) => {
              setBw(kg);
              setBwUpdatedAt(updatedAt);
            }}
          />
        )}

        {sections.length === 0 && (
          <p className="pt-10 text-center text-sm text-ink-faint">
            Log a few workouts and your progress will show up here.
          </p>
        )}

        {sections.map((section) =>
          section.kind === "strength" ? (
            <CollapsibleSection key={section.name} title={section.name} count={section.items.length}>
              {section.items.map((pr) => (
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
          ) : (
            <CollapsibleSection key="cardio" title="Cardio" count={section.items.length}>
              {section.items.map((c) => (
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
          )
        )}
      </div>

      <ExerciseDetailSheet target={detailTarget} onClose={() => setDetailTarget(null)} />
    </div>
  );
}
