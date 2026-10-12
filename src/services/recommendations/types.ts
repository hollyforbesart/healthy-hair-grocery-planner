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
  /** Meals the user hearted. */
  favorites?: string[];
  /** Meals chosen in the last couple of weeks (pushed down unless a favorite). */
  recentMealIds?: string[];
  /** Every meal chosen before (new-to-you meals win ties). */
  previouslyChosenIds?: string[];
}

export interface MealRecommendation {
  meal: MealTemplate;
  match: MealMatch;
  /** Short, factual reasons shown on the card (no health claims). */
  reasons: string[];
  isFavorite: boolean;
  /** Chosen in the last couple of weeks. */
  isRecent: boolean;
}

export interface RecommendationProvider {
  id: string;
  /** Returned in rank order, best first. */
  recommend(request: RecommendationRequest, options?: { signal?: AbortSignal }): Promise<MealRecommendation[]>;
}
