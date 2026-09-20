// The calendar dots use a simplified 2-colour scheme (upper vs lower body)
// per your request, while the day-detail sheet and logger still show the
// full per-body-part palette from the `body_parts` table untouched.
//
// Cardio doesn't cleanly fit "upper" or "lower", so it gets its own neutral
// grey dot rather than being forced into either bucket. Adjust the mapping
// below any time — it's the only place this logic lives.

export const CALENDAR_UPPER_COLOR = "#FF3B30"; // red
export const CALENDAR_LOWER_COLOR = "#0A84FF"; // blue
export const CALENDAR_OTHER_COLOR = "#8E8E93"; // grey (cardio / custom parts)

export const CALENDAR_GROUP_BY_BODY_PART: Record<string, string> = {
  Chest: CALENDAR_UPPER_COLOR,
  Back: CALENDAR_UPPER_COLOR,
  Shoulder: CALENDAR_UPPER_COLOR,
  Arm: CALENDAR_UPPER_COLOR,
  Abs: CALENDAR_UPPER_COLOR,
  "Lower Body": CALENDAR_LOWER_COLOR,
  Cardio: CALENDAR_OTHER_COLOR,
};

export function calendarColorForBodyPart(name: string): string {
  return CALENDAR_GROUP_BY_BODY_PART[name] ?? CALENDAR_OTHER_COLOR;
}

export const CALENDAR_LEGEND = [
  { label: "Upper body", color: CALENDAR_UPPER_COLOR },
  { label: "Lower body", color: CALENDAR_LOWER_COLOR },
  { label: "Cardio", color: CALENDAR_OTHER_COLOR },
];

// Display order for body-part sections on the Progress & PRs page and the
// day-detail sheet. Deliberately not the same as body_parts.sort_order in
// the database (that has Abs before Arm) - this is purely a UI ordering
// preference. Anything not in this list (custom body parts) sorts after,
// alphabetically.
export const BODY_PART_DISPLAY_ORDER = [
  "Chest",
  "Back",
  "Shoulder",
  "Arm",
  "Abs",
  "Cardio",
  "Lower Body",
];

export function bodyPartSortIndex(name: string): number {
  const i = BODY_PART_DISPLAY_ORDER.indexOf(name);
  return i === -1 ? 999 : i;
}
