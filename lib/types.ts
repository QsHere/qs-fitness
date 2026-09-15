// Hand-written types matching supabase/schema.sql.
// If you change the schema, update these to match.

export type CardioField =
  | "speed_kmh"
  | "incline_level"
  | "distance_km"
  | "duration_min"
  | "steps"
  | "speed_level";

export interface LocationRow {
  id: string;
  name: string;
  is_default: boolean;
  created_at: string;
}

export interface BodyPartRow {
  id: string;
  name: string;
  color_hex: string;
  sort_order: number;
  is_cardio: boolean;
  is_custom: boolean;
  created_at: string;
}

export interface ExerciseRow {
  id: string;
  body_part_id: string;
  name: string;
  is_custom: boolean;
  is_bodyweight: boolean;
  cardio_fields: CardioField[] | null;
  created_at: string;
}

export interface SessionRow {
  id: string;
  session_date: string; // YYYY-MM-DD
  location_id: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionExerciseRow {
  id: string;
  session_id: string;
  exercise_id: string;
  body_part_id: string;
  order_index: number;
  notes: string | null;
  created_at: string;
}

export interface ExerciseSetRow {
  id: string;
  session_exercise_id: string;
  set_number: number;
  weight: number | null;
  unit: string | null;
  reps: number | null;
  duration_min: number | null;
  distance_km: number | null;
  speed_kmh: number | null;
  incline_level: number | null;
  steps: number | null;
  speed_level: number | null;
  notes: string | null;
  created_at: string;
}

// ---- Composite view types used across the UI -------------------------------

export interface SetDraft {
  set_number: number;
  weight?: number | null;
  reps?: number | null;
  duration_min?: number | null;
  distance_km?: number | null;
  speed_kmh?: number | null;
  incline_level?: number | null;
  steps?: number | null;
  speed_level?: number | null;
}

export interface ExerciseBlockDraft {
  tempId: string;
  body_part_id: string;
  exercise_id: string;
  exercise_name: string;
  is_cardio: boolean;
  cardio_fields: CardioField[] | null;
  notes: string;
  sets: SetDraft[];
}

export interface DayExerciseDetail {
  session_exercise_id: string;
  exercise_id: string;
  exercise_name: string;
  body_part_id: string;
  body_part_name: string;
  color_hex: string;
  is_cardio: boolean;
  cardio_fields: CardioField[] | null;
  notes: string | null;
  sets: ExerciseSetRow[];
}

export interface DaySessionDetail {
  session_id: string;
  session_date: string;
  location_id: string;
  location_name: string;
  notes: string | null;
  exercises: DayExerciseDetail[];
}

export interface CalendarDaySummary {
  date: string; // YYYY-MM-DD
  bodyPartColors: string[]; // distinct colours trained that day, in sort order
}

export interface OverviewStats {
  allTime: number;
  thisWeek: number;
}

// ---- Analytics / PR types --------------------------------------------------

export interface ExercisePRSummary {
  exercise_id: string;
  exercise_name: string;
  body_part_id: string;
  body_part_name: string;
  color_hex: string;
  is_bodyweight: boolean;
  usesEstimatedOneRepMax: boolean; // false when scored by reps instead (bodyweight, no bodyweight set)
  bestValue: number;
  bestUnit: "kg" | "reps";
  bestSetLabel: string;
  bestDate: string;
  isNewPR: boolean;
  trendDelta: number | null;
  sessionsCount: number;
}

export interface ExerciseHistoryPoint {
  session_date: string;
  value: number;
  setLabel: string;
  isAllTimeBestSoFar: boolean;
}

export interface ExerciseHistoryResult {
  exercise_id: string;
  exercise_name: string;
  color_hex: string;
  is_bodyweight: boolean;
  bodyweightKnown: boolean;
  usesEstimatedOneRepMax: boolean;
  unit: "kg" | "reps";
  points: ExerciseHistoryPoint[];
}

export interface CardioSummary {
  exercise_id: string;
  exercise_name: string;
  color_hex: string;
  bestDurationMin: number;
  bestDistanceKm: number | null;
  lastSessionLabel: string;
  lastDate: string;
  sessionsCount: number;
}

export interface CardioHistoryPoint {
  session_date: string;
  duration_min: number;
  label: string;
}


// Minimal Database type so @supabase/ssr generics don't complain.
// Not a full generated type — fine for this project's scope.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
