import type { MealTemplate } from '../types';
import type { IngredientLookup } from './ingredients';
import { matchKey, normalizeName } from './text';

/**
 * True when the query matches the start of a word in the meal's name or in
 * any of its ingredients' names or other names — so "garbanzo" finds chickpea
 * meals and "chick" finds chicken and chickpeas, but "apple" doesn't match
 * "pineapple".
 */
export function mealMatchesQuery(meal: MealTemplate, query: string, lookup: IngredientLookup): boolean {
  const q = normalizeName(query);
  if (!q) return true;
  const qKey = matchKey(query);
  const startsWord = (text: string, needle: string) => needle !== '' && ` ${text}`.includes(` ${needle}`);
  const hit = (text: string) => startsWord(normalizeName(text), q) || startsWord(matchKey(text), qKey);
  if (hit(meal.name)) return true;
  return [...meal.requiredIngredients, ...meal.optionalIngredients].some((id) => {
    const ingredient = lookup.get(id);
    return ingredient ? [ingredient.name, ...(ingredient.aliases ?? [])].some(hit) : false;
  });
}
