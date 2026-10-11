import { MEAL_CATEGORY_LABELS } from '../data/categories';
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
  onToggleExtra: (ingredientId: string) => void;
}

const TAG_LABELS: Record<string, string> = {
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  'dairy-free': 'Dairy-free',
  'gluten-free': 'Gluten-free',
  pescatarian: 'Pescatarian',
};

export function MealCard({ recommendation, lookup, statuses, selected, extras, onToggle, onToggleExtra }: MealCardProps) {
  const { meal, match, fitsTime, reasons } = recommendation;
  const name = (id: string) => ingredientName(lookup, id);
  const headingId = `meal-${meal.id}`;

  const describe = (r: { ingredientId: string; substituteId?: string; avoided?: boolean }) =>
    r.substituteId ? `${name(r.substituteId)} (instead of ${name(r.ingredientId).toLowerCase()})` : name(r.ingredientId);

  const have = match.required.filter((r) => r.status === 'have' || r.status === 'have-substitute');
  const onList = match.required.filter((r) => r.status === 'on-list');
  const stillNeed = match.required.filter((r) => r.status === 'missing');
  const total = match.required.length;

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
      <div className="meal-card__top">
        <div>
          <h3 id={headingId}>{meal.name}</h3>
          <p className="meal-card__meta">
            <span>{MEAL_CATEGORY_LABELS[meal.category]}</span>
            <span aria-hidden="true"> · </span>
            <span className={fitsTime ? undefined : 'warn'}>About {meal.prepTimeMinutes} min</span>
          </p>
        </div>
        <span className={`pill ${have.length === total ? 'pill--ok' : 'pill--buy'}`}>
          {have.length} of {total} at home
        </span>
      </div>

      {meal.description && <p className="meal-card__desc">{meal.description}</p>}

      {(meal.dietaryTags?.length ?? 0) > 0 && (
        <ul className="tags" aria-label="Dietary tags">
          {meal.dietaryTags!.map((tag) => (
            <li key={tag} className="tag">
              {TAG_LABELS[tag] ?? tag}
            </li>
          ))}
        </ul>
      )}

      <dl className="meal-card__lists">
        <div className="have">
          <dt>Already have</dt>
          <dd>{have.length > 0 ? have.map(describe).join(', ') : <span className="muted">Nothing yet</span>}</dd>
        </div>
        {onList.length > 0 && (
          <div className="on-list">
            <dt>Already on shopping list</dt>
            <dd>{onList.map(describe).join(', ')}</dd>
          </div>
        )}
        {stillNeed.length > 0 && (
          <div className="still-need">
            <dt>Still need</dt>
            <dd>{stillNeed.map(describe).join(', ')}</dd>
          </div>
        )}
      </dl>

      {match.optional.length > 0 && (
        <div className="meal-card__extras">
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
        <div className="meal-card__extras">
          <p className="meal-card__extras-title">Cooking for someone who eats differently?</p>
          <ul className="chip-list">
            {match.swapOptions.flatMap((s) =>
              s.alternatives.map((alt) => (
                <li key={`${s.ingredientId}-${alt}`}>{extraChip(alt, `${name(alt)} instead of ${name(s.ingredientId).toLowerCase()}`)}</li>
              )),
            )}
          </ul>
        </div>
      )}

      {(match.optional.length > 0 || match.swapOptions.length > 0) && (
        <p className="small muted meal-card__hint">Tap an extra to add it to your grocery list{selected ? '.' : ' (this also adds the meal to your plan).'}</p>
      )}

      {reasons.length > 0 && <p className="meal-card__reasons small muted">{reasons.join(' · ')}</p>}

      <details className="meal-card__details">
        <summary>How to make it</summary>
        <ol>
          {meal.instructions.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
        {meal.substitutions.some((s) => s.note) && (
          <p className="small muted">{meal.substitutions.filter((s) => s.note).map((s) => s.note).join(' ')}</p>
        )}
      </details>

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
