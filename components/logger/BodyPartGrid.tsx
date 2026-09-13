"use client";

import { Plus } from "lucide-react";
import type { BodyPartRow } from "@/lib/types";

const EMOJI: Record<string, string> = {
  Chest: "🏋️",
  Back: "🧗",
  Shoulder: "🙆",
  Abs: "🔥",
  Arm: "💪",
  Cardio: "❤️‍🔥",
  "Lower Body": "🦵",
};

const DEFAULT_EMOJI = "🏷️";

export function BodyPartGrid({
  bodyParts,
  onSelect,
  onAddNew,
}: {
  bodyParts: BodyPartRow[];
  onSelect: (bp: BodyPartRow) => void;
  onAddNew: () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {bodyParts.map((bp) => (
        <button
          key={bp.id}
          onClick={() => onSelect(bp)}
          className="flex flex-col items-start gap-3 rounded-2xl border border-line bg-white p-4 text-left transition-transform active:scale-[0.97]"
        >
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
            style={{ backgroundColor: `${bp.color_hex}1A` }}
          >
            {EMOJI[bp.name] ?? DEFAULT_EMOJI}
          </span>
          <span className="text-[15px] font-semibold text-ink">{bp.name}</span>
        </button>
      ))}
      <button
        onClick={onAddNew}
        className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-line bg-transparent p-4 text-left transition-transform active:scale-[0.97]"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-paper text-ink-faint">
          <Plus size={20} />
        </span>
        <span className="text-[15px] font-semibold text-ink-soft">Add new part</span>
      </button>
    </div>
  );
}
