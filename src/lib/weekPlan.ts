/**
 * "My week": placing meals on a Sunday-to-Saturday week. Pure helpers, so the
 * reducer, the page and the tests share them.
 */
import { MEAL_CATEGORY_LABELS } from '../data/categories';
import type { MealCategory, MealTemplate } from '../types';

/** What can go in a slot: one of the planner's meals, leftovers of one, a quick pick, or the person's own words. */
export type WeekSlot =
  | { kind: 'meal'; mealId: string }
  | { kind: 'leftovers'; mealId: string }
  | { kind: 'quick'; id: QuickPickId }
  | { kind: 'custom'; text: string };

/** How someone likes to eat, used by "Fill in my week" (remembered from week to week). */
export interface FillPreferences {
  breakfast: 'rotate' | 'once';
  lunch: 'rotate' | 'once';
  dinner: 'once' | 'twice';
  snack: 'rotate' | 'once';
  /** Dinner leftovers become the next day's lunch. */
  leftoverLunches: boolean;
  /** Only fill in Monday to Friday. */
  weekendOpen: boolean;
  /** Friday dinner is a night off cooking (takeout). */
  nightOff: boolean;
}

export const DEFAULT_FILL_PREFERENCES: FillPreferences = {
  breakfast: 'rotate',
  lunch: 'once',
  dinner: 'once',
  snack: 'rotate',
  leftoverLunches: true,
  weekendOpen: false,
  nightOff: false,
};

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

/**
 * The Sunday a new plan starts on: this week's, except on Saturday, when
 * people are usually planning (and shopping) for the week ahead.
 */
export const defaultStart = (today: string) => (toDate(today).getUTCDay() === 6 ? addDays(today, 1) : sundayOf(today));

/** The plan's Sunday: the saved one, or the default for a new plan. Plans are one week at a time. */
export const planStart = (plan: WeekPlan, today: string) => plan.start ?? defaultStart(today);

/** A short label for a slot ("Eating out", the meal's name, or what they typed). */
export function slotLabel(slot: WeekSlot, mealsById: Map<string, MealTemplate>): string {
  if (slot.kind === 'meal') return mealsById.get(slot.mealId)?.name ?? 'A meal';
  if (slot.kind === 'leftovers') return `Leftovers: ${mealsById.get(slot.mealId)?.name ?? 'a meal'}`;
  if (slot.kind === 'quick') return QUICK_PICKS.find((q) => q.id === slot.id)?.label ?? '';
  return slot.text;
}

/** Cleans a typed entry; empty means "nothing to save". */
export const cleanCustomText = (text: string) => text.replace(/\s+/g, ' ').trim().slice(0, MAX_CUSTOM_LENGTH);

/** Days for meals that take longer: weekends first, then midweek. Other meals prefer weekdays. */
const SLOW_DAY_ORDER = [0, 6, 3, 2, 4, 1, 5];
const FAST_DAY_ORDER = [1, 2, 3, 4, 5, 0, 6];
const isSlow = (m: MealTemplate) => m.timeCategory === 'more-involved';

/** Spreads meals over free days, one each, with longer recipes on the weekend when there's room. */
function spreadOnce(slots: Record<string, WeekSlot>, category: MealCategory, meals: MealTemplate[], days: number[]) {
  const free = days.filter((d) => !slots[slotKey(d, category)]);
  const toPlace = [...meals].sort((a, b) => Number(isSlow(b)) - Number(isSlow(a))).slice(0, free.length);
  if (toPlace.length === 0) return;
  const step = free.length / toPlace.length;
  const chosen = new Set(toPlace.map((_, i) => free[Math.floor(i * step + step / 2)]));
  // Make room on a free weekend day for each longer recipe, swapping out the nearest weekday.
  let slow = toPlace.filter(isSlow).length;
  for (const weekend of [0, 6]) {
    if (slow === 0) break;
    if (!free.includes(weekend)) continue;
    if (!chosen.has(weekend)) {
      const weekdays = [...chosen].filter((d) => d !== 0 && d !== 6);
      if (weekdays.length === 0) break;
      const nearest = weekdays.reduce((a, b) => (Math.abs(b - weekend) < Math.abs(a - weekend) ? b : a));
      chosen.delete(nearest);
      chosen.add(weekend);
    }
    slow -= 1;
  }
  for (const meal of toPlace) {
    const day = (isSlow(meal) ? SLOW_DAY_ORDER : FAST_DAY_ORDER).find((d) => chosen.has(d))!;
    chosen.delete(day);
    slots[slotKey(day, category)] = { kind: 'meal', mealId: meal.id };
  }
}

/**
 * Fills every free day in a row by taking turns with the picks (one pick means
 * the same every day). Each spot gets whichever pick is in the row least so
 * far, so a pick they haven't placed yet comes first.
 */
function rotate(slots: Record<string, WeekSlot>, category: MealCategory, meals: MealTemplate[], days: number[]) {
  if (meals.length === 0) return;
  const uses = new Map(meals.map((m) => [m.id, 0]));
  for (let d = 0; d < 7; d += 1) {
    const slot = slots[slotKey(d, category)];
    if (slot?.kind === 'meal' && uses.has(slot.mealId)) uses.set(slot.mealId, uses.get(slot.mealId)! + 1);
  }
  for (const day of days) {
    const key = slotKey(day, category);
    if (slots[key]) continue;
    const next = meals.reduce((a, b) => (uses.get(b.id)! < uses.get(a.id)! ? b : a));
    slots[key] = { kind: 'meal', mealId: next.id };
    uses.set(next.id, uses.get(next.id)! + 1);
  }
}

/** Each dinner on two nights in a row: cooked, then leftovers. */
function spreadTwice(slots: Record<string, WeekSlot>, meals: MealTemplate[], days: number[]) {
  const free = (d: number) => days.includes(d) && !slots[slotKey(d, 'dinner')];
  for (const meal of [...meals].sort((a, b) => Number(isSlow(b)) - Number(isSlow(a)))) {
    const order = isSlow(meal) ? [6, 0, 3, 1, 4, 2, 5] : [1, 3, 5, 0, 2, 4, 6];
    const pairStart = order.find((d) => d < 6 && free(d) && free(d + 1));
    const single = order.find(free);
    const day = pairStart ?? single;
    if (day === undefined) return;
    slots[slotKey(day, 'dinner')] = { kind: 'meal', mealId: meal.id };
    if (pairStart !== undefined) slots[slotKey(day + 1, 'dinner')] = { kind: 'leftovers', mealId: meal.id };
  }
}

/**
 * "Fill in my week": fills empty spots from the meals they picked, the way
 * they like to eat. Spots already filled are never changed, so it can be
 * pressed again at any time.
 */
export function fillWeek(plan: WeekPlan, meals: MealTemplate[], start: string, prefs: FillPreferences = DEFAULT_FILL_PREFERENCES): WeekPlan {
  const slots = { ...plan.slots };
  const days = prefs.weekendOpen ? [1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6];
  const placed = new Set(Object.values(slots).flatMap((s) => (s.kind === 'meal' ? [s.mealId] : [])));
  const picks = (c: MealCategory) => meals.filter((m) => m.category === c);
  const notYetPlaced = (c: MealCategory) => picks(c).filter((m) => !placed.has(m.id));

  if (prefs.nightOff && days.includes(5) && !slots[slotKey(5, 'dinner')]) slots[slotKey(5, 'dinner')] = { kind: 'quick', id: 'takeout' };

  if (prefs.dinner === 'twice') spreadTwice(slots, notYetPlaced('dinner'), days);
  else spreadOnce(slots, 'dinner', notYetPlaced('dinner'), days);

  if (prefs.leftoverLunches) {
    for (const day of days) {
      const dinner = slots[slotKey(day - 1, 'dinner')];
      const lunch = slotKey(day, 'lunch');
      if (day === 0 || dinner?.kind !== 'meal' || slots[lunch]) continue;
      // Skip when tonight's dinner is already that meal's leftovers.
      const tonight = slots[slotKey(day, 'dinner')];
      if (tonight?.kind === 'leftovers' && tonight.mealId === dinner.mealId) continue;
      slots[lunch] = { kind: 'leftovers', mealId: dinner.mealId };
    }
  }

  for (const category of ['lunch', 'breakfast', 'snack'] as const) {
    if (prefs[category] === 'rotate') rotate(slots, category, picks(category), days);
    else spreadOnce(slots, category, notYetPlaced(category), days);
  }
  return { start, slots };
}

/** Empty spots per meal type, for the "still open" note. */
export const openSpots = (plan: WeekPlan) =>
  WEEK_CATEGORIES.map((category) => ({
    category,
    open: [0, 1, 2, 3, 4, 5, 6].filter((d) => !plan.slots[slotKey(d, category)]).length,
  })).filter((r) => r.open > 0);

/**
 * Puts a slot on more days ("Every day" / "Weekdays" after placing a meal, or
 * leftovers for tomorrow). Only empty spots are filled unless `overwrite`.
 */
export function repeatSlot(plan: WeekPlan, category: MealCategory, slot: WeekSlot, days: readonly number[], start: string, overwrite = false): WeekPlan {
  const slots = { ...plan.slots };
  for (const d of days) if (overwrite || !slots[slotKey(d, category)]) slots[slotKey(d, category)] = slot;
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

export interface PrepNote {
  /** The evening to do it: 0–6 for Sunday–Saturday, or -1 for the Saturday before the plan starts. */
  evening: number;
  text: string;
}

/**
 * Reminders for the evening before: meals that need to soak or set
 * overnight, and meals that take a while to make.
 */
export function prepNotes(plan: WeekPlan, mealsById: Map<string, MealTemplate>): PrepNote[] {
  const notes: PrepNote[] = [];
  for (let day = 0; day < 7; day += 1) {
    for (const category of WEEK_CATEGORIES) {
      const slot = plan.slots[slotKey(day, category)];
      const meal = slot?.kind === 'meal' ? mealsById.get(slot.mealId) : undefined;
      if (!meal) continue;
      const which = `tomorrow’s ${MEAL_CATEGORY_LABELS[category].toLowerCase()}`;
      if (meal.makeAhead) notes.push({ evening: day - 1, text: `Start ${meal.name} for ${which} (it soaks or sets overnight).` });
      else if (meal.timeCategory === 'more-involved') notes.push({ evening: day - 1, text: `Prep what you can for ${which}, ${meal.name} (it takes a while).` });
    }
  }
  return notes;
}

/** Tonight's reminders, for the app's "Tonight" notes. */
export function tonightReminders(plan: WeekPlan, mealsById: Map<string, MealTemplate>, today: string): string[] {
  const evening = daysBetween(planStart(plan, today), today);
  return prepNotes(plan, mealsById)
    .filter((n) => n.evening === evening)
    .map((n) => `Tonight: ${n.text.charAt(0).toLowerCase()}${n.text.slice(1)}`);
}

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
    else if (v.kind === 'leftovers' && typeof v.mealId === 'string') plan.slots[key] = { kind: 'leftovers', mealId: v.mealId };
    else if (v.kind === 'quick' && typeof v.id === 'string' && QUICK_PICK_IDS.has(v.id)) plan.slots[key] = { kind: 'quick', id: v.id as QuickPickId };
    else if (v.kind === 'custom' && typeof v.text === 'string' && cleanCustomText(v.text)) plan.slots[key] = { kind: 'custom', text: cleanCustomText(v.text) };
  }
  return plan;
}

export function hydrateFillPreferences(saved: unknown): FillPreferences {
  const v = typeof saved === 'object' && saved !== null ? (saved as Record<string, unknown>) : {};
  const pick = <T extends string>(value: unknown, allowed: T[], fallback: T): T => (allowed.includes(value as T) ? (value as T) : fallback);
  const d = DEFAULT_FILL_PREFERENCES;
  return {
    breakfast: pick(v.breakfast, ['rotate', 'once'], d.breakfast),
    lunch: pick(v.lunch, ['rotate', 'once'], d.lunch),
    dinner: pick(v.dinner, ['once', 'twice'], d.dinner),
    snack: pick(v.snack, ['rotate', 'once'], d.snack),
    leftoverLunches: typeof v.leftoverLunches === 'boolean' ? v.leftoverLunches : d.leftoverLunches,
    weekendOpen: v.weekendOpen === true,
    nightOff: v.nightOff === true,
  };
}
