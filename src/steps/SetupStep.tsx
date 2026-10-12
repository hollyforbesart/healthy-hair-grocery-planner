import { useState } from 'react';
import { StepFooter } from '../components/StepFooter';
import { StepHeader } from '../components/StepHeader';
import { AVOID_GROUPS } from '../data/avoidGroups';
import { MEAL_CATEGORIES } from '../data/categories';
import { findIngredientByName, ingredientName } from '../lib/ingredients';
import { isAllMeals, toggleMealChoice, type MealChoice } from '../lib/mealSelection';
import { useStepNav } from '../hooks/useStepNav';
import { usePlanner } from '../state/PlannerContext';
import type { PlannerPath } from '../types';

const PATHS: { value: PlannerPath; title: string; text: string }[] = [
  {
    value: 'pantry',
    title: 'Use what I already have',
    text: 'Tell us what’s in your kitchen and we’ll suggest meals that use it.',
  },
  {
    value: 'ideas',
    title: 'Help me find meal ideas',
    text: 'Browse meals, pick the ones you like, then tick off what you already have.',
  },
];

export function SetupStep() {
  const { state, dispatch, allIngredients, lookup } = usePlanner();
  const prefs = state.preferences;
  const [avoidInput, setAvoidInput] = useState('');
  const [avoidMessage, setAvoidMessage] = useState('');
  const avoidSet = new Set(prefs.avoidIngredientIds);
  const update = (patch: Partial<typeof prefs>) => dispatch({ type: 'updatePreferences', patch });
  const { goNext } = useStepNav();
  const next = () => {
    if (state.path) goNext?.();
  };

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
      <StepHeader title="How would you like to start?">
        <p>You can switch any time. Both ways end with one grocery list.</p>
      </StepHeader>

      <form className="stack" onSubmit={(e) => { e.preventDefault(); next(); }}>
        <fieldset className="path-picker">
          <legend className="visually-hidden">Choose how to start</legend>
          {PATHS.map((option) => (
            <label key={option.value} className={`path-card${state.path === option.value ? ' is-selected' : ''}`}>
              <input
                type="radio"
                name="path"
                checked={state.path === option.value}
                onChange={() => dispatch({ type: 'choosePath', path: option.value })}
              />
              <span>
                <strong className="path-card__title">{option.title}</strong>
                <span className="path-card__text">{option.text}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <h3 className="setup-subhead">A few optional details</h3>

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

          <details className="avoid-groups-help">
            <summary>What’s in each group?</summary>
            <dl>
              {AVOID_GROUPS.map((group) => (
                <div key={group.id}>
                  <dt>{group.label}</dt>
                  <dd>{group.ingredientIds.map((id) => ingredientName(lookup, id)).join(', ')}</dd>
                </div>
              ))}
            </dl>
            <p className="small muted">
              Some foods, like noodles, granola and protein powder, vary by brand, so they aren’t in a group. Add them
              below if you need to avoid them.
            </p>
          </details>

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

        {!state.path && (
          <p className="small muted setup-hint" role="status">
            Choose how you’d like to start to continue.
          </p>
        )}
        <StepFooter onNext={state.path ? next : undefined} />
      </form>
    </section>
  );
}
