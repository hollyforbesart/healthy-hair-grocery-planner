import type { MealMatch } from '../../lib/matching';
import type { Ingredient, IngredientStatusMap, MealTemplate, WeekPreferences } from '../../types';

/**
 * Everything a recommendation provider may use. A future AI provider receives
 * the same request, so the UI never needs to know which provider is active.
 */
export interface RecommendationRequest {
  preferences: WeekPreferences;
  ingredientStatuses: IngredientStatusMap;
  /** Catalog plus the user's custom ingredients. */
  ingredients: Ingredient[];
  /** Candidate meal templates. */
  meals: MealTemplate[];
}

export interface MealRecommendation {
  meal: MealTemplate;
  match: MealMatch;
  /** False when the meal takes longer than the user's stated time. */
  fitsTime: boolean;
  /** Short, factual reasons shown on the card (no health claims). */
  reasons: string[];
}

export interface RecommendationProvider {
  id: string;
  /** Returned in rank order, best first. */
  recommend(request: RecommendationRequest, options?: { signal?: AbortSignal }): Promise<MealRecommendation[]>;
}
