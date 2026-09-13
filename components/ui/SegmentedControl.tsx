"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-2xl bg-line/50 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className="relative flex-1 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
        >
          {value === opt.value && (
            <motion.div
              layoutId="segmented-bg"
              className="absolute inset-0 rounded-xl bg-white shadow-soft"
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
            />
          )}
          <span
            className={cn(
              "relative z-10",
              value === opt.value ? "text-ink" : "text-ink-soft"
            )}
          >
            {opt.label}
          </span>
        </button>
      ))}
    </div>
  );
}
