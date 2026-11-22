import { readJson, removeKey, writeJson } from './storage';

/**
 * Recipes and The Iron Refill meals are built behind the scenes before launch.
 *
 * While RECIPES_LAUNCHED is false, everyone sees the planner as it is today.
 * Opening any planner page with ?preview=recipes turns the preview on in that
 * browser (it stays on); ?preview=off turns it off again.
 *
 * To launch: set RECIPES_LAUNCHED to true. Everyone then sees the meals,
 * the High iron tags and the recipes.
 */
export const RECIPES_LAUNCHED = false;

const KEY = 'mane-meals:preview';

function readPreview(): boolean {
  try {
    const url = new URL(window.location.href);
    const asked = url.searchParams.get('preview');
    if (asked === 'recipes') writeJson(KEY, true);
    if (asked === 'off') removeKey(KEY);
    if (asked !== null) {
      // Tidy the address bar so the link isn't shared by accident.
      url.searchParams.delete('preview');
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    }
  } catch {
    // No window (tests) or a blocked history API: fall back to what's saved.
  }
  return readJson(KEY) === true;
}

/** True when this browser should see unlaunched recipes and meals. Read once per page load. */
export const PREVIEW = RECIPES_LAUNCHED || (typeof window !== 'undefined' && readPreview());
