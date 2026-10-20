import { goToRoute } from '../hooks/useRoute';
import { usePlanner } from '../state/PlannerContext';

/** "This week" reminder at the top of the grocery list: the chosen meals. */
export function PlanReminder() {
  const { selectedMeals } = usePlanner();
  return (
    <section className="card plan-reminder" aria-labelledby="plan-reminder-title">
      <h3 id="plan-reminder-title">This week</h3>
      {selectedMeals.length > 0 ? (
        <ul className="plan-reminder__meals">
          {selectedMeals.map((meal) => (
            <li key={meal.id}>{meal.name}</li>
          ))}
        </ul>
      ) : (
        <p className="small muted">No meals picked yet.</p>
      )}
      {selectedMeals.length > 0 && (
        <p className="plan-reminder__week no-print">
          <a
            href="/week"
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
              e.preventDefault();
              goToRoute('week');
            }}
          >
            Plan my week: put these on days →
          </a>
        </p>
      )}
    </section>
  );
}
