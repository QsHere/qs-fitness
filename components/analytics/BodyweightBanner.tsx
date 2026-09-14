"use client";

import { useState, useTransition } from "react";
import { Check, Info } from "lucide-react";
import { setBodyweightKg } from "@/lib/actions";

export function BodyweightBanner({
  currentKg,
  onSaved,
}: {
  currentKg: number | null;
  onSaved: (kg: number) => void;
}) {
  const [editing, setEditing] = useState(currentKg == null);
  const [value, setValue] = useState(currentKg ? String(currentKg) : "");
  const [isPending, startTransition] = useTransition();

  const save = () => {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return;
    startTransition(async () => {
      await setBodyweightKg(n);
      onSaved(n);
      setEditing(false);
    });
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-left shadow-soft"
      >
        <span className="text-sm text-ink-soft">
          Bodyweight: <span className="font-semibold text-ink">{currentKg} kg</span>
        </span>
        <span className="text-xs font-medium text-ink-faint">Edit</span>
      </button>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-soft">
      <div className="mb-2 flex items-start gap-2">
        <Info size={15} className="mt-0.5 shrink-0 text-ink-faint" />
        <p className="text-[13px] text-ink-soft">
          Set your bodyweight so bodyweight exercises (sit-ups, captain chair)
          can be scored properly - 0kg logged there means "just my bodyweight",
          not "no load".
        </p>
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. 70"
          className="h-11 flex-1 rounded-xl border border-line bg-paper px-3.5 text-[15px] outline-none focus:border-ink"
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
        <button
          onClick={save}
          disabled={isPending}
          className="flex h-11 items-center gap-1.5 rounded-xl bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Check size={15} /> Save
        </button>
      </div>
    </div>
  );
}
