import { GROCERY_CATEGORIES } from '../data/categories';
import type {
  GroceryCategoryId,
  GroceryItemOverride,
  GroceryListItem,
  IngredientStatusMap,
  ManualGroceryItem,
  MealExtras,
  MealTemplate,
} from '../types';
import type { IngredientLookup } from './ingredients';
import { extraKind, matchMeal } from './matching';
import { matchKey } from './text';

export interface BuildGroceryListInput {
  statuses: IngredientStatusMap;
  selectedMeals: MealTemplate[];
  lookup: IngredientLookup;
  overrides?: Record<string, GroceryItemOverride>;
  manualItems?: ManualGroceryItem[];
  /** Optional extras / swaps tapped on meal cards (only used for selected meals). */
  mealExtras?: MealExtras;
  /** Ingredients the household avoids; meals use swaps for these. */
  avoidIngredientIds?: string[];
}

/**
 * Combine manually chosen groceries ("Need to Buy") with the missing required
 * ingredients of selected meals and any extras the user tapped for them.
 * De-duplicates by ingredient ID, never includes anything marked
 * "Already Have", then applies the user's edits.
 */
export function buildGroceryList({
  statuses,
  selectedMeals,
  lookup,
  overrides = {},
  manualItems = [],
  mealExtras = {},
  avoidIngredientIds = [],
}: BuildGroceryListInput): GroceryListItem[] {
  const byId = new Map<string, GroceryListItem>();
  const avoid = new Set(avoidIngredientIds);

  const upsert = (ingredientId: string, source: 'chosen' | 'meal' | 'extra', mealName?: string, note?: string) => {
    if (statuses[ingredientId] === 'have') return;
    let item = byId.get(ingredientId);
    if (!item) {
      const ingredient = lookup.get(ingredientId);
      item = {
        id: ingredientId,
        name: ingredient?.name ?? ingredientId,
        category: ingredient?.category ?? 'other',
        checked: false,
        sources: [],
        forMeals: [],
        extraNotes: [],
      };
      byId.set(ingredientId, item);
    }
    if (!item.sources.includes(source)) item.sources.push(source);
    if (mealName && !item.forMeals.includes(mealName)) item.forMeals.push(mealName);
    if (note && !item.extraNotes.includes(note)) item.extraNotes.push(note);
  };

  for (const [ingredientId, status] of Object.entries(statuses)) {
    if (status === 'need') upsert(ingredientId, 'chosen');
  }
  for (const meal of selectedMeals) {
    for (const id of matchMeal(meal, statuses, avoid).missingIds) upsert(id, 'meal', meal.name);
    for (const id of mealExtras[meal.id] ?? []) {
      const kind = extraKind(meal, id);
      if (!kind || avoid.has(id)) continue;
      upsert(id, 'extra', undefined, `${kind === 'optional' ? 'Optional for' : 'Swap option for'} ${meal.name}`);
    }
  }

  const items: GroceryListItem[] = [];
  for (const item of byId.values()) {
    const override = overrides[item.id];
    if (override?.removed) continue;
    items.push({
      ...item,
      name: override?.name?.trim() ? override.name.trim() : item.name,
      checked: override?.checked ?? false,
    });
  }

  // Hand-added items: skip anything already listed or marked "Already Have".
  const seenKeys = new Set(items.map((i) => matchKey(i.name)));
  const seenIds = new Set(items.map((i) => i.id));
  for (const manual of manualItems) {
    const key = matchKey(manual.name);
    if (!key || seenKeys.has(key)) continue;
    if (manual.ingredientId && (statuses[manual.ingredientId] === 'have' || seenIds.has(manual.ingredientId))) continue;
    seenKeys.add(key);
    if (manual.ingredientId) seenIds.add(manual.ingredientId);
    items.push({
      id: manual.id,
      name: manual.name,
      category: manual.category,
      checked: manual.checked,
      sources: ['added'],
      forMeals: [],
      extraNotes: [],
    });
  }

  return items;
}

export interface GroceryGroup {
  category: GroceryCategoryId;
  label: string;
  items: GroceryListItem[];
}

/** Group by grocery category in display order; empty groups are omitted. */
export function groupGroceryList(items: GroceryListItem[]): GroceryGroup[] {
  return GROCERY_CATEGORIES.map(({ id, label }) => ({
    category: id,
    label,
    items: items
      .filter((item) => item.category === id)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
  })).filter((group) => group.items.length > 0);
}

/** IDs of generated items the user removed, so they can be restored. */
export function removedItemIds(overrides: Record<string, GroceryItemOverride>): string[] {
  return Object.entries(overrides)
    .filter(([, o]) => o.removed)
    .map(([id]) => id);
}
