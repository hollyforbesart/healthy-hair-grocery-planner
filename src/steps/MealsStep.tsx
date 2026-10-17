import { useEffect, useMemo, useRef, useState } from 'react';
import { AvoidFoods } from '../components/AvoidFoods';
import { MealCard } from '../components/MealCard';
import { StepFooter } from '../components/StepFooter';
import { StepHeader } from '../components/StepHeader';
import { AVOID_GROUPS } from '../data/avoidGroups';
import { Icon } from '../components/Icon';
import { MEAL_CATEGORIES, TIME_CATEGORIES } from '../data/categories';
import { useRecommendations } from '../hooks/useRecommendations';
import { track } from '../lib/analytics';
import { useStepNav } from '../hooks/useStepNav';
import { ingredientName } from '../lib/ingredients';
import { previouslyChosenMealIds, recentMealIds } from '../lib/mealHistory';
import { mealMatchesQuery } from '../lib/mealSearch';
import { toggleMealChoice, type MealChoice } from '../lib/mealSelection';
import { recommendationProvider, type MealRecommendation, type RecommendationRequest } from '../services/recommendations';
import { todayIso } from '../state/plannerReducer';
import { usePlanner } from '../state/PlannerContext';
import type { MealCategory, TimeCategory } from '../types';

/** Cards shown before "Show more" in a single list, so 100 meals don't load as one long page. */
const PAGE_SIZE = 20;
/** Cards shown per meal type before "See all" (which switches to just that type). */
const SECTION_SIZE = 4;

export function MealsStep() {
  const { state, dispatch, allIngredients, meals, lookup } = usePlanner();
  const { goBack, goNext, go } = useStepNav();
  const { preferences, ingredientStatuses, selectedMealIds, mealExtras, favorites, mealHistory, path } = state;
  const categories = preferences.mealCategories;
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE_SIZE);
  const [time, setTime] = useState<TimeCategory | null>(null);
  const [avoidOpen, setAvoidOpen] = useState(false);
  const avoidRef = useRef<HTMLDetailsElement>(null);
  const filterBarRef = useRef<HTMLDivElement>(null);
  const scrollToFilters = useRef(false);

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
      (categories.length === 0 || categories.includes(r.meal.category)) &&
      (!favoritesOnly || r.isFavorite) &&
      (!time || r.meal.timeCategory === time) &&
      mealMatchesQuery(r.meal, query, lookup),
  );
  // Browsing several meal types: one short section each, so snacks don't crowd out dinners.
  const sectioned = !query.trim() && !favoritesOnly && categories.length !== 1;
  const sections = MEAL_CATEGORIES.filter((c) => categories.length === 0 || categories.includes(c.id))
    .map((c) => ({ ...c, items: matching.filter((r) => r.meal.category === c.id) }))
    .filter((s) => s.items.length > 0);
  const visible = matching.slice(0, shown);
  const hasAnything = Object.values(ingredientStatuses).some((s) => s === 'have');
  const hiddenByAvoid = result.status === 'ready' ? meals.length - result.data.length : 0;
  const resetPaging = () => setShown(PAGE_SIZE);

  const chooseCategory = (choice: MealChoice) => {
    track('meal_type_filter', choice);
    setFavoritesOnly(false);
    dispatch({ type: 'updatePreferences', patch: { mealCategories: toggleMealChoice(categories, choice) } });
    resetPaging();
  };

  // "See all" shows just that meal type, the same as tapping its chip.
  const seeAll = (category: MealCategory) => {
    track('see_all', category);
    setFavoritesOnly(false);
    dispatch({ type: 'updatePreferences', patch: { mealCategories: [category] } });
    resetPaging();
    scrollToFilters.current = true;
  };
  // Scroll once the shorter list has rendered, so the page doesn't jump past the chips.
  useEffect(() => {
    if (!scrollToFilters.current) return;
    scrollToFilters.current = false;
    filterBarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [categories]);

  const chooseTime = (choice: TimeCategory | null) => {
    track('time_filter', choice === null || choice === time ? 'any' : choice);
    setTime((current) => (current === choice ? null : choice));
    resetPaging();
  };

  // Count what people search for once they pause typing (3+ letters), not every keystroke.
  useEffect(() => {
    const term = query.trim();
    if (term.length < 3) return;
    const timer = window.setTimeout(() => track('search', term), 1500);
    return () => window.clearTimeout(timer);
  }, [query]);

  // Summary for the "Foods to leave out" panel: ticked groups by name, then single foods.
  const avoidIds = preferences.avoidIngredientIds;
  const avoidSet = new Set(avoidIds);
  const avoidGroups = AVOID_GROUPS.filter((g) => g.ingredientIds.every((id) => avoidSet.has(id)));
  const inGroups = new Set(avoidGroups.flatMap((g) => g.ingredientIds));
  const avoidLabels = [
    ...avoidGroups.map((g) => g.label),
    ...avoidIds.filter((id) => !inGroups.has(id)).map((id) => ingredientName(lookup, id)),
  ];
  const avoidSummary =
    avoidLabels.length === 0
      ? 'None'
      : avoidLabels.length <= 3
        ? avoidLabels.join(', ')
        : `${avoidLabels.slice(0, 3).join(', ')} +${avoidLabels.length - 3} more`;

  const openAvoid = () => {
    setAvoidOpen(true);
    avoidRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const card = (recommendation: MealRecommendation) => (
    <MealCard
      key={recommendation.meal.id}
      recommendation={recommendation}
      lookup={lookup}
      statuses={ingredientStatuses}
      selected={selectedMealIds.includes(recommendation.meal.id)}
      extras={mealExtras[recommendation.meal.id] ?? []}
      onToggle={() => dispatch({ type: 'toggleMeal', mealId: recommendation.meal.id })}
      onToggleFavorite={() => dispatch({ type: 'toggleFavorite', mealId: recommendation.meal.id })}
      onToggleExtra={(ingredientId) => dispatch({ type: 'toggleMealExtra', mealId: recommendation.meal.id, ingredientId })}
    />
  );

  const selectedCount = selectedMealIds.length;

  return (
    <section aria-labelledby="step-title" className={selectedCount > 0 ? 'has-review-bar' : undefined}>
      <StepHeader title={path === 'ideas' ? 'Find meal ideas' : 'Meal ideas from your kitchen'}>
        <p>
          {path === 'ideas'
            ? 'Browse or search, and add the meals you’d like to make. Next you’ll tick off what you already have.'
            : 'Within each meal type, ideas that use more of what you have come first. Add the ones you’d like to make.'}
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

      <div ref={filterBarRef} className="filter-bar" role="group" aria-label="Show meal types">
        <button type="button" className="chip" aria-pressed={categories.length === 0 && !favoritesOnly} onClick={() => chooseCategory('all')}>
          All meals
        </button>
        {MEAL_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className="chip"
            aria-pressed={!favoritesOnly && categories.includes(c.id)}
            onClick={() => chooseCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
        <button
          type="button"
          className="chip"
          aria-pressed={favoritesOnly}
          onClick={() => {
            if (!favoritesOnly) track('favorites_filter');
            setFavoritesOnly((f) => !f);
            resetPaging();
          }}
        >
          ♥ Favorites
        </button>
      </div>

      <div className="filter-bar filter-bar--time" role="group" aria-label="Time to make">
        <span className="filter-bar__label" aria-hidden="true">
          <Icon name="clock" size={15} /> Time:
        </span>
        <button type="button" className="chip chip--small" aria-pressed={time === null} onClick={() => chooseTime(null)}>
          Any
        </button>
        {TIME_CATEGORIES.map((t) => (
          <button
            key={t.id}
            type="button"
            className="chip chip--small"
            aria-pressed={time === t.id}
            title={t.hint}
            onClick={() => chooseTime(t.id)}
          >
            <span className={`chip-clock meal-time--${t.id}`} aria-hidden="true">
              <Icon name="clock" size={14} />
            </span>
            {t.label}
          </button>
        ))}
      </div>

      <details
        ref={avoidRef}
        className="card avoid-panel"
        open={avoidOpen}
        onToggle={(e) => setAvoidOpen(e.currentTarget.open)}
      >
        <summary>
          <span className="avoid-panel__title">Foods to leave out</span>{' '}
          <span className="avoid-panel__summary">{avoidSummary}</span>
        </summary>
        <AvoidFoods />
      </details>

      <p className="small muted" aria-live="polite">
        {result.status === 'loading' && result.data.length === 0
          ? 'Finding meal ideas…'
          : `${matching.length} meal idea${matching.length === 1 ? '' : 's'} · ${selectedCount} in your plan`}
        {hiddenByAvoid > 0 && (
          <>
            {' · '}
            {hiddenByAvoid} hidden because of foods you leave out{' '}
            <button type="button" className="link-btn" onClick={openAvoid}>
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
                : time
                  ? 'No meal ideas match this time and these meal types.'
                  : 'No meal ideas match these meal types.'}
          </p>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => {
              chooseCategory('all');
              setQuery('');
              setTime(null);
            }}
          >
            Show all meals
          </button>
        </div>
      )}

      {sectioned ? (
        sections.map((section) => {
          const label = section.label.toLowerCase();
          return (
            <section key={section.id} className="meal-section" aria-labelledby={`meals-${section.id}`}>
              <h3 id={`meals-${section.id}`} className="meal-section__title">
                {section.label} <span className="muted">· {section.items.length}</span>
              </h3>
              <div className="meal-grid">{section.items.slice(0, SECTION_SIZE).map(card)}</div>
              {section.items.length > SECTION_SIZE && (
                <div className="show-more">
                  <button type="button" className="btn btn--secondary" onClick={() => seeAll(section.id)}>
                    See all {section.items.length} {label} ideas
                  </button>
                </div>
              )}
            </section>
          );
        })
      ) : (
        <>
          <div className="meal-grid">{visible.map(card)}</div>
          {matching.length > visible.length && (
            <div className="show-more">
              <button type="button" className="btn btn--secondary" onClick={() => setShown((n) => n + PAGE_SIZE)}>
                Show more meals ({matching.length - visible.length} more)
              </button>
            </div>
          )}
        </>
      )}

      <StepFooter
        onBack={goBack}
        onNext={goNext}
        nextLabel={selectedCount > 0 ? `Review my ${selectedCount} meal${selectedCount === 1 ? '' : 's'}` : 'Review'}
      />

      {selectedCount > 0 && goNext && (
        <div className="review-bar no-print">
          <div className="container review-bar__inner">
            <span className="review-bar__count" aria-live="polite">
              {selectedCount} selected
            </span>
            <button type="button" className="btn btn--primary" onClick={goNext}>
              Review →
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
