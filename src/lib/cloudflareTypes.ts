/** Minimal Cloudflare types, so the functions type-check without extra packages. */
export interface D1Result<T> {
  results: T[];
}
export interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  run(): Promise<unknown>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}
export interface D1Database {
  prepare(sql: string): D1Statement;
}

/** Cloudflare's built-in static file server for the Pages project. */
export interface AssetsFetcher {
  fetch(request: Request): Promise<Response>;
}

/**
 * Set in Cloudflare Pages → Settings:
 * - DB (D1 binding) and STATS_KEY (secret): usage analytics, see docs/ANALYTICS.md
 * - ACCESS_CODES and SESSION_SECRET (secrets): the access lock, see docs/ACCESS.md
 */
export interface Env {
  DB?: D1Database;
  STATS_KEY?: string;
  ACCESS_CODES?: string;
  SESSION_SECRET?: string;
  ASSETS?: AssetsFetcher;
}

export interface PagesContext {
  request: Request;
  env: Env;
}
