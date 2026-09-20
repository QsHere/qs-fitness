"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useDragControls, useMotionValue, type PanInfo } from "framer-motion";
import { Timer as TimerIcon } from "lucide-react";
import { useTimer } from "@/lib/timer/TimerContext";
import { TimerSheet } from "@/components/timer/TimerSheet";
import { vibrateIfSupported } from "@/lib/timer/sound";
import { cn } from "@/lib/utils";

function formatClock(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const RADIUS = 15;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const POSITION_KEY = "qsf_timer_fab_pos";
const HOLD_MS = 350;
const MOVE_CANCEL_PX = 8;

export function TimerFab() {
  const { status, durationMs, remainingMs, dismissCompleted } = useTimer();
  const [open, setOpen] = useState(false);
  const [dragMode, setDragMode] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const dragControls = useDragControls();
  const boundaryRef = useRef<HTMLDivElement>(null);

  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const suppressClickRef = useRef(false);

  // Restore a saved drag position - dragging out of the way of the home
  // stats should stick, not reset every time the app opens.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(POSITION_KEY);
      if (raw) {
        const { x: sx, y: sy } = JSON.parse(raw);
        if (typeof sx === "number" && typeof sy === "number") {
          x.set(sx);
          y.set(sy);
        }
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A finished timer clears itself if left untouched.
  useEffect(() => {
    if (status !== "completed") return;
    const t = setTimeout(() => dismissCompleted(), 8000);
    return () => clearTimeout(t);
  }, [status, dismissCompleted]);

  const clearHoldTimer = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    startPointRef.current = { x: e.clientX, y: e.clientY };
    clearHoldTimer();
    holdTimerRef.current = setTimeout(() => {
      setDragMode(true);
      vibrateIfSupported([12]);
      dragControls.start(e);
    }, HOLD_MS);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!startPointRef.current || dragMode) return;
    const dx = e.clientX - startPointRef.current.x;
    const dy = e.clientY - startPointRef.current.y;
    if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) {
      // Moved before the hold threshold fired - this was a scroll/flick
      // attempt near the button, not a tap or a hold-to-drag.
      clearHoldTimer();
    }
  };

  const endPointer = () => {
    clearHoldTimer();
    startPointRef.current = null;
  };

  const handleDragEnd = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setDragMode(false);
    suppressClickRef.current = true;
    setTimeout(() => {
      suppressClickRef.current = false;
    }, 50);
    try {
      window.localStorage.setItem(
        POSITION_KEY,
        JSON.stringify({ x: x.get(), y: y.get() })
      );
    } catch {
      // ignore
    }
  };

  const handleClick = () => {
    if (suppressClickRef.current) return;
    if (status === "completed") dismissCompleted();
    else setOpen(true);
  };

  const progress = durationMs > 0 ? 1 - remainingMs / durationMs : 0;
  const dashoffset = CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, progress)));
  const idle = status === "idle";

  return (
    <>
      {/* Invisible boundary so the FAB can't be dragged off-screen. */}
      <div ref={boundaryRef} className="pointer-events-none fixed inset-3 z-0" />

      <motion.button
        drag
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={boundaryRef}
        dragElastic={0.08}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onClick={handleClick}
        style={{ x, y }}
        animate={{ scale: dragMode ? 1.08 : status === "completed" ? [1, 1.06, 1] : 1 }}
        transition={
          status === "completed" && !dragMode
            ? { repeat: Infinity, duration: 0.9 }
            : { duration: 0.15 }
        }
        className={cn(
          "fixed bottom-28 right-4 z-30 flex h-14 items-center gap-2 rounded-full pl-2.5 pr-4 shadow-soft transition-colors touch-none",
          dragMode && "shadow-lg ring-2 ring-pulse",
          idle && "bg-white text-ink-soft",
          status === "running" && "bg-ink text-white",
          status === "paused" && "bg-white text-ink-soft ring-2 ring-line",
          status === "completed" && "bg-pulse text-ink"
        )}
        aria-label="Rest timer - tap to open, hold to move"
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
          {idle ? "Rest" : status === "completed" ? "Done" : formatClock(remainingMs)}
        </span>
      </motion.button>

      <TimerSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
