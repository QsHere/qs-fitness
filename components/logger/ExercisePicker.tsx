"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { ExerciseRow } from "@/lib/types";

export function ExercisePicker({
  exercises,
  onSelect,
  onAddNew,
}: {
  exercises: ExerciseRow[];
  onSelect: (ex: ExerciseRow) => void;
  onAddNew: (name: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  return (
    <div className="space-y-2.5">
      {exercises.map((ex) => (
        <button
          key={ex.id}
          onClick={() => onSelect(ex)}
          className="flex w-full items-center justify-between rounded-2xl border border-line bg-white px-4 py-3.5 text-left text-[15px] font-medium text-ink transition-transform active:scale-[0.98]"
        >
          {ex.name}
        </button>
      ))}

      {adding ? (
        <div className="flex gap-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Exercise name"
            className="h-12 flex-1 rounded-xl border border-line bg-white px-3.5 text-[15px] outline-none focus:border-ink"
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) {
                onAddNew(name.trim());
                setName("");
                setAdding(false);
              }
            }}
          />
          <button
            onClick={() => {
              if (name.trim()) {
                onAddNew(name.trim());
                setName("");
                setAdding(false);
              }
            }}
            className="rounded-xl bg-ink px-4 text-sm font-semibold text-white"
          >
            Add
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-line py-3.5 text-sm font-medium text-ink-soft hover:border-ink hover:text-ink"
        >
          <Plus size={15} /> Add new exercise
        </button>
      )}
    </div>
  );
}
