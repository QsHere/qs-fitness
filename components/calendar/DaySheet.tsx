"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { SetEditor } from "@/components/logger/SetEditor";
import {
  deleteSession,
  deleteSessionExercise,
  getDayDetail,
  updateSessionExercise,
  updateSessionNotes,
} from "@/lib/actions";
import { formatFriendlyDate, setVolume } from "@/lib/utils";
import type { DaySessionDetail, SetDraft } from "@/lib/types";

export function DaySheet({
  dateKey,
  onClose,
}: {
  dateKey: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [sessions, setSessions] = useState<DaySessionDetail[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftSets, setDraftSets] = useState<SetDraft[]>([]);
  const [draftNotes, setDraftNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!dateKey) {
      setSessions(null);
      setEditingId(null);
      return;
    }
    getDayDetail(dateKey).then(setSessions);
  }, [dateKey]);

  const refresh = () => {
    if (dateKey) getDayDetail(dateKey).then(setSessions);
  };

  const startEdit = (sessionExerciseId: string, sets: SetDraft[], notes: string) => {
    setEditingId(sessionExerciseId);
    setDraftSets(sets);
    setDraftNotes(notes);
  };

  const saveEdit = () => {
    if (!editingId) return;
    startTransition(async () => {
      await updateSessionExercise(editingId, { notes: draftNotes, sets: draftSets });
      setEditingId(null);
      refresh();
    });
  };

  return (
    <BottomSheet open={!!dateKey} onClose={onClose}>
      <div className="px-5 pb-10 pt-4">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold tracking-tight">
              {dateKey ? formatFriendlyDate(dateKey) : ""}
            </h3>
            {sessions && sessions.length === 0 && (
              <p className="mt-0.5 text-sm text-ink-soft">Rest day</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-paper text-ink-soft"
          >
            <X size={16} />
          </button>
        </div>

        {sessions === null && (
          <div className="py-10 text-center text-sm text-ink-faint">Loading...</div>
        )}

        {sessions?.length === 0 && (
          <Button
            variant="primary"
            className="w-full"
            onClick={() => dateKey && router.push(`/log?date=${dateKey}`)}
          >
            <Plus size={16} /> Log a workout
          </Button>
        )}

        {sessions?.map((session) => (
          <div key={session.session_id} className="mb-6 last:mb-0">
            <div className="mb-3 flex items-center justify-between">
              <span className="rounded-full bg-paper px-3 py-1 text-xs font-medium text-ink-soft">
                {session.location_name}
              </span>
              <button
                onClick={() =>
                  startTransition(async () => {
                    await deleteSession(session.session_id);
                    refresh();
                  })
                }
                className="text-xs font-medium text-danger"
              >
                Delete day
              </button>
            </div>

            <div className="space-y-3">
              {session.exercises.map((ex) => (
                <div
                  key={ex.session_exercise_id}
                  className="rounded-2xl border border-line bg-white p-4"
                  style={{ borderLeft: `3px solid ${ex.color_hex}` }}
                >
                  {editingId === ex.session_exercise_id ? (
                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm font-semibold">{ex.exercise_name}</span>
                      </div>
                      <SetEditor
                        isCardio={ex.is_cardio}
                        cardioFields={ex.cardio_fields}
                        sets={draftSets}
                        onSetsChange={setDraftSets}
                        notes={draftNotes}
                        onNotesChange={setDraftNotes}
                      />
                      <div className="mt-3 flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          className="flex-1"
                          disabled={isPending}
                          onClick={saveEdit}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-ink">
                            {ex.exercise_name}
                          </p>
                          <p className="mt-1 text-[13px] text-ink-soft">
                            {ex.is_cardio
                              ? cardioSummary(ex.sets[0])
                              : ex.sets
                                  .map((s) => `${s.weight ?? 0}kg × ${s.reps ?? 0}`)
                                  .join(" · ")}
                          </p>
                          {!ex.is_cardio && (
                            <p className="mt-1 text-[11px] text-ink-faint">
                              Volume:{" "}
                              {ex.sets.reduce((sum, s) => sum + setVolume(s), 0).toLocaleString()}{" "}
                              kg
                            </p>
                          )}
                          {ex.notes && (
                            <p className="mt-1.5 text-[13px] italic text-ink-faint">
                              &ldquo;{ex.notes}&rdquo;
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            onClick={() =>
                              startEdit(
                                ex.session_exercise_id,
                                ex.sets.map((s) => ({
                                  set_number: s.set_number,
                                  weight: s.weight,
                                  reps: s.reps,
                                  duration_min: s.duration_min,
                                  distance_km: s.distance_km,
                                  speed_kmh: s.speed_kmh,
                                  incline_level: s.incline_level,
                                  steps: s.steps,
                                  speed_level: s.speed_level,
                                })),
                                ex.notes ?? ""
                              )
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-faint hover:bg-paper hover:text-ink"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() =>
                              startTransition(async () => {
                                await deleteSessionExercise(ex.session_exercise_id);
                                refresh();
                              })
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-faint hover:bg-danger/10 hover:text-danger"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <SessionNotes
              sessionId={session.session_id}
              initialNotes={session.notes ?? ""}
            />

            <button
              onClick={() =>
                router.push(
                  `/log?date=${dateKey}&location=${session.location_id}&session=${session.session_id}`
                )
              }
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-3 text-sm font-medium text-ink-soft hover:border-ink hover:text-ink"
            >
              <Plus size={15} /> Add exercise to this session
            </button>
          </div>
        ))}
      </div>
    </BottomSheet>
  );
}

function cardioSummary(set?: {
  speed_kmh?: number | null;
  distance_km?: number | null;
  duration_min?: number | null;
  steps?: number | null;
  speed_level?: number | null;
  incline_level?: number | null;
}) {
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

function SessionNotes({
  sessionId,
  initialNotes,
}: {
  sessionId: string;
  initialNotes: string;
}) {
  const [value, setValue] = useState(initialNotes);
  const [saved, setSaved] = useState(true);

  return (
    <textarea
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        setSaved(false);
      }}
      onBlur={() => {
        if (!saved) {
          updateSessionNotes(sessionId, value).then(() => setSaved(true));
        }
      }}
      placeholder="Session remark (optional)"
      rows={2}
      className="mt-3 w-full resize-none rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-ink"
    />
  );
}
