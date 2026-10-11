import { describe, expect, it } from 'vitest';
import { INGREDIENTS } from '../data/ingredients';
import { MEALS } from '../data/meals';
import { buildGroceryList, groupGroceryList } from './groceryList';
import { createLookup } from './ingredients';
import { groceryListToText } from './format';

const lookup = createLookup(INGREDIENTS);
const meal = (id: string) => MEALS.find((m) => m.id === id)!;

describe('buildGroceryList', () => {
  it('combines chosen groceries with missing meal ingredients without duplicates', () => {
    const items = buildGroceryList({
      lookup,
      // broccoli is both chosen AND needed by both selected meals
      statuses: { broccoli: 'need', salmon: 'have' },
      selectedMeals: [meal('sheet-pan-salmon'), meal('tofu-veggie-stir-fry')],
    });
    const ids = items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((id) => id === 'broccoli')).toHaveLength(1);
    expect(ids.filter((id) => id === 'olive-oil')).toHaveLength(1);
    const broccoli = items.find((i) => i.id === 'broccoli')!;
    expect(broccoli.sources).toEqual(['chosen']);
  });

  it('records every selected meal that needs an item', () => {
    const items = buildGroceryList({
      lookup,
      statuses: {},
      selectedMeals: [meal('sheet-pan-salmon'), meal('tofu-veggie-stir-fry')],
    });
    expect(items.find((i) => i.id === 'broccoli')!.forMeals).toHaveLength(2);
  });

  it('excludes ingredients marked Already Have', () => {
    const items = buildGroceryList({
      lookup,
      statuses: { 'olive-oil': 'have', salmon: 'have', eggs: 'need' },
      selectedMeals: [meal('sheet-pan-salmon')],
    });
    const ids = items.map((i) => i.id);
    expect(ids).not.toContain('olive-oil');
    expect(ids).not.toContain('salmon');
    expect(ids).toEqual(expect.arrayContaining(['eggs', 'sweet-potatoes', 'broccoli']));
  });

  it('does not add optional ingredients or ones covered by an owned substitute', () => {
    const items = buildGroceryList({
      lookup,
      statuses: { 'chicken-breast': 'have' },
      selectedMeals: [meal('sheet-pan-salmon')],
    });
    const ids = items.map((i) => i.id);
    expect(ids).not.toContain('salmon'); // chicken substitutes
    expect(ids).not.toContain('lemons'); // optional
    expect(ids).not.toContain('garlic'); // optional
  });

  it('skips hand-added duplicates and hand-added items marked Already Have', () => {
    const items = buildGroceryList({
      lookup,
      statuses: { eggs: 'need', avocado: 'have' },
      selectedMeals: [],
      manualItems: [
        { id: 'manual-1', name: 'egg', category: 'proteins', checked: false, ingredientId: 'eggs' },
        { id: 'manual-2', name: 'Avocados', category: 'fats-extras', checked: false, ingredientId: 'avocado' },
        { id: 'manual-3', name: 'Paper towels', category: 'other', checked: false },
        { id: 'manual-4', name: 'paper towel', category: 'other', checked: false },
      ],
    });
    expect(items.map((i) => i.name).sort()).toEqual(['Eggs', 'Paper towels']);
  });

  it('applies user edits: rename, check off and remove', () => {
    const items = buildGroceryList({
      lookup,
      statuses: { eggs: 'need', spinach: 'need', kale: 'need' },
      selectedMeals: [],
      overrides: { eggs: { name: 'Free-range eggs', checked: true }, kale: { removed: true } },
    });
    expect(items.find((i) => i.id === 'eggs')).toMatchObject({ name: 'Free-range eggs', checked: true });
    expect(items.map((i) => i.id)).not.toContain('kale');
  });

  it('handles empty selections gracefully', () => {
    expect(buildGroceryList({ lookup, statuses: {}, selectedMeals: [] })).toEqual([]);
    expect(groupGroceryList([])).toEqual([]);
    expect(groceryListToText([])).toContain('empty');
  });
});

describe('groupGroceryList', () => {
  it('groups by category in display order, alphabetized within', () => {
    const items = buildGroceryList({
      lookup,
      statuses: { spinach: 'need', eggs: 'need', broccoli: 'need', 'olive-oil': 'need' },
      selectedMeals: [],
    });
    const groups = groupGroceryList(items);
    expect(groups.map((g) => g.label)).toEqual(['Proteins', 'Vegetables & Fruit', 'Fats & Extras']);
    expect(groups[1].items.map((i) => i.name)).toEqual(['Broccoli', 'Spinach']);
  });
});
