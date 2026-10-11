import { useState } from 'react';
import { StepFooter } from '../components/StepFooter';
import { StepHeader } from '../components/StepHeader';
import { AVOID_GROUPS } from '../data/avoidGroups';
import { MEAL_CATEGORIES } from '../data/categories';
import { findIngredientByName, ingredientName } from '../lib/ingredients';
import { isAllMeals, toggleMealChoice, type MealChoice } from '../lib/mealSelection';
import { usePlanner } from '../state/PlannerContext';
import type { CookingStyle } from '../types';

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
  const { state, dispatch, allIngredients, lookup } = usePlanner();
  const prefs = state.preferences;
  const [avoidInput, setAvoidInput] = useState('');
  const [avoidMessage, setAvoidMessage] = useState('');
  const avoidSet = new Set(prefs.avoidIngredientIds);
  const update = (patch: Partial<typeof prefs>) => dispatch({ type: 'updatePreferences', patch });
  const next = () => dispatch({ type: 'goToStep', step: 1 });

  const chooseMeal = (choice: MealChoice) => update({ mealCategories: toggleMealChoice(prefs.mealCategories, choice) });

  const groupChecked = (ids: string[]) => ids.every((id) => avoidSet.has(id));
  const toggleGroup = (ids: string[]) => {
    const next = new Set(avoidSet);
    if (groupChecked(ids)) ids.forEach((id) => next.delete(id));
    else ids.forEach((id) => next.add(id));
    update({ avoidIngredientIds: [...next] });
  };
  // Show individual chips only for items not already covered by a ticked group.
  const coveredByGroup = new Set(AVOID_GROUPS.filter((g) => groupChecked(g.ingredientIds)).flatMap((g) => g.ingredientIds));
  const individuallyAvoided = prefs.avoidIngredientIds.filter((id) => !coveredByGroup.has(id));

  const addAvoid = () => {
    const name = avoidInput.trim();
    if (!name) return;
    const ingredient = findIngredientByName(name, allIngredients);
    if (!ingredient) {
      setAvoidMessage(`“${name}” isn’t in our ingredient list yet, so it won’t change the meal ideas.`);
      return;
    }
    if (!avoidSet.has(ingredient.id)) update({ avoidIngredientIds: [...prefs.avoidIngredientIds, ingredient.id] });
    setAvoidMessage(`Avoiding ${ingredient.name}.`);
    setAvoidInput('');
  };

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
          <p className="small muted">Select the meals you’d like ideas for.</p>
          <div className="choice-grid choice-grid--meals">
            <label className="choice">
              <input type="checkbox" checked={isAllMeals(prefs.mealCategories)} onChange={() => chooseMeal('all')} />
              <span>All meals</span>
            </label>
            {MEAL_CATEGORIES.map((category) => (
              <label key={category.id} className="choice">
                <input
                  type="checkbox"
                  checked={prefs.mealCategories.includes(category.id)}
                  onChange={() => chooseMeal(category.id)}
                />
                <span>{category.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="card">
          <legend>Anything you’re avoiding?</legend>
          <p className="small muted">
            Select any foods you don’t want included in your meal ideas. We’ll suggest alternatives when available.
          </p>
          <div className="choice-grid choice-grid--compact">
            {AVOID_GROUPS.map((group) => (
              <label key={group.id} className="choice">
                <input
                  type="checkbox"
                  checked={groupChecked(group.ingredientIds)}
                  onChange={() => toggleGroup(group.ingredientIds)}
                />
                <span>{group.label}</span>
              </label>
            ))}
          </div>

          <div className="avoid-add">
            <label htmlFor="avoid-input">Avoid a specific ingredient</label>
            <div className="inline-input">
              <input
                id="avoid-input"
                type="text"
                list="avoid-options"
                autoComplete="off"
                placeholder="e.g. mushrooms"
                value={avoidInput}
                onChange={(e) => {
                  setAvoidInput(e.target.value);
                  setAvoidMessage('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addAvoid();
                  }
                }}
              />
              <datalist id="avoid-options">
                {allIngredients.map((i) => (
                  <option key={i.id} value={i.name} />
                ))}
              </datalist>
              <button type="button" className="btn btn--secondary" onClick={addAvoid}>
                Add
              </button>
            </div>
            <p className="small" role="status" aria-live="polite">
              {avoidMessage}
            </p>
          </div>

          {individuallyAvoided.length > 0 && (
            <ul className="chip-list" aria-label="Ingredients you’re avoiding">
              {individuallyAvoided.map((id) => (
                <li key={id}>
                  <button
                    type="button"
                    className="chip chip--small chip--removable"
                    aria-label={`Stop avoiding ${ingredientName(lookup, id)}`}
                    onClick={() => update({ avoidIngredientIds: prefs.avoidIngredientIds.filter((x) => x !== id) })}
                  >
                    {ingredientName(lookup, id)} <span aria-hidden="true">✕</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="small muted">For allergies, always check product labels. This planner can’t guarantee ingredients are allergen-free.</p>
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
              How many people are you shopping for? <span className="muted">(optional)</span>
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
