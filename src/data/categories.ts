import type { FoodGroupId, Ingredient, KitchenGroupId, MealCategory, StoreSectionId } from '../types';
import storeSections from './library/store-sections.json';

/** Nutrition food groups, in display order. */
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

/** Groups on the "Your kitchen" step, in display order. */
export const KITCHEN_GROUPS: { id: KitchenGroupId; label: string; hint?: string }[] = [
  { id: 'produce', label: 'Fruits & vegetables' },
  { id: 'proteins', label: 'Proteins', hint: 'Meat, fish, beans, lentils & tofu' },
  { id: 'dairy-eggs', label: 'Dairy & eggs' },
  { id: 'grains', label: 'Grains, bread & pasta' },
  { id: 'pantry', label: 'Pantry & extras', hint: 'Nuts, seeds, oils, sauces, spices & canned goods' },
  { id: 'own', label: 'Your own items' },
];

export const KITCHEN_GROUP_IDS = new Set<string>(KITCHEN_GROUPS.map((g) => g.id));

export const kitchenGroupOf = (ingredient: Ingredient): KitchenGroupId =>
  ingredient.kitchenGroup ?? (ingredient.custom ? 'own' : 'pantry');

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
