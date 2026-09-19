"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Timer as TimerIcon } from "lucide-react";
import { useTimer } from "@/lib/timer/TimerContext";
import { TimerSheet } from "@/components/timer/TimerSheet";
import { cn } from "@/lib/utils";

function formatClock(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const RADIUS = 15;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function TimerFab() {
  const { status, durationMs, remainingMs, dismissCompleted } = useTimer();
  const [open, setOpen] = useState(false);

  // A finished timer clears itself if left untouched, same as an alarm you
  // don't interact with eventually going quiet on its own.
  useEffect(() => {
    if (status !== "completed") return;
    const t = setTimeout(() => dismissCompleted(), 8000);
    return () => clearTimeout(t);
  }, [status, dismissCompleted]);

  const progress = durationMs > 0 ? 1 - remainingMs / durationMs : 0;
  const dashoffset = CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, progress)));

  const idle = status === "idle";

  return (
    <>
      <motion.button
        onClick={() => (status === "completed" ? dismissCompleted() : setOpen(true))}
        initial={false}
        animate={{ scale: status === "completed" ? [1, 1.06, 1] : 1 }}
        transition={
          status === "completed"
            ? { repeat: Infinity, duration: 0.9 }
            : { duration: 0.15 }
        }
        className={cn(
          "fixed bottom-28 right-4 z-30 flex h-14 items-center gap-2 rounded-full pl-2.5 pr-4 shadow-soft transition-colors",
          idle && "bg-white text-ink-soft",
          status === "running" && "bg-ink text-white",
          status === "paused" && "bg-white text-ink-soft ring-2 ring-line",
          status === "completed" && "bg-pulse text-ink"
        )}
        aria-label="Rest timer"
      >
        {idle ? (
          <span className="flex h-9 w-9 items-center justify-center">
            <TimerIcon size={19} />
          </span>
        ) : (
          <span className="relative flex h-9 w-9 items-center justify-center">
            <svg width={36} height={36} className="-rotate-90">
              <circle
                cx={18}
                cy={18}
                r={RADIUS}
                fill="none"
                stroke="currentColor"
                strokeOpacity={0.25}
                strokeWidth={2.5}
              />
              <circle
                cx={18}
                cy={18}
                r={RADIUS}
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashoffset}
                strokeLinecap="round"
              />
            </svg>
          </span>
        )}
        <span className="text-[15px] font-semibold tabular-nums">
          {idle
            ? "Rest"
            : status === "completed"
            ? "Done"
            : formatClock(remainingMs)}
        </span>
      </motion.button>

      <TimerSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
