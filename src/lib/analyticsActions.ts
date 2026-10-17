import { AVOID_GROUPS } from '../data/avoidGroups';
import type { PlannerAction, PlannerState } from '../state/plannerReducer';
import type { AnalyticsEvent } from './analyticsSchema';

/**
 * Usage events implied by a planner action, worked out from the state before
 * and after it. Pure, so it's easy to test; PlannerContext sends the results.
 */
export function eventsForAction(prev: PlannerState, next: PlannerState, action: PlannerAction): AnalyticsEvent[] {
  const events: AnalyticsEvent[] = [];
  switch (action.type) {
    case 'choosePath':
      if (prev.path !== action.path) events.push({ name: 'path_chosen', value: action.path });
      break;
    case 'setIngredientStatus':
      // Adding foods in the kitchen; ticks on the Review step aren't counted as kitchen foods.
      if (action.status === 'have' && prev.currentStep === 'kitchen' && prev.ingredientStatuses[action.ingredientId] !== 'have') {
        events.push({ name: 'food_added', value: action.ingredientId });
      }
      break;
    case 'addCustomIngredient':
      if (action.status === 'have') events.push({ name: 'food_added', value: 'own' });
      break;
    case 'toggleStaple':
      if (!prev.staples.includes(action.ingredientId)) events.push({ name: 'staple_marked', value: action.ingredientId });
      break;
    case 'toggleMeal':
      events.push({ name: prev.selectedMealIds.includes(action.mealId) ? 'meal_removed' : 'meal_added', value: action.mealId });
      break;
    case 'toggleFavorite':
      if (!prev.favorites.includes(action.mealId)) events.push({ name: 'favorite_added', value: action.mealId });
      break;
    case 'toggleMealExtra':
      if (!(prev.mealExtras[action.mealId] ?? []).includes(action.ingredientId)) {
        events.push({ name: 'extra_added', value: action.ingredientId });
        if (!prev.selectedMealIds.includes(action.mealId)) events.push({ name: 'meal_added', value: action.mealId });
      }
      break;
    case 'updatePreferences': {
      if (!action.patch.avoidIngredientIds) break;
      const before = new Set(prev.preferences.avoidIngredientIds);
      const after = new Set(next.preferences.avoidIngredientIds);
      const added = [...after].filter((id) => !before.has(id));
      const groups = AVOID_GROUPS.filter(
        (g) => g.ingredientIds.every((id) => after.has(id)) && !g.ingredientIds.every((id) => before.has(id)),
      );
      const inGroups = new Set(groups.flatMap((g) => g.ingredientIds));
      for (const g of groups) events.push({ name: 'leave_out_group', value: g.id });
      for (const id of added) if (!inGroups.has(id)) events.push({ name: 'leave_out_food', value: id });
      break;
    }
    case 'addManualItem':
      events.push({ name: 'list_item_added' });
      break;
    case 'startNewWeek':
      events.push({ name: 'new_week' });
      break;
    case 'reset':
      events.push({ name: 'start_over' });
      break;
  }
  if (next.path && next.currentStep !== prev.currentStep && action.type !== 'reset') {
    events.push({ name: 'step_view', value: next.currentStep });
  }
  return events;
}
