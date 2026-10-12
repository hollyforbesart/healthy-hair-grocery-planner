import type { FoodGroupId, Ingredient, MealTemplate } from '../types';

/**
 * The ingredients most meals rely on, per food group — shown as one-tap
 * chips on the kitchen step so most people never need to type.
 */
export function quickPicksByGroup(
  meals: MealTemplate[],
  ingredients: Ingredient[],
  perGroup = 8,
): Record<FoodGroupId, Ingredient[]> {
  const uses = new Map<string, number>();
  for (const meal of meals) for (const id of meal.requiredIngredients) uses.set(id, (uses.get(id) ?? 0) + 1);
  const result = { proteins: [], carbohydrates: [], produce: [], 'fats-extras': [] } as Record<FoodGroupId, Ingredient[]>;
  const ranked = ingredients
    .filter((i) => !i.custom && (uses.get(i.id) ?? 0) > 0)
    .sort((a, b) => (uses.get(b.id) ?? 0) - (uses.get(a.id) ?? 0) || a.name.localeCompare(b.name));
  for (const ingredient of ranked) {
    const list = result[ingredient.category];
    if (list && list.length < perGroup) list.push(ingredient);
  }
  return result;
}
