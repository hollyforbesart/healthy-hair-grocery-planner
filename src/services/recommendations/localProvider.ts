import { compareMatches, matchMeal } from '../../lib/matching';
import type { MealRecommendation, RecommendationProvider, RecommendationRequest } from './types';

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/**
 * Synchronous core, exported for tests. Meals that need an avoided
 * ingredient with no acceptable swap are left out.
 */
export function rankMeals({ meals, ingredientStatuses, preferences }: RecommendationRequest): MealRecommendation[] {
  const maxMinutes = preferences.maxPrepMinutes;
  const avoid = new Set(preferences.avoidIngredientIds);

  const scored = meals
    .map((meal) => {
      const match = matchMeal(meal, ingredientStatuses, avoid);
      const fitsTime = !maxMinutes || meal.prepTimeMinutes <= maxMinutes;
      const reasons: string[] = [];
      if (match.required.length > 0 && match.haveCount === match.required.length) reasons.push('Everything is already at home');
      else if (match.haveCount > 0) reasons.push(`Uses ${plural(match.haveCount, 'ingredient')} you already have`);
      if (match.required.some((r) => r.avoided)) reasons.push('Includes a swap for foods you avoid');
      if (!fitsTime) reasons.push(`Takes longer than your usual ${maxMinutes} minutes`);
      return { meal, match, fitsTime, reasons, name: meal.name };
    })
    .filter((r) => !r.match.blocked);

  // Pantry fit first; available time breaks ties before ingredient overlap.
  scored.sort((a, b) => {
    const notAtHome = (x: typeof a) => x.match.missingCount + x.match.onListCount;
    return (
      notAtHome(a) - notAtHome(b) ||
      a.match.missingCount - b.match.missingCount ||
      Number(b.fitsTime) - Number(a.fitsTime) ||
      compareMatches(a, b)
    );
  });

  return scored.map(({ meal, match, fitsTime, reasons }) => ({ meal, match, fitsTime, reasons }));
}

/** Version 1 provider: rules-based matching against the local meal library. */
export const localRecommendationProvider: RecommendationProvider = {
  id: 'local-rules',
  recommend: async (request) => rankMeals(request),
};
