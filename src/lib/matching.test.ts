import { describe, expect, it } from 'vitest';
import type { MealTemplate } from '../types';
import { matchMeal } from './matching';
import { rankMeals } from '../services/recommendations/localProvider';
import { INGREDIENTS } from '../data/ingredients';
import { MEALS } from '../data/meals';

const bowl: MealTemplate = {
  id: 'bowl',
  name: 'Test Bowl',
  category: 'lunch',
  requiredIngredients: ['chickpeas', 'quinoa', 'cucumber'],
  optionalIngredients: ['feta', 'lemons'],
  substitutions: [{ ingredientId: 'quinoa', alternatives: ['brown-rice'] }],
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
    expect(m.missingIds).not.toContain('feta');
  });

  it('accepts an owned substitution for a required ingredient', () => {
    const m = matchMeal(bowl, { chickpeas: 'have', 'brown-rice': 'have' });
    const quinoa = m.required.find((r) => r.ingredientId === 'quinoa');
    expect(quinoa).toEqual({ ingredientId: 'quinoa', status: 'have-substitute', substituteId: 'brown-rice' });
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
  const prefs = { cookingStyle: null, maxPrepMinutes: null, mealCategories: [], budget: '', householdSize: null };

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

  it('flags meals longer than the available time', () => {
    const ranked = rankMeals({ ...base, preferences: { ...prefs, maxPrepMinutes: 15 }, ingredientStatuses: {} });
    const soup = ranked.find((r) => r.meal.id === 'lentil-vegetable-soup')!;
    expect(soup.fitsTime).toBe(false);
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
        ...meal.substitutions.flatMap((s) => [s.ingredientId, ...s.alternatives]),
      ];
      for (const id of referenced) expect(ids, `${meal.id} → ${id}`).toContain(id);
    }
  });
});

describe('time preference', () => {
  it('treats 0 as "no time limit"', () => {
    const ranked = rankMeals({
      ingredients: INGREDIENTS,
      meals: MEALS,
      ingredientStatuses: {},
      preferences: { cookingStyle: null, maxPrepMinutes: 0, mealCategories: [], budget: '', householdSize: null },
    });
    expect(ranked.every((r) => r.fitsTime)).toBe(true);
  });
});
