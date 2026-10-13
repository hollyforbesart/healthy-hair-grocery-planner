import { usePlanner } from '../state/PlannerContext';

/**
 * "This week" reminder at the top of the grocery list: the chosen meals plus
 * an optional budget and household size. These are notes for the shopper
 * only — they don't change meal ideas or the list.
 */
export function PlanReminder() {
  const { state, dispatch, selectedMeals } = usePlanner();
  const { budget, householdSize } = state.preferences;
  const update = (patch: { budget?: string; householdSize?: number | null }) =>
    dispatch({ type: 'updatePreferences', patch });

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

      <div className="field-row plan-reminder__fields no-print">
        <div className="field">
          <label htmlFor="budget">
            Budget <span className="muted">(optional)</span>
          </label>
          <input
            id="budget"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="e.g. $100"
            value={budget}
            maxLength={40}
            onChange={(e) => update({ budget: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="household">
            People <span className="muted">(optional)</span>
          </label>
          <input
            id="household"
            type="number"
            inputMode="numeric"
            min={1}
            max={20}
            placeholder="e.g. 2"
            value={householdSize ?? ''}
            onChange={(e) => {
              const n = Number.parseInt(e.target.value, 10);
              update({ householdSize: Number.isFinite(n) && n > 0 ? Math.min(n, 20) : null });
            }}
          />
        </div>
      </div>

      {(budget || householdSize) && (
        <p className="print-only small">
          {[budget && `Budget: ${budget}`, householdSize && `Shopping for ${householdSize}`].filter(Boolean).join(' · ')}
        </p>
      )}
    </section>
  );
}
