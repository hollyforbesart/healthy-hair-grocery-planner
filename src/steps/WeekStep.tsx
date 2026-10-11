import { StepFooter } from '../components/StepFooter';
import { StepHeader } from '../components/StepHeader';
import { MEAL_CATEGORIES } from '../data/categories';
import { usePlanner } from '../state/PlannerContext';
import type { CookingStyle, MealCategory } from '../types';

const STYLE_OPTIONS: { value: CookingStyle; label: string; hint: string }[] = [
  { value: 'quick', label: 'Quick & simple', hint: 'Mostly fast meals with little prep' },
  { value: 'batch', label: 'Batch cooking', hint: 'Cook once, eat a few times' },
  { value: 'mixed', label: 'A bit of both', hint: 'Some quick meals, some bigger cooks' },
];

const TIME_OPTIONS: { value: number; label: string }[] = [
  { value: 15, label: 'Up to 15 minutes' },
  { value: 30, label: 'Up to 30 minutes' },
  { value: 45, label: 'Up to 45 minutes' },
  { value: 0, label: 'No time limit' },
];

export function WeekStep() {
  const { state, dispatch } = usePlanner();
  const prefs = state.preferences;
  const update = (patch: Partial<typeof prefs>) => dispatch({ type: 'updatePreferences', patch });
  const next = () => dispatch({ type: 'goToStep', step: 1 });

  const toggleMealCategory = (category: MealCategory) =>
    update({
      mealCategories: prefs.mealCategories.includes(category)
        ? prefs.mealCategories.filter((c) => c !== category)
        : [...prefs.mealCategories, category],
    });

  return (
    <section aria-labelledby="step-title">
      <StepHeader step={1} title="Start with your week">
        <p>A few quick questions help us suggest meals that fit your week. Every question is optional.</p>
      </StepHeader>

      <form className="stack" onSubmit={(e) => { e.preventDefault(); next(); }}>
        <fieldset className="card">
          <legend>How do you like to cook this week?</legend>
          <div className="choice-grid">
            {STYLE_OPTIONS.map((option) => (
              <label key={option.value} className="choice">
                <input
                  type="radio"
                  name="cookingStyle"
                  checked={prefs.cookingStyle === option.value}
                  onChange={() => update({ cookingStyle: option.value })}
                />
                <span>
                  <strong>{option.label}</strong>
                  <span className="small muted block">{option.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="card">
          <legend>How much time do you usually have to cook a meal?</legend>
          <div className="choice-grid choice-grid--compact">
            {TIME_OPTIONS.map((option) => (
              <label key={option.label} className="choice">
                <input
                  type="radio"
                  name="maxPrepMinutes"
                  checked={prefs.maxPrepMinutes === option.value}
                  onChange={() => update({ maxPrepMinutes: option.value })}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="card">
          <legend>Which meals are you planning for?</legend>
          <p className="small muted">Leave all unticked to see every kind of meal.</p>
          <div className="choice-grid choice-grid--compact">
            {MEAL_CATEGORIES.map((category) => (
              <label key={category.id} className="choice">
                <input
                  type="checkbox"
                  checked={prefs.mealCategories.includes(category.id)}
                  onChange={() => toggleMealCategory(category.id)}
                />
                <span>{category.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="card field-row">
          <div className="field">
            <label htmlFor="budget">
              Grocery budget <span className="muted">(optional)</span>
            </label>
            <input
              id="budget"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="e.g. $100"
              value={prefs.budget}
              maxLength={40}
              onChange={(e) => update({ budget: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="household">
              People in your household <span className="muted">(optional)</span>
            </label>
            <input
              id="household"
              type="number"
              inputMode="numeric"
              min={1}
              max={20}
              placeholder="e.g. 2"
              value={prefs.householdSize ?? ''}
              onChange={(e) => {
                const n = Number.parseInt(e.target.value, 10);
                update({ householdSize: Number.isFinite(n) && n > 0 ? Math.min(n, 20) : null });
              }}
            />
          </div>
        </div>

        <StepFooter
          onNext={next}
          extra={
            <button type="button" className="btn btn--ghost" onClick={next}>
              Skip for now
            </button>
          }
        />
      </form>
    </section>
  );
}
