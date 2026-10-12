import { useMemo } from 'react';
import { StepFooter } from '../components/StepFooter';
import { StepHeader } from '../components/StepHeader';
import { MEAL_CATEGORY_LABELS } from '../data/categories';
import { useStepNav } from '../hooks/useStepNav';
import { ingredientName } from '../lib/ingredients';
import { buildReviewList } from '../lib/review';
import { usePlanner } from '../state/PlannerContext';

/**
 * The "checkout": a summary of the chosen meals, then every ingredient they
 * need (once each, by store section) to tick off if it's already at home.
 * Anything left unticked goes on the grocery list.
 */
export function ReviewStep() {
  const { state, dispatch, lookup, selectedMeals } = usePlanner();
  const { goBack, goNext, go } = useStepNav();

  const groups = useMemo(
    () =>
      buildReviewList({
        selectedMeals,
        statuses: state.ingredientStatuses,
        lookup,
        mealExtras: state.mealExtras,
        avoidIngredientIds: state.preferences.avoidIngredientIds,
      }),
    [selectedMeals, state.ingredientStatuses, lookup, state.mealExtras, state.preferences.avoidIngredientIds],
  );
  const items = groups.flatMap((g) => g.items);
  const haveCount = items.filter((i) => i.have).length;
  const toBuy = items.length - haveCount;

  return (
    <section aria-labelledby="step-title">
      <StepHeader title="Review your plan">
        <p>Check your meals, then tick off anything you already have. Everything else goes on your grocery list.</p>
      </StepHeader>

      <section className="card review-meals" aria-labelledby="review-meals-title">
        <h3 id="review-meals-title">
          Your meals <span className="muted">({selectedMeals.length})</span>
        </h3>
        {selectedMeals.length === 0 ? (
          <div className="empty">
            <p>You haven’t picked any meals yet.</p>
            <button type="button" className="btn btn--secondary" onClick={() => go('meals')}>
              Find meal ideas
            </button>
          </div>
        ) : (
          <ul className="review-meals__list">
            {selectedMeals.map((meal) => {
              const extras = state.mealExtras[meal.id] ?? [];
              return (
                <li key={meal.id}>
                  <div>
                    <span className="review-meals__name">{meal.name}</span>
                    <span className="small muted">
                      {MEAL_CATEGORY_LABELS[meal.category]}
                      {extras.length > 0 && ` · plus ${extras.map((id) => ingredientName(lookup, id).toLowerCase()).join(', ')}`}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    aria-label={`Remove ${meal.name}`}
                    onClick={() => dispatch({ type: 'toggleMeal', mealId: meal.id })}
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {selectedMeals.length > 0 && (
          <button type="button" className="link-btn small" onClick={() => go('meals')}>
            + Add more meals
          </button>
        )}
      </section>

      {items.length > 0 && (
        <section className="card review-check" aria-labelledby="review-check-title">
          <h3 id="review-check-title">Tick off what you already have</h3>
          <p className="small muted" aria-live="polite">
            {items.length} ingredient{items.length === 1 ? '' : 's'} · {haveCount} already have · {toBuy} to buy
          </p>
          {groups.map((group) => (
            <fieldset key={group.section} className="review-group">
              <legend>{group.label}</legend>
              <ul>
                {group.items.map((item) => (
                  <li key={item.id}>
                    <label className={`review-item${item.have ? ' is-have' : ''}`}>
                      <input
                        type="checkbox"
                        checked={item.have}
                        onChange={(e) =>
                          dispatch({ type: 'setIngredientStatus', ingredientId: item.id, status: e.target.checked ? 'have' : null })
                        }
                      />
                      <span>
                        <span className="review-item__name">{item.name}</span>
                        <span className="review-item__for small muted">
                          {item.optionalOnly ? 'Optional extra · ' : ''}
                          {item.forMeals.join(', ')}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          ))}
        </section>
      )}

      <StepFooter
        onBack={goBack}
        onNext={goNext}
        nextLabel={toBuy > 0 ? `Build my grocery list (${toBuy})` : 'Build my grocery list'}
      />
    </section>
  );
}
