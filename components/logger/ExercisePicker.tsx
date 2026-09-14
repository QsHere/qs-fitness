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
  onAddNew: (name: string, isBodyweight: boolean) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [isBodyweight, setIsBodyweight] = useState(false);

  const submit = () => {
    if (!name.trim()) return;
    onAddNew(name.trim(), isBodyweight);
    setName("");
    setIsBodyweight(false);
    setAdding(false);
  };

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
        <div className="space-y-2.5 rounded-2xl border border-line bg-white p-3.5">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Exercise name"
            className="h-12 w-full rounded-xl border border-line bg-paper px-3.5 text-[15px] outline-none focus:border-ink"
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <button
            onClick={() => setIsBodyweight((v) => !v)}
            className="flex w-full items-center gap-2.5 rounded-xl bg-paper px-3.5 py-2.5 text-left"
          >
            <span
              className={`flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${
                isBodyweight ? "bg-ink justify-end" : "bg-line justify-start"
              }`}
            >
              <span className="h-4 w-4 rounded-full bg-white shadow-soft" />
            </span>
            <span className="text-[13px] text-ink-soft">
              This is a bodyweight exercise - weight I log is{" "}
              <span className="font-medium text-ink">extra</span> load, not the total
            </span>
          </button>
          <button
            onClick={submit}
            className="w-full rounded-xl bg-ink py-2.5 text-sm font-semibold text-white"
          >
            Add exercise
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
