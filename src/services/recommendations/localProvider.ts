import { compareMatches, matchMeal } from '../../lib/matching';
import type { MealRecommendation, RecommendationProvider, RecommendationRequest } from './types';

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** Synchronous core, exported for tests. */
export function rankMeals({ meals, ingredientStatuses, preferences }: RecommendationRequest): MealRecommendation[] {
  const maxMinutes = preferences.maxPrepMinutes;

  const scored = meals.map((meal) => {
    const match = matchMeal(meal, ingredientStatuses);
    const fitsTime = !maxMinutes || meal.prepTimeMinutes <= maxMinutes;
    const reasons: string[] = [];
    if (match.haveCount > 0) reasons.push(`Uses ${plural(match.haveCount, 'ingredient')} you have`);
    if (match.isComplete) reasons.push('Nothing extra to buy');
    if (!fitsTime) reasons.push(`Takes longer than your usual ${maxMinutes} minutes`);
    return { meal, match, fitsTime, reasons, name: meal.name };
  });

  // Fewest additional ingredients first; meals that fit the user's time
  // break ties before ingredient overlap does.
  scored.sort((a, b) => a.match.missingCount - b.match.missingCount || Number(b.fitsTime) - Number(a.fitsTime) || compareMatches(a, b));

  return scored.map(({ meal, match, fitsTime, reasons }) => ({ meal, match, fitsTime, reasons }));
}

/** Version 1 provider: rules-based matching against the local meal library. */
export const localRecommendationProvider: RecommendationProvider = {
  id: 'local-rules',
  recommend: async (request) => rankMeals(request),
};
