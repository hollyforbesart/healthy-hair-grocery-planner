import { compareMatches, matchMeal } from '../../lib/matching';
import type { MealRecommendation, RecommendationProvider, RecommendationRequest } from './types';

/**
 * Synchronous core, exported for tests. Order:
 * 1. Meals chosen in the last couple of weeks go after the rest (favorites
 *    are exempt), so suggestions rotate.
 * 2. Pantry fit (see compareMatches) — fewest ingredients not at home.
 * 3. Meals the user has never chosen win ties.
 * Preparation time is not used. Meals that need an avoided ingredient with
 * no acceptable swap are left out.
 */
export function rankMeals({
  meals,
  ingredientStatuses,
  preferences,
  favorites = [],
  recentMealIds = [],
  previouslyChosenIds = [],
}: RecommendationRequest): MealRecommendation[] {
  const avoid = new Set(preferences.avoidIngredientIds);
  const favoriteSet = new Set(favorites);
  const recentSet = new Set(recentMealIds);
  const chosenBefore = new Set(previouslyChosenIds);

  return meals
    .map((meal) => {
      const match = matchMeal(meal, ingredientStatuses, avoid);
      const isFavorite = favoriteSet.has(meal.id);
      const isRecent = recentSet.has(meal.id);
      const reasons: string[] = [];
      // How much is at home is shown on the card itself ("You have 3 of 4"), so it isn't repeated here.
      if (match.required.some((r) => r.avoided)) reasons.push('Includes a swap for foods you avoid');
      if (isFavorite) reasons.push('One of your favorites');
      else if (isRecent) reasons.push('You had this recently');
      else if (chosenBefore.size > 0 && !chosenBefore.has(meal.id)) reasons.push('New to you');
      return { meal, match, reasons, isFavorite, isRecent, name: meal.name };
    })
    .filter((r) => !r.match.blocked)
    .sort((a, b) => {
      const demoted = (r: typeof a) => Number(r.isRecent && !r.isFavorite);
      const newToYou = (r: typeof a) => Number(!chosenBefore.has(r.meal.id));
      return (
        demoted(a) - demoted(b) ||
        a.match.missingCount + a.match.onListCount - (b.match.missingCount + b.match.onListCount) ||
        a.match.missingCount - b.match.missingCount ||
        newToYou(b) - newToYou(a) ||
        compareMatches(a, b)
      );
    })
    .map(({ meal, match, reasons, isFavorite, isRecent }) => ({ meal, match, reasons, isFavorite, isRecent }));
}

/** Version 1 provider: rules-based matching against the local meal library. */
export const localRecommendationProvider: RecommendationProvider = {
  id: 'local-rules',
  recommend: async (request) => rankMeals(request),
};
