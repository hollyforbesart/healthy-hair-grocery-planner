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
});
