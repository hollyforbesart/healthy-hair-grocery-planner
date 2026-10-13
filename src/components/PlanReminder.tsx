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
    </section>
  );
}
