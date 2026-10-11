import { useMemo, useState } from 'react';
import { IngredientRow } from '../components/IngredientRow';
import { StepFooter } from '../components/StepFooter';
import { StepHeader } from '../components/StepHeader';
import { GROCERY_CATEGORY_LABELS, INGREDIENT_CATEGORIES } from '../data/categories';
import { createCustomIngredient, searchIngredients, sortByName } from '../lib/ingredients';
import { usePlanner } from '../state/PlannerContext';
import type { GroceryCategoryId, IngredientStatus } from '../types';

type Message = { kind: 'info' | 'error'; text: string } | null;

export function IngredientsStep() {
  const { state, dispatch, allIngredients } = usePlanner();
  const [query, setQuery] = useState('');
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState<GroceryCategoryId>('produce');
  const [message, setMessage] = useState<Message>(null);

  const statuses = state.ingredientStatuses;
  const haveCount = Object.values(statuses).filter((s) => s === 'have').length;
  const needCount = Object.values(statuses).filter((s) => s === 'need').length;

  const groups = useMemo(() => {
    const results = searchIngredients(query, allIngredients);
    return INGREDIENT_CATEGORIES.map((category) => ({
      ...category,
      results: sortByName(
        results.filter((r) => r.ingredient.category === category.id).map((r) => ({ ...r, name: r.ingredient.name })),
      ),
    })).filter((g) => g.results.length > 0);
  }, [query, allIngredients]);

  const setStatus = (ingredientId: string, status: IngredientStatus | null) =>
    dispatch({ type: 'setIngredientStatus', ingredientId, status });

  const addCustom = (status: IngredientStatus) => {
    const result = createCustomIngredient(customName, customCategory, allIngredients);
    if (!result.ok) {
      if (result.reason === 'empty') {
        setMessage({ kind: 'error', text: 'Type an ingredient name first.' });
      } else {
        const existing = result.existing;
        const current = statuses[existing.id];
        // Never silently overwrite a choice the user already made.
        if (!current) setStatus(existing.id, status);
        setMessage({
          kind: 'info',
          text: current
            ? `“${existing.name}” is already in ${GROCERY_CATEGORY_LABELS[existing.category]} and marked ${current === 'have' ? 'Already have' : 'Need to buy'}.`
            : `“${existing.name}” is already in ${GROCERY_CATEGORY_LABELS[existing.category]}, so we’ve marked it there.`,
        });
        setQuery(existing.name);
        setCustomName('');
      }
      return;
    }
    dispatch({ type: 'addCustomIngredient', ingredient: result.ingredient, status });
    setMessage({ kind: 'info', text: `Added “${result.ingredient.name}” to ${GROCERY_CATEGORY_LABELS[customCategory]}.` });
    setCustomName('');
  };

  return (
    <section aria-labelledby="step-title">
      <StepHeader step={2} title="Choose your ingredients">
        <p>
          Mark what you <strong>already have</strong> and what you <strong>need to buy</strong>. Leave anything you
          don’t want unmarked.
        </p>
      </StepHeader>

      <div className="ingredients-toolbar card">
        <div className="field">
          <label htmlFor="ingredient-search">Search ingredients</label>
          <input
            id="ingredient-search"
            type="search"
            placeholder="e.g. chickpeas, spinach, salmon"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <p className="small" aria-live="polite">
          <span className="count count--have">{haveCount} already have</span>
          <span className="count count--need">{needCount} need to buy</span>
        </p>
      </div>

      {groups.length === 0 && (
        <div className="empty card" role="status">
          <p>No ingredients match “{query}”.</p>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => {
              setCustomName(query);
              document.getElementById('custom-name')?.focus();
            }}
          >
            Add “{query}” as your own ingredient
          </button>
        </div>
      )}

      {groups.map((group) => (
        <section key={group.id} className="ingredient-group" aria-labelledby={`cat-${group.id}`}>
          <h3 id={`cat-${group.id}`}>{group.label}</h3>
          <ul className="ingredient-list">
            {group.results.map(({ ingredient, matchedAlias }) => (
              <IngredientRow
                key={ingredient.id}
                ingredient={ingredient}
                status={statuses[ingredient.id]}
                matchedAlias={matchedAlias}
                onChange={(status) => setStatus(ingredient.id, status)}
                onRemoveCustom={
                  ingredient.custom
                    ? () => dispatch({ type: 'removeCustomIngredient', ingredientId: ingredient.id })
                    : undefined
                }
              />
            ))}
          </ul>
        </section>
      ))}

      <form
        className="card custom-form"
        onSubmit={(e) => {
          e.preventDefault();
          addCustom('need');
        }}
      >
        <h3>Add your own ingredient</h3>
        <div className="field-row">
          <div className="field">
            <label htmlFor="custom-name">Ingredient name</label>
            <input
              id="custom-name"
              type="text"
              autoComplete="off"
              maxLength={60}
              value={customName}
              onChange={(e) => {
                setCustomName(e.target.value);
                setMessage(null);
              }}
            />
          </div>
          <div className="field">
            <label htmlFor="custom-category">Category</label>
            <select
              id="custom-category"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value as GroceryCategoryId)}
            >
              {INGREDIENT_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="button-row">
          <button type="button" className="btn btn--secondary" onClick={() => addCustom('have')}>
            Add as Already have
          </button>
          <button type="submit" className="btn btn--secondary">
            Add as Need to buy
          </button>
        </div>
        <p className={`small ${message?.kind === 'error' ? 'error' : ''}`} role="status" aria-live="polite">
          {message?.text}
        </p>
      </form>

      <StepFooter
        onBack={() => dispatch({ type: 'goToStep', step: 0 })}
        onNext={() => dispatch({ type: 'goToStep', step: 2 })}
        nextLabel="Find meal ideas"
      />
    </section>
  );
}
