import type { Ingredient, IngredientStatus } from '../types';

interface IngredientRowProps {
  ingredient: Ingredient;
  status: IngredientStatus | undefined;
  matchedAlias?: string;
  avoided?: boolean;
  /** Quick-pick groups that caused the avoidance, e.g. ["Dairy"]. */
  avoidReasons?: string[];
  isStaple?: boolean;
  onToggleStaple?: () => void;
  onChange: (status: IngredientStatus | null) => void;
  onRemoveCustom?: () => void;
}

export function IngredientRow({
  ingredient,
  status,
  matchedAlias,
  avoided,
  avoidReasons = [],
  isStaple,
  onToggleStaple,
  onChange,
  onRemoveCustom,
}: IngredientRowProps) {
  const toggle = (next: IngredientStatus) => onChange(status === next ? null : next);
  const rowState = avoided ? ' is-avoided' : status ? ` is-${status}` : '';
  return (
    <li className={`ingredient-row${rowState}`}>
      <div className="ingredient-row__name">
        {onToggleStaple && (
          <button
            type="button"
            className={`staple-btn${isStaple ? ' is-on' : ''}`}
            aria-pressed={isStaple}
            aria-label={`Staple: ${ingredient.name}`}
            title={isStaple ? 'Staple — tap to remove' : 'Mark as a staple you always keep on hand'}
            disabled={avoided}
            onClick={onToggleStaple}
          >
            <span aria-hidden="true">{isStaple ? '★' : '☆'}</span>
          </button>
        )}
        <span className="ingredient-row__label">{ingredient.name}</span>
        {matchedAlias && <span className="muted small"> (matches “{matchedAlias}”)</span>}
        {ingredient.custom && <span className="badge">Your item</span>}
        {avoided && (
          <span className="badge badge--avoid">Avoiding{avoidReasons.length > 0 && ` (${avoidReasons.join(', ')})`}</span>
        )}
      </div>
      <div className="ingredient-row__actions" role="group" aria-label={ingredient.name}>
        <button
          type="button"
          className="toggle toggle--have"
          aria-pressed={!avoided && status === 'have'}
          disabled={avoided}
          onClick={() => toggle('have')}
        >
          Already have
        </button>
        <button
          type="button"
          className="toggle toggle--need"
          aria-pressed={!avoided && status === 'need'}
          disabled={avoided}
          onClick={() => toggle('need')}
        >
          Need to buy
        </button>
        {onRemoveCustom && (
          <button type="button" className="icon-btn" onClick={onRemoveCustom} aria-label={`Delete ${ingredient.name}`}>
            ✕
          </button>
        )}
      </div>
    </li>
  );
}
