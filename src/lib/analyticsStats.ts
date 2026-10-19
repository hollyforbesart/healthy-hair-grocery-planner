import ingredients from '../data/library/ingredients.json';
import meals from '../data/library/meals.json';
import { AVOID_GROUPS } from '../data/avoidGroups';
import type { EventName } from './analyticsSchema';

/** Rows as returned by the stats queries in functions/api/stats.ts. */
export interface CountRow {
  name: string;
  count: number;
}
export interface DailyRow extends CountRow {
  day: string;
}
export interface ValueRow extends CountRow {
  value: string;
}
export interface DeviceRow {
  device: string;
  count: number;
}

/** Events whose values are worth ranking ("most-added meals", "top searches"…). */
export const RANKED_EVENTS: EventName[] = [
  'meal_added',
  'favorite_added',
  'extra_added',
  'recipe_link',
  'food_added',
  'staple_marked',
  'search',
  'leave_out_group',
  'leave_out_food',
  'meal_type_filter',
  'time_filter',
  'see_all',
  'path_chosen',
  'page_view',
  'feedback_sent',
];

const TOP_N = 15;
const mealNames = new Map(meals.map((m) => [m.id, m.name]));
const ingredientNames = new Map(ingredients.map((i) => [i.id, i.name]));
const groupNames = new Map(AVOID_GROUPS.map((g) => [g.id, g.label]));

/** A readable label for a stored value (meal and ingredient IDs become names). */
export function labelFor(name: string, value: string): string {
  if (['meal_added', 'meal_removed', 'favorite_added', 'recipe_link'].includes(name)) return mealNames.get(value) ?? value;
  if (['food_added', 'staple_marked', 'extra_added', 'leave_out_food'].includes(name)) {
    return value === 'own' ? 'Their own item' : (ingredientNames.get(value) ?? value);
  }
  if (name === 'leave_out_group') return groupNames.get(value) ?? value;
  return value;
}

const count = (rows: CountRow[], name: string) => rows.find((r) => r.name === name)?.count ?? 0;

/**
 * The JSON a dashboard reads: totals, a per-day series, the planner funnel,
 * top values per event and the device split.
 */
export function buildStats(
  meta: { env: string; days: number; from: string; to: string },
  totals: CountRow[],
  daily: DailyRow[],
  values: ValueRow[],
  pageViewsByPage: ValueRow[],
  stepViews: ValueRow[],
  devices: DeviceRow[],
) {
  const totalsByName = Object.fromEntries(totals.map((r) => [r.name, r.count]));
  const step = (s: string) => stepViews.find((r) => r.value === s)?.count ?? 0;
  const page = (p: string) => pageViewsByPage.find((r) => r.value === p)?.count ?? 0;

  const days = [...new Set(daily.map((r) => r.day))].sort();
  const series = days.map((day) => {
    const on = daily.filter((r) => r.day === day);
    const c = (name: string) => on.find((r) => r.name === name)?.count ?? 0;
    return {
      day,
      pageViews: c('page_view'),
      mealsAdded: c('meal_added'),
      listsViewed: c('list_view'),
      listsShared: c('list_share') + c('list_copy') + c('list_print'),
      newWeeks: c('new_week'),
    };
  });

  const top: Record<string, { value: string; label: string; count: number }[]> = {};
  for (const name of RANKED_EVENTS) {
    top[name] = values
      .filter((r) => r.name === name)
      .sort((a, b) => b.count - a.count)
      .slice(0, TOP_N)
      .map((r) => ({ value: r.value, label: labelFor(name, r.value), count: r.count }));
  }

  return {
    ...meta,
    generatedAt: new Date().toISOString(),
    headline: {
      plannerOpens: page('planner'),
      homeVisits: page('home'),
      mealsAdded: count(totals, 'meal_added'),
      listsViewed: count(totals, 'list_view'),
      listsSharedCopiedPrinted: count(totals, 'list_share') + count(totals, 'list_copy') + count(totals, 'list_print'),
      newWeeksPlanned: count(totals, 'new_week'),
      recipeLinksOpened: count(totals, 'recipe_link'),
      feedbackSent: count(totals, 'feedback_sent'),
      appInstalls: count(totals, 'app_installed'),
      signInPageViews: page('access'),
      welcomePageViews: page('welcome'),
      signIns: count(totals, 'signed_in'),
      getManeMealsClicks: count(totals, 'purchase_link'),
    },
    funnel: [
      { step: 'Opened the planner', count: page('planner') },
      { step: 'Chose how to start', count: count(totals, 'path_chosen') },
      { step: 'Saw meal ideas', count: step('meals') },
      { step: 'Reviewed their plan', count: step('review') },
      { step: 'Reached the grocery list', count: step('list') },
      { step: 'Shared, copied or printed it', count: count(totals, 'list_share') + count(totals, 'list_copy') + count(totals, 'list_print') },
    ],
    totals: totalsByName,
    daily: series,
    top,
    devices: Object.fromEntries(devices.map((d) => [d.device, d.count])),
  };
}

export type Stats = ReturnType<typeof buildStats>;
