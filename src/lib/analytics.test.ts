import { describe, expect, it } from 'vitest';
import { onRequestPost } from '../../functions/api/event';
import { onRequestGet } from '../../functions/api/stats';
import type { D1Database, Env } from './cloudflareTypes';
import { createInitialState, plannerReducer, type PlannerAction, type PlannerState } from '../state/plannerReducer';
import { eventsForAction } from './analyticsActions';
import { deviceFor, environmentFor, parseEvent } from './analyticsSchema';
import { buildStats, labelFor } from './analyticsStats';

describe('parseEvent', () => {
  it('keeps known events with short, tidy values and drops anything else', () => {
    expect(parseEvent({ name: 'meal_added', value: 'Jerk-Chicken-Pasta ' })).toEqual({ name: 'meal_added', value: 'jerk-chicken-pasta' });
    expect(parseEvent({ name: 'list_view', value: 7 })).toEqual({ name: 'list_view', value: '7' });
    expect(parseEvent({ name: 'list_share' })).toEqual({ name: 'list_share' });
    expect(parseEvent({ name: 'search', value: 'x'.repeat(100) })!.value).toHaveLength(40);
    expect(parseEvent({ name: 'steal_data', value: 'a' })).toBeNull();
    expect(parseEvent({ name: 'meal_added', value: { nested: true } })).toBeNull();
    expect(parseEvent('meal_added')).toBeNull();
  });
});

describe('environment and device', () => {
  it('tells the live site from branch previews', () => {
    expect(environmentFor('healthy-hair-grocery-planner.pages.dev')).toBe('live');
    expect(environmentFor('planner.manemeals.com')).toBe('live');
    expect(environmentFor('claude-vigilant-cannon-2gayf.healthy-hair-grocery-planner.pages.dev')).toBe('preview');
    expect(environmentFor('localhost:5173')).toBe('dev');
  });
  it('keeps only a coarse device type', () => {
    expect(deviceFor('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', false)).toBe('mobile');
    expect(deviceFor('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', false)).toBe('desktop');
    expect(deviceFor('anything', true)).toBe('app');
  });
});

describe('eventsForAction', () => {
  const run = (state: PlannerState, action: PlannerAction) => eventsForAction(state, plannerReducer(state, action), action);

  it('counts path choice and the step it opens', () => {
    expect(run(createInitialState(), { type: 'choosePath', path: 'ideas' })).toEqual([
      { name: 'path_chosen', value: 'ideas' },
      { name: 'step_view', value: 'meals' },
    ]);
  });

  it('counts kitchen foods but not ticks on the Review step', () => {
    const kitchen = plannerReducer(createInitialState(), { type: 'choosePath', path: 'pantry' });
    expect(run(kitchen, { type: 'setIngredientStatus', ingredientId: 'eggs', status: 'have' })).toEqual([
      { name: 'food_added', value: 'eggs' },
    ]);
    const review = plannerReducer(kitchen, { type: 'goToStep', step: 'review' });
    expect(run(review, { type: 'setIngredientStatus', ingredientId: 'eggs', status: 'have' })).toEqual([]);
  });

  it('counts meals added and removed, favorites, extras and new weeks', () => {
    const s = createInitialState();
    expect(run(s, { type: 'toggleMeal', mealId: 'jerk-chicken-pasta' })).toEqual([{ name: 'meal_added', value: 'jerk-chicken-pasta' }]);
    const withMeal = plannerReducer(s, { type: 'toggleMeal', mealId: 'jerk-chicken-pasta' });
    expect(run(withMeal, { type: 'toggleMeal', mealId: 'jerk-chicken-pasta' })).toEqual([{ name: 'meal_removed', value: 'jerk-chicken-pasta' }]);
    expect(run(s, { type: 'toggleFavorite', mealId: 'a' })).toEqual([{ name: 'favorite_added', value: 'a' }]);
    expect(run(s, { type: 'toggleMealExtra', mealId: 'm', ingredientId: 'honey' })).toEqual([
      { name: 'extra_added', value: 'honey' },
      { name: 'meal_added', value: 'm' },
    ]);
    expect(run(s, { type: 'startNewWeek' })[0]).toEqual({ name: 'new_week' });
  });

  it('reports a whole "leave out" group once, plus single foods', async () => {
    const { AVOID_GROUPS } = await import('../data/avoidGroups');
    const fish = AVOID_GROUPS.find((g) => g.id === 'fish')!;
    const events = run(createInitialState(), {
      type: 'updatePreferences',
      patch: { avoidIngredientIds: [...fish.ingredientIds, 'mushrooms'] },
    });
    expect(events).toEqual([
      { name: 'leave_out_group', value: 'fish' },
      { name: 'leave_out_food', value: 'mushrooms' },
    ]);
  });

  it('never includes what people type into their list', () => {
    const events = run(createInitialState(), {
      type: 'addManualItem',
      item: { id: 'm1', name: 'Birthday candles', section: 'other', checked: false },
    });
    expect(events).toEqual([{ name: 'list_item_added' }]);
  });
});

describe('stats summary', () => {
  it('labels IDs with names and builds the funnel', () => {
    expect(labelFor('meal_added', 'jerk-chicken-pasta')).toBe('Jerk Chicken Pasta');
    expect(labelFor('food_added', 'own')).toBe('Their own item');
    const stats = buildStats(
      { env: 'live', days: 7, from: '2026-10-11', to: '2026-10-17' },
      [
        { name: 'meal_added', count: 9 },
        { name: 'list_share', count: 2 },
        { name: 'path_chosen', count: 5 },
      ],
      [{ day: '2026-10-17', name: 'meal_added', count: 9 }],
      [{ name: 'meal_added', value: 'jerk-chicken-pasta', count: 4 }],
      [{ name: 'page_view', value: 'planner', count: 6 }],
      [{ name: 'step_view', value: 'list', count: 3 }],
      [{ device: 'mobile', count: 5 }],
    );
    expect(stats.headline).toMatchObject({ plannerOpens: 6, mealsAdded: 9, listsSharedCopiedPrinted: 2 });
    expect(stats.funnel.map((f) => f.count)).toEqual([6, 5, 0, 0, 3, 2]);
    expect(stats.top.meal_added[0]).toEqual({ value: 'jerk-chicken-pasta', label: 'Jerk Chicken Pasta', count: 4 });
    expect(stats.daily[0]).toMatchObject({ day: '2026-10-17', mealsAdded: 9 });
  });
});

/** A stand-in for Cloudflare D1 that records inserts and returns no rows. */
function fakeDb() {
  const inserts: unknown[][] = [];
  const db: D1Database = {
    prepare: (sql: string) => {
      let values: unknown[] = [];
      const stmt = {
        bind: (...v: unknown[]) => {
          values = v;
          return stmt;
        },
        run: async () => {
          if (sql.startsWith('INSERT')) inserts.push(values);
          return {};
        },
        all: async <T,>() => ({ results: [] as T[] }),
      };
      return stmt;
    },
  };
  return { db, inserts };
}

describe('Cloudflare functions', () => {
  const post = (env: Env, body: string, headers: Record<string, string> = {}) =>
    onRequestPost({
      env,
      request: new Request('https://healthy-hair-grocery-planner.pages.dev/api/event', {
        method: 'POST',
        body,
        headers: { 'User-Agent': 'iPhone', ...headers },
      }),
    });

  it('stores a valid event without IP, user agent or visitor ID', async () => {
    const { db, inserts } = fakeDb();
    const res = await post({ DB: db }, JSON.stringify({ name: 'meal_added', value: 'jerk-chicken-pasta', installed: false }));
    expect(res.status).toBe(204);
    expect(inserts).toHaveLength(1);
    const [ts, day, env, name, value, device] = inserts[0] as string[];
    expect(day).toBe(ts.slice(0, 10));
    expect([env, name, value, device]).toEqual(['live', 'meal_added', 'jerk-chicken-pasta', 'mobile']);
  });

  it('rejects unknown events and other websites, and quietly accepts before setup', async () => {
    const { db, inserts } = fakeDb();
    expect((await post({ DB: db }, JSON.stringify({ name: 'nope' }))).status).toBe(400);
    expect((await post({ DB: db }, JSON.stringify({ name: 'list_share' }), { Origin: 'https://evil.example' })).status).toBe(403);
    expect(inserts).toHaveLength(0);
    expect((await post({}, JSON.stringify({ name: 'list_share' }))).status).toBe(204);
  });

  it('only gives stats to someone with the key', async () => {
    const { db } = fakeDb();
    const get = (url: string) => onRequestGet({ env: { DB: db, STATS_KEY: 'secret-key' }, request: new Request(url) });
    expect((await get('https://x.pages.dev/api/stats')).status).toBe(401);
    expect((await get('https://x.pages.dev/api/stats?key=wrong-key!')).status).toBe(401);
    const ok = await get('https://x.pages.dev/api/stats?key=secret-key&days=7');
    expect(ok.status).toBe(200);
    expect(ok.headers.get('Access-Control-Allow-Origin')).toBe('*');
    const body = await ok.json();
    expect(body).toMatchObject({ env: 'live', days: 7, headline: { mealsAdded: 0 } });
  });
});

describe('old address forwarding', () => {
  const run = async (href: string) => {
    const { onRequest } = await import('../../functions/_middleware');
    return onRequest({ request: new Request(href), env: {}, next: async () => new Response('page') });
  };

  it('forwards the old pages.dev address to the planner, keeping the page', async () => {
    const res = await run('https://healthy-hair-grocery-planner.pages.dev/terms?x=1');
    expect(res.status).toBe(301);
    expect(res.headers.get('Location')).toBe('https://manemeals.thehairlossnutritionist.com/terms?x=1');
  });

  it('leaves the real address, previews and analytics calls alone', async () => {
    for (const href of [
      'https://manemeals.thehairlossnutritionist.com/planner',
      'https://claude-vigilant-cannon-2gayf.healthy-hair-grocery-planner.pages.dev/',
      'https://healthy-hair-grocery-planner.pages.dev/api/event',
    ]) {
      expect((await run(href)).status, href).toBe(200);
    }
  });
});

describe('Cloudflare function routes', () => {
  it('cover every page address (for forwarding) and the API', async () => {
    const { ROUTE_PATHS } = await import('../hooks/useRoute');
    const routes = (await import('../../public/_routes.json')).default;
    for (const path of Object.values(ROUTE_PATHS)) expect(routes.include, path).toContain(path);
    expect(routes.include).toContain('/api/*');
  });
});
