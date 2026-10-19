/** Minimal Cloudflare types, so the functions type-check without extra packages. */
export interface D1Result<T> {
  results: T[];
}
export interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  run(): Promise<unknown>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
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
 * - DB (D1 binding) and STATS_KEY (secret): usage analytics and accounts, see docs/ANALYTICS.md
 * - SESSION_SECRET, ACCESS_CODES, GUEST_EMAILS, RESEND_API_KEY (secrets): sign-in, see docs/ACCESS.md
 * - KIT_API_KEY and KIT_BUYER_TAG (optional): let buyers sign up with just their email
 */
export interface Env {
  DB?: D1Database;
  STATS_KEY?: string;
  SESSION_SECRET?: string;
  ACCESS_CODES?: string;
  GUEST_EMAILS?: string;
  RESEND_API_KEY?: string;
  /** Only for local testing: where sign-in emails are posted instead of Resend. */
  RESEND_API_URL?: string;
  EMAIL_FROM?: string;
  KIT_API_KEY?: string;
  KIT_BUYER_TAG?: string;
  ASSETS?: AssetsFetcher;
}

export interface PagesContext {
  request: Request;
  env: Env;
}
