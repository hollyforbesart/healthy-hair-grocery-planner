import { RECIPES } from '../data/recipes';
import { useBackToClose } from '../hooks/useBackToClose';
import type { MealTemplate } from '../types';
import { RecipeView } from './RecipeView';
import { Sheet } from './Sheet';

/** A meal's full recipe in a panel, with a button (and the back gesture) to return. */
export function RecipeSheet({ meal, backLabel, onClose }: { meal: MealTemplate; backLabel: string; onClose: () => void }) {
  const close = useBackToClose(onClose);
  const recipe = RECIPES[meal.id];
  if (!recipe) return null;
  return (
    <Sheet title={`${meal.name} recipe`} onClose={close} backLabel={backLabel}>
      <RecipeView name={meal.name} recipe={recipe} highIron={meal.highIron} />
    </Sheet>
  );
}
