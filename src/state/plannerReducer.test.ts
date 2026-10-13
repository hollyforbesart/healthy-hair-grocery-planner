import { describe, expect, it } from 'vitest';
import { createInitialState, hydrateState, plannerReducer } from './plannerReducer';

describe('hydrateState', () => {
  it('falls back to defaults for missing, corrupt or old saves', () => {
    expect(hydrateState(null)).toEqual(createInitialState());
    expect(hydrateState('nonsense')).toEqual(createInitialState());
    expect(hydrateState({ version: 0, currentStep: 3 })).toEqual(createInitialState());
  });

  it('keeps valid fields and drops invalid ones', () => {
    const state = hydrateState({
      version: 1,
      currentStep: 2,
      ingredientStatuses: { eggs: 'have', kale: 'maybe' },
      selectedMealIds: ['berry-overnight-oats', 42],
    });
    // Numbered steps from older saves map to named ones; those plans used the pantry path.
    expect(state.currentStep).toBe('meals');
    expect(state.path).toBe('pantry');
    expect(state.ingredientStatuses).toEqual({ eggs: 'have' });
    expect(state.selectedMealIds).toEqual(['berry-overnight-oats']);
  });

  it('moves plans saved on the old Start and Feedback screens to the right step', () => {
    expect(hydrateState({ version: 1, currentStep: 'setup', path: 'ideas' }).currentStep).toBe('meals');
    expect(hydrateState({ version: 1, currentStep: 'setup', path: 'pantry' }).currentStep).toBe('kitchen');
    expect(hydrateState({ version: 1, currentStep: 'feedback', path: 'ideas' }).currentStep).toBe('list');
    expect(hydrateState({ version: 1, currentStep: 4 }).currentStep).toBe('list');
    // The kitchen isn't part of the meal-ideas path.
    expect(hydrateState({ version: 1, currentStep: 'kitchen', path: 'ideas' }).currentStep).toBe('meals');
  });
});

describe('choosing a path', () => {
  it('starts at the first step of the path, or stays on a step both paths share', () => {
    const ideas = plannerReducer(createInitialState(), { type: 'choosePath', path: 'ideas' });
    expect(ideas.currentStep).toBe('meals');
    expect(plannerReducer(createInitialState(), { type: 'choosePath', path: 'pantry' }).currentStep).toBe('kitchen');
    expect(plannerReducer(ideas, { type: 'choosePath', path: 'pantry' }).currentStep).toBe('meals');
  });
});

describe('plannerReducer', () => {
  it('round-trips through hydrate unchanged', () => {
    let state = createInitialState();
    state = plannerReducer(state, { type: 'setIngredientStatus', ingredientId: 'eggs', status: 'have' });
    state = plannerReducer(state, { type: 'toggleMeal', mealId: 'berry-overnight-oats' });
    expect(hydrateState(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });

  it('clears an ingredient status when set to null', () => {
    let state = plannerReducer(createInitialState(), { type: 'setIngredientStatus', ingredientId: 'eggs', status: 'need' });
    state = plannerReducer(state, { type: 'setIngredientStatus', ingredientId: 'eggs', status: null });
    expect(state.ingredientStatuses).toEqual({});
  });

  it('tapping an extra adds the meal to the plan; removing the meal drops its extras', () => {
    let state = plannerReducer(createInitialState(), { type: 'toggleMealExtra', mealId: 'chickpea-quinoa-bowl', ingredientId: 'feta' });
    expect(state.selectedMealIds).toEqual(['chickpea-quinoa-bowl']);
    expect(state.mealExtras).toEqual({ 'chickpea-quinoa-bowl': ['feta'] });
    state = plannerReducer(state, { type: 'toggleMeal', mealId: 'chickpea-quinoa-bowl' });
    expect(state.selectedMealIds).toEqual([]);
    expect(state.mealExtras).toEqual({});
  });

  it('loads saves from before avoid lists and extras existed', () => {
    const state = hydrateState({ version: 1, preferences: { budget: '$50', householdSize: 2 } });
    // Budget and household size were removed; old saves simply drop them.
    expect(state.preferences).toEqual({ mealCategories: [], avoidIngredientIds: [] });
    expect(state.mealExtras).toEqual({});
  });

  it('avoiding a food clears any Have / Need to buy choice for it', () => {
    let state = plannerReducer(createInitialState(), { type: 'setIngredientStatus', ingredientId: 'salmon', status: 'need' });
    state = plannerReducer(state, { type: 'setIngredientStatus', ingredientId: 'eggs', status: 'have' });
    state = plannerReducer(state, { type: 'updatePreferences', patch: { avoidIngredientIds: ['salmon'] } });
    expect(state.ingredientStatuses).toEqual({ eggs: 'have' });
  });

  it('loads feedback drafts saved before the "helpful" question existed', () => {
    expect(hydrateState({ version: 1, feedback: { rating: 5, wish: 'More meals' } }).feedback).toEqual({
      rating: 5,
      helpful: '',
      wish: 'More meals',
    });
  });

  it('marking a staple also marks it Already have (without overriding Need to buy)', () => {
    let state = plannerReducer(createInitialState(), { type: 'toggleStaple', ingredientId: 'olive-oil' });
    expect(state.staples).toEqual(['olive-oil']);
    expect(state.ingredientStatuses['olive-oil']).toBe('have');
    state = plannerReducer(state, { type: 'setIngredientStatus', ingredientId: 'garlic', status: 'need' });
    state = plannerReducer(state, { type: 'toggleStaple', ingredientId: 'garlic' });
    expect(state.ingredientStatuses.garlic).toBe('need');
    state = plannerReducer(state, { type: 'toggleStaple', ingredientId: 'olive-oil' });
    expect(state.staples).toEqual(['garlic']);
  });

  it('starting a new week keeps preferences and staples, clears the rest of the plan', () => {
    let state = createInitialState();
    state = plannerReducer(state, { type: 'updatePreferences', patch: { mealCategories: ['dinner'], avoidIngredientIds: ['salmon'] } });
    state = plannerReducer(state, { type: 'toggleStaple', ingredientId: 'olive-oil' });
    state = plannerReducer(state, { type: 'toggleStaple', ingredientId: 'eggs' });
    state = plannerReducer(state, { type: 'setIngredientStatus', ingredientId: 'eggs', status: 'need' }); // ran out
    state = plannerReducer(state, { type: 'setIngredientStatus', ingredientId: 'spinach', status: 'have' });
    state = plannerReducer(state, { type: 'toggleMealExtra', mealId: 'chickpea-quinoa-bowl', ingredientId: 'feta' });
    state = plannerReducer(state, { type: 'updateGroceryItem', itemId: 'eggs', patch: { checked: true } });
    state = plannerReducer(state, { type: 'addManualItem', item: { id: 'm1', name: 'Tea', section: 'other', checked: false } });
    state = plannerReducer(state, { type: 'goToStep', step: 'list' });

    state = plannerReducer(state, { type: 'startNewWeek', today: '2026-10-12' });
    expect(state.currentStep).toBe('kitchen');
    expect(state.mealHistory).toEqual([{ date: '2026-10-12', mealIds: ['chickpea-quinoa-bowl'] }]);
    expect(state.reviewingPantry).toBe(true);
    expect(state.preferences).toMatchObject({ mealCategories: ['dinner'], avoidIngredientIds: ['salmon'] });
    expect(state.staples).toEqual(['olive-oil', 'eggs']);
    // Staples start as "Already have" again; last week's other pantry items need re-checking.
    expect(state.ingredientStatuses).toEqual({ 'olive-oil': 'have', eggs: 'have' });
    expect(state.selectedMealIds).toEqual([]);
    expect(state.mealExtras).toEqual({});
    expect(state.groceryOverrides).toEqual({});
    expect(state.manualItems).toEqual([]);

    state = plannerReducer(state, { type: 'goToStep', step: 'meals' });
    expect(state.reviewingPantry).toBe(false);
  });

  it('does not pre-mark staples that are now avoided', () => {
    let state = plannerReducer(createInitialState(), { type: 'toggleStaple', ingredientId: 'tuna' });
    state = plannerReducer(state, { type: 'updatePreferences', patch: { avoidIngredientIds: ['tuna'] } });
    state = plannerReducer(plannerReducer(state, { type: 'startNewWeek' }), { type: 'goToStep', step: 'kitchen' });
    expect(state.ingredientStatuses).toEqual({});
  });

  it('moves a plan saved under the old catalog onto the current ingredient IDs', () => {
    const state = hydrateState({
      version: 1,
      currentStep: 3,
      preferences: { maxPrepMinutes: 30, mealCategories: ['dinner'], avoidIngredientIds: ['tuna', 'kale'] },
      ingredientStatuses: { bananas: 'have', lemons: 'need', banana: 'need', berries: 'have', eggs: 'have' },
      staples: ['brown-rice', 'olive-oil'],
      selectedMealIds: ['sheet-pan-salmon'],
      mealExtras: { 'chickpea-quinoa-bowl': ['feta', 'lemons'] },
      groceryOverrides: { lemons: { name: 'Lemons (3)' }, 'rolled-oats': { removed: true } },
      manualItems: [
        { id: 'm1', name: 'Paper towels', category: 'other', checked: true },
        { id: 'm2', name: 'Kiwi', category: 'produce', checked: false },
        { id: 'm3', name: 'Tuna steak', category: 'proteins', checked: false, ingredientId: 'tuna' },
      ],
      customIngredients: [{ id: 'custom-dragon-fruit', name: 'Dragon fruit', category: 'produce', custom: true }],
    });
    // Current IDs win over old ones when a plan has both (banana).
    expect(state.ingredientStatuses).toEqual({ banana: 'need', eggs: 'have', lemon: 'need', 'mixed-berries': 'have' });
    expect(state.preferences.avoidIngredientIds).toEqual(['canned-tuna', 'kale']);
    expect(state.preferences).not.toHaveProperty('maxPrepMinutes');
    expect(state.staples).toEqual(['rice', 'olive-oil']);
    expect(state.mealExtras).toEqual({ 'chickpea-quinoa-bowl': ['feta-cheese', 'lemon'] });
    expect(state.groceryOverrides).toEqual({ lemon: { name: 'Lemons (3)' }, oats: { removed: true } });
    expect(state.manualItems.map((i) => [i.section, i.ingredientId])).toEqual([
      ['other', undefined],
      ['produce', undefined],
      ['other', 'canned-tuna'],
    ]);
    expect(state.customIngredients[0]).toMatchObject({ category: 'produce', storeSection: 'produce' });
    // Meals that are no longer in the library are kept but simply don't resolve.
    expect(state.selectedMealIds).toEqual(['sheet-pan-salmon']);
  });

  it('starting a new week on the meal-ideas path goes back to the meal ideas', () => {
    let state = plannerReducer(createInitialState(), { type: 'choosePath', path: 'ideas' });
    state = plannerReducer(state, { type: 'startNewWeek' });
    expect(state.currentStep).toBe('meals');
  });

  it('keeps a limited history of past weeks, newest first, and skips empty weeks', () => {
    let state = createInitialState();
    for (let week = 1; week <= 10; week += 1) {
      state = plannerReducer(state, { type: 'toggleMeal', mealId: `meal-${week}` });
      state = plannerReducer(state, { type: 'startNewWeek', today: `2026-01-${String(week).padStart(2, '0')}` });
    }
    state = plannerReducer(state, { type: 'startNewWeek', today: '2026-01-20' }); // nothing chosen
    expect(state.mealHistory).toHaveLength(8);
    expect(state.mealHistory[0]).toEqual({ date: '2026-01-10', mealIds: ['meal-10'] });
  });

  it('toggles favorites', () => {
    let state = plannerReducer(createInitialState(), { type: 'toggleFavorite', mealId: 'a' });
    expect(state.favorites).toEqual(['a']);
    state = plannerReducer(state, { type: 'toggleFavorite', mealId: 'a' });
    expect(state.favorites).toEqual([]);
  });

  it('saves and reloads path, favorites and history', () => {
    let state = plannerReducer(createInitialState(), { type: 'choosePath', path: 'ideas' });
    state = plannerReducer(state, { type: 'toggleFavorite', mealId: 'a' });
    state = plannerReducer(state, { type: 'toggleMeal', mealId: 'b' });
    state = plannerReducer(state, { type: 'startNewWeek', today: '2026-10-12' });
    state = plannerReducer(state, { type: 'goToStep', step: 'review' });
    expect(hydrateState(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });
});
