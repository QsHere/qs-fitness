import { GymLoader } from "@/components/ui/GymLoader";

export default function AnalyticsLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <GymLoader label="Pulling up your PRs..." />
    </div>
  );
}
