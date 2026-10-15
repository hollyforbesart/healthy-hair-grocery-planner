import { MEAL_CATEGORY_LABELS, TIME_CATEGORIES } from '../data/categories';
import { mealPhotoUrl } from '../data/mealPhotos';
import { Icon } from './Icon';
import { ingredientName, type IngredientLookup } from '../lib/ingredients';
import { effectiveId } from '../lib/matching';
import type { MealRecommendation } from '../services/recommendations';
import type { IngredientStatusMap } from '../types';

interface MealCardProps {
  recommendation: MealRecommendation;
  lookup: IngredientLookup;
  statuses: IngredientStatusMap;
  selected: boolean;
  /** Extras (optional ingredients or swaps) the user tapped for this meal. */
  extras: string[];
  onToggle: () => void;
  onToggleFavorite: () => void;
  onToggleExtra: (ingredientId: string) => void;
}

const TAG_LABELS: Record<string, string> = {
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  'dairy-free': 'Dairy-free',
  'gluten-free': 'Gluten-free',
  pescatarian: 'Pescatarian',
};

// Meal instructions stay in the data for a future recipes feature but are
// intentionally not shown in Version 1.
export function MealCard({
  recommendation,
  lookup,
  statuses,
  selected,
  extras,
  onToggle,
  onToggleFavorite,
  onToggleExtra,
}: MealCardProps) {
  const { meal, match, reasons, isFavorite } = recommendation;
  const photo = mealPhotoUrl(meal.id);
  const name = (id: string) => ingredientName(lookup, id);
  const headingId = `meal-${meal.id}`;
  const time = TIME_CATEGORIES.find((t) => t.id === meal.timeCategory);

  const describe = (r: { ingredientId: string; substituteId?: string }) =>
    r.substituteId ? `${name(r.substituteId)} (instead of ${name(r.ingredientId).toLowerCase()})` : name(r.ingredientId);

  const have = match.required.filter((r) => r.status === 'have' || r.status === 'have-substitute');
  // "Need to buy" = new purchases first, then items already on the shopping list (marked as such).
  const needToBuy = match.required.filter((r) => r.status === 'missing');
  const onList = match.required.filter((r) => r.status === 'on-list');
  const total = match.required.length;
  const allAtHome = have.length === total;

  const tags = (meal.dietaryTags ?? []).map((t) => TAG_LABELS[t] ?? t);
  const hasExtras = match.optional.length > 0 || match.swapOptions.length > 0;
  const addedCount = extras.length;

  /** A tappable "+ item" chip, or a plain note when the user already has / plans to buy it. */
  const extraChip = (id: string, label: string) => {
    if (statuses[id] === 'have') return <span className="chip-note">{label} · already have</span>;
    if (statuses[id] === 'need') return <span className="chip-note">{label} · on your list</span>;
    const added = extras.includes(id);
    return (
      <button type="button" className="chip chip--small" aria-pressed={added} onClick={() => onToggleExtra(id)}>
        {added ? '✓' : '+'} {label}
      </button>
    );
  };

  return (
    <article className={`meal-card${selected ? ' is-selected' : ''}`} aria-labelledby={headingId}>
      <header className="meal-card__header">
        {photo ? (
          <img className="meal-thumb" src={photo} alt="" width={88} height={88} loading="lazy" decoding="async" />
        ) : (
          <span className="meal-thumb meal-thumb--placeholder" aria-hidden="true">
            <Icon name="bowl" size={30} />
          </span>
        )}
        <div className="meal-card__title">
          <h3 id={headingId}>{meal.name}</h3>
          <p className="meal-card__meta">
            {MEAL_CATEGORY_LABELS[meal.category]}
            {time && (
              <span className="meal-time" title={time.hint}>
                <Icon name="clock" size={15} />
                <span className="visually-hidden">Time: </span>
                {time.label}
              </span>
            )}
            {tags.length > 0 && <span> · {tags.join(', ')}</span>}
          </p>
          <span className={`have-badge${allAtHome ? ' is-full' : have.length > 0 ? ' is-some' : ''}`}>
            {allAtHome
              ? `You have all ${total} ingredients`
              : have.length > 0
                ? `You have ${have.length} of ${total} ingredients`
                : `${total} ingredient${total === 1 ? '' : 's'}`}
          </span>
        </div>
        <div className="meal-card__side">
        <button
          type="button"
          className={`fav-btn${isFavorite ? ' is-on' : ''}`}
          aria-pressed={isFavorite}
          aria-label={`Favorite: ${meal.name}`}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          onClick={onToggleFavorite}
        >
          <span aria-hidden="true">{isFavorite ? '♥' : '♡'}</span>
        </button>
        </div>
      </header>

      {reasons.length > 0 && <p className="meal-card__why">{reasons.join(' · ')}</p>}

      {meal.description && <p className="meal-card__desc">{meal.description}</p>}

      {have.length === 0 ? (
        // Nothing at home yet: a plain list reads better than "Already have: none".
        <dl className="meal-card__lists">
          <div>
            <dt>Ingredients</dt>
            <dd>
              {[...needToBuy, ...onList].map(describe).join(', ')}
              {onList.length > 0 && (
                <span className="meal-card__on-list">
                  <br />
                  <span className="muted">Already on your list: {onList.map(describe).join(', ')}</span>
                </span>
              )}
            </dd>
          </div>
        </dl>
      ) : (
        <dl className="meal-card__lists">
          <div>
            <dt>Already have</dt>
            <dd>{have.length > 0 ? have.map(describe).join(', ') : <span className="muted">None yet</span>}</dd>
          </div>
          <div className="need">
            <dt>Need to buy</dt>
            <dd>
              {needToBuy.length === 0 && onList.length === 0 ? (
                <span className="muted">Nothing — you have it all</span>
              ) : (
                <>
                  {needToBuy.map(describe).join(', ')}
                  {onList.length > 0 && (
                    <span className="meal-card__on-list">
                      {needToBuy.length > 0 && <br />}
                      {onList.map(describe).join(', ')} <span className="muted">(already on your list)</span>
                    </span>
                  )}
                </>
              )}
            </dd>
          </div>
        </dl>
      )}

      {meal.preparationNote && (
        <details className="meal-card__note">
          <summary>Preparation note</summary>
          <p>{meal.preparationNote}</p>
        </details>
      )}

      {hasExtras && (
        <details className="meal-card__extras">
          <summary>
            {match.swapOptions.length > 0 ? 'Optional extras & swaps' : 'Optional extras'}
            {addedCount > 0 && <span className="meal-card__added"> · {addedCount} added</span>}
          </summary>
          <div className="meal-card__extras-body">
            {match.optional.length > 0 && (
              <div>
                <p className="meal-card__extras-title">Optional extras</p>
                <ul className="chip-list">
                  {match.optional.map((o) => {
                    const id = effectiveId(o);
                    return <li key={o.ingredientId}>{extraChip(id, name(id))}</li>;
                  })}
                </ul>
              </div>
            )}
            {match.swapOptions.length > 0 && (
              <div>
                <p className="meal-card__extras-title">Swaps for anyone who eats differently</p>
                <ul className="chip-list">
                  {match.swapOptions.flatMap((s) =>
                    s.alternatives.map((alt) => (
                      <li key={`${s.ingredientId}-${alt}`}>
                        {extraChip(alt, `${name(alt)} instead of ${name(s.ingredientId).toLowerCase()}`)}
                      </li>
                    )),
                  )}
                </ul>
              </div>
            )}
            <p className="small muted">
              Tap an item to add it to your grocery list{selected ? '.' : ' (this also adds the meal to your plan).'}
            </p>
          </div>
        </details>
      )}

      <button
        type="button"
        className={`btn ${selected ? 'btn--selected' : 'btn--secondary'} meal-card__select`}
        aria-pressed={selected}
        onClick={onToggle}
      >
        {selected ? '✓ In my plan' : 'Add to my plan'}
      </button>
    </article>
  );
}
