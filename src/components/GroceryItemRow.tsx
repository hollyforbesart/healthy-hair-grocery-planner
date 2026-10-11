import { useEffect, useRef, useState } from 'react';
import type { GroceryListItem } from '../types';

interface GroceryItemRowProps {
  item: GroceryListItem;
  onToggle: (checked: boolean) => void;
  onRename: (name: string) => void;
  onRemove: () => void;
}

export function GroceryItemRow({ item, onToggle, onRename, onRemove }: GroceryItemRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const editBtnRef = useRef<HTMLButtonElement>(null);
  const checkboxId = `item-${item.id}`;

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const finish = (save: boolean) => {
    if (save && draft.trim() && draft.trim() !== item.name) onRename(draft.trim());
    setEditing(false);
    requestAnimationFrame(() => editBtnRef.current?.focus());
  };

  const detail =
    item.forMeals.length > 0
      ? `For ${item.forMeals.join(', ')}`
      : item.sources.includes('added')
        ? 'Added by you'
        : null;

  return (
    <li className={`grocery-item${item.checked ? ' is-checked' : ''}`}>
      {editing ? (
        <form
          className="grocery-item__edit"
          onSubmit={(e) => {
            e.preventDefault();
            finish(true);
          }}
        >
          <label htmlFor={`edit-${item.id}`} className="visually-hidden">
            Edit {item.name}
          </label>
          <input
            id={`edit-${item.id}`}
            ref={inputRef}
            type="text"
            value={draft}
            maxLength={60}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && finish(false)}
          />
          <button type="submit" className="btn btn--small btn--primary">
            Save
          </button>
          <button type="button" className="btn btn--small btn--ghost" onClick={() => finish(false)}>
            Cancel
          </button>
        </form>
      ) : (
        <>
          <input
            id={checkboxId}
            type="checkbox"
            className="grocery-item__check"
            checked={item.checked}
            onChange={(e) => onToggle(e.target.checked)}
          />
          <label htmlFor={checkboxId} className="grocery-item__label">
            <span className="grocery-item__name">{item.name}</span>
            {detail && <span className="grocery-item__detail small muted">{detail}</span>}
          </label>
          <div className="grocery-item__actions no-print">
            <button
              ref={editBtnRef}
              type="button"
              className="icon-btn"
              aria-label={`Edit ${item.name}`}
              onClick={() => {
                setDraft(item.name);
                setEditing(true);
              }}
            >
              ✎
            </button>
            <button type="button" className="icon-btn" aria-label={`Remove ${item.name}`} onClick={onRemove}>
              ✕
            </button>
          </div>
        </>
      )}
    </li>
  );
}
