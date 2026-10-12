import { useMemo, useState } from 'react';
import { IngredientPicker } from '../components/IngredientPicker';
import { StepFooter } from '../components/StepFooter';
import { StepHeader } from '../components/StepHeader';
import { FOOD_GROUP_LABELS, INGREDIENT_CATEGORIES } from '../data/categories';
import { useStepNav } from '../hooks/useStepNav';
import { createCustomIngredient, sortByName } from '../lib/ingredients';
import { quickPicksByGroup } from '../lib/quickPicks';
import { usePlanner } from '../state/PlannerContext';
import type { FoodGroupId, Ingredient } from '../types';

/**
 * "Use what I already have": people add what's in their kitchen by tapping a
 * quick pick or typing with suggestions, one section per food group. Adding
 * means "I have this"; what to buy is decided later on the Review step.
 */
export function KitchenStep() {
  const { state, dispatch, allIngredients, meals } = usePlanner();
  const { goBack, goNext } = useStepNav();
  const [message, setMessage] = useState('');

  const statuses = state.ingredientStatuses;
  const avoidIds = useMemo(() => new Set(state.preferences.avoidIngredientIds), [state.preferences.avoidIngredientIds]);
  const haveIds = useMemo(
    () => new Set(Object.entries(statuses).filter(([, s]) => s === 'have').map(([id]) => id)),
    [statuses],
  );
  const quickPicks = useMemo(() => quickPicksByGroup(meals, allIngredients), [meals, allIngredients]);
  const byGroup = useMemo(() => {
    const groups = {} as Record<FoodGroupId, Ingredient[]>;
    for (const { id } of INGREDIENT_CATEGORIES) groups[id] = allIngredients.filter((i) => i.category === id);
    return groups;
  }, [allIngredients]);

  const have = (ingredient: Ingredient) => {
    dispatch({ type: 'setIngredientStatus', ingredientId: ingredient.id, status: 'have' });
    setMessage(`Added ${ingredient.name}.`);
  };
  const remove = (ingredient: Ingredient) => {
    dispatch({ type: 'setIngredientStatus', ingredientId: ingredient.id, status: null });
    setMessage(`Removed ${ingredient.name}.`);
  };

  const addCustom = (name: string, group: FoodGroupId) => {
    const result = createCustomIngredient(name, group, allIngredients);
    if (result.ok) {
      dispatch({ type: 'addCustomIngredient', ingredient: result.ingredient, status: 'have' });
      setMessage(`Added ${result.ingredient.name} as your own item.`);
    } else if (result.reason === 'duplicate') {
      if (avoidIds.has(result.existing.id)) {
        setMessage(`You’re avoiding ${result.existing.name}. To include it, remove it from your avoid list on the Start step.`);
      } else {
        have(result.existing);
      }
    }
  };

  const total = haveIds.size;

  return (
    <section aria-labelledby="step-title">
      <StepHeader title="What’s in your kitchen?">
        <p>Tap the foods you have, or start typing to find others. You don’t need to add everything.</p>
      </StepHeader>

      {state.reviewingPantry && (
        <div className="notice" role="status">
          <p>
            <strong>New week — check your kitchen.</strong>{' '}
            {state.staples.length > 0
              ? 'Your staples (★) are already added. Ran out of one? Remove it and it’ll go on your list if a meal needs it.'
              : 'Add what you have on hand this week.'}
          </p>
        </div>
      )}

      <p className="small muted kitchen-hint">
        Tap ☆ on anything you always keep on hand — staples are added for you each new week.
      </p>

      <div className="kitchen-sections">
        {INGREDIENT_CATEGORIES.map(({ id: group, label }) => {
          const added = sortByName(byGroup[group].filter((i) => haveIds.has(i.id)));
          const picks = quickPicks[group].filter((i) => !haveIds.has(i.id) && !avoidIds.has(i.id));
          return (
            <section key={group} className="card kitchen-section" aria-labelledby={`kitchen-${group}`}>
              <h3 id={`kitchen-${group}`}>{label}</h3>
              <IngredientPicker
                label={label}
                options={byGroup[group]}
                selectedIds={haveIds}
                avoidIds={avoidIds}
                onPick={have}
                onAddCustom={(name) => addCustom(name, group)}
              />

              {added.length > 0 && (
                <ul className="chip-list kitchen-added" aria-label={`${label} you have`}>
                  {added.map((ingredient) => {
                    const isStaple = state.staples.includes(ingredient.id);
                    return (
                      <li key={ingredient.id} className="kitchen-chip">
                        <button
                          type="button"
                          className={`kitchen-chip__star${isStaple ? ' is-on' : ''}`}
                          aria-pressed={isStaple}
                          aria-label={`Staple: ${ingredient.name}`}
                          title={isStaple ? 'Staple — tap to unmark' : 'Mark as a staple'}
                          onClick={() => dispatch({ type: 'toggleStaple', ingredientId: ingredient.id })}
                        >
                          <span aria-hidden="true">{isStaple ? '★' : '☆'}</span>
                        </button>
                        <span className="kitchen-chip__name">{ingredient.name}</span>
                        <button
                          type="button"
                          className="kitchen-chip__remove"
                          aria-label={`Remove ${ingredient.name}`}
                          onClick={() => remove(ingredient)}
                        >
                          <span aria-hidden="true">✕</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {picks.length > 0 && (
                <div className="kitchen-picks">
                  <p className="kitchen-picks__label">Common {FOOD_GROUP_LABELS[group].toLowerCase()}</p>
                  <ul className="chip-list">
                    {picks.map((ingredient) => (
                      <li key={ingredient.id}>
                        <button type="button" className="chip chip--small" onClick={() => have(ingredient)}>
                          + {ingredient.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          );
        })}
      </div>

      <p className="small kitchen-status" role="status" aria-live="polite">
        {message}
      </p>

      <StepFooter
        onBack={goBack}
        onNext={goNext}
        nextLabel={total > 0 ? `See meal ideas using your ${total} food${total === 1 ? '' : 's'}` : 'See meal ideas'}
      />
    </section>
  );
}
