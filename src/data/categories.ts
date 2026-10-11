import type { GroceryCategoryId, MealCategory } from '../types';

export interface GroceryCategory {
  id: GroceryCategoryId;
  label: string;
}

/** Food groups used for ingredients in Step 2, in display order. */
export const INGREDIENT_CATEGORIES: GroceryCategory[] = [
  { id: 'proteins', label: 'Proteins' },
  { id: 'carbohydrates', label: 'Carbohydrates' },
  { id: 'produce', label: 'Vegetables & Fruit' },
  { id: 'fats-extras', label: 'Fats & Extras' },
];

/** Grocery list sections: the food groups plus a catch-all for hand-added items. */
export const GROCERY_CATEGORIES: GroceryCategory[] = [...INGREDIENT_CATEGORIES, { id: 'other', label: 'Other' }];

export const GROCERY_CATEGORY_LABELS: Record<GroceryCategoryId, string> = Object.fromEntries(
  GROCERY_CATEGORIES.map((c) => [c.id, c.label]),
) as Record<GroceryCategoryId, string>;

export const MEAL_CATEGORIES: { id: MealCategory; label: string }[] = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'snack', label: 'Snack' },
];

export const MEAL_CATEGORY_LABELS: Record<MealCategory, string> = Object.fromEntries(
  MEAL_CATEGORIES.map((c) => [c.id, c.label]),
) as Record<MealCategory, string>;
