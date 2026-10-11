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
    expect(state.currentStep).toBe(2);
    expect(state.ingredientStatuses).toEqual({ eggs: 'have' });
    expect(state.selectedMealIds).toEqual(['berry-overnight-oats']);
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
    const state = hydrateState({ version: 1, preferences: { budget: '$50' } });
    expect(state.preferences).toMatchObject({ budget: '$50', avoidIngredientIds: [] });
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
    state = plannerReducer(state, { type: 'updatePreferences', patch: { budget: '$80', avoidIngredientIds: ['salmon'] } });
    state = plannerReducer(state, { type: 'toggleStaple', ingredientId: 'olive-oil' });
    state = plannerReducer(state, { type: 'toggleStaple', ingredientId: 'eggs' });
    state = plannerReducer(state, { type: 'setIngredientStatus', ingredientId: 'eggs', status: 'need' }); // ran out
    state = plannerReducer(state, { type: 'setIngredientStatus', ingredientId: 'spinach', status: 'have' });
    state = plannerReducer(state, { type: 'toggleMealExtra', mealId: 'chickpea-quinoa-bowl', ingredientId: 'feta' });
    state = plannerReducer(state, { type: 'updateGroceryItem', itemId: 'eggs', patch: { checked: true } });
    state = plannerReducer(state, { type: 'addManualItem', item: { id: 'm1', name: 'Tea', category: 'other', checked: false } });
    state = plannerReducer(state, { type: 'goToStep', step: 3 });

    state = plannerReducer(state, { type: 'startNewWeek' });
    expect(state.currentStep).toBe(1);
    expect(state.reviewingPantry).toBe(true);
    expect(state.preferences).toMatchObject({ budget: '$80', avoidIngredientIds: ['salmon'] });
    expect(state.staples).toEqual(['olive-oil', 'eggs']);
    // Staples start as "Already have" again; last week's other pantry items need re-checking.
    expect(state.ingredientStatuses).toEqual({ 'olive-oil': 'have', eggs: 'have' });
    expect(state.selectedMealIds).toEqual([]);
    expect(state.mealExtras).toEqual({});
    expect(state.groceryOverrides).toEqual({});
    expect(state.manualItems).toEqual([]);

    state = plannerReducer(state, { type: 'goToStep', step: 2 });
    expect(state.reviewingPantry).toBe(false);
  });

  it('does not pre-mark staples that are now avoided', () => {
    let state = plannerReducer(createInitialState(), { type: 'toggleStaple', ingredientId: 'tuna' });
    state = plannerReducer(state, { type: 'updatePreferences', patch: { avoidIngredientIds: ['tuna'] } });
    state = plannerReducer(plannerReducer(state, { type: 'startNewWeek' }), { type: 'goToStep', step: 1 });
    expect(state.ingredientStatuses).toEqual({});
  });
});
