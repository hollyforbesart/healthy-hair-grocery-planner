import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Icon } from '../components/Icon';
import { MEAL_CATEGORY_LABELS, TIME_CATEGORIES } from '../data/categories';
import { mealPhotoUrl } from '../data/mealPhotos';
import { track } from '../lib/analytics';
import { takeSpotToReopen } from '../lib/scheduleTrip';
import {
  DAY_NAMES,
  MAX_CUSTOM_LENGTH,
  QUICK_PICKS,
  WEEK_CATEGORIES,
  addDays,
  cleanCustomText,
  daysBetween,
  openSpots,
  planStart,
  prepNotes,
  shortDate,
  slotKey,
  slotLabel,
  tonightReminders,
  type FillPreferences,
  type WeekSlot,
} from '../lib/weekPlan';
import { usePlanner } from '../state/PlannerContext';
import { todayIso } from '../state/plannerReducer';
import type { MealCategory, MealTemplate } from '../types';

const WEEK_CLEAR_CONFIRM = 'Clear everything on this week’s meal schedule? Your meals and grocery list stay as they are.';
const lower = (c: MealCategory) => MEAL_CATEGORY_LABELS[c].toLowerCase();

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

/** A panel that slides up from the bottom on phones (centered on bigger screens). */
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
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

  return (
    <div className="week-sheet-backdrop" onClick={onClose}>
      <div className="week-sheet" role="dialog" aria-modal="true" aria-labelledby="week-sheet-title" onClick={(e) => e.stopPropagation()}>
        <div className="week-sheet__head">
          <h3 id="week-sheet-title" tabIndex={-1} ref={headingRef}>
            {title}
          </h3>
          <button type="button" className="week-sheet__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="week-sheet__body">{children}</div>
      </div>
    </div>
  );
}

interface PickerProps {
  day: number;
  category: MealCategory;
  current: WeekSlot | undefined;
  /** Yesterday's dinner, offered as leftovers. */
  leftoversFrom: MealTemplate | undefined;
  placedOn: Map<string, string[]>;
  onChoose: (slot: WeekSlot | null) => void;
  onRepeat: (days: number[], reason: 'every-day' | 'weekdays') => void;
  onLeftovers: (day: number, category: MealCategory, mealId: string) => void;
  onClose: () => void;
  onFindMeals: (category: MealCategory) => void;
}

/** The sheet for one spot: their meals, leftovers, quick options or their own words; then "also add it to…". */
function SlotPicker({ day, category, current, leftoversFrom, placedOn, onChoose, onRepeat, onLeftovers, onClose, onFindMeals }: PickerProps) {
  const { selectedMeals } = usePlanner();
  const [text, setText] = useState(current?.kind === 'custom' ? current.text : '');
  const [added, setAdded] = useState<MealTemplate | null>(null);
  const dayName = DAY_NAMES[day];
  const sameType = selectedMeals.filter((m) => m.category === category);
  const otherTypes = selectedMeals.filter((m) => m.category !== category);

  if (added) {
    // Step 2: repeat it, or save leftovers for tomorrow.
    const options: { label: string; run: () => void }[] =
      category === 'dinner'
        ? day < 6
          ? [
              { label: 'Tomorrow’s lunch (leftovers)', run: () => onLeftovers(day + 1, 'lunch', added.id) },
              { label: 'Tomorrow’s dinner (leftovers)', run: () => onLeftovers(day + 1, 'dinner', added.id) },
            ]
          : []
        : [
            { label: 'Every day this week', run: () => onRepeat([0, 1, 2, 3, 4, 5, 6], 'every-day') },
            { label: 'Weekdays (Mon–Fri)', run: () => onRepeat([1, 2, 3, 4, 5], 'weekdays') },
          ];
    return (
      <Sheet title={`${dayName} ${lower(category)}`} onClose={onClose}>
        <p className="week-added" role="status">
          <Icon name="check" size={18} />
          <span>
            Added <strong>{added.name}</strong> to {dayName} {lower(category)}.
          </span>
        </p>
        {options.length > 0 && (
          <>
            <h4>Also add it to</h4>
            <div className="week-repeat">
              {options.map((o) => (
                <button key={o.label} type="button" className="btn btn--secondary" onClick={o.run}>
                  {o.label}
                </button>
              ))}
            </div>
            {category !== 'dinner' && <p className="small muted">Only empty spots are filled; anything you’ve already planned stays.</p>}
          </>
        )}
        <p className="week-sheet__done">
          <button type="button" className="btn btn--primary" onClick={onClose}>
            Done
          </button>
        </p>
      </Sheet>
    );
  }

  const mealButton = (meal: MealTemplate) => {
    const chosen = current?.kind === 'meal' && current.mealId === meal.id;
    const elsewhere = placedOn.get(meal.id);
    const photo = mealPhotoUrl(meal.id);
    return (
      <li key={meal.id}>
        <button
          type="button"
          className={`week-pick${chosen ? ' is-chosen' : ''}`}
          aria-pressed={chosen}
          onClick={() => {
            onChoose({ kind: 'meal', mealId: meal.id });
            setAdded(meal);
          }}
        >
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
    if (clean) {
      onChoose({ kind: 'custom', text: clean });
      onClose();
    }
  };
  const chooseAndClose = (slot: WeekSlot) => {
    onChoose(slot);
    onClose();
  };

  return (
    <Sheet title={`${dayName} ${lower(category)}`} onClose={onClose}>
      {leftoversFrom && (
        <>
          <h4>Leftovers</h4>
          <button
            type="button"
            className={`week-pick week-pick--leftovers${current?.kind === 'leftovers' ? ' is-chosen' : ''}`}
            onClick={() => chooseAndClose({ kind: 'leftovers', mealId: leftoversFrom.id })}
          >
            <span className="week-pick__text">
              <span className="week-pick__name">Leftovers: {leftoversFrom.name}</span>
              <span className="week-pick__meta">From {DAY_NAMES[day - 1]}’s dinner</span>
            </span>
          </button>
        </>
      )}

      {selectedMeals.length === 0 ? (
        <p className="small muted">
          You haven’t picked any meal ideas yet.{' '}
          <button type="button" className="link-btn" onClick={() => onFindMeals(category)}>
            Find meal ideas
          </button>{' '}
          or use the options below.
        </p>
      ) : (
        <>
          {sameType.length > 0 && (
            <>
              <h4>Your {lower(category)} picks</h4>
              <ul className="week-picks">{sameType.map(mealButton)}</ul>
            </>
          )}
          {otherTypes.length > 0 && (
            <>
              <h4>{sameType.length > 0 ? 'Your other picks' : 'Your picks'}</h4>
              <ul className="week-picks">{otherTypes.map(mealButton)}</ul>
            </>
          )}
          <p className="small week-sheet__more">
            <button type="button" className="link-btn" onClick={() => onFindMeals(category)}>
              Find more {lower(category)} ideas
            </button>
          </p>
        </>
      )}

      <h4>Quick options</h4>
      <div className="chip-list">
        {QUICK_PICKS.map((q) => (
          <button
            key={q.id}
            type="button"
            className="chip"
            aria-pressed={current?.kind === 'quick' && current.id === q.id}
            onClick={() => chooseAndClose({ kind: 'quick', id: q.id })}
          >
            {q.label}
          </button>
        ))}
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
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              onChoose(null);
              onClose();
            }}
          >
            Remove from {dayName}
          </button>
        </p>
      )}
    </Sheet>
  );
}

/** The "How do you like to eat?" questions before filling in the week. */
function FillSheet({ initial, onFill, onClose }: { initial: FillPreferences; onFill: (p: FillPreferences) => void; onClose: () => void }) {
  const [prefs, setPrefs] = useState(initial);
  const set = (patch: Partial<FillPreferences>) => setPrefs((p) => ({ ...p, ...patch }));

  const choice = <K extends 'breakfast' | 'lunch' | 'dinner' | 'snack'>(
    key: K,
    label: string,
    example: string,
    options: { value: FillPreferences[K]; label: string }[],
  ) => (
    <fieldset className="week-fill__q">
      <legend>{label}</legend>
      <p className="week-fill__example">{example}</p>
      <div className="week-fill__options">
        {options.map((o) => (
          <label key={o.value} className={`week-fill__option${prefs[key] === o.value ? ' is-on' : ''}`}>
            <input type="radio" name={`fill-${key}`} checked={prefs[key] === o.value} onChange={() => set({ [key]: o.value } as Partial<FillPreferences>)} />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );

  return (
    <Sheet title="How do you like to eat?" onClose={onClose}>
      <p className="small muted">We’ll fill your empty spots with the meals you picked. Anything you’ve already planned stays. We’ll remember your answers.</p>
      {choice('breakfast', 'Breakfasts', 'Repeat: the same oats every morning, or taking turns between your picks. Once: each breakfast on one day.', [
        { value: 'rotate', label: 'Repeat my picks all week' },
        { value: 'once', label: 'Each one once' },
      ])}
      {choice('lunch', 'Lunches', 'Repeat suits meal prep: one batch of salad for the work week.', [
        { value: 'once', label: 'Each one once' },
        { value: 'rotate', label: 'Repeat my picks all week (meal prep)' },
      ])}
      <label className="week-fill__check">
        <input type="checkbox" checked={prefs.leftoverLunches} onChange={(e) => set({ leftoverLunches: e.target.checked })} />
        <span>
          Dinner leftovers become the next day’s lunch
          <span className="week-fill__example">e.g. Monday’s dinner is Tuesday’s lunch</span>
        </span>
      </label>
      {choice('dinner', 'Dinners', 'Two nights: cook a big batch on Monday and have it again on Tuesday.', [
        { value: 'once', label: 'Each one once' },
        { value: 'twice', label: 'Each one lasts two nights (batch cooking)' },
      ])}
      {choice('snack', 'Snacks', 'Repeat: the same go-to snack each day.', [
        { value: 'rotate', label: 'Repeat my picks all week' },
        { value: 'once', label: 'Each one once' },
      ])}
      <fieldset className="week-fill__q">
        <legend>Anything else?</legend>
        <label className="week-fill__check">
          <input type="checkbox" checked={prefs.nightOff} onChange={(e) => set({ nightOff: e.target.checked })} />
          Plan a night off cooking (Friday takeout)
        </label>
        <label className="week-fill__check">
          <input type="checkbox" checked={prefs.weekendOpen} onChange={(e) => set({ weekendOpen: e.target.checked })} />
          Leave the weekend open
        </label>
      </fieldset>
      <p className="week-sheet__done">
        <button type="button" className="btn btn--primary" onClick={() => onFill(prefs)}>
          Fill in my schedule
        </button>
      </p>
    </Sheet>
  );
}

export function WeekPage({ onOpenPlanner, onFindMeals }: { onOpenPlanner: () => void; onFindMeals: (category?: MealCategory, day?: number) => void }) {
  const { state, dispatch, meals, selectedMeals } = usePlanner();
  const plan = state.weekPlan;
  const today = todayIso();
  const start = planStart(plan, today);
  const stale = daysBetween(start, today) > 6;
  const mealsById = useMemo(() => new Map(meals.map((m) => [m.id, m])), [meals]);
  const reminders = stale ? [] : tonightReminders(plan, mealsById, today);
  const open = openSpots(plan);
  const [picker, setPicker] = useState<{ day: number; category: MealCategory } | null>(null);
  const [filling, setFilling] = useState(false);
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

  const closeSheet = () => {
    setPicker(null);
    setFilling(false);
    const id = lastTrigger.current;
    requestAnimationFrame(() => id && document.getElementById(id)?.focus());
  };

  const filledCount = Object.keys(plan.slots).length;
  const notes = prepNotes(plan, mealsById);
  // The first empty spot of a meal type, from today on (or from Sunday).
  const firstEmpty = (category: MealCategory) => {
    const from = Math.max(0, Math.min(6, daysBetween(start, today)));
    return [...[0, 1, 2, 3, 4, 5, 6].slice(from), ...[0, 1, 2, 3, 4, 5, 6].slice(0, from)].find((d) => !plan.slots[slotKey(d, category)]);
  };

  // Back from meal ideas: reopen the spot they were filling, if it's still empty.
  useEffect(() => {
    const spot = takeSpotToReopen();
    if (spot && !plan.slots[slotKey(spot.day, spot.category)]) {
      lastTrigger.current = `slot-${spot.day}-${spot.category}`;
      setPicker(spot);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const notesFor = (evening: number) => notes.filter((n) => n.evening === evening);
  const nightName = (evening: number) => (evening < 0 ? 'Saturday night, before the week starts' : `${DAY_NAMES[evening]} night`);
  const yesterdaysDinner = (day: number) => {
    const slot = day > 0 ? plan.slots[slotKey(day - 1, 'dinner')] : undefined;
    return slot && (slot.kind === 'meal' || slot.kind === 'leftovers') ? mealsById.get(slot.mealId) : undefined;
  };

  return (
    <section className="week" aria-labelledby="week-title">
      <h2 id="week-title">Your meal schedule</h2>
      <p className="week__lead">
        Place your meals on the days you’ll eat them. Tap any spot to pick a meal, leftovers, a quick option like “Eating out,” or type your own.
      </p>

      {stale && filledCount > 0 ? (
        <div className="card week-notice no-print">
          <p>
            This schedule was for the week of {shortDate(start)}.{' '}
            <button type="button" className="btn btn--secondary btn--small" onClick={() => dispatch({ type: 'clearWeek' })}>
              Start this week’s schedule
            </button>
          </p>
        </div>
      ) : (
        <p className="week__dates">
          Week of {shortDate(start)}–{shortDate(addDays(start, 6))}
        </p>
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
        {open.length > 0 && (
          <button
            id="week-fill"
            type="button"
            className="btn btn--primary"
            onClick={() => {
              lastTrigger.current = 'week-fill';
              setFilling(true);
            }}
          >
            Fill in my schedule
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
            Print my schedule
          </button>
        )}
      </div>

      {open.length > 0 && filledCount > 0 && (
        <div className="card week-open no-print" role="note" aria-label="Spots still open">
          <h3>Still open</h3>
          <ul>
            {open.map(({ category, open: n }) => (
              <li key={category}>
                <strong>
                  {n} {lower(category)} {n === 1 ? 'spot' : 'spots'}
                </strong>
                {selectedMeals.some((m) => m.category === category) ? '' : ` (no ${lower(category)} ideas picked yet)`} ·{' '}
                <button type="button" className="link-btn" onClick={() => onFindMeals(category, firstEmpty(category))}>
                  Find {lower(category)} ideas
                </button>
              </li>
            ))}
          </ul>
          <p className="small muted">
            Tap <em>+ Add</em> on any day to choose a meal, leftovers or a quick option like “Eating out,” or type your own. To fill a whole row with
            what you picked, use <em>Fill in my schedule</em> and choose “Repeat my picks all week.”
          </p>
        </div>
      )}
      {selectedMeals.length === 0 && filledCount === 0 && (
        <p className="small muted no-print">
          Tip: pick meal ideas in the planner first, then come back to place them here.{' '}
          <button type="button" className="link-btn" onClick={() => onFindMeals()}>
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
              {day === 0 && notesFor(-1).length > 0 && (
                <ul className="week-day__notes">
                  {notesFor(-1).map((n) => (
                    <li key={n.text}>
                      <Icon name="moon" size={14} />
                      <span>
                        <strong>The night before:</strong> {n.text}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <ul className="week-slots">
                {WEEK_CATEGORIES.map((category) => {
                  const slot = plan.slots[slotKey(day, category)];
                  const id = `slot-${day}-${category}`;
                  const meal = slot?.kind === 'meal' ? mealsById.get(slot.mealId) : undefined;
                  const label = MEAL_CATEGORY_LABELS[category];
                  const kindClass = !slot ? '' : slot.kind === 'meal' ? ' is-filled' : slot.kind === 'leftovers' ? ' is-filled is-leftovers' : ' is-filled is-other';
                  return (
                    <li key={category} className="week-slot">
                      <span className="week-slot__type">{label}</span>
                      <button
                        id={id}
                        type="button"
                        className={`week-slot__btn${kindClass}`}
                        aria-label={slot ? `${dayName} ${label.toLowerCase()}: ${slotLabel(slot, mealsById)}. Change` : `Add ${dayName} ${label.toLowerCase()}`}
                        onClick={() => {
                          lastTrigger.current = id;
                          setPicker({ day, category });
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
              {notesFor(day).length > 0 && (
                <ul className="week-day__notes">
                  {notesFor(day).map((n) => (
                    <li key={n.text}>
                      <Icon name="moon" size={14} />
                      <span>
                        <strong>Tonight:</strong> {n.text}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>

      {/* A simple table for the fridge. */}
      <table className="week-print print-only">
        <caption>
          Meal schedule: {shortDate(start)}–{shortDate(addDays(start, 6))}
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
      {notes.length > 0 && (
        <div className="week-print-notes print-only">
          <h3>Prep reminders</h3>
          <ul>
            {notes.map((n) => (
              <li key={n.evening + n.text}>
                <strong>{nightName(n.evening)}:</strong> {n.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="week-footer no-print">
        <button type="button" className="btn btn--secondary" onClick={onOpenPlanner}>
          ← Back to the planner
        </button>
        {filledCount > 0 && (
          <button type="button" className="link-btn" onClick={() => window.confirm(WEEK_CLEAR_CONFIRM) && dispatch({ type: 'clearWeek' })}>
            Clear this week’s schedule
          </button>
        )}
      </div>

      {picker && (
        <SlotPicker
          day={picker.day}
          category={picker.category}
          current={plan.slots[slotKey(picker.day, picker.category)]}
          leftoversFrom={picker.category === 'breakfast' ? undefined : yesterdaysDinner(picker.day)}
          placedOn={placedOn}
          onChoose={(slot) => dispatch({ type: 'setWeekSlot', start, day: picker.day, category: picker.category, slot })}
          onRepeat={(days, reason) => {
            const slot = plan.slots[slotKey(picker.day, picker.category)] ?? null;
            if (slot) dispatch({ type: 'repeatWeekSlot', start, category: picker.category, slot, days, reason });
            closeSheet();
          }}
          onLeftovers={(day, category, mealId) => {
            dispatch({ type: 'repeatWeekSlot', start, category, slot: { kind: 'leftovers', mealId }, days: [day], reason: 'leftovers' });
            closeSheet();
          }}
          onClose={closeSheet}
          onFindMeals={(category) => {
            setPicker(null);
            onFindMeals(category, picker.day);
          }}
        />
      )}
      {filling && (
        <FillSheet
          initial={state.fillPreferences}
          onClose={closeSheet}
          onFill={(preferences) => {
            dispatch({ type: 'fillWeek', start, meals: selectedMeals, preferences });
            closeSheet();
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
          See my meal schedule →
        </button>
      </div>
    </div>
  );
}
