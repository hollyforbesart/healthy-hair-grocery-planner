import type { Ingredient, IngredientStatus } from '../types';

interface IngredientRowProps {
  ingredient: Ingredient;
  status: IngredientStatus | undefined;
  matchedAlias?: string;
  avoided?: boolean;
  onChange: (status: IngredientStatus | null) => void;
  onRemoveCustom?: () => void;
}

export function IngredientRow({ ingredient, status, matchedAlias, avoided, onChange, onRemoveCustom }: IngredientRowProps) {
  const toggle = (next: IngredientStatus) => onChange(status === next ? null : next);
  return (
    <li className={`ingredient-row${status ? ` is-${status}` : ''}`}>
      <div className="ingredient-row__name">
        <span>{ingredient.name}</span>
        {matchedAlias && <span className="muted small"> (matches “{matchedAlias}”)</span>}
        {ingredient.custom && <span className="badge">Your item</span>}
        {avoided && <span className="badge badge--avoid">Avoiding</span>}
      </div>
      <div className="ingredient-row__actions" role="group" aria-label={ingredient.name}>
        <button
          type="button"
          className="toggle toggle--have"
          aria-pressed={status === 'have'}
          onClick={() => toggle('have')}
        >
          Already have
        </button>
        <button
          type="button"
          className="toggle toggle--need"
          aria-pressed={status === 'need'}
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
