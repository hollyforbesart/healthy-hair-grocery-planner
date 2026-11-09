import { useCallback, useEffect, useMemo } from 'react';
import { matchMeal } from '../lib/matching';
import { usePlanner } from '../state/PlannerContext';
import { MealCard } from './MealCard';
import { Sheet } from './Sheet';

interface MealSheetProps {
  mealId: string;
  /** Where the back button returns to, e.g. "Back to your plan". */
  backLabel: string;
  onClose: () => void;
}

/**
 * A meal's full card, opened from a meal name (Review, the grocery list).
 * It works like the card on Meal ideas, and the phone's back gesture closes it.
 */
export function MealSheet({ mealId, backLabel, onClose }: MealSheetProps) {
  const { state, dispatch, meals, lookup } = usePlanner();
  const meal = meals.find((m) => m.id === mealId);
  const { ingredientStatuses, preferences, selectedMealIds, mealExtras, favorites } = state;

  const recommendation = useMemo(() => {
    if (!meal) return null;
    const match = matchMeal(meal, ingredientStatuses, new Set(preferences.avoidIngredientIds));
    const reasons = match.required.some((r) => r.avoided) ? ['Includes a swap for foods you avoid'] : [];
    return { meal, match, reasons, isFavorite: favorites.includes(meal.id), isRecent: false };
  }, [meal, ingredientStatuses, preferences.avoidIngredientIds, favorites]);

  // An extra history entry while the card is open, so "back" closes the card
  // instead of leaving the planner.
  useEffect(() => {
    if (!(window.history.state as { mealSheet?: boolean } | null)?.mealSheet) {
      window.history.pushState({ ...(window.history.state ?? {}), mealSheet: true }, '');
    }
    window.addEventListener('popstate', onClose);
    return () => window.removeEventListener('popstate', onClose);
  }, [onClose]);
  const close = useCallback(() => window.history.back(), []);

  if (!meal || !recommendation) return null;
  return (
    <Sheet title={meal.name} onClose={close} backLabel={backLabel}>
      <MealCard
        recommendation={recommendation}
        lookup={lookup}
        statuses={ingredientStatuses}
        selected={selectedMealIds.includes(meal.id)}
        extras={mealExtras[meal.id] ?? []}
        onToggle={() => dispatch({ type: 'toggleMeal', mealId: meal.id })}
        onToggleFavorite={() => dispatch({ type: 'toggleFavorite', mealId: meal.id })}
        onToggleExtra={(ingredientId) => dispatch({ type: 'toggleMealExtra', mealId: meal.id, ingredientId })}
      />
    </Sheet>
  );
}

/** The button that opens a meal's card: looks like the plain meal name. */
export function MealNameButton({ name, onOpen }: { name: string; onOpen: () => void }) {
  return (
    <button type="button" className="meal-name-btn" onClick={onOpen}>
      {name}
      <span className="visually-hidden"> (see meal details)</span>
    </button>
  );
}
