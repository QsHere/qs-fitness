import { getBodyweightKg, getCardioSummaries, getExercisePRs } from "@/lib/actions";
import { AnalyticsClient } from "@/components/analytics/AnalyticsClient";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [prs, cardio, bodyweightKg] = await Promise.all([
    getExercisePRs(),
    getCardioSummaries(),
    getBodyweightKg(),
  ]);

  return <AnalyticsClient prs={prs} cardio={cardio} bodyweightKg={bodyweightKg} />;
}
