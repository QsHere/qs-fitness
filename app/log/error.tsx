"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export default function LogError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-8 text-center">
      <p className="font-display text-lg font-semibold">Something slipped</p>
      <p className="text-sm text-ink-soft">
        That's usually a one-off connection hiccup with the database. Your
        entries on this screen may be lost - sorry about that.
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => router.push("/")}>
          Back to calendar
        </Button>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
