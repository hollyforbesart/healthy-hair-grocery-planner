import { useCallback, useState } from 'react';
import { goToRoute } from '../hooks/useRoute';
import { MealNameButton, MealSheet } from './MealSheet';
import { usePlanner } from '../state/PlannerContext';

/** "This week" reminder at the top of the grocery list: the chosen meals. */
export function PlanReminder() {
  const { selectedMeals } = usePlanner();
  const [openMealId, setOpenMealId] = useState<string | null>(null);
  const closeMeal = useCallback(() => setOpenMealId(null), []);
  return (
    <section className="card plan-reminder" aria-labelledby="plan-reminder-title">
      <h3 id="plan-reminder-title">This week</h3>
      {selectedMeals.length > 0 ? (
        <ul className="plan-reminder__meals">
          {selectedMeals.map((meal) => (
            <li key={meal.id}>
              <MealNameButton name={meal.name} onOpen={() => setOpenMealId(meal.id)} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="small muted">No meals picked yet.</p>
      )}
      {selectedMeals.length > 0 && (
        <p className="plan-reminder__week no-print">
          <a
            href="/schedule"
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
              e.preventDefault();
              goToRoute('week');
            }}
          >
            Schedule my meals: put them on days →
          </a>
        </p>
      )}
      {openMealId && <MealSheet mealId={openMealId} backLabel="Back to your list" onClose={closeMeal} />}
    </section>
  );
}
