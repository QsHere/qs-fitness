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
