"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { calendarColorForBodyPart } from "@/lib/constants";
import { estimatedOneRepMax, effectiveWeight } from "@/lib/utils";
import type {
  BodyPartRow,
  CalendarDaySummary,
  CardioHistoryPoint,
  CardioSummary,
  DayExerciseDetail,
  DaySessionDetail,
  ExerciseBlockDraft,
  ExerciseHistoryPoint,
  ExerciseHistoryResult,
  ExercisePRSummary,
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
  name: string,
  isBodyweight = false
): Promise<ExerciseRow> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("exercises")
    .insert({ body_part_id: bodyPartId, name, is_custom: true, is_bodyweight: isBodyweight })
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
  // Fetch every time this exercise has been logged, then sort in code by the
  // session's actual date (not insertion/update time). This intentionally
  // avoids relying on PostgREST's order-by-related-table behaviour: that
  // feature is documented and reliable for one-to-many embeds (reordering a
  // nested array), but session_exercises -> sessions is many-to-one, and
  // whether that reliably reorders the *top-level* rows rather than being a
  // no-op is genuinely ambiguous - not worth trusting for something this
  // important to get right. A personal tracker's history for one exercise is
  // small (tens to low hundreds of rows at most), so sorting in code here
  // costs nothing and removes the ambiguity entirely.
  const { data: blocks, error } = await supabase
    .from("session_exercises")
    .select("id, notes, created_at, sessions!inner(session_date)")
    .eq("exercise_id", exerciseId);
  if (error) throw error;
  if (!blocks || blocks.length === 0) return null;

  type BlockRow = {
    id: string;
    notes: string | null;
    created_at: string;
    sessions: { session_date: string };
  };
  const sorted = (blocks as unknown as BlockRow[]).slice().sort((a, b) => {
    const dateDiff = b.sessions.session_date.localeCompare(a.sessions.session_date);
    if (dateDiff !== 0) return dateDiff;
    return b.created_at.localeCompare(a.created_at);
  });
  const lastBlock = sorted[0];

  const { data: sets } = await supabase
    .from("exercise_sets")
    .select("*")
    .eq("session_exercise_id", lastBlock.id)
    .order("set_number");

  return {
    date: lastBlock.sessions.session_date,
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
): Promise<{ days: CalendarDaySummary[]; sessionsCount: number }> {
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

  return { days, sessionsCount: sessionIds.length };
}

// ---------------------------------------------------------------------------
// Overview stats
//
// "All time" and "this week" always reflect real today, independent of
// whatever month the calendar is scrolled to - "this month" instead comes
// from getMonthCalendar above, since it's meant to track the month you're
// currently looking at.
//
// Date math here is anchored to a fixed timezone rather than server local
// time: Vercel's serverless functions run in UTC, so "today"/"this Monday"
// computed from a bare `new Date()` would be wrong for roughly the first 8
// hours of every Malaysia day (UTC+8) - e.g. a session logged at 1am on a
// Monday would still read as "last week" server-side, even though it's
// already Monday locally. Update APP_TIMEZONE if you're ever not in MY/SG.
// ---------------------------------------------------------------------------

const APP_TIMEZONE = "Asia/Kuala_Lumpur";

function todayKeyInAppTimezone(): string {
  // en-CA locale formats as YYYY-MM-DD, which is exactly what session_date
  // comparisons need - no manual string assembly required.
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIMEZONE }).format(
    new Date()
  );
}

function mondayOfThisWeek(): string {
  const [y, m, d] = todayKeyInAppTimezone().split("-").map(Number);
  // UTC-anchored on purpose: this is pure calendar-date arithmetic on a
  // Y/M/D triple that's already been resolved to the right timezone above,
  // so there's no DST/local-offset shift to worry about here.
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = (date.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  date.setUTCDate(date.getUTCDate() - day);
  return date.toISOString().slice(0, 10);
}

export async function getOverviewStats(): Promise<{
  allTime: number;
  thisWeek: number;
}> {
  const supabase = createClient();

  const [allTimeRes, weekRes] = await Promise.all([
    supabase.from("sessions").select("id", { count: "exact", head: true }),
    supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .gte("session_date", mondayOfThisWeek()),
  ]);

  if (allTimeRes.error) throw allTimeRes.error;
  if (weekRes.error) throw weekRes.error;

  return {
    allTime: allTimeRes.count ?? 0,
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

// ---------------------------------------------------------------------------
// Bodyweight setting - used to score bodyweight-flagged exercises correctly
// ---------------------------------------------------------------------------

export async function getBodyweightKg(): Promise<number | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "bodyweight_kg")
    .maybeSingle();
  if (!data) return null;
  const n = Number(data.value);
  return Number.isFinite(n) ? n : null;
}

// Same data as above, plus when it was last set - used only by the UI to
// show "updated 19 Sep" next to the bodyweight. Kept separate from
// getBodyweightKg so the internal scoring calculations above don't need to
// change shape.
export async function getBodyweightSetting(): Promise<
  { kg: number; updatedAt: string } | null
> {
  const supabase = createClient();
  const { data } = await supabase
    .from("app_settings")
    .select("value, updated_at")
    .eq("key", "bodyweight_kg")
    .maybeSingle();
  if (!data) return null;
  const n = Number(data.value);
  if (!Number.isFinite(n)) return null;
  return { kg: n, updatedAt: data.updated_at };
}

export async function setBodyweightKg(kg: number): Promise<{ updatedAt: string }> {
  const supabase = createClient();
  const updatedAt = new Date().toISOString();
  const { error } = await supabase.from("app_settings").upsert({
    key: "bodyweight_kg",
    value: String(kg),
    updated_at: updatedAt,
  });
  if (error) throw error;
  revalidatePath("/analytics");
  return { updatedAt };
}

// ---------------------------------------------------------------------------
// Analytics / Personal Records
//
// Deliberately NOT scored by volume (weight x reps) - see estimatedOneRepMax
// in lib/utils.ts for why. Everything below fetches sets in one pass per
// page load and reduces them in Node, since a personal gym log is a small
// enough dataset (low thousands of rows at most) that this stays instant
// without needing per-exercise round trips.
// ---------------------------------------------------------------------------

type RawSetRow = {
  weight: number | null;
  reps: number | null;
  set_number?: number;
};

type RawBlockRow = {
  exercise_id: string;
  sessions: { session_date: string } | null;
  exercise_sets: RawSetRow[] | null;
};

export async function getExercisePRs(): Promise<ExercisePRSummary[]> {
  const supabase = createClient();
  const bodyweightKg = await getBodyweightKg();

  const [{ data: exercises, error: exError }, { data: bodyParts, error: bpError }, { data: blocks, error: blocksError }] =
    await Promise.all([
      supabase.from("exercises").select("id, name, body_part_id, is_bodyweight"),
      supabase.from("body_parts").select("id, name, color_hex, is_cardio"),
      supabase
        .from("session_exercises")
        .select("exercise_id, sessions!inner(session_date), exercise_sets(weight, reps)"),
    ]);
  if (exError) throw exError;
  if (bpError) throw bpError;
  if (blocksError) throw blocksError;

  const exMap = new Map((exercises ?? []).map((e) => [e.id, e]));
  const bpMap = new Map((bodyParts ?? []).map((b) => [b.id, b]));

  const byExercise = new Map<string, { date: string; sets: RawSetRow[] }[]>();
  for (const raw of (blocks ?? []) as unknown as RawBlockRow[]) {
    const date = raw.sessions?.session_date;
    if (!date) continue;
    const list = byExercise.get(raw.exercise_id) ?? [];
    list.push({ date, sets: raw.exercise_sets ?? [] });
    byExercise.set(raw.exercise_id, list);
  }

  const results: ExercisePRSummary[] = [];

  for (const [exerciseId, entries] of byExercise) {
    const ex = exMap.get(exerciseId);
    if (!ex) continue;
    const bp = bpMap.get(ex.body_part_id);
    if (!bp || bp.is_cardio) continue; // cardio scored separately

    const usesEstimatedOneRepMax = !(ex.is_bodyweight && !bodyweightKg);

    entries.sort((a, b) => a.date.localeCompare(b.date));

    const sessionBests = entries.map((entry) => {
      let value = 0;
      let label = "";
      for (const s of entry.sets) {
        let v: number;
        let l: string;
        if (usesEstimatedOneRepMax) {
          const w = effectiveWeight(s.weight, ex.is_bodyweight, bodyweightKg);
          v = estimatedOneRepMax(w, s.reps ?? 0);
          l = `${s.weight ?? 0}kg × ${s.reps ?? 0}`;
        } else {
          v = s.reps ?? 0;
          l = `${s.reps ?? 0} reps`;
        }
        if (v > value) {
          value = v;
          label = l;
        }
      }
      return { date: entry.date, value, label };
    });

    let best = sessionBests[0];
    for (const sb of sessionBests) if (sb.value >= best.value) best = sb;

    const last = sessionBests[sessionBests.length - 1];
    const secondLast = sessionBests[sessionBests.length - 2];

    results.push({
      exercise_id: exerciseId,
      exercise_name: ex.name,
      body_part_id: bp.id,
      body_part_name: bp.name,
      color_hex: bp.color_hex,
      is_bodyweight: ex.is_bodyweight,
      usesEstimatedOneRepMax,
      bestValue: Math.round(best.value * 10) / 10,
      bestUnit: usesEstimatedOneRepMax ? "kg" : "reps",
      bestSetLabel: best.label,
      bestDate: best.date,
      isNewPR: last.date === best.date && sessionBests.length > 1,
      trendDelta: secondLast
        ? Math.round((last.value - secondLast.value) * 10) / 10
        : null,
      sessionsCount: entries.length,
    });
  }

  results.sort((a, b) => b.bestDate.localeCompare(a.bestDate));
  return results;
}

export async function getExerciseHistory(
  exerciseId: string
): Promise<ExerciseHistoryResult | null> {
  const supabase = createClient();
  const bodyweightKg = await getBodyweightKg();

  const { data: ex, error: exError } = await supabase
    .from("exercises")
    .select("id, name, is_bodyweight, body_parts(color_hex)")
    .eq("id", exerciseId)
    .single();
  if (exError) throw exError;
  if (!ex) return null;

  const colorHex = (ex as unknown as { body_parts: { color_hex: string } })
    .body_parts?.color_hex ?? "#16171B";

  const { data: blocks, error: blocksError } = await supabase
    .from("session_exercises")
    .select("sessions!inner(session_date), exercise_sets(weight, reps, set_number)")
    .eq("exercise_id", exerciseId);
  if (blocksError) throw blocksError;

  const usesEstimatedOneRepMax = !(ex.is_bodyweight && !bodyweightKg);

  const entries = ((blocks ?? []) as unknown as RawBlockRow[])
    .map((b) => ({ date: b.sessions?.session_date, sets: b.exercise_sets ?? [] }))
    .filter((e): e is { date: string; sets: RawSetRow[] } => !!e.date)
    .sort((a, b) => a.date.localeCompare(b.date));

  let runningBest = 0;
  const points: ExerciseHistoryPoint[] = entries.map((entry) => {
    const orderedSets = entry.sets
      .slice()
      .sort((a, b) => (a.set_number ?? 0) - (b.set_number ?? 0));

    let value = 0;
    let label = "";
    let bestIdx = -1;
    orderedSets.forEach((s, i) => {
      let v: number;
      let l: string;
      if (usesEstimatedOneRepMax) {
        const w = effectiveWeight(s.weight, ex.is_bodyweight, bodyweightKg);
        v = estimatedOneRepMax(w, s.reps ?? 0);
        l = `${s.weight ?? 0}kg × ${s.reps ?? 0}`;
      } else {
        v = s.reps ?? 0;
        l = `${s.reps ?? 0} reps`;
      }
      if (v > value) {
        value = v;
        label = l;
        bestIdx = i;
      }
    });
    const isAllTimeBestSoFar = value >= runningBest && value > 0;
    if (value > runningBest) runningBest = value;
    return {
      session_date: entry.date,
      value: Math.round(value * 10) / 10,
      setLabel: label,
      allSets: orderedSets.map((s) => ({ weight: s.weight, reps: s.reps })),
      bestSetIndex: bestIdx,
      isAllTimeBestSoFar,
    };
  });

  return {
    exercise_id: ex.id,
    exercise_name: ex.name,
    color_hex: colorHex,
    is_bodyweight: ex.is_bodyweight,
    bodyweightKnown: bodyweightKg != null,
    usesEstimatedOneRepMax,
    unit: usesEstimatedOneRepMax ? "kg" : "reps",
    points,
  };
}

// ---------------------------------------------------------------------------
// Cardio - scored differently (duration/distance trend, no 1RM concept)
// ---------------------------------------------------------------------------

type RawCardioSetRow = {
  duration_min: number | null;
  distance_km: number | null;
  speed_kmh: number | null;
  incline_level: number | null;
  steps: number | null;
  speed_level: number | null;
};

type RawCardioBlockRow = {
  exercise_id: string;
  sessions: { session_date: string } | null;
  exercise_sets: RawCardioSetRow[] | null;
};

function cardioLabel(s: RawCardioSetRow): string {
  const parts: string[] = [];
  if (s.speed_kmh) parts.push(`${s.speed_kmh} km/h`);
  if (s.distance_km) parts.push(`${s.distance_km} km`);
  if (s.steps) parts.push(`${s.steps} steps`);
  if (s.speed_level) parts.push(`level ${s.speed_level}`);
  if (s.incline_level) parts.push(`${s.incline_level}% incline`);
  if (s.duration_min) parts.push(`${s.duration_min} min`);
  return parts.join(" · ");
}

export async function getCardioSummaries(): Promise<CardioSummary[]> {
  const supabase = createClient();

  const [{ data: exercises, error: exError }, { data: bodyParts, error: bpError }, { data: blocks, error: blocksError }] =
    await Promise.all([
      supabase.from("exercises").select("id, name, body_part_id"),
      supabase.from("body_parts").select("id, color_hex, is_cardio"),
      supabase
        .from("session_exercises")
        .select(
          "exercise_id, sessions!inner(session_date), exercise_sets(duration_min, distance_km, speed_kmh, incline_level, steps, speed_level)"
        ),
    ]);
  if (exError) throw exError;
  if (bpError) throw bpError;
  if (blocksError) throw blocksError;

  const exMap = new Map((exercises ?? []).map((e) => [e.id, e]));
  const bpMap = new Map((bodyParts ?? []).map((b) => [b.id, b]));

  const byExercise = new Map<string, { date: string; sets: RawCardioSetRow[] }[]>();
  for (const raw of (blocks ?? []) as unknown as RawCardioBlockRow[]) {
    const date = raw.sessions?.session_date;
    if (!date) continue;
    const ex = exMap.get(raw.exercise_id);
    if (!ex) continue;
    const bp = bpMap.get(ex.body_part_id);
    if (!bp?.is_cardio) continue;
    const list = byExercise.get(raw.exercise_id) ?? [];
    list.push({ date, sets: raw.exercise_sets ?? [] });
    byExercise.set(raw.exercise_id, list);
  }

  const results: CardioSummary[] = [];
  for (const [exerciseId, entries] of byExercise) {
    const ex = exMap.get(exerciseId)!;
    const bp = bpMap.get(ex.body_part_id)!;
    entries.sort((a, b) => a.date.localeCompare(b.date));

    let bestDuration = 0;
    let bestDistance: number | null = null;
    for (const entry of entries) {
      for (const s of entry.sets) {
        if (s.duration_min && s.duration_min > bestDuration) bestDuration = s.duration_min;
        if (s.distance_km && (bestDistance === null || s.distance_km > bestDistance)) {
          bestDistance = s.distance_km;
        }
      }
    }

    const last = entries[entries.length - 1];
    results.push({
      exercise_id: exerciseId,
      exercise_name: ex.name,
      color_hex: bp.color_hex,
      bestDurationMin: bestDuration,
      bestDistanceKm: bestDistance,
      lastSessionLabel: last.sets[0] ? cardioLabel(last.sets[0]) : "",
      lastDate: last.date,
      sessionsCount: entries.length,
    });
  }

  results.sort((a, b) => b.lastDate.localeCompare(a.lastDate));
  return results;
}

export async function getCardioHistory(
  exerciseId: string
): Promise<CardioHistoryPoint[]> {
  const supabase = createClient();
  const { data: blocks, error } = await supabase
    .from("session_exercises")
    .select(
      "sessions!inner(session_date), exercise_sets(duration_min, distance_km, speed_kmh, incline_level, steps, speed_level)"
    )
    .eq("exercise_id", exerciseId);
  if (error) throw error;

  return ((blocks ?? []) as unknown as RawCardioBlockRow[])
    .map((b) => {
      const date = b.sessions?.session_date;
      const s = b.exercise_sets?.[0];
      if (!date || !s) return null;
      return {
        session_date: date,
        duration_min: s.duration_min ?? 0,
        label: cardioLabel(s),
      };
    })
    .filter((p): p is CardioHistoryPoint => !!p)
    .sort((a, b) => a.session_date.localeCompare(b.session_date));
}

