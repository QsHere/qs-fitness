import { getBodyweightSetting, getCardioSummaries, getExercisePRs } from "@/lib/actions";
import { AnalyticsClient } from "@/components/analytics/AnalyticsClient";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [prs, cardio, bodyweight] = await Promise.all([
    getExercisePRs(),
    getCardioSummaries(),
    getBodyweightSetting(),
  ]);

  return (
    <AnalyticsClient
      prs={prs}
      cardio={cardio}
      bodyweightKg={bodyweight?.kg ?? null}
      bodyweightUpdatedAt={bodyweight?.updatedAt ?? null}
    />
  );
}
