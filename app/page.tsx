import { getBodyParts, getMonthCalendar } from "@/lib/actions";
import { HomeClient } from "@/components/HomeClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [{ days, stats }, bodyParts] = await Promise.all([
    getMonthCalendar(year, month),
    getBodyParts(),
  ]);

  return (
    <HomeClient
      initialYear={year}
      initialMonth={month}
      initialDays={days}
      initialStats={stats}
      bodyParts={bodyParts}
    />
  );
}
