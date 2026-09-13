"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { calendarColorForBodyPart } from "@/lib/constants";
import { toDateKey } from "@/lib/utils";
import type {
  BodyPartRow,
  CalendarDaySummary,
  DayExerciseDetail,
  DaySessionDetail,
  ExerciseBlockDraft,
  ExerciseRow,
  LocationRow,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

export async function getLocations(): Promise<LocationRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .order("is_default", { ascending: false })
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getBodyParts(): Promise<BodyPartRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("body_parts")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function getExercisesForBodyPart(
  bodyPartId: string
): Promise<ExerciseRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .eq("body_part_id", bodyPartId)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function addCustomBodyPart(
  name: string,
  colorHex: string
): Promise<BodyPartRow> {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("body_parts")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = (existing?.[0]?.sort_order ?? 0) + 1;
  const { data, error } = await supabase
    .from("body_parts")
    .insert({ name, color_hex: colorHex, sort_order: nextOrder, is_custom: true })
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/");
  return data;
}

export async function addCustomExercise(
  bodyPartId: string,
  name: string
): Promise<ExerciseRow> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("exercises")
    .insert({ body_part_id: bodyPartId, name, is_custom: true })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Prepopulation: "last time you did this"
// ---------------------------------------------------------------------------

export async function getLastExerciseRecord(exerciseId: string) {
  const supabase = createClient();
  // Ordered by the session's actual date, not by when the row was inserted -
  // otherwise backfilling an older date after already logging a more recent
  // one would incorrectly surface the backfilled entry as "last time".
  const { data: lastBlock } = await supabase
    .from("session_exercises")
    .select("id, notes, sessions!inner(session_date)")
    .eq("exercise_id", exerciseId)
    .order("session_date", { referencedTable: "sessions", ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lastBlock) return null;

  const { data: sets } = await supabase
    .from("exercise_sets")
    .select("*")
    .eq("session_exercise_id", lastBlock.id)
    .order("set_number");

  return {
    date: (lastBlock as unknown as { sessions: { session_date: string } })
      .sessions?.session_date,
    notes: lastBlock.notes,
    sets: sets ?? [],
  };
}

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

export async function getMonthCalendar(
  year: number,
  month: number // 1-12
): Promise<{ days: CalendarDaySummary[] }> {
  const supabase = createClient();
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(
    endDate
  ).padStart(2, "0")}`;

  const { data: sessions, error } = await supabase
    .from("sessions")
    .select("id, session_date")
    .gte("session_date", start)
    .lte("session_date", end);
  if (error) throw error;

  const sessionIds = (sessions ?? []).map((s) => s.id);
  const dateBySession = new Map(
    (sessions ?? []).map((s) => [s.id, s.session_date])
  );

  const colorsByDate = new Map<string, Set<string>>();

  if (sessionIds.length > 0) {
    const { data: blocks, error: blocksError } = await supabase
      .from("session_exercises")
      .select("session_id, body_parts(name, sort_order)")
      .in("session_id", sessionIds);
    if (blocksError) throw blocksError;

    for (const b of blocks ?? []) {
      const date = dateBySession.get(
        (b as unknown as { session_id: string }).session_id
      );
      const bp = (b as unknown as { body_parts: { name: string } })
        .body_parts;
      if (!date || !bp) continue;
      if (!colorsByDate.has(date)) colorsByDate.set(date, new Set());
      colorsByDate.get(date)!.add(calendarColorForBodyPart(bp.name));
    }
  }

  const days: CalendarDaySummary[] = Array.from(colorsByDate.entries()).map(
    ([date, colors]) => ({ date, bodyPartColors: Array.from(colors) })
  );

  return { days };
}

// ---------------------------------------------------------------------------
// Overview stats - always reflect real "today", independent of whatever
// month the calendar above happens to be scrolled to.
// ---------------------------------------------------------------------------

function mondayOfThisWeek(): string {
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // Mon=0..Sun=6
  const monday = new Date(now);
  monday.setDate(now.getDate() - day);
  return toDateKey(monday);
}

function firstOfThisMonth(): string {
  const now = new Date();
  return toDateKey(new Date(now.getFullYear(), now.getMonth(), 1));
}

export async function getOverviewStats(): Promise<{
  allTime: number;
  thisMonth: number;
  thisWeek: number;
}> {
  const supabase = createClient();

  const [allTimeRes, monthRes, weekRes] = await Promise.all([
    supabase.from("sessions").select("id", { count: "exact", head: true }),
    supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .gte("session_date", firstOfThisMonth()),
    supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .gte("session_date", mondayOfThisWeek()),
  ]);

  if (allTimeRes.error) throw allTimeRes.error;
  if (monthRes.error) throw monthRes.error;
  if (weekRes.error) throw weekRes.error;

  return {
    allTime: allTimeRes.count ?? 0,
    thisMonth: monthRes.count ?? 0,
    thisWeek: weekRes.count ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Day detail
// ---------------------------------------------------------------------------

export async function getDayDetail(
  dateKey: string
): Promise<DaySessionDetail[]> {
  const supabase = createClient();
  const { data: sessions, error } = await supabase
    .from("sessions")
    .select("id, session_date, notes, locations(id, name)")
    .eq("session_date", dateKey);
  if (error) throw error;
  if (!sessions || sessions.length === 0) return [];

  const results: DaySessionDetail[] = [];

  for (const session of sessions) {
    const location = (
      session as unknown as { locations: { id: string; name: string } }
    ).locations;

    const { data: blocks } = await supabase
      .from("session_exercises")
      .select(
        "id, notes, order_index, exercises(id, name, cardio_fields), body_parts(id, name, color_hex, is_cardio)"
      )
      .eq("session_id", session.id)
      .order("order_index");

    const exercises = [];
    for (const b of blocks ?? []) {
      const ex = (
        b as unknown as {
          exercises: {
            id: string;
            name: string;
            cardio_fields: DayExerciseDetail["cardio_fields"];
          };
        }
      ).exercises;
      const bp = (
        b as unknown as {
          body_parts: {
            id: string;
            name: string;
            color_hex: string;
            is_cardio: boolean;
          };
        }
      ).body_parts;
      const { data: sets } = await supabase
        .from("exercise_sets")
        .select("*")
        .eq("session_exercise_id", b.id)
        .order("set_number");

      exercises.push({
        session_exercise_id: b.id,
        exercise_id: ex.id,
        exercise_name: ex.name,
        body_part_id: bp.id,
        body_part_name: bp.name,
        color_hex: bp.color_hex,
        is_cardio: bp.is_cardio,
        cardio_fields: ex.cardio_fields,
        notes: b.notes,
        sets: sets ?? [],
      });
    }

    results.push({
      session_id: session.id,
      session_date: session.session_date,
      location_id: location.id,
      location_name: location.name,
      notes: session.notes,
      exercises,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Save / edit / delete
// ---------------------------------------------------------------------------

export async function saveSession(input: {
  dateKey: string;
  locationId: string;
  sessionNotes: string;
  blocks: ExerciseBlockDraft[];
}) {
  const supabase = createClient();

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .upsert(
      {
        session_date: input.dateKey,
        location_id: input.locationId,
        notes: input.sessionNotes || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_date,location_id" }
    )
    .select()
    .single();
  if (sessionError) throw sessionError;

  for (let i = 0; i < input.blocks.length; i++) {
    const block = input.blocks[i];
    const { data: sessionExercise, error: blockError } = await supabase
      .from("session_exercises")
      .insert({
        session_id: session.id,
        exercise_id: block.exercise_id,
        body_part_id: block.body_part_id,
        order_index: i,
        notes: block.notes || null,
      })
      .select()
      .single();
    if (blockError) throw blockError;

    const setsPayload = block.sets.map((s) => ({
      session_exercise_id: sessionExercise.id,
      set_number: s.set_number,
      weight: s.weight ?? null,
      reps: s.reps ?? null,
      duration_min: s.duration_min ?? null,
      distance_km: s.distance_km ?? null,
      speed_kmh: s.speed_kmh ?? null,
      incline_level: s.incline_level ?? null,
      steps: s.steps ?? null,
      speed_level: s.speed_level ?? null,
    }));
    if (setsPayload.length > 0) {
      const { error: setsError } = await supabase
        .from("exercise_sets")
        .insert(setsPayload);
      if (setsError) throw setsError;
    }
  }

  revalidatePath("/");
  return session.id as string;
}

export async function updateSessionExercise(
  sessionExerciseId: string,
  input: { notes: string; sets: ExerciseBlockDraft["sets"] }
) {
  const supabase = createClient();

  const { error: notesError } = await supabase
    .from("session_exercises")
    .update({ notes: input.notes || null })
    .eq("id", sessionExerciseId);
  if (notesError) throw notesError;

  const { error: deleteError } = await supabase
    .from("exercise_sets")
    .delete()
    .eq("session_exercise_id", sessionExerciseId);
  if (deleteError) throw deleteError;

  const setsPayload = input.sets.map((s) => ({
    session_exercise_id: sessionExerciseId,
    set_number: s.set_number,
    weight: s.weight ?? null,
    reps: s.reps ?? null,
    duration_min: s.duration_min ?? null,
    distance_km: s.distance_km ?? null,
    speed_kmh: s.speed_kmh ?? null,
      incline_level: s.incline_level ?? null,
    steps: s.steps ?? null,
    speed_level: s.speed_level ?? null,
  }));
  if (setsPayload.length > 0) {
    const { error: insertError } = await supabase
      .from("exercise_sets")
      .insert(setsPayload);
    if (insertError) throw insertError;
  }

  revalidatePath("/");
}

export async function deleteSessionExercise(sessionExerciseId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("session_exercises")
    .delete()
    .eq("id", sessionExerciseId);
  if (error) throw error;
  revalidatePath("/");
}

export async function deleteSession(sessionId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("sessions").delete().eq("id", sessionId);
  if (error) throw error;
  revalidatePath("/");
}

export async function updateSessionNotes(sessionId: string, notes: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("sessions")
    .update({ notes: notes || null })
    .eq("id", sessionId);
  if (error) throw error;
  revalidatePath("/");
}

export async function addExerciseToSession(
  sessionId: string,
  block: ExerciseBlockDraft,
  orderIndex: number
) {
  const supabase = createClient();
  const { data: sessionExercise, error: blockError } = await supabase
    .from("session_exercises")
    .insert({
      session_id: sessionId,
      exercise_id: block.exercise_id,
      body_part_id: block.body_part_id,
      order_index: orderIndex,
      notes: block.notes || null,
    })
    .select()
    .single();
  if (blockError) throw blockError;

  const setsPayload = block.sets.map((s) => ({
    session_exercise_id: sessionExercise.id,
    set_number: s.set_number,
    weight: s.weight ?? null,
    reps: s.reps ?? null,
    duration_min: s.duration_min ?? null,
    distance_km: s.distance_km ?? null,
    speed_kmh: s.speed_kmh ?? null,
      incline_level: s.incline_level ?? null,
    steps: s.steps ?? null,
    speed_level: s.speed_level ?? null,
  }));
  if (setsPayload.length > 0) {
    const { error: setsError } = await supabase
      .from("exercise_sets")
      .insert(setsPayload);
    if (setsError) throw setsError;
  }

  revalidatePath("/");
}

export async function getOrCreateSessionForDate(
  dateKey: string,
  locationId: string
) {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("sessions")
    .select("id")
    .eq("session_date", dateKey)
    .eq("location_id", locationId)
    .maybeSingle();
  if (existing) return existing.id as string;

  const { data: created, error } = await supabase
    .from("sessions")
    .insert({ session_date: dateKey, location_id: locationId })
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/");
  return created.id as string;
}
