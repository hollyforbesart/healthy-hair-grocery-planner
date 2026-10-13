import { defaultStoreSection } from '../data/categories';
import type { FoodGroupId, Ingredient } from '../types';
import { matchKey, normalizeName, slugify, tidyName } from './text';

export type IngredientLookup = Map<string, Ingredient>;

export function createLookup(ingredients: Ingredient[]): IngredientLookup {
  return new Map(ingredients.map((i) => [i.id, i]));
}

/** Display name for an ID, falling back to the raw ID for unknown entries. */
export function ingredientName(lookup: IngredientLookup, id: string): string {
  return lookup.get(id)?.name ?? id;
}

/**
 * Resolve a free-text name (or alias) to an ingredient.
 * "garbanzo beans" → chickpeas, "Tomato" → cherry-tomatoes.
 */
export function findIngredientByName(name: string, ingredients: Ingredient[]): Ingredient | undefined {
  const key = matchKey(name);
  if (!key) return undefined;
  return ingredients.find(
    (ingredient) =>
      matchKey(ingredient.name) === key || (ingredient.aliases ?? []).some((alias) => matchKey(alias) === key),
  );
}

export interface SearchResult {
  ingredient: Ingredient;
  /** Set when the query matched an alias rather than the name. */
  matchedAlias?: string;
}

export function searchIngredients(query: string, ingredients: Ingredient[]): SearchResult[] {
  const q = normalizeName(query);
  if (!q) return ingredients.map((ingredient) => ({ ingredient }));
  const qKey = matchKey(query);
  // Best first: exact name or other name ("milk" → Milk), then names starting with
  // the text, then words starting with it, then anywhere. Ties keep catalog order.
  const score = (text: string) => {
    const t = normalizeName(text);
    if (t === q || matchKey(text) === qKey) return 0;
    if (t.startsWith(q)) return 1;
    if (t.split(' ').some((word) => word.startsWith(q))) return 2;
    return 3;
  };
  const results: (SearchResult & { score: number })[] = [];
  for (const ingredient of ingredients) {
    const name = normalizeName(ingredient.name);
    if (name.includes(q) || matchKey(ingredient.name).includes(qKey)) {
      results.push({ ingredient, score: score(ingredient.name) });
      continue;
    }
    const alias = (ingredient.aliases ?? []).find(
      (a) => normalizeName(a).includes(q) || matchKey(a).includes(qKey),
    );
    if (alias) results.push({ ingredient, matchedAlias: alias, score: score(alias) });
  }
  return results.sort((a, b) => a.score - b.score).map(({ score: _score, ...result }) => result);
}

export function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

export type CustomIngredientResult =
  | { ok: true; ingredient: Ingredient }
  | { ok: false; reason: 'empty' }
  | { ok: false; reason: 'duplicate'; existing: Ingredient };

/**
 * Create a custom ingredient unless the name (or an alias) already exists.
 * Duplicates return the existing entry so the UI can point the user to it.
 */
export function createCustomIngredient(
  rawName: string,
  category: FoodGroupId,
  existing: Ingredient[],
): CustomIngredientResult {
  const name = tidyName(rawName);
  if (!slugify(name)) return { ok: false, reason: 'empty' };
  const duplicate = findIngredientByName(name, existing);
  if (duplicate) return { ok: false, reason: 'duplicate', existing: duplicate };

  const base = `custom-${slugify(name)}`;
  const ids = new Set(existing.map((i) => i.id));
  let id = base;
  for (let n = 2; ids.has(id); n += 1) id = `${base}-${n}`;

  const displayName = name.charAt(0).toUpperCase() + name.slice(1);
  return {
    ok: true,
    ingredient: { id, name: displayName, category, kitchenGroup: 'own', storeSection: defaultStoreSection(category), custom: true },
  };
}
