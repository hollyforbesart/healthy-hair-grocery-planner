/**
 * "My week": placing meals on a Sunday-to-Saturday week. Pure helpers, so the
 * reducer, the page and the tests share them.
 */
import { MEAL_CATEGORY_LABELS } from '../data/categories';
import type { MealCategory, MealTemplate } from '../types';

/** What can go in a slot: one of the planner's meals, a quick pick, or the person's own words. */
export type WeekSlot = { kind: 'meal'; mealId: string } | { kind: 'quick'; id: QuickPickId } | { kind: 'custom'; text: string };

export interface WeekPlan {
  /** The Sunday the plan starts on (YYYY-MM-DD), or null before anything is placed. */
  start: string | null;
  /** Keyed by slotKey(day, category); day 0 is Sunday. */
  slots: Record<string, WeekSlot>;
}

export const emptyWeekPlan = (): WeekPlan => ({ start: null, slots: {} });

export const QUICK_PICKS = [
  { id: 'eating-out', label: 'Eating out' },
  { id: 'leftovers', label: 'Leftovers' },
  { id: 'pizza-night', label: 'Pizza night' },
  { id: 'takeout', label: 'Takeout' },
  { id: 'skipping', label: 'Not home / skipping' },
] as const;
export type QuickPickId = (typeof QUICK_PICKS)[number]['id'];
const QUICK_PICK_IDS = new Set<string>(QUICK_PICKS.map((q) => q.id));

export const WEEK_CATEGORIES: MealCategory[] = ['breakfast', 'lunch', 'dinner', 'snack'];
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MAX_CUSTOM_LENGTH = 60;

export const slotKey = (day: number, category: MealCategory) => `${day}-${category}`;

const toDate = (iso: string) => new Date(`${iso}T12:00:00Z`);
const toIso = (d: Date) => d.toISOString().slice(0, 10);

export const addDays = (iso: string, days: number) => toIso(new Date(toDate(iso).getTime() + days * 86_400_000));
export const daysBetween = (from: string, to: string) => Math.round((toDate(to).getTime() - toDate(from).getTime()) / 86_400_000);

/** The Sunday on or before a date. */
export const sundayOf = (iso: string) => addDays(iso, -toDate(iso).getUTCDay());

/** "Oct 18" */
export const shortDate = (iso: string) => toDate(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

/** The plan's Sunday: the saved one, or this week's. */
export const planStart = (plan: WeekPlan, today: string) => plan.start ?? sundayOf(today);

/** A short label for a slot ("Eating out", the meal's name, or what they typed). */
export function slotLabel(slot: WeekSlot, mealsById: Map<string, MealTemplate>): string {
  if (slot.kind === 'meal') return mealsById.get(slot.mealId)?.name ?? 'A meal';
  if (slot.kind === 'quick') return QUICK_PICKS.find((q) => q.id === slot.id)?.label ?? '';
  return slot.text;
}

/** Cleans a typed entry; empty means "nothing to save". */
export const cleanCustomText = (text: string) => text.replace(/\s+/g, ' ').trim().slice(0, MAX_CUSTOM_LENGTH);

/** Days for meals that take longer: weekends first, then midweek. Other meals prefer weekdays. */
const SLOW_DAY_ORDER = [0, 6, 3, 2, 4, 1, 5];
const FAST_DAY_ORDER = [1, 2, 3, 4, 5, 0, 6];

/**
 * Fills empty slots with the selected meals that aren't on the plan yet,
 * each in its own meal type's row, spread out across the week. "More involved"
 * meals go on the weekend when there's room. Slots already filled are kept.
 */
export function fillWeek(plan: WeekPlan, meals: MealTemplate[], start: string): WeekPlan {
  const slots = { ...plan.slots };
  const placed = new Set(Object.values(slots).flatMap((s) => (s.kind === 'meal' ? [s.mealId] : [])));
  for (const category of WEEK_CATEGORIES) {
    const toPlace = meals
      .filter((m) => m.category === category && !placed.has(m.id))
      .sort((a, b) => Number(b.timeCategory === 'more-involved') - Number(a.timeCategory === 'more-involved'));
    const free = [0, 1, 2, 3, 4, 5, 6].filter((d) => !slots[slotKey(d, category)]);
    if (toPlace.length === 0 || free.length === 0) continue;
    // Spread them out: with 3 dinners and 7 free days, aim for every other day or so.
    const step = free.length / Math.min(toPlace.length, free.length);
    const remaining = new Set(toPlace.slice(0, free.length).map((_, i) => free[Math.floor(i * step + step / 2)]));
    // Make room on a free weekend day for each longer recipe, swapping out the nearest weekday.
    let slow = toPlace.slice(0, free.length).filter((m) => m.timeCategory === 'more-involved').length;
    for (const weekend of [0, 6]) {
      if (slow === 0) break;
      if (!free.includes(weekend)) continue;
      if (!remaining.has(weekend)) {
        const weekdays = [...remaining].filter((d) => d !== 0 && d !== 6);
        if (weekdays.length === 0) break;
        const nearest = weekdays.reduce((a, b) => (Math.abs(b - weekend) < Math.abs(a - weekend) ? b : a));
        remaining.delete(nearest);
        remaining.add(weekend);
      }
      slow -= 1;
    }
    for (const meal of toPlace.slice(0, free.length)) {
      const order = meal.timeCategory === 'more-involved' ? SLOW_DAY_ORDER : FAST_DAY_ORDER;
      const day = order.find((d) => remaining.has(d))!;
      remaining.delete(day);
      slots[slotKey(day, category)] = { kind: 'meal', mealId: meal.id };
      placed.add(meal.id);
    }
  }
  return { start, slots };
}

/** Selected meals that aren't on the plan anywhere yet. */
export const unplacedMeals = (plan: WeekPlan, meals: MealTemplate[]) => {
  const placed = new Set(Object.values(plan.slots).flatMap((s) => (s.kind === 'meal' ? [s.mealId] : [])));
  return meals.filter((m) => !placed.has(m.id));
};

/** What's planned on a date, if it's in the plan's week. */
export function mealsOn(plan: WeekPlan, date: string, today: string): { category: MealCategory; slot: WeekSlot }[] {
  const day = daysBetween(planStart(plan, today), date);
  if (day < 0 || day > 6) return [];
  return WEEK_CATEGORIES.flatMap((category) => {
    const slot = plan.slots[slotKey(day, category)];
    return slot ? [{ category, slot }] : [];
  });
}

/**
 * The "tonight" reminders for tomorrow's meals: ones that need to soak or set
 * overnight, and ones that take a while to make.
 */
export function tonightReminders(plan: WeekPlan, mealsById: Map<string, MealTemplate>, today: string): string[] {
  const reminders: string[] = [];
  for (const { category, slot } of mealsOn(plan, addDays(today, 1), today)) {
    if (slot.kind !== 'meal') continue;
    const meal = mealsById.get(slot.mealId);
    if (!meal) continue;
    const which = `tomorrow’s ${MEAL_CATEGORY_LABELS[category].toLowerCase()}`;
    if (meal.makeAhead) {
      reminders.push(`Tonight: get ${which}, ${meal.name}, started. It needs a few hours or overnight to soak or set.`);
    } else if (meal.timeCategory === 'more-involved') {
      reminders.push(`${capitalize(which)}, ${meal.name}, takes a while. Prep what you can tonight to make it easier.`);
    }
  }
  return reminders;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Rebuilds a saved plan from untrusted JSON (anything malformed is dropped). */
export function hydrateWeekPlan(saved: unknown): WeekPlan {
  if (typeof saved !== 'object' || saved === null) return emptyWeekPlan();
  const { start, slots } = saved as Record<string, unknown>;
  const plan = emptyWeekPlan();
  if (typeof start === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(start)) plan.start = start;
  if (typeof slots !== 'object' || slots === null) return plan;
  for (const [key, value] of Object.entries(slots as Record<string, unknown>)) {
    const [day, category] = key.split('-');
    if (!/^[0-6]$/.test(day) || !WEEK_CATEGORIES.includes(category as MealCategory)) continue;
    if (typeof value !== 'object' || value === null) continue;
    const v = value as Record<string, unknown>;
    if (v.kind === 'meal' && typeof v.mealId === 'string') plan.slots[key] = { kind: 'meal', mealId: v.mealId };
    else if (v.kind === 'quick' && typeof v.id === 'string' && QUICK_PICK_IDS.has(v.id)) plan.slots[key] = { kind: 'quick', id: v.id as QuickPickId };
    else if (v.kind === 'custom' && typeof v.text === 'string' && cleanCustomText(v.text)) plan.slots[key] = { kind: 'custom', text: cleanCustomText(v.text) };
  }
  return plan;
}
