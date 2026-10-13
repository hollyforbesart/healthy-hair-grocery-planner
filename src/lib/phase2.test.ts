import { describe, expect, it } from 'vitest';
import { INGREDIENTS } from '../data/ingredients';
import { MEALS } from '../data/meals';
import { rankMeals } from '../services/recommendations/localProvider';
import type { MealTemplate, WeekPreferences } from '../types';
import { createLookup } from './ingredients';
import { previouslyChosenMealIds, recentMealIds } from './mealHistory';
import { mealMatchesQuery } from './mealSearch';
import { quickPicksByGroup } from './quickPicks';
import { buildReviewList } from './review';

const lookup = createLookup(INGREDIENTS);
const meal = (id: string) => MEALS.find((m) => m.id === id)!;
const prefs: WeekPreferences = { mealCategories: [], budget: '', householdSize: null, avoidIngredientIds: [] };

describe('meal history', () => {
  const history = [
    { date: '2026-10-05', mealIds: ['a', 'b'] },
    { date: '2026-09-20', mealIds: ['c'] },
  ];
  it('treats meals from the last 14 days as recent', () => {
    expect([...recentMealIds(history, '2026-10-12')].sort()).toEqual(['a', 'b']);
    expect([...recentMealIds(history, '2026-10-30')]).toEqual([]);
  });
  it('remembers everything chosen before', () => {
    expect([...previouslyChosenMealIds(history)].sort()).toEqual(['a', 'b', 'c']);
  });
});

describe('rotation in meal ideas', () => {
  const m = (id: string): MealTemplate => ({ id, name: id, category: 'dinner', requiredIngredients: ['eggs'], optionalIngredients: [] });
  const meals = [m('a'), m('b'), m('c'), m('d')];

  it('pushes recently chosen meals down, unless they are favorites', () => {
    const ranked = rankMeals({
      ingredients: INGREDIENTS,
      meals,
      ingredientStatuses: {},
      preferences: prefs,
      recentMealIds: ['a', 'b'],
      favorites: ['b'],
      previouslyChosenIds: ['a', 'b'],
    });
    expect(ranked.map((r) => r.meal.id)).toEqual(['c', 'd', 'b', 'a']);
    expect(ranked.find((r) => r.meal.id === 'a')!.reasons).toContain('You had this recently');
    expect(ranked.find((r) => r.meal.id === 'b')!.reasons).toContain('One of your favorites');
    expect(ranked.find((r) => r.meal.id === 'c')!.reasons).toContain('New to you');
  });

  it('still puts pantry fit before rotation among non-recent meals', () => {
    const ranked = rankMeals({
      ingredients: INGREDIENTS,
      meals: [m('x'), { ...m('y'), requiredIngredients: ['milk'] }],
      ingredientStatuses: { milk: 'have' },
      preferences: prefs,
      previouslyChosenIds: ['y'],
    });
    expect(ranked[0].meal.id).toBe('y');
  });
});

describe('meal search', () => {
  it('finds meals by name or by any ingredient name or other name', () => {
    const oats = meal('strawberry-overnight-oats');
    expect(mealMatchesQuery(oats, 'overnight', lookup)).toBe(true);
    expect(mealMatchesQuery(oats, 'strawberry', lookup)).toBe(true);
    expect(mealMatchesQuery(oats, 'chia', lookup)).toBe(true); // optional ingredient
    expect(mealMatchesQuery(oats, 'salmon', lookup)).toBe(false);
    expect(mealMatchesQuery(meal('roasted-chickpeas-bell-pepper-strips'), 'garbanzo', lookup)).toBe(true);
    expect(mealMatchesQuery(meal('roasted-chickpeas-bell-pepper-strips'), 'chick', lookup)).toBe(true);
  });
  it('matches the start of words, so "apple" does not find pineapple meals', () => {
    expect(mealMatchesQuery(meal('tropical-yogurt-bowl'), 'apple', lookup)).toBe(false);
    expect(mealMatchesQuery(meal('tropical-yogurt-bowl'), 'pineapple', lookup)).toBe(true);
    expect(mealMatchesQuery(meal('apple-peanut-butter'), 'apple', lookup)).toBe(true);
    expect(mealMatchesQuery(meal('apple-peanut-butter'), 'peanut butter', lookup)).toBe(true);
  });
  it('finds many meals for a common ingredient across the library', () => {
    expect(MEALS.filter((x) => mealMatchesQuery(x, 'spinach', lookup)).length).toBeGreaterThan(10);
  });
});

describe('review list', () => {
  const picks = [meal('strawberry-overnight-oats'), meal('coconut-chickpea-spinach-curry-with-rice')];

  it('lists every needed ingredient once, grouped by store section, ticked when already at home', () => {
    const groups = buildReviewList({ selectedMeals: picks, statuses: { milk: 'have' }, lookup });
    const items = groups.flatMap((g) => g.items);
    expect(items.map((i) => i.id).sort()).toEqual(
      ['chickpeas', 'coconut-milk', 'curry-powder', 'greek-yogurt', 'milk', 'oats', 'rice', 'spinach', 'strawberries'].sort(),
    );
    expect(items.find((i) => i.id === 'milk')!.have).toBe(true);
    expect(items.find((i) => i.id === 'oats')!.have).toBe(false);
    expect(groups[0].label).toBe('Produce');
  });

  it('includes tapped extras but not untapped optional ingredients', () => {
    const items = buildReviewList({
      selectedMeals: picks,
      statuses: {},
      lookup,
      mealExtras: { 'strawberry-overnight-oats': ['honey'] },
    }).flatMap((g) => g.items);
    expect(items.find((i) => i.id === 'honey')).toMatchObject({ optionalOnly: true });
    expect(items.map((i) => i.id)).not.toContain('chia-seeds');
  });

  it('is empty with no meals', () => {
    expect(buildReviewList({ selectedMeals: [], statuses: {}, lookup })).toEqual([]);
  });
});

describe('quick picks', () => {
  it('offers the most-used ingredients in each food group', () => {
    const picks = quickPicksByGroup(MEALS, INGREDIENTS);
    expect(picks.carbohydrates[0].id).toBe('rice');
    expect(picks.produce.map((i) => i.id)).toContain('spinach');
    for (const list of Object.values(picks)) expect(list.length).toBeLessThanOrEqual(8);
  });
});

describe('copied / shared list text', () => {
  it('starts with the week’s meals, budget and household when given', async () => {
    const { groceryListToText } = await import('./format');
    const text = groceryListToText([], { meals: ['Apple + Peanut Butter'], budget: '$80', householdSize: 3 });
    expect(text.split('\n').slice(0, 4)).toEqual(['Grocery List', 'Meals: Apple + Peanut Butter', 'Budget: $80', 'Shopping for 3']);
  });
  it('leaves out reminders that are empty', async () => {
    const { groceryListToText } = await import('./format');
    expect(groceryListToText([], { meals: [], budget: ' ' }).split('\n')[1]).toBe('');
  });
});
