import { MEAL_CATEGORY_LABELS } from '../data/categories';
import { ingredientName, type IngredientLookup } from '../lib/ingredients';
import { effectiveId } from '../lib/matching';
import type { MealRecommendation } from '../services/recommendations';
import type { IngredientStatusMap } from '../types';

interface MealCardProps {
  recommendation: MealRecommendation;
  lookup: IngredientLookup;
  statuses: IngredientStatusMap;
  /** The user's usual cooking time, to flag longer meals. */
  maxPrepMinutes: number | null;
  selected: boolean;
  /** Extras (optional ingredients or swaps) the user tapped for this meal. */
  extras: string[];
  onToggle: () => void;
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
  maxPrepMinutes,
  selected,
  extras,
  onToggle,
  onToggleExtra,
}: MealCardProps) {
  const { meal, match, fitsTime } = recommendation;
  const name = (id: string) => ingredientName(lookup, id);
  const headingId = `meal-${meal.id}`;

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
        <div className="meal-card__title">
          <h3 id={headingId}>{meal.name}</h3>
          <p className="meal-card__meta">
            {MEAL_CATEGORY_LABELS[meal.category]} · About {meal.prepTimeMinutes} min
            {!fitsTime && maxPrepMinutes ? <span className="warn"> · longer than your usual {maxPrepMinutes}</span> : null}
            {tags.length > 0 && <span> · {tags.join(', ')}</span>}
          </p>
        </div>
        <span
          className={`availability ${allAtHome ? 'availability--full' : ''}`}
          aria-label={`${have.length} of ${total} ingredients at home`}
        >
          <span className="availability__dots" aria-hidden="true">
            {match.required.map((r, i) => (
              <span key={i} className={r.status === 'have' || r.status === 'have-substitute' ? 'is-on' : ''} />
            ))}
          </span>
          <span aria-hidden="true">
            {have.length}/{total} at home
          </span>
        </span>
      </header>

      {meal.description && <p className="meal-card__desc">{meal.description}</p>}

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

      {hasExtras && (
        <details className="meal-card__extras">
          <summary>
            Optional extras &amp; swaps
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
