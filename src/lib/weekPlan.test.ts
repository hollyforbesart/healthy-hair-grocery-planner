import { describe, expect, it } from 'vitest';
import { MEALS } from '../data/meals';
import { createInitialState, hydrateState, plannerReducer } from '../state/plannerReducer';
import { eventsForAction } from './analyticsActions';
import {
  DEFAULT_FILL_PREFERENCES,
  emptyWeekPlan,
  fillWeek,
  hydrateWeekPlan,
  mealsOn,
  openSpots,
  repeatSlot,
  slotKey,
  sundayOf,
  tonightReminders,
  unplacedMeals,
  hydrateFillPreferences,
  type FillPreferences,
  type WeekPlan,
} from './weekPlan';

const byId = new Map(MEALS.map((m) => [m.id, m]));
const pick = (category: string, filter: (m: (typeof MEALS)[number]) => boolean = () => true) =>
  MEALS.filter((m) => m.category === category && filter(m));

describe('week dates', () => {
  it('starts the week on Sunday', () => {
    expect(sundayOf('2026-10-20')).toBe('2026-10-18'); // a Tuesday
    expect(sundayOf('2026-10-18')).toBe('2026-10-18');
    expect(sundayOf('2026-10-24')).toBe('2026-10-18'); // Saturday
  });
});

const ONCE: FillPreferences = { ...DEFAULT_FILL_PREFERENCES, breakfast: 'once', snack: 'once', leftoverLunches: false };
const rows = (plan: WeekPlan, category: string) => Object.entries(plan.slots).filter(([k]) => k.endsWith(`-${category}`));

describe('fill in my week', () => {
  const dinners = [...pick('dinner', (m) => m.timeCategory !== 'more-involved').slice(0, 2), pick('dinner', (m) => m.timeCategory === 'more-involved')[0]];
  const breakfasts = pick('breakfast').slice(0, 2);

  it('places each meal once in its own row, spread out, with longer recipes on the weekend', () => {
    const plan = fillWeek(emptyWeekPlan(), [...dinners, breakfasts[0]], '2026-10-18', ONCE);
    expect(rows(plan, 'dinner')).toHaveLength(3);
    const slowDay = rows(plan, 'dinner').find(([, s]) => s.kind === 'meal' && s.mealId === dinners[2].id)![0];
    expect(['0-dinner', '6-dinner']).toContain(slowDay);
    expect(rows(plan, 'breakfast')).toHaveLength(1);
    expect(unplacedMeals(plan, [...dinners, breakfasts[0]])).toHaveLength(0);
  });

  it('repeats breakfasts all week, taking turns, and turns dinners into next-day lunches', () => {
    const plan = fillWeek(emptyWeekPlan(), [dinners[0], ...breakfasts], '2026-10-18', DEFAULT_FILL_PREFERENCES);
    const b = rows(plan, 'breakfast').map(([, s]) => (s as { mealId: string }).mealId);
    expect(b).toHaveLength(7);
    expect(new Set(b)).toEqual(new Set(breakfasts.map((m) => m.id)));
    const [dinnerKey] = rows(plan, 'dinner')[0];
    const day = Number(dinnerKey[0]);
    if (day < 6) expect(plan.slots[slotKey(day + 1, 'lunch')]).toEqual({ kind: 'leftovers', mealId: dinners[0].id });
  });

  it('makes each dinner last two nights for batch cooking, and can keep the weekend open and plan a night off', () => {
    const prefs: FillPreferences = { ...ONCE, dinner: 'twice', weekendOpen: true, nightOff: true };
    const plan = fillWeek(emptyWeekPlan(), dinners.slice(0, 2), '2026-10-18', prefs);
    expect(plan.slots[slotKey(5, 'dinner')]).toEqual({ kind: 'quick', id: 'takeout' });
    expect(rows(plan, 'dinner').filter(([, s]) => s.kind === 'leftovers')).toHaveLength(2);
    expect(Object.keys(plan.slots).some((k) => k.startsWith('0-') || k.startsWith('6-'))).toBe(false);
  });

  it('keeps what people already placed, and never fills more than the 7 days', () => {
    const start: WeekPlan = { start: '2026-10-18', slots: { [slotKey(2, 'dinner')]: { kind: 'quick', id: 'eating-out' } } };
    const many = pick('dinner').slice(0, 9);
    const plan = fillWeek(start, many, '2026-10-18', ONCE);
    expect(plan.slots[slotKey(2, 'dinner')]).toEqual({ kind: 'quick', id: 'eating-out' });
    expect(Object.keys(plan.slots)).toHaveLength(7);
    expect(unplacedMeals(plan, many)).toHaveLength(3);
  });

  it('repeats one choice on empty days only, but leftovers replace what was there', () => {
    const plan: WeekPlan = { start: '2026-10-18', slots: { [slotKey(3, 'breakfast')]: { kind: 'custom', text: 'Brunch out' } } };
    const oats = { kind: 'meal', mealId: breakfasts[0].id } as const;
    const every = repeatSlot(plan, 'breakfast', oats, [1, 2, 3, 4, 5], '2026-10-18');
    expect(rows(every, 'breakfast')).toHaveLength(5);
    expect(every.slots[slotKey(3, 'breakfast')]).toEqual({ kind: 'custom', text: 'Brunch out' });
    const leftovers = repeatSlot(plan, 'breakfast', { kind: 'leftovers', mealId: 'x' }, [3], '2026-10-18', true);
    expect(leftovers.slots[slotKey(3, 'breakfast')]).toEqual({ kind: 'leftovers', mealId: 'x' });
  });

  it('lists the spots still open', () => {
    expect(openSpots(fillWeek(emptyWeekPlan(), breakfasts, '2026-10-18', DEFAULT_FILL_PREFERENCES)).map((r) => r.category)).toEqual(['lunch', 'dinner', 'snack']);
  });
});

describe('tonight reminders', () => {
  const soak = MEALS.find((m) => m.makeAhead)!;
  const slow = MEALS.find((m) => m.timeCategory === 'more-involved' && !m.makeAhead)!;
  const quick = MEALS.find((m) => m.timeCategory === 'quick' && !m.makeAhead)!;

  it('reminds the night before about meals that soak or take a while', () => {
    const plan: WeekPlan = {
      start: '2026-10-18',
      slots: {
        [slotKey(3, soak.category)]: { kind: 'meal', mealId: soak.id }, // Wednesday
        [slotKey(3, 'snack')]: { kind: 'meal', mealId: quick.id },
        [slotKey(3, slow.category === soak.category ? 'dinner' : slow.category)]: { kind: 'meal', mealId: slow.id },
      },
    };
    const tuesday = tonightReminders(plan, byId, '2026-10-20');
    expect(tuesday).toHaveLength(2);
    expect(tuesday[0]).toContain(soak.name);
    expect(tuesday.join(' ')).toContain('Tonight');
    expect(tuesday.join(' ')).toContain(slow.name);
    expect(tonightReminders(plan, byId, '2026-10-21')).toEqual([]);
    expect(tonightReminders(plan, byId, '2026-11-10')).toEqual([]); // a different week
  });

  it('knows what is on a given day', () => {
    const plan: WeekPlan = { start: '2026-10-18', slots: { [slotKey(0, 'lunch')]: { kind: 'custom', text: 'Brunch at Sam’s' } } };
    expect(mealsOn(plan, '2026-10-18', '2026-10-18')).toEqual([{ category: 'lunch', slot: { kind: 'custom', text: 'Brunch at Sam’s' } }]);
    expect(mealsOn(plan, '2026-10-25', '2026-10-18')).toEqual([]);
  });
});

describe('saving the week', () => {
  it('saves and reloads, drops anything malformed, and clears with a new week', () => {
    let state = createInitialState();
    const meal = pick('dinner')[0];
    state = plannerReducer(state, { type: 'toggleMeal', mealId: meal.id });
    state = plannerReducer(state, { type: 'setWeekSlot', start: '2026-10-18', day: 1, category: 'dinner', slot: { kind: 'meal', mealId: meal.id } });
    state = plannerReducer(state, { type: 'setWeekSlot', start: '2026-10-18', day: 2, category: 'lunch', slot: { kind: 'custom', text: 'Leftover soup' } });
    state = plannerReducer(state, { type: 'setWeekSlot', start: '2026-10-18', day: 3, category: 'snack', slot: { kind: 'quick', id: 'skipping' } });
    state = plannerReducer(state, { type: 'setWeekSlot', start: '2026-10-18', day: 4, category: 'lunch', slot: { kind: 'leftovers', mealId: meal.id } });
    expect(hydrateState(JSON.parse(JSON.stringify(state)))).toEqual(state);

    expect(
      hydrateWeekPlan({ start: 'nope', slots: { '9-dinner': { kind: 'meal', mealId: 'x' }, '1-brunch': {}, '2-lunch': { kind: 'quick', id: 'made-up' }, '3-dinner': { kind: 'custom', text: '   ' } } }),
    ).toEqual(emptyWeekPlan());

    const removed = plannerReducer(state, { type: 'setWeekSlot', start: '2026-10-18', day: 3, category: 'snack', slot: null });
    expect(Object.keys(removed.weekPlan.slots)).toHaveLength(3);
    expect(plannerReducer(state, { type: 'startNewWeek', today: '2026-10-25' }).weekPlan).toEqual(emptyWeekPlan());

    // "How do you like to eat?" answers are remembered, even across a new week.
    const filled = plannerReducer(state, { type: 'fillWeek', start: '2026-10-18', meals: [], preferences: { ...ONCE, dinner: 'twice' } });
    expect(hydrateState(JSON.parse(JSON.stringify(filled))).fillPreferences.dinner).toBe('twice');
    expect(plannerReducer(filled, { type: 'startNewWeek' }).fillPreferences.dinner).toBe('twice');
    expect(hydrateFillPreferences({ breakfast: 'sometimes', weekendOpen: 'yes' })).toEqual(DEFAULT_FILL_PREFERENCES);
  });

  it('counts week planning anonymously, never with what people typed', () => {
    const before = createInitialState();
    const action = { type: 'setWeekSlot', start: '2026-10-18', day: 2, category: 'lunch', slot: { kind: 'custom', text: 'Lunch with Jo' } } as const;
    const events = eventsForAction(before, plannerReducer(before, action), action);
    expect(events).toEqual([{ name: 'week_slot_set', value: 'custom' }]);
    const fill = { type: 'fillWeek', start: '2026-10-18', meals: pick('dinner').slice(0, 3), preferences: ONCE } as const;
    expect(eventsForAction(before, plannerReducer(before, fill), fill)).toEqual([{ name: 'week_filled', value: '3' }]);
    const repeat = { type: 'repeatWeekSlot', start: '2026-10-18', category: 'lunch', slot: { kind: 'leftovers', mealId: 'x' }, days: [2], reason: 'leftovers' } as const;
    expect(eventsForAction(before, plannerReducer(before, repeat), repeat)).toEqual([{ name: 'week_repeat', value: 'leftovers' }]);
  });
});

describe('repeat my picks', () => {
  it('uses the pick that is placed least, so a second breakfast is not left out', () => {
    const [oats, smoothie] = MEALS.filter((m) => m.category === 'breakfast').slice(0, 2);
    const start: WeekPlan = { start: '2026-10-25', slots: {} };
    for (const d of [0, 1, 2, 3, 4, 5]) start.slots[slotKey(d, 'breakfast')] = { kind: 'meal', mealId: oats.id };
    const plan = fillWeek(start, [oats, smoothie], '2026-10-25', DEFAULT_FILL_PREFERENCES);
    expect(plan.slots[slotKey(6, 'breakfast')]).toEqual({ kind: 'meal', mealId: smoothie.id });
  });
});
