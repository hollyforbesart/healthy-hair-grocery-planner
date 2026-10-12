import { useMemo, useState } from 'react';
import { MealCard } from '../components/MealCard';
import { StepFooter } from '../components/StepFooter';
import { StepHeader } from '../components/StepHeader';
import { MEAL_CATEGORIES } from '../data/categories';
import { useRecommendations } from '../hooks/useRecommendations';
import { useStepNav } from '../hooks/useStepNav';
import { previouslyChosenMealIds, recentMealIds } from '../lib/mealHistory';
import { mealMatchesQuery } from '../lib/mealSearch';
import { recommendationProvider, type RecommendationRequest } from '../services/recommendations';
import { todayIso } from '../state/plannerReducer';
import { usePlanner } from '../state/PlannerContext';
import type { MealCategory } from '../types';

/** Cards shown before "Show more", so 100 meals don't load as one long page. */
const PAGE_SIZE = 20;

export function MealsStep() {
  const { state, dispatch, allIngredients, meals, lookup } = usePlanner();
  const { goBack, goNext, go } = useStepNav();
  const { preferences, ingredientStatuses, selectedMealIds, mealExtras, favorites, mealHistory, path } = state;
  const [filter, setFilter] = useState<MealCategory[]>(preferences.mealCategories);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE_SIZE);

  const request = useMemo<RecommendationRequest>(
    () => ({
      preferences,
      ingredientStatuses,
      ingredients: allIngredients,
      meals,
      favorites,
      recentMealIds: [...recentMealIds(mealHistory, todayIso())],
      previouslyChosenIds: [...previouslyChosenMealIds(mealHistory)],
    }),
    [preferences, ingredientStatuses, allIngredients, meals, favorites, mealHistory],
  );
  const result = useRecommendations(recommendationProvider, request);

  const matching = result.data.filter(
    (r) =>
      (filter.length === 0 || filter.includes(r.meal.category)) &&
      (!favoritesOnly || r.isFavorite) &&
      mealMatchesQuery(r.meal, query, lookup),
  );
  const visible = matching.slice(0, shown);
  const hasAnything = Object.values(ingredientStatuses).some((s) => s === 'have');
  const hiddenByAvoid = result.status === 'ready' ? meals.length - result.data.length : 0;
  const resetPaging = () => setShown(PAGE_SIZE);

  const toggleFilter = (category: MealCategory) => {
    setFavoritesOnly(false);
    setFilter((f) => (f.includes(category) ? f.filter((c) => c !== category) : [...f, category]));
    resetPaging();
  };

  return (
    <section aria-labelledby="step-title">
      <StepHeader title={path === 'ideas' ? 'Find meal ideas' : 'Meal ideas from your kitchen'}>
        <p>
          {path === 'ideas'
            ? 'Browse or search, and add the meals you’d like to make. Next you’ll tick off what you already have.'
            : 'Meals that use the most of what you have come first. Add the ones you’d like to make.'}
        </p>
      </StepHeader>

      {path === 'ideas' ? (
        <p className="small path-switch">
          Want ideas based on what’s in your kitchen?{' '}
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              dispatch({ type: 'choosePath', path: 'pantry' });
              go('kitchen');
            }}
          >
            Add your kitchen
          </button>
        </p>
      ) : (
        !hasAnything && (
          <div className="notice" role="note">
            <p>
              You haven’t added anything from your kitchen yet, so every ingredient counts as something to buy.{' '}
              <button type="button" className="link-btn" onClick={() => go('kitchen')}>
                Add what you have
              </button>
            </p>
          </div>
        )
      )}

      <div className="meal-search field">
        <label htmlFor="meal-search">Search meals or ingredients</label>
        <input
          id="meal-search"
          type="search"
          placeholder="e.g. salmon, oats, curry"
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            resetPaging();
          }}
        />
      </div>

      <div className="filter-bar" role="group" aria-label="Show meal types">
        <button
          type="button"
          className="chip"
          aria-pressed={filter.length === 0 && !favoritesOnly}
          onClick={() => {
            setFilter([]);
            setFavoritesOnly(false);
            resetPaging();
          }}
        >
          All meals
        </button>
        {MEAL_CATEGORIES.map((c) => (
          <button key={c.id} type="button" className="chip" aria-pressed={!favoritesOnly && filter.includes(c.id)} onClick={() => toggleFilter(c.id)}>
            {c.label}
          </button>
        ))}
        <button
          type="button"
          className="chip"
          aria-pressed={favoritesOnly}
          onClick={() => {
            setFavoritesOnly((f) => !f);
            resetPaging();
          }}
        >
          ♥ Favorites
        </button>
      </div>

      <p className="small muted" aria-live="polite">
        {result.status === 'loading' && result.data.length === 0
          ? 'Finding meal ideas…'
          : `${matching.length} meal idea${matching.length === 1 ? '' : 's'} · ${selectedMealIds.length} in your plan`}
        {hiddenByAvoid > 0 && (
          <>
            {' · '}
            {hiddenByAvoid} hidden because of foods you avoid{' '}
            <button type="button" className="link-btn" onClick={() => go('setup')}>
              Change
            </button>
          </>
        )}
      </p>

      {result.status === 'error' && (
        <p className="error" role="alert">
          {result.error}
        </p>
      )}

      {result.status !== 'loading' && matching.length === 0 && (
        <div className="empty card">
          <p>
            {favoritesOnly
              ? 'No favorites yet. Tap ♡ on a meal to save it here.'
              : query
                ? `No meals match “${query}”.`
                : 'No meal ideas match these meal types.'}
          </p>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => {
              setFilter([]);
              setFavoritesOnly(false);
              setQuery('');
              resetPaging();
            }}
          >
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
            selected={selectedMealIds.includes(recommendation.meal.id)}
            extras={mealExtras[recommendation.meal.id] ?? []}
            onToggle={() => dispatch({ type: 'toggleMeal', mealId: recommendation.meal.id })}
            onToggleFavorite={() => dispatch({ type: 'toggleFavorite', mealId: recommendation.meal.id })}
            onToggleExtra={(ingredientId) =>
              dispatch({ type: 'toggleMealExtra', mealId: recommendation.meal.id, ingredientId })
            }
          />
        ))}
      </div>

      {matching.length > visible.length && (
        <div className="show-more">
          <button type="button" className="btn btn--secondary" onClick={() => setShown((n) => n + PAGE_SIZE)}>
            Show more meals ({matching.length - visible.length} more)
          </button>
        </div>
      )}

      <StepFooter
        onBack={goBack}
        onNext={goNext}
        nextLabel={selectedMealIds.length > 0 ? `Review my ${selectedMealIds.length} meal${selectedMealIds.length === 1 ? '' : 's'}` : 'Review'}
      />
    </section>
  );
}
