import { describe, expect, it } from 'vitest';
import { MEALS } from '../data/meals';
import { createInitialState, hydrateState, plannerReducer } from '../state/plannerReducer';
import { eventsForAction } from './analyticsActions';
import {
  emptyWeekPlan,
  fillWeek,
  hydrateWeekPlan,
  mealsOn,
  slotKey,
  sundayOf,
  tonightReminders,
  unplacedMeals,
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

describe('fill in my meals', () => {
  it('puts each meal in its own row, spread out, with longer recipes on the weekend', () => {
    const dinners = [...pick('dinner', (m) => m.timeCategory !== 'more-involved').slice(0, 2), pick('dinner', (m) => m.timeCategory === 'more-involved')[0]];
    const breakfast = pick('breakfast')[0];
    const plan = fillWeek(emptyWeekPlan(), [...dinners, breakfast], '2026-10-18');
    const dinnerDays = Object.entries(plan.slots).filter(([k]) => k.endsWith('-dinner'));
    expect(dinnerDays).toHaveLength(3);
    expect(new Set(dinnerDays.map(([k]) => k)).size).toBe(3);
    const slowDay = dinnerDays.find(([, s]) => s.kind === 'meal' && s.mealId === dinners[2].id)![0];
    expect(['0-dinner', '6-dinner']).toContain(slowDay);
    expect(Object.keys(plan.slots).filter((k) => k.endsWith('-breakfast'))).toHaveLength(1);
    expect(unplacedMeals(plan, [...dinners, breakfast])).toHaveLength(0);
  });

  it('keeps what people already placed, and never fills more than the 7 days', () => {
    const start: WeekPlan = { start: '2026-10-18', slots: { [slotKey(2, 'dinner')]: { kind: 'quick', id: 'eating-out' } } };
    const dinners = pick('dinner').slice(0, 9);
    const plan = fillWeek(start, dinners, '2026-10-18');
    expect(plan.slots[slotKey(2, 'dinner')]).toEqual({ kind: 'quick', id: 'eating-out' });
    expect(Object.keys(plan.slots)).toHaveLength(7);
    expect(unplacedMeals(plan, dinners)).toHaveLength(3);
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
    expect(hydrateState(JSON.parse(JSON.stringify(state)))).toEqual(state);

    expect(
      hydrateWeekPlan({ start: 'nope', slots: { '9-dinner': { kind: 'meal', mealId: 'x' }, '1-brunch': {}, '2-lunch': { kind: 'quick', id: 'made-up' }, '3-dinner': { kind: 'custom', text: '   ' } } }),
    ).toEqual(emptyWeekPlan());

    const removed = plannerReducer(state, { type: 'setWeekSlot', start: '2026-10-18', day: 3, category: 'snack', slot: null });
    expect(Object.keys(removed.weekPlan.slots)).toHaveLength(2);
    expect(plannerReducer(state, { type: 'startNewWeek', today: '2026-10-25' }).weekPlan).toEqual(emptyWeekPlan());
  });

  it('counts week planning anonymously, never with what people typed', () => {
    const before = createInitialState();
    const action = { type: 'setWeekSlot', start: '2026-10-18', day: 2, category: 'lunch', slot: { kind: 'custom', text: 'Lunch with Jo' } } as const;
    const events = eventsForAction(before, plannerReducer(before, action), action);
    expect(events).toEqual([{ name: 'week_slot_set', value: 'custom' }]);
    const fill = { type: 'fillWeek', start: '2026-10-18', meals: pick('dinner').slice(0, 3) } as const;
    expect(eventsForAction(before, plannerReducer(before, fill), fill)).toEqual([{ name: 'week_filled', value: '3' }]);
  });
});
