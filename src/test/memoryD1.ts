import { DatabaseSync } from 'node:sqlite';
import type { D1Database } from '../lib/cloudflareTypes';

/** Cloudflare D1, played by Node's built-in SQLite. */
export function memoryD1(): D1Database & { sql: DatabaseSync } {
  const sql = new DatabaseSync(':memory:');
  return {
    sql,
    prepare(query: string) {
      let values: unknown[] = [];
      const statement = {
        bind: (...v: unknown[]) => {
          values = v;
          return statement;
        },
        run: async () => sql.prepare(query).run(...values),
        all: async <T,>() => ({ results: sql.prepare(query).all(...values) as T[] }),
        first: async <T,>() => (sql.prepare(query).get(...values) as T | undefined) ?? null,
      };
      return statement;
    },
  };
}

