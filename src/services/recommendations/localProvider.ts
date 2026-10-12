import { compareMatches, matchMeal } from '../../lib/matching';
import type { MealRecommendation, RecommendationProvider, RecommendationRequest } from './types';

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/**
 * Synchronous core, exported for tests. Ranks purely on pantry fit (see
 * compareMatches); preparation time is not used. Meals that need an avoided
 * ingredient with no acceptable swap are left out.
 */
export function rankMeals({ meals, ingredientStatuses, preferences }: RecommendationRequest): MealRecommendation[] {
  const avoid = new Set(preferences.avoidIngredientIds);

  return meals
    .map((meal) => {
      const match = matchMeal(meal, ingredientStatuses, avoid);
      const reasons: string[] = [];
      if (match.required.length > 0 && match.haveCount === match.required.length) reasons.push('Everything is already at home');
      else if (match.haveCount > 0) reasons.push(`Uses ${plural(match.haveCount, 'ingredient')} you already have`);
      if (match.required.some((r) => r.avoided)) reasons.push('Includes a swap for foods you avoid');
      return { meal, match, reasons, name: meal.name };
    })
    .filter((r) => !r.match.blocked)
    .sort(compareMatches)
    .map(({ meal, match, reasons }) => ({ meal, match, reasons }));
}

/** Version 1 provider: rules-based matching against the local meal library. */
export const localRecommendationProvider: RecommendationProvider = {
  id: 'local-rules',
  recommend: async (request) => rankMeals(request),
};
