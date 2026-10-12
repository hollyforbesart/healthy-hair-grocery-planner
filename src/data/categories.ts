import type { FoodGroupId, MealCategory, StoreSectionId } from '../types';
import storeSections from './library/store-sections.json';

/** Food groups for Step 2, in display order. */
export const INGREDIENT_CATEGORIES: { id: FoodGroupId; label: string }[] = [
  { id: 'proteins', label: 'Proteins' },
  { id: 'carbohydrates', label: 'Carbohydrates' },
  { id: 'produce', label: 'Vegetables & Fruit' },
  { id: 'fats-extras', label: 'Fats & Extras' },
];

export const FOOD_GROUP_LABELS = Object.fromEntries(INGREDIENT_CATEGORIES.map((c) => [c.id, c.label])) as Record<
  FoodGroupId,
  string
>;

/** Grocery-list sections in store-walking order (edit store-sections.json to change). */
export const STORE_SECTIONS: { id: StoreSectionId; label: string }[] = storeSections;

export const OTHER_SECTION: StoreSectionId = 'other';

export const STORE_SECTION_IDS = new Set(STORE_SECTIONS.map((s) => s.id));

/** Best-guess section for a user's own ingredient, from its food group. */
export const defaultStoreSection = (group: FoodGroupId): StoreSectionId =>
  group === 'produce' ? 'produce' : OTHER_SECTION;

export const MEAL_CATEGORIES: { id: MealCategory; label: string }[] = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'snack', label: 'Snack' },
];

export const MEAL_CATEGORY_LABELS: Record<MealCategory, string> = Object.fromEntries(
  MEAL_CATEGORIES.map((c) => [c.id, c.label]),
) as Record<MealCategory, string>;
