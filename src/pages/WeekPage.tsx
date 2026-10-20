import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { MEAL_CATEGORY_LABELS, TIME_CATEGORIES } from '../data/categories';
import { mealPhotoUrl } from '../data/mealPhotos';
import { track } from '../lib/analytics';
import {
  DAY_NAMES,
  MAX_CUSTOM_LENGTH,
  QUICK_PICKS,
  WEEK_CATEGORIES,
  addDays,
  cleanCustomText,
  daysBetween,
  planStart,
  shortDate,
  slotKey,
  slotLabel,
  sundayOf,
  tonightReminders,
  unplacedMeals,
  type WeekSlot,
} from '../lib/weekPlan';
import { usePlanner } from '../state/PlannerContext';
import { todayIso } from '../state/plannerReducer';
import type { MealCategory, MealTemplate } from '../types';

const WEEK_CLEAR_CONFIRM = 'Clear everything on this week’s plan? Your meals and grocery list stay as they are.';

function MealTime({ meal }: { meal: MealTemplate }) {
  const time = TIME_CATEGORIES.find((t) => t.id === meal.timeCategory);
  return (
    <>
      {time && (
        <span className={`meal-time meal-time--${time.id} week-slot__time`}>
          <Icon name="clock" size={13} />
          {time.label}
        </span>
      )}
      {meal.makeAhead && (
        <span className="meal-time meal-time--ahead week-slot__time">
          <Icon name="moon" size={12} />
          Make ahead
        </span>
      )}
    </>
  );
}

interface PickerProps {
  dayName: string;
  category: MealCategory;
  current: WeekSlot | undefined;
  placedOn: Map<string, string[]>;
  onChoose: (slot: WeekSlot | null) => void;
  onClose: () => void;
  onFindMeals: () => void;
}

/** The sheet that opens when a slot is tapped: their meals, quick options, or their own words. */
function SlotPicker({ dayName, category, current, placedOn, onChoose, onClose, onFindMeals }: PickerProps) {
  const { selectedMeals } = usePlanner();
  const [text, setText] = useState(current?.kind === 'custom' ? current.text : '');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const sameType = selectedMeals.filter((m) => m.category === category);
  const otherTypes = selectedMeals.filter((m) => m.category !== category);
  const label = MEAL_CATEGORY_LABELS[category];

  useEffect(() => {
    headingRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const mealButton = (meal: MealTemplate) => {
    const chosen = current?.kind === 'meal' && current.mealId === meal.id;
    const elsewhere = placedOn.get(meal.id);
    const photo = mealPhotoUrl(meal.id);
    return (
      <li key={meal.id}>
        <button type="button" className={`week-pick${chosen ? ' is-chosen' : ''}`} aria-pressed={chosen} onClick={() => onChoose({ kind: 'meal', mealId: meal.id })}>
          {photo ? <img src={photo} alt="" width={48} height={48} loading="lazy" /> : <span className="week-pick__nophoto" aria-hidden="true" />}
          <span className="week-pick__text">
            <span className="week-pick__name">{meal.name}</span>
            <span className="week-pick__meta">
              <MealTime meal={meal} />
              {elsewhere && elsewhere.length > 0 && <span className="week-pick__placed">On {elsewhere.join(', ')}</span>}
            </span>
          </span>
        </button>
      </li>
    );
  };

  const saveText = () => {
    const clean = cleanCustomText(text);
    if (clean) onChoose({ kind: 'custom', text: clean });
  };

  return (
    <div className="week-sheet-backdrop" onClick={onClose}>
      <div className="week-sheet" role="dialog" aria-modal="true" aria-labelledby="week-sheet-title" onClick={(e) => e.stopPropagation()}>
        <div className="week-sheet__head">
          <h3 id="week-sheet-title" tabIndex={-1} ref={headingRef}>
            {dayName} {label.toLowerCase()}
          </h3>
          <button type="button" className="week-sheet__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="week-sheet__body">
          {selectedMeals.length === 0 ? (
            <p className="small muted">
              You haven’t picked any meal ideas yet.{' '}
              <button type="button" className="link-btn" onClick={onFindMeals}>
                Find meal ideas
              </button>{' '}
              or use the options below.
            </p>
          ) : (
            <>
              {sameType.length > 0 && (
                <>
                  <h4>Your {label.toLowerCase()} picks</h4>
                  <ul className="week-picks">{sameType.map(mealButton)}</ul>
                </>
              )}
              {otherTypes.length > 0 && (
                <>
                  <h4>{sameType.length > 0 ? 'Your other picks' : 'Your picks'}</h4>
                  <ul className="week-picks">{otherTypes.map(mealButton)}</ul>
                </>
              )}
            </>
          )}

          <h4>Quick options</h4>
          <div className="chip-list">
            {QUICK_PICKS.map((q) => {
              const chosen = current?.kind === 'quick' && current.id === q.id;
              return (
                <button key={q.id} type="button" className="chip" aria-pressed={chosen} onClick={() => onChoose({ kind: 'quick', id: q.id })}>
                  {q.label}
                </button>
              );
            })}
          </div>

          <h4>
            <label htmlFor="week-own">Something else</label>
          </h4>
          <form
            className="week-own"
            onSubmit={(e) => {
              e.preventDefault();
              saveText();
            }}
          >
            <input
              id="week-own"
              type="text"
              placeholder="e.g. Mom’s lasagna"
              maxLength={MAX_CUSTOM_LENGTH}
              autoComplete="off"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button type="submit" className="btn btn--secondary btn--small" disabled={!cleanCustomText(text)}>
              Add
            </button>
          </form>

          {current && (
            <p className="week-sheet__remove">
              <button type="button" className="link-btn" onClick={() => onChoose(null)}>
                Remove from {dayName}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function WeekPage({ onOpenPlanner, onFindMeals }: { onOpenPlanner: () => void; onFindMeals: () => void }) {
  const { state, dispatch, meals, selectedMeals } = usePlanner();
  const plan = state.weekPlan;
  const today = todayIso();
  const thisSunday = sundayOf(today);
  const start = planStart(plan, today);
  const stale = daysBetween(start, today) > 6;
  const mealsById = useMemo(() => new Map(meals.map((m) => [m.id, m])), [meals]);
  const reminders = stale ? [] : tonightReminders(plan, mealsById, today);
  const notPlaced = unplacedMeals(plan, selectedMeals);
  const [open, setOpen] = useState<{ day: number; category: MealCategory } | null>(null);
  const lastTrigger = useRef<string | null>(null);

  // Which days each meal is already on, for the picker ("On Tue, Thu").
  const placedOn = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const [key, slot] of Object.entries(plan.slots)) {
      if (slot.kind !== 'meal') continue;
      const day = DAY_NAMES[Number(key.split('-')[0])].slice(0, 3);
      map.set(slot.mealId, [...(map.get(slot.mealId) ?? []), day]);
    }
    return map;
  }, [plan.slots]);

  const closePicker = () => {
    setOpen(null);
    const id = lastTrigger.current;
    requestAnimationFrame(() => id && document.getElementById(id)?.focus());
  };

  const choose = (slot: WeekSlot | null) => {
    if (!open) return;
    dispatch({ type: 'setWeekSlot', start, day: open.day, category: open.category, slot });
    closePicker();
  };

  const filledCount = Object.keys(plan.slots).length;
  const weekChoices = [
    { start: thisSunday, label: 'This week' },
    { start: addDays(thisSunday, 7), label: 'Next week' },
  ];

  return (
    <section className="week" aria-labelledby="week-title">
      <h2 id="week-title">My week</h2>
      <p className="week__lead">
        Place your meals on the days you’ll eat them. Tap any spot to pick a meal, a quick option like “Leftovers,” or type your own.
      </p>

      {stale && filledCount > 0 ? (
        <div className="card week-notice no-print">
          <p>
            This plan was for the week of {shortDate(start)}.{' '}
            <button type="button" className="btn btn--secondary btn--small" onClick={() => dispatch({ type: 'clearWeek' })}>
              Start this week’s plan
            </button>
          </p>
        </div>
      ) : (
        <div className="week-controls no-print" role="radiogroup" aria-label="Which week">
          {weekChoices.map((w) => (
            <button
              key={w.start}
              type="button"
              role="radio"
              className="chip"
              aria-checked={start === w.start}
              aria-pressed={start === w.start}
              onClick={() => dispatch({ type: 'setWeekStart', start: w.start })}
            >
              {w.label} · {shortDate(w.start)}–{shortDate(addDays(w.start, 6))}
            </button>
          ))}
        </div>
      )}

      {reminders.length > 0 && (
        <div className="card week-reminders" role="note" aria-label="Reminders for tonight">
          <Icon name="moon" size={20} />
          <ul>
            {reminders.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="week-actions no-print">
        {notPlaced.length > 0 && (
          <button type="button" className="btn btn--primary" onClick={() => dispatch({ type: 'fillWeek', start, meals: selectedMeals })}>
            Fill in my week
          </button>
        )}
        {filledCount > 0 && (
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => {
              track('week_print');
              window.print();
            }}
          >
            Print my week
          </button>
        )}
      </div>
      {notPlaced.length > 0 && (
        <p className="small muted no-print week-actions__hint">
          {notPlaced.length === 1 ? '1 meal you picked isn’t' : `${notPlaced.length} meals you picked aren’t`} on your week yet. “Fill in”
          places them across the week, with longer recipes on the weekend. You can change any of them.
        </p>
      )}
      {selectedMeals.length === 0 && filledCount === 0 && (
        <p className="small muted no-print">
          Tip: pick meal ideas in the planner first, then come back to place them here.{' '}
          <button type="button" className="link-btn" onClick={onFindMeals}>
            Find meal ideas
          </button>
        </p>
      )}

      <ol className="week-days no-print">
        {DAY_NAMES.map((dayName, day) => {
          const date = addDays(start, day);
          const isToday = date === today;
          return (
            <li key={day} className={`card week-day${isToday ? ' is-today' : ''}`} aria-label={`${dayName}, ${shortDate(date)}${isToday ? ', today' : ''}`}>
              <h3 className="week-day__title">
                {dayName} <span className="week-day__date">{shortDate(date)}</span>
                {isToday && <span className="week-day__today">Today</span>}
              </h3>
              <ul className="week-slots">
                {WEEK_CATEGORIES.map((category) => {
                  const slot = plan.slots[slotKey(day, category)];
                  const id = `slot-${day}-${category}`;
                  const meal = slot?.kind === 'meal' ? mealsById.get(slot.mealId) : undefined;
                  const label = MEAL_CATEGORY_LABELS[category];
                  return (
                    <li key={category} className="week-slot">
                      <span className="week-slot__type">{label}</span>
                      <button
                        id={id}
                        type="button"
                        className={`week-slot__btn${slot ? ' is-filled' : ''}${slot && slot.kind !== 'meal' ? ' is-other' : ''}`}
                        aria-label={slot ? `${dayName} ${label.toLowerCase()}: ${slotLabel(slot, mealsById)}. Change` : `Add ${dayName} ${label.toLowerCase()}`}
                        onClick={() => {
                          lastTrigger.current = id;
                          setOpen({ day, category });
                        }}
                      >
                        {slot ? (
                          <>
                            <span className="week-slot__name">{slotLabel(slot, mealsById)}</span>
                            {meal && (
                              <span className="week-slot__meta">
                                <MealTime meal={meal} />
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="week-slot__add">+ Add</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>

      {/* A simple table for the fridge. */}
      <table className="week-print print-only">
        <caption>
          My week: {shortDate(start)}–{shortDate(addDays(start, 6))}
        </caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            {WEEK_CATEGORIES.map((c) => (
              <th key={c} scope="col">
                {MEAL_CATEGORY_LABELS[c]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAY_NAMES.map((dayName, day) => (
            <tr key={day}>
              <th scope="row">
                {dayName}
                <br />
                <span className="small">{shortDate(addDays(start, day))}</span>
              </th>
              {WEEK_CATEGORIES.map((c) => {
                const slot = plan.slots[slotKey(day, c)];
                return <td key={c}>{slot ? slotLabel(slot, mealsById) : ''}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="week-footer no-print">
        <button type="button" className="btn btn--secondary" onClick={onOpenPlanner}>
          ← Back to the planner
        </button>
        {filledCount > 0 && (
          <button type="button" className="link-btn" onClick={() => window.confirm(WEEK_CLEAR_CONFIRM) && dispatch({ type: 'clearWeek' })}>
            Clear this week’s plan
          </button>
        )}
      </div>

      {open && (
        <SlotPicker
          dayName={DAY_NAMES[open.day]}
          category={open.category}
          current={plan.slots[slotKey(open.day, open.category)]}
          placedOn={placedOn}
          onChoose={choose}
          onClose={closePicker}
          onFindMeals={() => {
            setOpen(null);
            onFindMeals();
          }}
        />
      )}
    </section>
  );
}

/** A small "Tonight" note on other pages, so the reminder is seen when they open the app. */
export function TonightBanner({ onOpenWeek }: { onOpenWeek: () => void }) {
  const { state, meals } = usePlanner();
  const mealsById = useMemo(() => new Map(meals.map((m) => [m.id, m])), [meals]);
  const today = todayIso();
  if (daysBetween(planStart(state.weekPlan, today), today) > 6) return null;
  const reminders = tonightReminders(state.weekPlan, mealsById, today);
  if (reminders.length === 0) return null;
  return (
    <div className="card week-reminders week-reminders--banner no-print" role="note" aria-label="Reminder for tonight">
      <Icon name="moon" size={20} />
      <div>
        <p>{reminders[0]}</p>
        <button type="button" className="link-btn" onClick={onOpenWeek}>
          See my week →
        </button>
      </div>
    </div>
  );
}
