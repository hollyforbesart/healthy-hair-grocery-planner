import { MEAL_CATEGORY_LABELS } from '../data/categories';
import { ingredientName, type IngredientLookup } from '../lib/ingredients';
import type { MealRecommendation } from '../services/recommendations';

interface MealCardProps {
  recommendation: MealRecommendation;
  lookup: IngredientLookup;
  selected: boolean;
  onToggle: () => void;
}

const TAG_LABELS: Record<string, string> = {
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  'dairy-free': 'Dairy-free',
  'gluten-free': 'Gluten-free',
  pescatarian: 'Pescatarian',
};

export function MealCard({ recommendation, lookup, selected, onToggle }: MealCardProps) {
  const { meal, match, fitsTime, reasons } = recommendation;
  const name = (id: string) => ingredientName(lookup, id);
  const headingId = `meal-${meal.id}`;

  const have = match.required.filter((r) => r.status === 'have' || r.status === 'have-substitute');
  const onList = match.required.filter((r) => r.status === 'on-list');
  const toBuy = match.required.filter((r) => r.status === 'missing');

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
        <span className={`pill ${match.isComplete ? 'pill--ok' : 'pill--buy'}`}>
          {match.isComplete ? 'Nothing extra to buy' : `${match.missingCount} to buy`}
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
        {have.length > 0 && (
          <div>
            <dt>You have</dt>
            <dd>
              {have
                .map((r) =>
                  r.substituteId ? `${name(r.substituteId)} (instead of ${name(r.ingredientId)})` : name(r.ingredientId),
                )
                .join(', ')}
            </dd>
          </div>
        )}
        {onList.length > 0 && (
          <div>
            <dt>Already on your list</dt>
            <dd>{onList.map((r) => name(r.ingredientId)).join(', ')}</dd>
          </div>
        )}
        {toBuy.length > 0 && (
          <div className="to-buy">
            <dt>You’d need to buy</dt>
            <dd>{toBuy.map((r) => name(r.ingredientId)).join(', ')}</dd>
          </div>
        )}
        {match.optional.length > 0 && (
          <div className="optional">
            <dt>Optional extras</dt>
            <dd>
              {match.optional
                .map((o) => {
                  const label = o.substituteId ? name(o.substituteId) : name(o.ingredientId);
                  return o.status === 'have' ? `${label} (you have)` : label;
                })
                .join(', ')}
            </dd>
          </div>
        )}
      </dl>

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
        {meal.substitutions.length > 0 && (
          <p className="small">
            <strong>Swaps:</strong>{' '}
            {meal.substitutions
              .map((s) => `${name(s.ingredientId)} → ${s.alternatives.map(name).join(' or ')}`)
              .join('; ')}
          </p>
        )}
      </details>

      <button type="button" className={`btn ${selected ? 'btn--selected' : 'btn--secondary'} meal-card__select`} aria-pressed={selected} onClick={onToggle}>
        {selected ? '✓ In my plan' : 'Add to my plan'}
      </button>
    </article>
  );
}
