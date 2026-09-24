import { GymLoader } from "@/components/ui/GymLoader";

export default function LogLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <GymLoader label="Setting up..." />
    </div>
  );
}
