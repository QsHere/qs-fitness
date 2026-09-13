import { Suspense } from "react";
import { getBodyParts, getLocations } from "@/lib/actions";
import { LogFlow } from "@/components/logger/LogFlow";

export const dynamic = "force-dynamic";

export default async function LogPage() {
  const [locations, bodyParts] = await Promise.all([
    getLocations(),
    getBodyParts(),
  ]);

  return (
    <Suspense fallback={null}>
      <LogFlow locations={locations} bodyParts={bodyParts} />
    </Suspense>
  );
}
