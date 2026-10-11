import { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';
import { INGREDIENTS } from '../data/ingredients';
import { MEALS } from '../data/meals';
import { createLookup, type IngredientLookup } from '../lib/ingredients';
import { readJson, writeJson } from '../lib/storage';
import type { Ingredient, MealTemplate } from '../types';
import { hydrateState, plannerReducer, type PlannerAction, type PlannerState } from './plannerReducer';

export const STORAGE_KEY = 'healthy-hair-grocery-planner:v1';

interface PlannerContextValue {
  state: PlannerState;
  dispatch: Dispatch<PlannerAction>;
  /** Catalog + the user's custom ingredients. */
  allIngredients: Ingredient[];
  lookup: IngredientLookup;
  meals: MealTemplate[];
  selectedMeals: MealTemplate[];
}

const PlannerContext = createContext<PlannerContextValue | null>(null);

export function PlannerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(plannerReducer, undefined, () => hydrateState(readJson(STORAGE_KEY)));

  useEffect(() => {
    writeJson(STORAGE_KEY, state);
  }, [state]);

  const value = useMemo<PlannerContextValue>(() => {
    const allIngredients = [...INGREDIENTS, ...state.customIngredients];
    return {
      state,
      dispatch,
      allIngredients,
      lookup: createLookup(allIngredients),
      meals: MEALS,
      // Silently drops saved IDs for meals no longer in the library.
      selectedMeals: MEALS.filter((m) => state.selectedMealIds.includes(m.id)),
    };
  }, [state]);

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

export function usePlanner(): PlannerContextValue {
  const ctx = useContext(PlannerContext);
  if (!ctx) throw new Error('usePlanner must be used inside <PlannerProvider>');
  return ctx;
}
