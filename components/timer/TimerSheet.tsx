"use client";

import { useState } from "react";
import { Minus, Pause, Play, Plus, RotateCcw, X } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { useTimer } from "@/lib/timer/TimerContext";

const PRESETS = [
  { label: "1:00", seconds: 60 },
  { label: "1:30", seconds: 90 },
  { label: "2:00", seconds: 120 },
];

function formatClock(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function TimerSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { status, remainingMs, start, pause, resume, cancel, addSeconds } =
    useTimer();
  const [customMin, setCustomMin] = useState("");
  const [customSec, setCustomSec] = useState("");

  const startCustom = () => {
    const min = Number(customMin) || 0;
    const sec = Number(customSec) || 0;
    const total = min * 60 + sec;
    if (total <= 0) return;
    start(total);
    onClose();
  };

  const isIdle = status === "idle" || status === "completed";

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="px-5 pb-10 pt-4">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold tracking-tight">
            Rest timer
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-paper text-ink-soft"
          >
            <X size={16} />
          </button>
        </div>

        {isIdle ? (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-2.5">
              {PRESETS.map((p) => (
                <button
                  key={p.seconds}
                  onClick={() => {
                    start(p.seconds);
                    onClose();
                  }}
                  className="rounded-2xl border border-line bg-white py-4 text-center transition-transform active:scale-[0.96]"
                >
                  <p className="font-display text-lg font-semibold text-ink">
                    {p.label}
                  </p>
                </button>
              ))}
            </div>

            <div>
              <p className="mb-2 text-[13px] font-medium text-ink-soft">Custom</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={customMin}
                  onChange={(e) => setCustomMin(e.target.value)}
                  placeholder="0"
                  className="h-12 w-full rounded-xl border border-line bg-white px-3.5 text-center text-[15px] outline-none focus:border-ink"
                />
                <span className="shrink-0 text-sm text-ink-faint">min</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={59}
                  value={customSec}
                  onChange={(e) => setCustomSec(e.target.value)}
                  placeholder="0"
                  className="h-12 w-full rounded-xl border border-line bg-white px-3.5 text-center text-[15px] outline-none focus:border-ink"
                />
                <span className="shrink-0 text-sm text-ink-faint">sec</span>
              </div>
              <Button className="mt-3 w-full" onClick={startCustom}>
                Start
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 text-center">
            <p className="font-display text-5xl font-semibold tabular-nums tracking-tight">
              {formatClock(remainingMs)}
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => addSeconds(-15)}
                className="flex h-11 items-center gap-1 rounded-full border border-line px-4 text-sm font-medium text-ink-soft"
              >
                <Minus size={14} /> 15s
              </button>
              <button
                onClick={status === "running" ? pause : resume}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white"
              >
                {status === "running" ? <Pause size={20} /> : <Play size={20} />}
              </button>
              <button
                onClick={() => addSeconds(15)}
                className="flex h-11 items-center gap-1 rounded-full border border-line px-4 text-sm font-medium text-ink-soft"
              >
                <Plus size={14} /> 15s
              </button>
            </div>

            <button
              onClick={() => {
                cancel();
                onClose();
              }}
              className="flex w-full items-center justify-center gap-1.5 text-sm font-medium text-danger"
            >
              <RotateCcw size={14} /> Cancel timer
            </button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
