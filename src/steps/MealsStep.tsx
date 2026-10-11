import { useMemo, useState } from 'react';
import { MealCard } from '../components/MealCard';
import { StepFooter } from '../components/StepFooter';
import { StepHeader } from '../components/StepHeader';
import { MEAL_CATEGORIES } from '../data/categories';
import { useRecommendations } from '../hooks/useRecommendations';
import { recommendationProvider, type RecommendationRequest } from '../services/recommendations';
import { usePlanner } from '../state/PlannerContext';
import type { MealCategory } from '../types';

export function MealsStep() {
  const { state, dispatch, allIngredients, meals, lookup } = usePlanner();
  const { preferences, ingredientStatuses, selectedMealIds, mealExtras } = state;
  const [filter, setFilter] = useState<MealCategory[]>(preferences.mealCategories);

  const request = useMemo<RecommendationRequest>(
    () => ({ preferences, ingredientStatuses, ingredients: allIngredients, meals }),
    [preferences, ingredientStatuses, allIngredients, meals],
  );
  const result = useRecommendations(recommendationProvider, request);

  const visible = result.data.filter((r) => filter.length === 0 || filter.includes(r.meal.category));
  const hasAnything = Object.values(ingredientStatuses).some((s) => s === 'have');
  const hiddenByAvoid = result.status === 'ready' ? meals.length - result.data.length : 0;

  const toggleFilter = (category: MealCategory) =>
    setFilter((f) => (f.includes(category) ? f.filter((c) => c !== category) : [...f, category]));

  return (
    <section aria-labelledby="step-title">
      <StepHeader step={3} title="Find meal ideas">
        <p>
          Meals that use the most of what you already have at home come first. Choose any you’d like to make —
          anything you need to buy goes on your grocery list.
        </p>
      </StepHeader>

      {!hasAnything && (
        <div className="notice" role="note">
          <p>
            You haven’t marked anything as <strong>Already have</strong> yet, so every ingredient counts as something
            to buy.{' '}
            <button type="button" className="link-btn" onClick={() => dispatch({ type: 'goToStep', step: 1 })}>
              Mark what you have
            </button>{' '}
            for better suggestions.
          </p>
        </div>
      )}

      {hiddenByAvoid > 0 && (
        <p className="small muted">
          {hiddenByAvoid} meal{hiddenByAvoid === 1 ? ' is' : 's are'} hidden because {hiddenByAvoid === 1 ? 'it uses' : 'they use'} foods
          you’re avoiding, with no swap available.{' '}
          <button type="button" className="link-btn" onClick={() => dispatch({ type: 'goToStep', step: 0 })}>
            Change what you avoid
          </button>
        </p>
      )}

      <div className="filter-bar" role="group" aria-label="Show meal types">
        <button type="button" className="chip" aria-pressed={filter.length === 0} onClick={() => setFilter([])}>
          All meals
        </button>
        {MEAL_CATEGORIES.map((c) => (
          <button key={c.id} type="button" className="chip" aria-pressed={filter.includes(c.id)} onClick={() => toggleFilter(c.id)}>
            {c.label}
          </button>
        ))}
      </div>

      <p className="small muted" aria-live="polite">
        {result.status === 'loading' && result.data.length === 0
          ? 'Finding meal ideas…'
          : `${visible.length} meal idea${visible.length === 1 ? '' : 's'} · ${selectedMealIds.length} in your plan`}
      </p>

      {result.status === 'error' && (
        <p className="error" role="alert">
          {result.error}
        </p>
      )}

      {result.status !== 'loading' && visible.length === 0 && (
        <div className="empty card">
          <p>No meal ideas match these meal types yet.</p>
          <button type="button" className="btn btn--secondary" onClick={() => setFilter([])}>
            Show all meals
          </button>
        </div>
      )}

      <div className="meal-grid">
        {visible.map((recommendation) => (
          <MealCard
            key={recommendation.meal.id}
            recommendation={recommendation}
            lookup={lookup}
            statuses={ingredientStatuses}
            maxPrepMinutes={preferences.maxPrepMinutes}
            selected={selectedMealIds.includes(recommendation.meal.id)}
            extras={mealExtras[recommendation.meal.id] ?? []}
            onToggle={() => dispatch({ type: 'toggleMeal', mealId: recommendation.meal.id })}
            onToggleExtra={(ingredientId) =>
              dispatch({ type: 'toggleMealExtra', mealId: recommendation.meal.id, ingredientId })
            }
          />
        ))}
      </div>

      <StepFooter
        onBack={() => dispatch({ type: 'goToStep', step: 1 })}
        onNext={() => dispatch({ type: 'goToStep', step: 3 })}
        nextLabel={selectedMealIds.length > 0 ? 'Build my grocery list' : 'Skip to grocery list'}
      />
    </section>
  );
}
