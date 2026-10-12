import { describe, expect, it } from 'vitest';
import { INGREDIENTS } from '../data/ingredients';
import { MEALS as LIBRARY } from '../data/meals';
import { FIXTURE_MEALS as MEALS } from '../test/fixtureMeals';
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
    expect(ids).not.toContain('lemon'); // optional
    expect(ids).not.toContain('garlic'); // optional
  });

  it('skips hand-added duplicates and hand-added items marked Already Have', () => {
    const items = buildGroceryList({
      lookup,
      statuses: { eggs: 'need', avocado: 'have' },
      selectedMeals: [],
      manualItems: [
        { id: 'manual-1', name: 'egg', section: 'dairy-eggs', checked: false, ingredientId: 'eggs' },
        { id: 'manual-2', name: 'Avocados', section: 'produce', checked: false, ingredientId: 'avocado' },
        { id: 'manual-3', name: 'Paper towels', section: 'other', checked: false },
        { id: 'manual-4', name: 'paper towel', section: 'other', checked: false },
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
  it('groups by store section in store order, alphabetized within', () => {
    const items = buildGroceryList({
      lookup,
      statuses: { spinach: 'need', eggs: 'need', broccoli: 'need', 'olive-oil': 'need' },
      selectedMeals: [],
    });
    const groups = groupGroceryList(items);
    expect(groups.map((g) => g.label)).toEqual(['Produce', 'Dairy & Eggs', 'Oils, Sauces & Condiments']);
    expect(groups[0].items.map((i) => i.name)).toEqual(['Broccoli', 'Spinach']);
  });

  it('puts items with an unknown or missing store section under Other', () => {
    const groups = groupGroceryList([
      { id: 'x', name: 'Mystery', section: 'not-a-section', checked: false, sources: ['added'], forMeals: [], extraNotes: [] },
      { id: 'y', name: 'Paper towels', section: 'other', checked: false, sources: ['added'], forMeals: [], extraNotes: [] },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ section: 'other', label: 'Other' });
    expect(groups[0].items.map((i) => i.name)).toEqual(['Mystery', 'Paper towels']);
  });
});

describe('tapped extras', () => {
  const bowl = meal('chickpea-quinoa-bowl');
  const salmonMeal = meal('sheet-pan-salmon');

  it('adds tapped optional extras and swaps with clear labels', () => {
    const items = buildGroceryList({
      lookup,
      statuses: {},
      selectedMeals: [bowl, salmonMeal],
      mealExtras: { 'chickpea-quinoa-bowl': ['feta-cheese'], 'sheet-pan-salmon': ['chicken-breast'] },
    });
    expect(items.find((i) => i.id === 'feta-cheese')).toMatchObject({
      sources: ['extra'],
      extraNotes: ['Optional for Chickpea Quinoa Bowl'],
    });
    expect(items.find((i) => i.id === 'chicken-breast')!.extraNotes).toEqual([
      'Swap option for Sheet-Pan Salmon, Sweet Potato & Broccoli',
    ]);
  });

  it('never adds untapped optional extras', () => {
    const items = buildGroceryList({ lookup, statuses: {}, selectedMeals: [bowl] });
    expect(items.map((i) => i.id)).not.toContain('feta-cheese');
    expect(items.map((i) => i.id)).not.toContain('tahini');
  });

  it('ignores extras for meals that are not selected, and extras already at home', () => {
    const items = buildGroceryList({
      lookup,
      statuses: { lemon: 'have' },
      selectedMeals: [bowl],
      mealExtras: { 'chickpea-quinoa-bowl': ['lemon'], 'sheet-pan-salmon': ['chicken-breast'] },
    });
    expect(items.map((i) => i.id)).not.toContain('lemon');
    expect(items.map((i) => i.id)).not.toContain('chicken-breast');
  });

  it('merges an extra with the same item needed by another meal', () => {
    const items = buildGroceryList({
      lookup,
      statuses: {},
      selectedMeals: [bowl, meal('lentil-vegetable-soup')],
      mealExtras: { 'chickpea-quinoa-bowl': ['lemon'] },
    });
    expect(items.filter((i) => i.id === 'lemon')).toHaveLength(1);
  });

  it('buys the swap instead of an avoided ingredient', () => {
    const items = buildGroceryList({ lookup, statuses: {}, selectedMeals: [salmonMeal], avoidIngredientIds: ['salmon'] });
    const ids = items.map((i) => i.id);
    expect(ids).toContain('chicken-breast');
    expect(ids).not.toContain('salmon');
  });
});

describe('grocery list from the real meal library', () => {
  const realLookup = createLookup(INGREDIENTS);
  const real = (id: string) => {
    const found = LIBRARY.find((m) => m.id === id);
    if (!found) throw new Error(`missing meal ${id}`);
    return found;
  };
  // Three representative picks: a breakfast, a snack and a dinner that share chickpeas.
  const picks = ['strawberry-overnight-oats', 'roasted-chickpeas-bell-pepper-strips', 'coconut-chickpea-spinach-curry-with-rice'].map(real);

  it('lists each needed ingredient once, grouped by store section, without optional extras', () => {
    const items = buildGroceryList({ lookup: realLookup, statuses: { milk: 'have', rice: 'have' }, selectedMeals: picks });
    const ids = items.map((i) => i.id).sort();
    expect(ids).toEqual(
      ['bell-peppers', 'chickpeas', 'coconut-milk', 'curry-powder', 'greek-yogurt', 'oats', 'spinach', 'strawberries'].sort(),
    );
    expect(items.find((i) => i.id === 'chickpeas')!.forMeals).toHaveLength(2);
    const groups = groupGroceryList(items);
    expect(groups.every((g) => g.label !== 'Other')).toBe(true);
    expect(groups.flatMap((g) => g.items)).toHaveLength(items.length);
  });

  it('adds a tapped optional extra, labelled for its meal', () => {
    const items = buildGroceryList({
      lookup: realLookup,
      statuses: {},
      selectedMeals: picks,
      mealExtras: { 'strawberry-overnight-oats': ['chia-seeds'] },
    });
    expect(items.find((i) => i.id === 'chia-seeds')!.extraNotes).toEqual(['Optional for Strawberry Overnight Oats']);
    expect(items.map((i) => i.id)).not.toContain('honey');
  });
});
