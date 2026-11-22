import { useMemo, useState } from 'react';
import { RECIPES } from '../data/recipes';
import { useBackToClose } from '../hooks/useBackToClose';
import { matchMeal } from '../lib/matching';
import { usePlanner } from '../state/PlannerContext';
import { MealCard } from './MealCard';
import { RecipeView } from './RecipeView';
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
 * In preview, "See the recipe" shows the recipe in the same panel.
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

  const close = useBackToClose(onClose);
  // The recipe opens inside this same panel, with its own way back to the card.
  const [showRecipe, setShowRecipe] = useState(false);
  const recipe = meal ? RECIPES[meal.id] : undefined;

  if (!meal || !recommendation) return null;
  if (showRecipe && recipe) {
    return (
      <Sheet key="recipe" title={`${meal.name} recipe`} onClose={() => setShowRecipe(false)} backLabel="Back to the meal">
        <RecipeView name={meal.name} recipe={recipe} highIron={meal.highIron} />
      </Sheet>
    );
  }
  return (
    <Sheet key="card" title={meal.name} onClose={close} backLabel={backLabel}>
      <MealCard
        recommendation={recommendation}
        lookup={lookup}
        statuses={ingredientStatuses}
        selected={selectedMealIds.includes(meal.id)}
        extras={mealExtras[meal.id] ?? []}
        onToggle={() => dispatch({ type: 'toggleMeal', mealId: meal.id })}
        onToggleFavorite={() => dispatch({ type: 'toggleFavorite', mealId: meal.id })}
        onToggleExtra={(ingredientId) => dispatch({ type: 'toggleMealExtra', mealId: meal.id, ingredientId })}
        onOpenRecipe={() => setShowRecipe(true)}
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
