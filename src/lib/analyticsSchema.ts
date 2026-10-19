/**
 * Anonymous usage events: the shared contract between the planner (which
 * sends them) and the Cloudflare functions in /functions (which store and
 * summarize them). No names, emails, typed list items or plan contents are
 * ever sent, and there is no visitor ID.
 */

/** Every event the planner can send. `value` is an ID or a short label, never free text from a person (except search terms). */
export const EVENT_NAMES = [
  // Pages and steps
  'page_view', // value: home | planner | about | nutrients | terms | access | welcome
  'path_chosen', // value: pantry | ideas
  'step_view', // value: kitchen | meals | review | list
  // Kitchen
  'food_added', // value: ingredient ID (own items: "own")
  'staple_marked', // value: ingredient ID
  // Meal ideas
  'meal_added', // value: meal ID
  'meal_removed', // value: meal ID
  'favorite_added', // value: meal ID
  'extra_added', // value: optional-ingredient ID
  'meal_type_filter', // value: all | breakfast | lunch | dinner | snack
  'time_filter', // value: any | quick | moderate | more-involved
  'favorites_filter',
  'see_all', // value: meal type
  'search', // value: what was typed (trimmed, lowercased, max 40 characters)
  'leave_out_group', // value: avoid-group ID
  'leave_out_food', // value: ingredient ID
  'recipe_link', // value: meal ID
  // Grocery list
  'list_view', // value: number of items
  'list_share',
  'list_copy',
  'list_print',
  'list_item_added', // no value: what people type stays private
  // Weekly use, installs and feedback
  'new_week',
  'start_over',
  'install_click',
  'app_installed',
  'feedback_sent', // value: rating 1–5, if given
  // Sign-in page
  'signed_in', // value: new (account just created) | returning
  'purchase_link', // "Get Mane Meals" tapped on the sign-in page
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

export interface AnalyticsEvent {
  name: EventName;
  value?: string;
}

const NAMES = new Set<string>(EVENT_NAMES);
export const MAX_VALUE_LENGTH = 40;

/** Accepts only known event names and short values; anything else is dropped. */
export function parseEvent(input: unknown): AnalyticsEvent | null {
  if (typeof input !== 'object' || input === null) return null;
  const { name, value } = input as Record<string, unknown>;
  if (typeof name !== 'string' || !NAMES.has(name)) return null;
  if (value === undefined || value === null || value === '') return { name: name as EventName };
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const clean = String(value).trim().toLowerCase().slice(0, MAX_VALUE_LENGTH);
  return clean ? { name: name as EventName, value: clean } : { name: name as EventName };
}

/** "live" for the real site (pages.dev production or a custom domain), "preview" for branch previews. */
export function environmentFor(host: string, productionHost = 'healthy-hair-grocery-planner.pages.dev'): 'live' | 'preview' | 'dev' {
  const h = host.toLowerCase().split(':')[0];
  if (h === 'localhost' || h === '127.0.0.1') return 'dev';
  if (h === productionHost) return 'live';
  return h.endsWith('.pages.dev') ? 'preview' : 'live';
}

/** A coarse device type from the browser's user agent; the user agent itself is not stored. */
export function deviceFor(userAgent: string, installed: boolean): 'app' | 'mobile' | 'desktop' {
  if (installed) return 'app';
  return /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent) ? 'mobile' : 'desktop';
}
