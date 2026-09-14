import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function tempId() {
  return Math.random().toString(36).slice(2, 10);
}

export function toDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromDateKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatFriendlyDate(key: string) {
  const d = fromDateKey(key);
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function setVolume(set: {
  weight?: number | null;
  reps?: number | null;
}) {
  if (!set.weight || !set.reps) return 0;
  return set.weight * set.reps;
}

// The actual fix for "0kg on Captain Chair doesn't mean zero load" and
// "I added weight but did fewer reps, that's still progress": volume
// (weight x reps) can't tell these apart correctly. Estimated one-rep-max
// (Epley formula) can, because it estimates true strength rather than just
// multiplying two numbers - heavier weight for fewer reps correctly scores
// as equal-or-better than lighter weight for more reps, matching how
// strength actually works.
export function estimatedOneRepMax(weight: number, reps: number): number {
  if (!weight || weight <= 0 || !reps || reps <= 0) return 0;
  if (reps === 1) return weight;
  if (reps > 12) {
    // Epley drifts at high rep counts; cap the rep term it's built on.
    return weight * (1 + 12 / 30);
  }
  return weight * (1 + reps / 30);
}

// For exercises flagged is_bodyweight (sit-ups, captain-chair leg raises...),
// the "weight" you log is EXTRA load on top of your own bodyweight, not the
// total load - so 0kg means "just my bodyweight", not "no load". This adds
// your configured bodyweight back in so progress math reflects true load.
export function effectiveWeight(
  loggedWeight: number | null | undefined,
  isBodyweight: boolean,
  bodyweightKg: number | null
): number {
  const extra = loggedWeight ?? 0;
  return isBodyweight ? (bodyweightKg ?? 0) + extra : extra;
}
