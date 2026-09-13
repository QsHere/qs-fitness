"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { BodyPartGrid } from "@/components/logger/BodyPartGrid";
import { ExercisePicker } from "@/components/logger/ExercisePicker";
import { SetEditor } from "@/components/logger/SetEditor";
import {
  addCustomBodyPart,
  addCustomExercise,
  addExerciseToSession,
  getExercisesForBodyPart,
  getLastExerciseRecord,
  saveSession,
} from "@/lib/actions";
import { setVolume, tempId, toDateKey } from "@/lib/utils";
import type {
  BodyPartRow,
  ExerciseBlockDraft,
  ExerciseRow,
  LocationRow,
  SetDraft,
} from "@/lib/types";

const NEW_PART_PALETTE = ["#FF8A5B", "#5B7CFA", "#F2C94C", "#5BC0A8", "#C084FC"];
const HISTORY_KEY = "qsfDepth";

type Step =
  | { name: "setup" }
  | { name: "pickBodyPart" }
  | { name: "pickExercise"; bodyPart: BodyPartRow }
  | {
      name: "fillSets";
      bodyPart: BodyPartRow;
      exercise: ExerciseRow;
      editingBlockId?: string;
    }
  | { name: "review" };

export function LogFlow({
  locations,
  bodyParts: initialBodyParts,
}: {
  locations: LocationRow[];
  bodyParts: BodyPartRow[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  const dateParam = params.get("date");
  const locationParam = params.get("location");
  const sessionParam = params.get("session");
  const addMode = !!sessionParam;

  const [bodyParts, setBodyParts] = useState(initialBodyParts);
  const [dateKey, setDateKey] = useState(dateParam ?? toDateKey(new Date()));
  const [locationId, setLocationId] = useState(
    locationParam ??
      locations.find((l) => l.is_default)?.id ??
      locations[0]?.id ??
      ""
  );
  const [blocks, setBlocks] = useState<ExerciseBlockDraft[]>([]);
  const [sessionNotes, setSessionNotes] = useState("");
  const [exercises, setExercises] = useState<ExerciseRow[]>([]);
  const [draftSets, setDraftSets] = useState<SetDraft[]>([{ set_number: 1 }]);
  const [draftNotes, setDraftNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const savingRef = useRef(false);

  // --- Navigation is driven by real browser history -----------------------
  // Every forward step pushes one history entry (tagged with its depth).
  // Every back action - whether the in-app arrow or the phone's own back
  // button/gesture - goes through the browser's real history, and a single
  // popstate handler is the only thing that ever changes `depth`. This is
  // what keeps the on-screen step and the device back button in sync: they
  // can no longer disagree about how many steps deep you are, and the
  // `blocks` you've already added never get wiped by navigating back,
  // because the component never unmounts while depth > 0.
  const initialStep: Step = addMode ? { name: "pickBodyPart" } : { name: "setup" };
  const stackRef = useRef<Step[]>([initialStep]);
  const [depth, setDepth] = useState(0);
  const step = stackRef.current[depth];

  useEffect(() => {
    window.history.replaceState({ [HISTORY_KEY]: 0 }, "");
    const onPopState = (e: PopStateEvent) => {
      const d = (e.state as Record<string, number> | null)?.[HISTORY_KEY];
      if (typeof d === "number" && d >= 0 && d < stackRef.current.length) {
        setDepth(d);
      } else {
        // Went further back than our flow knows about - let the browser
        // finish leaving the page naturally.
        router.push("/");
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pushStep = (s: Step) => {
    stackRef.current = stackRef.current.slice(0, depth + 1);
    stackRef.current.push(s);
    const newDepth = stackRef.current.length - 1;
    window.history.pushState({ [HISTORY_KEY]: newDepth }, "");
    setDepth(newDepth);
  };

  const goBackSteps = (n: number) => {
    window.history.go(-n);
  };

  const backOne = () => {
    if (depth === 0) {
      router.back();
      return;
    }
    goBackSteps(1);
  };

  const locationName = locations.find((l) => l.id === locationId)?.name ?? "";

  const selectBodyPart = async (bp: BodyPartRow) => {
    const list = await getExercisesForBodyPart(bp.id);
    setExercises(list);
    pushStep({ name: "pickExercise", bodyPart: bp });
  };

  const selectExercise = async (bp: BodyPartRow, ex: ExerciseRow) => {
    const isCardio = bp.is_cardio;
    const last = await getLastExerciseRecord(ex.id);
    if (isCardio) {
      const lastSet = last?.sets?.[0];
      setDraftSets([
        {
          set_number: 1,
          duration_min: lastSet?.duration_min ?? null,
          distance_km: lastSet?.distance_km ?? null,
          speed_kmh: lastSet?.speed_kmh ?? null,
          incline_level: lastSet?.incline_level ?? null,
          steps: lastSet?.steps ?? null,
          speed_level: lastSet?.speed_level ?? null,
        },
      ]);
    } else if (last?.sets?.length) {
      setDraftSets(
        last.sets.map((s, i) => ({
          set_number: i + 1,
          weight: s.weight,
          reps: s.reps,
        }))
      );
    } else {
      setDraftSets([{ set_number: 1 }]);
    }
    setDraftNotes("");
    pushStep({ name: "fillSets", bodyPart: bp, exercise: ex });
  };

  const editBlock = (block: ExerciseBlockDraft) => {
    const bp = bodyParts.find((b) => b.id === block.body_part_id);
    if (!bp) return;
    const exercise: ExerciseRow = {
      id: block.exercise_id,
      body_part_id: block.body_part_id,
      name: block.exercise_name,
      is_custom: false,
      cardio_fields: block.cardio_fields,
      created_at: "",
    };
    setDraftSets(block.sets);
    setDraftNotes(block.notes);
    pushStep({
      name: "fillSets",
      bodyPart: bp,
      exercise,
      editingBlockId: block.tempId,
    });
  };

  const addNewExercise = async (bp: BodyPartRow, name: string) => {
    const ex = await addCustomExercise(bp.id, name);
    setExercises((prev) => [...prev, ex]);
    await selectExercise(bp, ex);
  };

  const addNewBodyPart = async () => {
    const name = window.prompt("Name this body part (e.g. Neck, Forearm)");
    if (!name?.trim()) return;
    const color = NEW_PART_PALETTE[bodyParts.length % NEW_PART_PALETTE.length];
    const bp = await addCustomBodyPart(name.trim(), color);
    setBodyParts((prev) => [...prev, bp]);
    await selectBodyPart(bp);
  };

  const confirmExercise = () => {
    if (step.name !== "fillSets") return;
    const editingId = step.editingBlockId;
    const block: ExerciseBlockDraft = {
      tempId: editingId ?? tempId(),
      body_part_id: step.bodyPart.id,
      exercise_id: step.exercise.id,
      exercise_name: step.exercise.name,
      is_cardio: step.bodyPart.is_cardio,
      cardio_fields: step.exercise.cardio_fields,
      notes: draftNotes,
      sets: draftSets,
    };
    if (editingId) {
      setBlocks((prev) => prev.map((b) => (b.tempId === editingId ? block : b)));
      goBackSteps(1);
    } else {
      setBlocks((prev) => [...prev, block]);
      goBackSteps(2); // unwind pickExercise + fillSets, back to pickBodyPart
    }
  };

  const removeBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.tempId !== id));
  };

  const handleSave = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      if (addMode && sessionParam) {
        for (let i = 0; i < blocks.length; i++) {
          await addExerciseToSession(sessionParam, blocks[i], i);
        }
      } else {
        await saveSession({ dateKey, locationId, sessionNotes, blocks });
      }
      setSuccess(true);
      setTimeout(() => router.push("/"), 1100);
    } catch (e) {
      console.error(e);
      savingRef.current = false;
      setSaving(false);
      window.alert("Something went wrong saving this session. Please try again.");
    }
  };

  const totalSets = blocks.reduce((sum, b) => sum + b.sets.length, 0);

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex items-center justify-between px-5 pt-6">
        <button
          onClick={backOne}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink-soft shadow-soft"
        >
          {depth === 0 ? <X size={17} /> : <ArrowLeft size={17} />}
        </button>
        {blocks.length > 0 && step.name !== "review" && !success && (
          <button
            onClick={() => pushStep({ name: "review" })}
            className="text-sm font-semibold text-ink"
          >
            Review ({blocks.length})
          </button>
        )}
      </div>

      <div className="flex-1 px-5 pb-10 pt-5">
        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center gap-4 py-24"
            >
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 14, stiffness: 220 }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-pulse"
              >
                <Check size={28} className="text-ink" strokeWidth={2.5} />
              </motion.div>
              <p className="font-display text-lg font-semibold">Session saved</p>
            </motion.div>
          ) : (
            <motion.div
              key={
                step.name +
                ("bodyPart" in step ? step.bodyPart.id : "") +
                ("exercise" in step ? step.exercise.id : "") +
                ("editingBlockId" in step ? step.editingBlockId ?? "" : "")
              }
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.18 }}
            >
              {step.name === "setup" && (
                <div className="space-y-6">
                  <h1 className="font-display text-2xl font-semibold tracking-tight">
                    New workout
                  </h1>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-medium text-ink-soft">Date</span>
                    <input
                      type="date"
                      value={dateKey}
                      onChange={(e) => setDateKey(e.target.value)}
                      className="h-12 rounded-xl border border-line bg-white px-3.5 text-[15px] outline-none focus:border-ink"
                    />
                  </label>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-medium text-ink-soft">Gym</span>
                    <SegmentedControl
                      options={locations.map((l) => ({ value: l.id, label: l.name }))}
                      value={locationId}
                      onChange={setLocationId}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => pushStep({ name: "pickBodyPart" })}
                    disabled={!locationId}
                  >
                    Continue
                  </Button>
                </div>
              )}

              {step.name === "pickBodyPart" && (
                <div className="space-y-5">
                  <div>
                    <h1 className="font-display text-2xl font-semibold tracking-tight">
                      What did you train?
                    </h1>
                    <p className="mt-1 text-sm text-ink-soft">
                      {new Date(dateKey + "T00:00:00").toLocaleDateString("en-GB", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                      {" · "}
                      {locationName}
                    </p>
                  </div>

                  {blocks.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[13px] font-medium text-ink-faint">
                        Added so far · tap to edit
                      </p>
                      {blocks.map((b) => (
                        <button
                          key={b.tempId}
                          onClick={() => editBlock(b)}
                          className="flex w-full items-center justify-between rounded-xl bg-white px-3.5 py-2.5 text-left shadow-soft"
                        >
                          <span className="text-sm font-medium text-ink">
                            {b.exercise_name}
                          </span>
                          <span className="flex items-center gap-2">
                            <Pencil size={13} className="text-ink-faint" />
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                removeBlock(b.tempId);
                              }}
                              className="flex h-6 w-6 items-center justify-center text-ink-faint hover:text-danger"
                            >
                              <Trash2 size={14} />
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  <BodyPartGrid
                    bodyParts={bodyParts}
                    onSelect={selectBodyPart}
                    onAddNew={addNewBodyPart}
                  />

                  {blocks.length > 0 && (
                    <Button
                      className="w-full"
                      onClick={() => pushStep({ name: "review" })}
                    >
                      Review & save
                    </Button>
                  )}
                </div>
              )}

              {step.name === "pickExercise" && (
                <div className="space-y-5">
                  <h1 className="font-display text-2xl font-semibold tracking-tight">
                    {step.bodyPart.name}
                  </h1>
                  <ExercisePicker
                    exercises={exercises}
                    onSelect={(ex) => selectExercise(step.bodyPart, ex)}
                    onAddNew={(name) => addNewExercise(step.bodyPart, name)}
                  />
                </div>
              )}

              {step.name === "fillSets" && (
                <div className="space-y-5">
                  <div>
                    <span
                      className="inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold"
                      style={{
                        backgroundColor: `${step.bodyPart.color_hex}1A`,
                        color: step.bodyPart.color_hex,
                      }}
                    >
                      {step.bodyPart.name}
                    </span>
                    <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight">
                      {step.exercise.name}
                    </h1>
                  </div>

                  <SetEditor
                    isCardio={step.bodyPart.is_cardio}
                    cardioFields={step.exercise.cardio_fields}
                    sets={draftSets}
                    onSetsChange={setDraftSets}
                    notes={draftNotes}
                    onNotesChange={setDraftNotes}
                  />

                  <Button className="w-full" onClick={confirmExercise}>
                    {step.editingBlockId ? "Save changes" : "Add to session"}
                  </Button>
                </div>
              )}

              {step.name === "review" && (
                <ReviewStep
                  dateKey={dateKey}
                  locationName={locationName}
                  blocks={blocks}
                  sessionNotes={sessionNotes}
                  onSessionNotesChange={setSessionNotes}
                  onRemoveBlock={removeBlock}
                  onEditBlock={editBlock}
                  onAddMore={() => pushStep({ name: "pickBodyPart" })}
                  onSave={handleSave}
                  saving={saving}
                  totalSets={totalSets}
                  addMode={addMode}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ReviewStep({
  dateKey,
  locationName,
  blocks,
  sessionNotes,
  onSessionNotesChange,
  onRemoveBlock,
  onEditBlock,
  onAddMore,
  onSave,
  saving,
  totalSets,
  addMode,
}: {
  dateKey: string;
  locationName: string;
  blocks: ExerciseBlockDraft[];
  sessionNotes: string;
  onSessionNotesChange: (v: string) => void;
  onRemoveBlock: (id: string) => void;
  onEditBlock: (block: ExerciseBlockDraft) => void;
  onAddMore: () => void;
  onSave: () => void;
  saving: boolean;
  totalSets: number;
  addMode: boolean;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, ExerciseBlockDraft[]>();
    for (const b of blocks) {
      if (!map.has(b.body_part_id)) map.set(b.body_part_id, []);
      map.get(b.body_part_id)!.push(b);
    }
    return Array.from(map.values());
  }, [blocks]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Review session
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          {new Date(dateKey + "T00:00:00").toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
          {" · "}
          {locationName}
          {" · "}
          {totalSets} sets
        </p>
      </div>

      {blocks.length === 0 && (
        <p className="text-sm text-ink-faint">Nothing added yet.</p>
      )}

      {grouped.map((group, i) => (
        <div key={i} className="space-y-2">
          {group.map((b) => (
            <button
              key={b.tempId}
              onClick={() => onEditBlock(b)}
              className="block w-full rounded-2xl border border-line bg-white p-4 text-left"
            >
              <div className="flex items-start justify-between">
                <p className="text-sm font-semibold text-ink">
                  {b.exercise_name}
                </p>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveBlock(b.tempId);
                  }}
                  className="flex h-6 w-6 items-center justify-center text-ink-faint hover:text-danger"
                >
                  <Trash2 size={14} />
                </span>
              </div>
              <p className="mt-1 text-[13px] text-ink-soft">
                {b.is_cardio
                  ? cardioLine(b.sets[0])
                  : b.sets
                      .map((s) => `${s.weight ?? 0}kg × ${s.reps ?? 0}`)
                      .join(" · ")}
              </p>
              {!b.is_cardio && (
                <p className="mt-1 text-[11px] text-ink-faint">
                  Volume: {b.sets.reduce((s, x) => s + setVolume(x), 0).toLocaleString()} kg
                </p>
              )}
            </button>
          ))}
        </div>
      ))}

      <button
        onClick={onAddMore}
        className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-line py-3.5 text-sm font-medium text-ink-soft hover:border-ink hover:text-ink"
      >
        Add another exercise
      </button>

      {!addMode && (
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-ink-soft">
            Session remark (optional)
          </span>
          <textarea
            value={sessionNotes}
            onChange={(e) => onSessionNotesChange(e.target.value)}
            placeholder="How did today feel overall?"
            rows={3}
            className="w-full resize-none rounded-xl border border-line bg-white px-3.5 py-3 text-sm outline-none focus:border-ink"
          />
        </label>
      )}

      <Button
        className="w-full"
        onClick={onSave}
        disabled={blocks.length === 0 || saving}
      >
        {saving ? "Saving..." : "Confirm & save"}
      </Button>
    </div>
  );
}

function cardioLine(set?: SetDraft) {
  if (!set) return "";
  const parts: string[] = [];
  if (set.speed_kmh) parts.push(`${set.speed_kmh} km/h`);
  if (set.distance_km) parts.push(`${set.distance_km} km`);
  if (set.steps) parts.push(`${set.steps} steps`);
  if (set.speed_level) parts.push(`level ${set.speed_level}`);
  if (set.incline_level) parts.push(`${set.incline_level}% incline`);
  if (set.duration_min) parts.push(`${set.duration_min} min`);
  return parts.join(" · ");
}
