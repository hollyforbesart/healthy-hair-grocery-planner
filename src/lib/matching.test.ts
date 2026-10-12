import { describe, expect, it } from 'vitest';
import type { MealTemplate } from '../types';
import { matchMeal } from './matching';
import { rankMeals } from '../services/recommendations/localProvider';
import { INGREDIENTS } from '../data/ingredients';
import { FIXTURE_MEALS as MEALS } from '../test/fixtureMeals';

const bowl: MealTemplate = {
  id: 'bowl',
  name: 'Test Bowl',
  category: 'lunch',
  requiredIngredients: ['chickpeas', 'quinoa', 'cucumber'],
  optionalIngredients: ['feta-cheese', 'lemon'],
  substitutions: [{ ingredientId: 'quinoa', alternatives: ['rice'] }],
  prepTimeMinutes: 20,
  instructions: [],
};

describe('matchMeal', () => {
  it('reports owned and missing required ingredients', () => {
    const m = matchMeal(bowl, { chickpeas: 'have' });
    expect(m.haveCount).toBe(1);
    expect(m.missingIds).toEqual(['quinoa', 'cucumber']);
    expect(m.isComplete).toBe(false);
  });

  it('never counts optional ingredients as missing', () => {
    const m = matchMeal(bowl, { chickpeas: 'have', quinoa: 'have', cucumber: 'have' });
    expect(m.missingCount).toBe(0);
    expect(m.isComplete).toBe(true);
    expect(m.optional.map((o) => o.status)).toEqual(['not-have', 'not-have']);
    expect(m.missingIds).not.toContain('feta-cheese');
  });

  it('accepts an owned substitution for a required ingredient', () => {
    const m = matchMeal(bowl, { chickpeas: 'have', 'rice': 'have' });
    const quinoa = m.required.find((r) => r.ingredientId === 'quinoa');
    expect(quinoa).toEqual({ ingredientId: 'quinoa', status: 'have-substitute', substituteId: 'rice' });
    expect(m.missingIds).toEqual(['cucumber']);
  });

  it('treats ingredients marked Need to Buy as on the list, not as additional', () => {
    const m = matchMeal(bowl, { chickpeas: 'have', quinoa: 'need' });
    expect(m.onListCount).toBe(1);
    expect(m.missingIds).toEqual(['cucumber']);
  });

  it('matches regardless of which name the user searched (alias → standard ID)', async () => {
    const { findIngredientByName } = await import('./ingredients');
    const id = findIngredientByName('Garbanzo Beans', INGREDIENTS)?.id;
    expect(id).toBe('chickpeas');
    expect(matchMeal(bowl, { [id!]: 'have' }).haveCount).toBe(1);
  });
});

describe('rankMeals', () => {
  const base = { ingredients: INGREDIENTS, meals: MEALS };
  const prefs = { mealCategories: [], budget: '', householdSize: null, avoidIngredientIds: [] };

  it('puts meals needing fewer additional ingredients first', () => {
    const ranked = rankMeals({
      ...base,
      preferences: prefs,
      ingredientStatuses: { oats: 'have', 'greek-yogurt': 'have', berries: 'have' },
    });
    expect(ranked[0].meal.id).toBe('berry-overnight-oats');
    const missing = ranked.map((r) => r.match.missingCount);
    expect(missing).toEqual([...missing].sort((a, b) => a - b));
  });

});

describe('sample data integrity', () => {
  const ids = new Set(INGREDIENTS.map((i) => i.id));

  it('has unique ingredient IDs', () => {
    expect(ids.size).toBe(INGREDIENTS.length);
  });

  it('only references ingredient IDs that exist in the catalog', () => {
    for (const meal of MEALS) {
      const referenced = [
        ...meal.requiredIngredients,
        ...meal.optionalIngredients,
        ...(meal.substitutions ?? []).flatMap((s) => [s.ingredientId, ...s.alternatives]),
      ];
      for (const id of referenced) expect(ids, `${meal.id} → ${id}`).toContain(id);
    }
  });
});

describe('preparation time', () => {
  it('is never used for ranking', () => {
    const quick: MealTemplate = { id: 'a-quick', name: 'B quick', category: 'lunch', requiredIngredients: ['eggs'], optionalIngredients: [], prepTimeMinutes: 5 };
    const slow: MealTemplate = { id: 'a-slow', name: 'A slow', category: 'lunch', requiredIngredients: ['eggs'], optionalIngredients: [], prepTimeMinutes: 90 };
    const ranked = rankMeals({
      ingredients: INGREDIENTS,
      meals: [quick, slow],
      ingredientStatuses: {},
      preferences: { mealCategories: [], budget: '', householdSize: null, avoidIngredientIds: [] },
    });
    // Same pantry fit, so alphabetical — the 90-minute meal is not pushed down.
    expect(ranked.map((r) => r.meal.id)).toEqual(['a-slow', 'a-quick']);
  });
});

describe('pantry vs shopping list in ranking', () => {
  const meal = (id: string, required: string[]): MealTemplate => ({
    id,
    name: id,
    category: 'dinner',
    requiredIngredients: required,
    optionalIngredients: [],
    substitutions: [],
    prepTimeMinutes: 20,
    instructions: [],
  });
  const prefs = { mealCategories: [], budget: '', householdSize: null, avoidIngredientIds: [] };

  it('ranks a meal mostly at home above one that is all on the shopping list', () => {
    const allOnList = meal('all-on-list', ['a', 'b', 'c', 'd', 'e']);
    const mostlyHome = meal('mostly-home', ['f', 'g', 'h', 'i', 'j']);
    const ranked = rankMeals({
      ingredients: [],
      meals: [allOnList, mostlyHome],
      preferences: prefs,
      ingredientStatuses: { a: 'need', b: 'need', c: 'need', d: 'need', e: 'need', f: 'have', g: 'have', h: 'have', i: 'have' },
    });
    expect(ranked.map((r) => r.meal.id)).toEqual(['mostly-home', 'all-on-list']);
    expect(ranked[1].match).toMatchObject({ haveCount: 0, onListCount: 5, missingCount: 0 });
    expect(ranked[0].match).toMatchObject({ haveCount: 4, onListCount: 0, missingCount: 1 });
  });

  it('uses Already on list only to break ties between equal pantry matches', () => {
    const onList = meal('on-list', ['a', 'b']);
    const notPlanned = meal('not-planned', ['c', 'd']);
    const ranked = rankMeals({
      ingredients: [],
      meals: [notPlanned, onList],
      preferences: prefs,
      ingredientStatuses: { a: 'have', b: 'need', c: 'have' },
    });
    expect(ranked.map((r) => r.meal.id)).toEqual(['on-list', 'not-planned']);
  });
});

describe('avoided ingredients', () => {
  const salmon = MEALS.find((m) => m.id === 'sheet-pan-salmon')!;
  const soup = MEALS.find((m) => m.id === 'lentil-vegetable-soup')!;

  it('swaps an avoided required ingredient for an acceptable alternative', () => {
    const m = matchMeal(salmon, {}, new Set(['salmon']));
    const req = m.required.find((r) => r.ingredientId === 'salmon')!;
    expect(req).toMatchObject({ status: 'missing', substituteId: 'chicken-breast', avoided: true });
    expect(m.missingIds).toContain('chicken-breast');
    expect(m.missingIds).not.toContain('salmon');
  });

  it('prefers a swap the user already has, and skips swaps that are also avoided', () => {
    const m = matchMeal(salmon, { tofu: 'have' }, new Set(['salmon', 'chicken-breast']));
    expect(m.required.find((r) => r.ingredientId === 'salmon')).toMatchObject({ status: 'have-substitute', substituteId: 'tofu' });
  });

  it('blocks meals with an avoided ingredient that has no swap, and the provider hides them', () => {
    expect(matchMeal(soup, {}, new Set(['lentils']))).toMatchObject({ blocked: true, blockedBy: ['lentils'] });
    const ranked = rankMeals({
      ingredients: INGREDIENTS,
      meals: MEALS,
      ingredientStatuses: {},
      preferences: { mealCategories: [], budget: '', householdSize: null, avoidIngredientIds: ['lentils'] },
    });
    expect(ranked.map((r) => r.meal.id)).not.toContain('lentil-vegetable-soup');
  });

  it('offers swap options for households that eat differently', () => {
    const m = matchMeal(salmon, {});
    expect(m.swapOptions).toContainEqual({ ingredientId: 'salmon', alternatives: ['chicken-breast', 'tofu'] });
  });
});

describe('swap options when an ingredient is avoided', () => {
  it('still offers the other alternatives', () => {
    const salmon = MEALS.find((m) => m.id === 'sheet-pan-salmon')!;
    const m = matchMeal(salmon, {}, new Set(['salmon']));
    expect(m.swapOptions).toContainEqual({ ingredientId: 'salmon', alternatives: ['tofu'] });
  });
});
