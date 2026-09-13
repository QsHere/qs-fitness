"use client";

import { Copy, Plus, Trash2 } from "lucide-react";
import type { CardioField, SetDraft } from "@/lib/types";

function NumberField({
  label,
  value,
  onChange,
  placeholder,
  step = 1,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  placeholder?: string;
  step?: number;
}) {
  return (
    <label className="flex flex-1 flex-col gap-1">
      <span className="text-[11px] font-medium text-ink-faint">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        value={value ?? ""}
        placeholder={placeholder ?? "0"}
        onChange={(e) =>
          onChange(e.target.value === "" ? null : Number(e.target.value))
        }
        className="h-11 w-full rounded-xl border border-line bg-paper px-3 text-[15px] font-medium text-ink outline-none focus:border-ink"
      />
    </label>
  );
}

const CARDIO_FIELD_LABELS: Record<CardioField, string> = {
  speed_kmh: "Speed (km/h)",
  incline_level: "Incline (%)",
  distance_km: "Distance (km)",
  duration_min: "Duration (min)",
  steps: "Steps",
  speed_level: "Speed level",
};

export function SetEditor({
  isCardio,
  cardioFields,
  sets,
  onSetsChange,
  notes,
  onNotesChange,
}: {
  isCardio: boolean;
  cardioFields: CardioField[] | null;
  sets: SetDraft[];
  onSetsChange: (sets: SetDraft[]) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
}) {
  if (isCardio) {
    const fields = cardioFields ?? ["duration_min"];
    const cardioSet: SetDraft = sets[0] ?? { set_number: 1 };

    const update = (patch: Partial<SetDraft>) => {
      onSetsChange([{ ...cardioSet, ...patch }]);
    };

    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          {fields.map((f) => (
            <NumberField
              key={f}
              label={CARDIO_FIELD_LABELS[f]}
              value={cardioSet[f] as number | null | undefined}
              step={
                f === "duration_min" || f === "distance_km" || f === "incline_level"
                  ? 0.1
                  : 1
              }
              onChange={(v) => update({ [f]: v } as Partial<SetDraft>)}
            />
          ))}
        </div>
        <NotesField value={notes} onChange={onNotesChange} />
      </div>
    );
  }

  const addSet = () => {
    const last = sets[sets.length - 1];
    onSetsChange([
      ...sets,
      {
        set_number: sets.length + 1,
        weight: last?.weight ?? null,
        reps: last?.reps ?? null,
      },
    ]);
  };

  const removeSet = (idx: number) => {
    const next = sets
      .filter((_, i) => i !== idx)
      .map((s, i) => ({ ...s, set_number: i + 1 }));
    onSetsChange(next);
  };

  const updateSet = (idx: number, patch: Partial<SetDraft>) => {
    onSetsChange(
      sets.map((s, i) => (i === idx ? { ...s, ...patch } : s))
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2.5">
        {sets.map((set, idx) => (
          <div key={idx} className="flex items-end gap-2">
            <div className="flex h-11 w-9 shrink-0 items-center justify-center rounded-xl bg-paper text-xs font-semibold text-ink-soft">
              {set.set_number}
            </div>
            <NumberField
              label="Weight (kg)"
              value={set.weight}
              step={0.5}
              onChange={(v) => updateSet(idx, { weight: v })}
            />
            <NumberField
              label="Reps"
              value={set.reps}
              onChange={(v) => updateSet(idx, { reps: v })}
            />
            <button
              onClick={() => removeSet(idx)}
              disabled={sets.length <= 1}
              className="mb-0.5 flex h-11 w-9 shrink-0 items-center justify-center rounded-xl text-ink-faint transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-30"
              aria-label="Remove set"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={addSet}
          className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-dashed border-line text-sm font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
        >
          <Copy size={14} /> Same as last set
        </button>
        <button
          onClick={() =>
            onSetsChange([...sets, { set_number: sets.length + 1 }])
          }
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line text-ink-soft transition-colors hover:border-ink hover:text-ink"
          aria-label="Add blank set"
        >
          <Plus size={16} />
        </button>
      </div>

      <NotesField value={notes} onChange={onNotesChange} />
    </div>
  );
}

function NotesField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-ink-faint">
        Note for this exercise (optional)
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. new machine, adjusted seat height..."
        rows={2}
        className="w-full resize-none rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-ink"
      />
    </label>
  );
}
