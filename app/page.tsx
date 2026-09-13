import { getBodyParts, getMonthCalendar, getOverviewStats } from "@/lib/actions";
import { HomeClient } from "@/components/HomeClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [{ days }, bodyParts, overviewStats] = await Promise.all([
    getMonthCalendar(year, month),
    getBodyParts(),
    getOverviewStats(),
  ]);

  return (
    <HomeClient
      initialYear={year}
      initialMonth={month}
      initialDays={days}
      overviewStats={overviewStats}
      bodyParts={bodyParts}
    />
  );
}
