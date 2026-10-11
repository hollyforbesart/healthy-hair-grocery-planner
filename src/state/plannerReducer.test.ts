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
});
