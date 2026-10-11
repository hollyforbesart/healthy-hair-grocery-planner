import type { MealCategory } from '../types';

/**
 * Meal-type selection for Step 1. An empty list means "All meals", which is
 * also how plans saved before this option existed are stored, so they keep
 * working unchanged.
 */
export type MealChoice = MealCategory | 'all';

export const isAllMeals = (selected: MealCategory[]) => selected.length === 0;

export function toggleMealChoice(selected: MealCategory[], choice: MealChoice): MealCategory[] {
  // Choosing "All meals" clears the individual selections.
  if (choice === 'all') return [];
  // Choosing a specific meal deselects "All meals"; unticking the last one
  // falls back to "All meals" rather than leaving nothing selected.
  return selected.includes(choice) ? selected.filter((c) => c !== choice) : [...selected, choice];
}
