import type { MealHistoryEntry } from '../types';

/** How long a chosen meal counts as "recent" and is pushed down the ideas. */
export const RECENT_DAYS = 14;

const dayNumber = (iso: string) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / 86_400_000);

/** Meals chosen in weeks closed within the last `days` days of `today` (YYYY-MM-DD). */
export function recentMealIds(history: MealHistoryEntry[], today: string, days = RECENT_DAYS): Set<string> {
  const now = dayNumber(today);
  const recent = new Set<string>();
  for (const entry of history) {
    const age = now - dayNumber(entry.date);
    if (Number.isFinite(age) && age >= 0 && age < days) entry.mealIds.forEach((id) => recent.add(id));
  }
  return recent;
}

/** Every meal the user has ever chosen (within the remembered weeks). */
export function previouslyChosenMealIds(history: MealHistoryEntry[]): Set<string> {
  return new Set(history.flatMap((e) => e.mealIds));
}
