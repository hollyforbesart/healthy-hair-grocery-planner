import { matchMeal, type MealMatch } from '../../lib/matching';
import type { MealRecommendation, RecommendationProvider, RecommendationRequest } from './types';

/** Share of a meal's ingredients not at home (to buy, or already on the list). */
export const shareNotAtHome = (m: MealMatch) => (m.missingCount + m.onListCount) / Math.max(m.required.length, 1);

/**
 * Synchronous core, exported for tests. Order:
 * 1. Meals chosen in the last couple of weeks go after the rest (favorites
 *    are exempt), so suggestions rotate.
 * 2. Pantry fit: the smallest share of ingredients not at home, so a
 *    5-ingredient meal with 1 to buy beats a 2-ingredient snack with 1 to buy.
 * 3. Smallest share of new things to buy (items already on the list don't count).
 * 4. Meals the user has never chosen.
 * 5. Library order, as curated.
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
    .map((meal, index) => {
      const match = matchMeal(meal, ingredientStatuses, avoid);
      const isFavorite = favoriteSet.has(meal.id);
      const isRecent = recentSet.has(meal.id);
      const reasons: string[] = [];
      // How much is at home is shown on the card itself ("You have 3 of 4"), so it isn't repeated here.
      if (match.required.some((r) => r.avoided)) reasons.push('Includes a swap for foods you avoid');
      if (isFavorite) reasons.push('One of your favorites');
      else if (isRecent) reasons.push('You had this recently');
      else if (chosenBefore.size > 0 && !chosenBefore.has(meal.id)) reasons.push('New to you');
      return { meal, match, reasons, isFavorite, isRecent, index };
    })
    .filter((r) => !r.match.blocked)
    .sort((a, b) => {
      const demoted = (r: typeof a) => Number(r.isRecent && !r.isFavorite);
      const newToYou = (r: typeof a) => Number(!chosenBefore.has(r.meal.id));
      return (
        demoted(a) - demoted(b) ||
        shareNotAtHome(a.match) - shareNotAtHome(b.match) ||
        a.match.missingCount / Math.max(a.match.required.length, 1) - b.match.missingCount / Math.max(b.match.required.length, 1) ||
        newToYou(b) - newToYou(a) ||
        a.index - b.index
      );
    })
    .map(({ meal, match, reasons, isFavorite, isRecent }) => ({ meal, match, reasons, isFavorite, isRecent }));
}

/** Version 1 provider: rules-based matching against the local meal library. */
export const localRecommendationProvider: RecommendationProvider = {
  id: 'local-rules',
  recommend: async (request) => rankMeals(request),
};
