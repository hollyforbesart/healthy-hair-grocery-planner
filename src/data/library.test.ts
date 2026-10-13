import { describe, expect, it } from 'vitest';
import { matchKey } from '../lib/text';
import { AVOID_GROUPS } from './avoidGroups';
import { INGREDIENT_CATEGORIES, MEAL_CATEGORIES, STORE_SECTIONS, STORE_SECTION_IDS } from './categories';
import { INGREDIENTS } from './ingredients';
import { LEGACY_INGREDIENT_IDS } from './legacyIds';
import { MEALS } from './meals';

/**
 * Guards the meal library and ingredient catalog. If one of these fails
 * after editing the JSON files, the message names the meal or ingredient.
 */
const ingredientIds = new Set(INGREDIENTS.map((i) => i.id));
const foodGroups = new Set<string>(INGREDIENT_CATEGORIES.map((c) => c.id));
const mealCategories = new Set<string>(MEAL_CATEGORIES.map((c) => c.id));

describe('ingredient catalog', () => {
  it('has unique IDs', () => {
    expect(ingredientIds.size).toBe(INGREDIENTS.length);
  });

  it('gives every ingredient a name, a valid food group and a valid store section', () => {
    for (const i of INGREDIENTS) {
      expect(i.name.trim(), i.id).not.toBe('');
      expect(foodGroups.has(i.category), `${i.id} category "${i.category}"`).toBe(true);
      expect(STORE_SECTION_IDS.has(i.storeSection), `${i.id} storeSection "${i.storeSection}"`).toBe(true);
    }
  });

  it('never lets one name or alias point to two different ingredients', () => {
    const owner = new Map<string, string>();
    for (const i of INGREDIENTS) {
      for (const name of [i.name, ...(i.aliases ?? [])]) {
        const key = matchKey(name);
        const existing = owner.get(key);
        expect(existing === undefined || existing === i.id, `"${name}" is used by both ${existing} and ${i.id}`).toBe(true);
        owner.set(key, i.id);
      }
    }
  });

  it('has store sections with unique IDs, including the "other" catch-all', () => {
    expect(new Set(STORE_SECTIONS.map((s) => s.id)).size).toBe(STORE_SECTIONS.length);
    expect(STORE_SECTION_IDS.has('other')).toBe(true);
  });
});

describe('meal library', () => {
  it('has 100 meals with unique IDs and names', () => {
    expect(MEALS).toHaveLength(100);
    expect(new Set(MEALS.map((m) => m.id)).size).toBe(MEALS.length);
    expect(new Set(MEALS.map((m) => m.name.toLowerCase())).size).toBe(MEALS.length);
  });

  it('uses only valid meal categories', () => {
    for (const m of MEALS) expect(mealCategories.has(m.category), `${m.id} category "${m.category}"`).toBe(true);
  });

  it('only references ingredients that exist in the catalog', () => {
    for (const m of MEALS) {
      for (const id of [...m.requiredIngredients, ...m.optionalIngredients]) {
        expect(ingredientIds.has(id), `${m.id} → ${id}`).toBe(true);
      }
    }
  });

  it('gives every meal at least one required ingredient, with no repeats or required/optional overlap', () => {
    for (const m of MEALS) {
      expect(m.requiredIngredients.length, m.id).toBeGreaterThan(0);
      expect(new Set(m.requiredIngredients).size, `${m.id} repeats a required ingredient`).toBe(m.requiredIngredients.length);
      expect(new Set(m.optionalIngredients).size, `${m.id} repeats an optional ingredient`).toBe(m.optionalIngredients.length);
      const overlap = m.optionalIngredients.filter((id) => m.requiredIngredients.includes(id));
      expect(overlap, `${m.id} lists ${overlap.join(', ')} as both required and optional`).toEqual([]);
    }
  });

  it('contains no unreviewed prep times, instructions, swaps or dietary tags', () => {
    for (const m of MEALS) {
      expect(m.prepTimeMinutes, m.id).toBeUndefined();
      expect(m.instructions, m.id).toBeUndefined();
      expect(m.substitutions, m.id).toBeUndefined();
      expect(m.dietaryTags, m.id).toBeUndefined();
    }
  });

  it('keeps the two reviewed preparation notes', () => {
    const withNotes = MEALS.filter((m) => m.preparationNote).map((m) => m.id);
    expect(withNotes).toEqual(['banana-oat-pancakes-with-greek-yogurt', 'roasted-chickpeas-bell-pepper-strips']);
  });
});

describe('legacy ingredient IDs and avoid groups', () => {
  it('maps every merged ID to a current ingredient, and no merged ID is still in the catalog', () => {
    for (const [oldId, newId] of Object.entries(LEGACY_INGREDIENT_IDS)) {
      expect(ingredientIds.has(newId), `${oldId} → ${newId}`).toBe(true);
      expect(ingredientIds.has(oldId), `${oldId} should have been merged`).toBe(false);
    }
  });

  it('keeps every ingredient ID from the original catalog resolvable', () => {
    const original = [
      'black-beans', 'chicken-breast', 'chickpeas', 'cottage-cheese', 'eggs', 'greek-yogurt', 'ground-beef',
      'ground-turkey', 'lentils', 'salmon', 'sardines', 'shrimp', 'tempeh', 'tofu', 'tuna', 'brown-rice',
      'corn-tortillas', 'oats', 'potatoes', 'quinoa', 'sweet-potatoes', 'whole-grain-wraps', 'whole-wheat-bread',
      'whole-wheat-pasta', 'bananas', 'bell-peppers', 'berries', 'broccoli', 'carrots', 'cherry-tomatoes', 'cucumber',
      'garlic', 'kale', 'lemons', 'mushrooms', 'onions', 'spinach', 'zucchini', 'almonds', 'avocado', 'chia-seeds',
      'feta', 'ground-flaxseed', 'honey', 'hummus', 'olive-oil', 'peanut-butter', 'pumpkin-seeds', 'salsa',
      'soy-sauce', 'tahini', 'walnuts',
    ];
    for (const id of original) {
      expect(ingredientIds.has(LEGACY_INGREDIENT_IDS[id] ?? id), id).toBe(true);
    }
  });

  it('builds avoid groups only from existing ingredients', () => {
    for (const group of AVOID_GROUPS) {
      for (const id of group.ingredientIds) expect(ingredientIds.has(id), `${group.id} → ${id}`).toBe(true);
    }
  });
});

describe('avoidGroupsFor', () => {
  it('names the ticked groups that cover an ingredient', async () => {
    const { avoidGroupsFor } = await import('./avoidGroups');
    const dairy = AVOID_GROUPS.find((g) => g.id === 'dairy')!.ingredientIds;
    const nuts = AVOID_GROUPS.find((g) => g.id === 'nuts')!.ingredientIds;
    expect(avoidGroupsFor('basil-pesto', [...dairy])).toEqual(['Dairy']);
    expect(avoidGroupsFor('basil-pesto', [...dairy, ...nuts])).toEqual(['Dairy', 'Nuts & peanuts']);
    // Avoided on its own, not through a group.
    expect(avoidGroupsFor('basil-pesto', ['basil-pesto'])).toEqual([]);
  });
});

describe('meal photos', () => {
  it('only lists photos for meals that exist', async () => {
    const { default: photoIds } = await import('./library/meal-photos.json');
    for (const id of photoIds) expect(MEALS.some((m) => m.id === id), id).toBe(true);
    const files = Object.keys(import.meta.glob('../../public/meal-photos/*.webp')).map((f) => f.split('/').pop());
    for (const id of photoIds) expect(files, `missing photo file for ${id}`).toContain(`${id}.webp`);
    expect(files.length, 'every photo file should be listed in meal-photos.json').toBe(photoIds.length);
  });
});
