import { useMemo, useState } from 'react';
import { GroceryItemRow } from '../components/GroceryItemRow';
import { StepFooter } from '../components/StepFooter';
import { useStepNav } from '../hooks/useStepNav';
import { StepHeader } from '../components/StepHeader';
import { OTHER_SECTION, STORE_SECTIONS } from '../data/categories';
import { copyText } from '../lib/clipboard';
import { NEW_WEEK_CONFIRM } from '../lib/confirmations';
import { groceryListToText } from '../lib/format';
import { buildGroceryList, groupGroceryList, removedItemIds } from '../lib/groceryList';
import { findIngredientByName } from '../lib/ingredients';
import { shareText } from '../lib/share';
import { matchKey, tidyName } from '../lib/text';
import { usePlanner } from '../state/PlannerContext';
import type { GroceryListItem, StoreSectionId } from '../types';

export function GroceryListStep() {
  const { state, dispatch, lookup, allIngredients, selectedMeals } = usePlanner();
  const { goBack, goNext, go } = useStepNav();
  const [newName, setNewName] = useState('');
  const [newSection, setNewSection] = useState<StoreSectionId>(OTHER_SECTION);
  const [status, setStatus] = useState<{ kind: 'info' | 'error'; text: string } | null>(null);
  const [addStatus, setAddStatus] = useState<{ kind: 'info' | 'error'; text: string } | null>(null);

  const items = useMemo(
    () =>
      buildGroceryList({
        statuses: state.ingredientStatuses,
        selectedMeals,
        lookup,
        overrides: state.groceryOverrides,
        manualItems: state.manualItems,
        mealExtras: state.mealExtras,
        avoidIngredientIds: state.preferences.avoidIngredientIds,
      }),
    [state.ingredientStatuses, selectedMeals, lookup, state.groceryOverrides, state.manualItems, state.mealExtras, state.preferences.avoidIngredientIds],
  );
  const groups = useMemo(() => groupGroceryList(items), [items]);
  const removedCount = removedItemIds(state.groceryOverrides).length;
  const checkedCount = items.filter((i) => i.checked).length;
  const isManual = (item: GroceryListItem) => item.sources.includes('added');

  const update = (item: GroceryListItem, patch: { name?: string; checked?: boolean; removed?: boolean }) => {
    if (isManual(item)) {
      if (patch.removed) dispatch({ type: 'removeManualItem', itemId: item.id });
      else dispatch({ type: 'updateManualItem', itemId: item.id, patch });
    } else {
      dispatch({ type: 'updateGroceryItem', itemId: item.id, patch });
    }
  };

  const addItem = () => {
    const name = tidyName(newName);
    if (!name) {
      setAddStatus({ kind: 'error', text: 'Type an item name first.' });
      return;
    }
    const ingredient = findIngredientByName(name, allIngredients);
    const listed = items.find((i) => (ingredient && i.id === ingredient.id) || matchKey(i.name) === matchKey(name));
    if (listed) {
      setAddStatus({ kind: 'info', text: `“${listed.name}” is already on your list.` });
      return;
    }
    if (ingredient && state.ingredientStatuses[ingredient.id] === 'have') {
      setAddStatus({
        kind: 'info',
        text: `You marked “${ingredient.name}” as Already have. Change it in Step 2 if you’re running low.`,
      });
      return;
    }
    if (ingredient && state.groceryOverrides[ingredient.id]?.removed) {
      dispatch({ type: 'updateGroceryItem', itemId: ingredient.id, patch: { removed: false } });
    } else {
      dispatch({
        type: 'addManualItem',
        item: {
          id: `manual-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          name: ingredient?.name ?? name.charAt(0).toUpperCase() + name.slice(1),
          section: ingredient?.storeSection ?? newSection,
          checked: false,
          ingredientId: ingredient?.id,
        },
      });
    }
    setAddStatus({ kind: 'info', text: `Added “${ingredient?.name ?? name}”.` });
    setNewName('');
  };

  const copy = async () => {
    const ok = await copyText(groceryListToText(groups));
    setStatus(
      ok
        ? { kind: 'info', text: 'List copied. Paste it into Notes, a text message or an email.' }
        : { kind: 'error', text: 'Copy didn’t work in this browser. Try Print instead.' },
    );
  };

  const share = async () => {
    const outcome = await shareText('Grocery list', groceryListToText(groups));
    if (outcome === 'shared') setStatus({ kind: 'info', text: 'List shared.' });
    else if (outcome === 'unsupported' || outcome === 'failed') {
      // Desktop browsers often have no share sheet: copy instead and say so.
      const ok = await copyText(groceryListToText(groups));
      setStatus(
        ok
          ? { kind: 'info', text: 'Sharing isn’t available in this browser, so we copied the list instead. Paste it wherever you like.' }
          : { kind: 'error', text: 'Sharing isn’t available in this browser. Try Print instead.' },
      );
    }
  };

  const { budget, householdSize } = state.preferences;

  return (
    <section aria-labelledby="step-title">
      <StepHeader title="Your grocery list">
        <p className="no-print">
          Everything your meals need that you don’t already have, plus anything you add. It shows what to buy, not how
          much.
        </p>
      </StepHeader>

      {(budget || householdSize) && (
        <p className="plan-summary small">
          {budget && <span>Budget: {budget}</span>}
          {householdSize && (
            <span>
              Shopping for: {householdSize} {householdSize === 1 ? 'person' : 'people'}
            </span>
          )}
        </p>
      )}

      <div className="list-toolbar no-print">
        <p className="small muted">
          {items.length} item{items.length === 1 ? '' : 's'}
          {checkedCount > 0 && ` · ${checkedCount} checked off`}
        </p>
        <div className="button-row">
          <button type="button" className="btn btn--primary" onClick={share} disabled={items.length === 0}>
            Share list
          </button>
          <button type="button" className="btn btn--secondary" onClick={copy} disabled={items.length === 0}>
            Copy list
          </button>
          <button type="button" className="btn btn--secondary" onClick={() => window.print()} disabled={items.length === 0}>
            Print list
          </button>
        </div>
      </div>

      <p className={`small no-print list-status ${status?.kind === 'error' ? 'error' : ''}`} role="status" aria-live="polite">
        {status?.text}
      </p>

      {items.length > 0 && (
        <details className="save-help card no-print">
          <summary>How to save or share your list</summary>
          <ul>
            <li>
              <strong>On your phone:</strong> tap <em>Share list</em>, then choose Notes to keep it, or Messages, email or
              WhatsApp to send it to someone you shop with.
            </li>
            <li>
              <strong>On a computer:</strong> tap <em>Copy list</em> and paste it into an email or note, or tap{' '}
              <em>Print list</em> and choose “Save as PDF”.
            </li>
            <li>
              <strong>Coming back later:</strong> your plan is kept automatically in this browser on this device. It isn’t
              saved online, so it won’t appear on other devices, and clearing your browser data will erase it. Share or
              save a copy if you want to keep it.
            </li>
          </ul>
        </details>
      )}

      {items.length === 0 ? (
        <div className="empty card">
          <p>Your list is empty.</p>
          <p className="small muted">Pick some meals, or add items below.</p>
          <div className="button-row">
            <button type="button" className="btn btn--secondary" onClick={() => go('meals')}>
              Find meal ideas
            </button>
          </div>
        </div>
      ) : (
        <div className="grocery-groups">
          {groups.map((group) => (
            <section key={group.section} className="grocery-group card" aria-labelledby={`list-${group.section}`}>
              <h3 id={`list-${group.section}`}>{group.label}</h3>
              <ul>
                {group.items.map((item) => (
                  <GroceryItemRow
                    key={item.id}
                    item={item}
                    onToggle={(checked) => update(item, { checked })}
                    onRename={(name) => update(item, { name })}
                    onRemove={() => update(item, { removed: true })}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <div className="list-secondary-actions no-print">
        {removedCount > 0 && (
          <button type="button" className="link-btn" onClick={() => dispatch({ type: 'restoreRemovedItems' })}>
            Restore {removedCount} removed item{removedCount === 1 ? '' : 's'}
          </button>
        )}
        {checkedCount > 0 && (
          <button
            type="button"
            className="link-btn"
            onClick={() =>
              dispatch({ type: 'clearChecked', generatedIds: items.filter((i) => !isManual(i)).map((i) => i.id) })
            }
          >
            Uncheck all
          </button>
        )}
      </div>

      <form
        className="card add-item-form no-print"
        onSubmit={(e) => {
          e.preventDefault();
          addItem();
        }}
      >
        <h3>Add an item</h3>
        <div className="field-row">
          <div className="field">
            <label htmlFor="new-item">Item</label>
            <input
              id="new-item"
              type="text"
              autoComplete="off"
              maxLength={60}
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setAddStatus(null);
              }}
            />
          </div>
          <div className="field">
            <label htmlFor="new-item-category">Store section</label>
            <select id="new-item-category" value={newSection} onChange={(e) => setNewSection(e.target.value)}>
              {STORE_SECTIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="small muted">Known ingredients go into their usual store section automatically.</p>
        <button type="submit" className="btn btn--secondary">
          Add to list
        </button>
        <p className={`small add-status ${addStatus?.kind === 'error' ? 'error' : ''}`} role="status" aria-live="polite">
          {addStatus?.text}
        </p>
      </form>

      <div className="card new-week no-print">
        <h3>Done shopping?</h3>
        <p className="small">
          Next week, start fresh: your preferences and staples are kept, and you’ll check your pantry for anything that
          ran out.
        </p>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => window.confirm(NEW_WEEK_CONFIRM) && dispatch({ type: 'startNewWeek' })}
        >
          Start a new week
        </button>
      </div>

      <StepFooter
        onBack={goBack}
        onNext={goNext}
        nextLabel="Share feedback"
      />
    </section>
  );
}
