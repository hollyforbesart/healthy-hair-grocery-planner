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

/** Set in Cloudflare Pages → Settings: a D1 binding named DB and a secret STATS_KEY. */
export interface Env {
  DB?: D1Database;
  STATS_KEY?: string;
}

export interface PagesContext {
  request: Request;
  env: Env;
}
