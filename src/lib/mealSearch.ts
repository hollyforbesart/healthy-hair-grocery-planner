import type { MealTemplate } from '../types';
import type { IngredientLookup } from './ingredients';
import { matchKey, normalizeName } from './text';

/**
 * True when the query appears in the meal's name or in any of its
 * ingredients' names or other names (so "garbanzo" finds chickpea meals).
 */
export function mealMatchesQuery(meal: MealTemplate, query: string, lookup: IngredientLookup): boolean {
  const q = normalizeName(query);
  if (!q) return true;
  const qKey = matchKey(query);
  const hit = (text: string) => normalizeName(text).includes(q) || matchKey(text).includes(qKey);
  if (hit(meal.name)) return true;
  return [...meal.requiredIngredients, ...meal.optionalIngredients].some((id) => {
    const ingredient = lookup.get(id);
    return ingredient ? [ingredient.name, ...(ingredient.aliases ?? [])].some(hit) : false;
  });
}
