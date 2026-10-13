import { useState } from 'react';
import { AVOID_GROUPS } from '../data/avoidGroups';
import { findIngredientByName, ingredientName } from '../lib/ingredients';
import { usePlanner } from '../state/PlannerContext';

/**
 * "Foods to leave out": quick-pick groups plus specific ingredients. Meals
 * swap these out where they can, or are hidden.
 */
export function AvoidFoods() {
  const { state, dispatch, allIngredients, lookup } = usePlanner();
  const avoidIds = state.preferences.avoidIngredientIds;
  const [avoidInput, setAvoidInput] = useState('');
  const [avoidMessage, setAvoidMessage] = useState('');
  const avoidSet = new Set(avoidIds);
  const setAvoid = (ids: string[]) => dispatch({ type: 'updatePreferences', patch: { avoidIngredientIds: ids } });

  const groupChecked = (ids: string[]) => ids.every((id) => avoidSet.has(id));
  const toggleGroup = (ids: string[]) => {
    const next = new Set(avoidSet);
    if (groupChecked(ids)) ids.forEach((id) => next.delete(id));
    else ids.forEach((id) => next.add(id));
    setAvoid([...next]);
  };
  // Show individual chips only for items not already covered by a ticked group.
  const coveredByGroup = new Set(AVOID_GROUPS.filter((g) => groupChecked(g.ingredientIds)).flatMap((g) => g.ingredientIds));
  const individuallyAvoided = avoidIds.filter((id) => !coveredByGroup.has(id));

  const addAvoid = () => {
    const name = avoidInput.trim();
    if (!name) return;
    const ingredient = findIngredientByName(name, allIngredients);
    if (!ingredient) {
      setAvoidMessage(`“${name}” isn’t in our ingredient list yet, so it won’t change the meal ideas.`);
      return;
    }
    if (!avoidSet.has(ingredient.id)) setAvoid([...avoidIds, ingredient.id]);
    setAvoidMessage(`Leaving out ${ingredient.name}.`);
    setAvoidInput('');
  };

  return (
    <div className="avoid-foods">
      <p className="small muted">
        Pick anything nobody in your household eats. Meals use a swap where there is one; otherwise they’re hidden.
      </p>
      <div className="choice-grid choice-grid--compact">
        {AVOID_GROUPS.map((group) => (
          <label key={group.id} className="choice">
            <input type="checkbox" checked={groupChecked(group.ingredientIds)} onChange={() => toggleGroup(group.ingredientIds)} />
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
          Some foods, like noodles, granola and protein powder, vary by brand, so they aren’t in a group. Add them below
          if you need to leave them out.
        </p>
      </details>

      <div className="avoid-add">
        <label htmlFor="avoid-input">Leave out a specific food</label>
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
        <ul className="chip-list" aria-label="Foods you’re leaving out">
          {individuallyAvoided.map((id) => (
            <li key={id}>
              <button
                type="button"
                className="chip chip--small chip--removable"
                aria-label={`Stop leaving out ${ingredientName(lookup, id)}`}
                onClick={() => setAvoid(avoidIds.filter((x) => x !== id))}
              >
                {ingredientName(lookup, id)} <span aria-hidden="true">✕</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="small muted">For allergies, always check product labels. This planner can’t guarantee ingredients are allergen-free.</p>
    </div>
  );
}
