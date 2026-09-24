import { GymLoader } from "@/components/ui/GymLoader";

export default function HomeLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <GymLoader label="Loading your training..." />
    </div>
  );
}
