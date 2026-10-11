import { describe, expect, it } from 'vitest';
import { createInitialState, hydrateState } from '../state/plannerReducer';
import { isAllMeals, toggleMealChoice } from './mealSelection';

describe('meal type selection', () => {
  it('starts on All meals for new users', () => {
    expect(isAllMeals(createInitialState().preferences.mealCategories)).toBe(true);
  });

  it('selecting a specific meal deselects All meals', () => {
    const next = toggleMealChoice([], 'dinner');
    expect(next).toEqual(['dinner']);
    expect(isAllMeals(next)).toBe(false);
  });

  it('allows several specific meals', () => {
    expect(toggleMealChoice(['dinner'], 'lunch')).toEqual(['dinner', 'lunch']);
  });

  it('selecting All meals clears individual selections', () => {
    expect(toggleMealChoice(['dinner', 'lunch'], 'all')).toEqual([]);
  });

  it('unticking the last specific meal falls back to All meals', () => {
    expect(isAllMeals(toggleMealChoice(['dinner'], 'dinner'))).toBe(true);
  });

  it('keeps meal preferences from previously saved plans', () => {
    expect(hydrateState({ version: 1, preferences: { mealCategories: ['breakfast', 'snack'] } }).preferences.mealCategories).toEqual([
      'breakfast',
      'snack',
    ]);
    expect(isAllMeals(hydrateState({ version: 1, preferences: { mealCategories: [] } }).preferences.mealCategories)).toBe(true);
  });
});
