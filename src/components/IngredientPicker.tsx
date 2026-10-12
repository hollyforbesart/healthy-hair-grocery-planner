import { useId, useMemo, useState } from 'react';
import { searchIngredients } from '../lib/ingredients';
import type { Ingredient } from '../types';

interface IngredientPickerProps {
  /** e.g. "Proteins" — used in the input's label. */
  label: string;
  /** Ingredients that can be suggested (already filtered to this food group). */
  options: Ingredient[];
  /** IDs already added, so they aren't suggested again. */
  selectedIds: Set<string>;
  /** IDs the household avoids; never suggested. */
  avoidIds: Set<string>;
  placeholder?: string;
  onPick: (ingredient: Ingredient) => void;
  /** Called with free text when nothing in the catalog matches. */
  onAddCustom: (name: string) => void;
}

const MAX_SUGGESTIONS = 8;

/**
 * Type-to-add with suggestions (ARIA combobox). Suggestions come from the
 * ingredient catalog, including other names ("garbanzo" → Chickpeas), so
 * what people type always matches meals; anything unrecognised can be added
 * as their own item.
 */
export function IngredientPicker({
  label,
  options,
  selectedIds,
  avoidIds,
  placeholder,
  onPick,
  onAddCustom,
}: IngredientPickerProps) {
  const id = useId();
  const listId = `${id}-list`;
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const trimmed = query.trim();
  const suggestions = useMemo(
    () =>
      trimmed
        ? searchIngredients(trimmed, options)
            .filter((r) => !selectedIds.has(r.ingredient.id) && !avoidIds.has(r.ingredient.id))
            .slice(0, MAX_SUGGESTIONS)
        : [],
    [trimmed, options, selectedIds, avoidIds],
  );
  // When nothing matches, offer one "add your own" option.
  const offerCustom = trimmed.length > 0 && suggestions.length === 0;
  const optionCount = offerCustom ? 1 : suggestions.length;
  const expanded = open && optionCount > 0;

  const reset = () => {
    setQuery('');
    setActive(0);
  };
  const choose = (index: number) => {
    if (offerCustom) onAddCustom(trimmed);
    else if (suggestions[index]) onPick(suggestions[index].ingredient);
    else return;
    reset();
  };

  return (
    <div className="picker">
      <label htmlFor={`${id}-input`} className="visually-hidden">
        Add {label.toLowerCase()} you have
      </label>
      <input
        id={`${id}-input`}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded ? `${id}-opt-${active}` : undefined}
        autoComplete="off"
        placeholder={placeholder ?? `Type to add ${label.toLowerCase()}…`}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && optionCount > 0) {
            e.preventDefault();
            setOpen(true);
            setActive((a) => (a + 1) % optionCount);
          } else if (e.key === 'ArrowUp' && optionCount > 0) {
            e.preventDefault();
            setActive((a) => (a - 1 + optionCount) % optionCount);
          } else if (e.key === 'Enter') {
            e.preventDefault();
            if (optionCount > 0) choose(active);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
      />
      <ul id={listId} role="listbox" className="picker__list" hidden={!expanded} aria-label={`${label} suggestions`}>
        {offerCustom ? (
          <li
            id={`${id}-opt-0`}
            role="option"
            aria-selected={active === 0}
            className={`picker__option${active === 0 ? ' is-active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => choose(0)}
          >
            Add “{trimmed}” as your own item
            <span className="picker__hint">Not in our list, so it won’t change meal ideas</span>
          </li>
        ) : (
          suggestions.map((r, index) => (
            <li
              key={r.ingredient.id}
              id={`${id}-opt-${index}`}
              role="option"
              aria-selected={active === index}
              className={`picker__option${active === index ? ' is-active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(index)}
            >
              {r.ingredient.name}
              {r.matchedAlias && <span className="picker__hint">also called “{r.matchedAlias}”</span>}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
