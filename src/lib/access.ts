/**
 * Sign-in for the planner. Buyers create an account once (with the access code
 * from their purchase, or because they're on the guest list), then sign in on
 * any device with a 6-digit code sent to their email. The server then sets a
 * signed session cookie. Used by functions/_middleware.ts and functions/api/auth/;
 * runs in Cloudflare and in tests (Web Crypto).
 *
 * The cookie holds only an account number, a version and a signature, so it
 * can't be forged, and an account can be signed out everywhere by bumping its
 * version (or switched off) in the database.
 */
import type { Env } from './cloudflareTypes';

export const SESSION_COOKIE = 'mm_session';
/** One year; browsers cap cookies at about 400 days anyway. */
export const SESSION_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

/** "mane-7kq4 x9tp" and "MANE7KQ4X9TP" are the same code. */
export const normalizeCode = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, '');

/** Codes from the ACCESS_CODES setting: one or more, separated by commas, spaces or new lines. */
export const parseCodes = (setting: string | undefined): string[] =>
  (setting ?? '')
    .split(/[\s,]+/)
    .map(normalizeCode)
    .filter((c) => c.length >= 6);

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const isValidEmail = (email: string) => email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/** Emails from the GUEST_EMAILS setting (Holly, mentors…): separated by commas, spaces or new lines. */
export const parseEmails = (setting: string | undefined): string[] =>
  (setting ?? '').split(/[\s,;]+/).map(normalizeEmail).filter(isValidEmail);

/** Sign-in is switched on once there's a session secret, the database, and at least one way to create an account. */
export const signInEnabled = (env: Env) =>
  Boolean(
    env.SESSION_SECRET &&
      env.DB &&
      (parseCodes(env.ACCESS_CODES).length > 0 || parseEmails(env.GUEST_EMAILS).length > 0 || (env.KIT_API_KEY && env.KIT_BUYER_TAG)),
  );

const encoder = new TextEncoder();

const toBase64Url = (bytes: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

/** A short, one-way ID for an access code, so the database never stores the code itself. */
export async function codeId(code: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`mane-meals:${normalizeCode(code)}`));
  return toBase64Url(digest).slice(0, 16);
}

async function sign(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toBase64Url(await crypto.subtle.sign('HMAC', key, encoder.encode(payload)));
}

/** Compares without leaking how much matched. */
export function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export interface Session {
  userId: number;
  version: number;
}

/** The cookie value for a signed-in account. */
export async function createSessionToken(secret: string, session: Session, now = Date.now()): Promise<string> {
  const payload = `s1.${session.userId}.${session.version}.${Math.floor(now / 1000)}`;
  return `${payload}.${await sign(secret, payload)}`;
}

/** The account a cookie belongs to, if we signed it. (Whether the account still exists is checked against the database.) */
export async function readSessionToken(token: string | undefined, secret: string): Promise<Session | null> {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 5 || parts[0] !== 's1') return null;
  const [prefix, userId, version, issued, signature] = parts;
  if (!sameText(signature, await sign(secret, `${prefix}.${userId}.${version}.${issued}`))) return null;
  const session = { userId: Number(userId), version: Number(version) };
  return Number.isInteger(session.userId) && Number.isInteger(session.version) ? session : null;
}

/** 6 random digits for the sign-in email. */
export function createSignInCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return String(n).padStart(6, '0');
}

/** Sign-in codes are stored only as a keyed hash. */
export const hashSignInCode = (secret: string, email: string, code: string) =>
  sign(secret, `signin.${normalizeEmail(email)}.${code.replace(/\D/g, '')}`);

/** Reads one cookie from a Cookie header. */
export function readCookie(header: string | null, name: string): string | undefined {
  for (const part of (header ?? '').split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return undefined;
}

export const sessionCookie = (token: string) =>
  `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}; HttpOnly; Secure; SameSite=Lax`;
export const clearedSessionCookie = () => `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;

/** Pages anyone can open without signing in: sign-in, the welcome page buyers land on, and the Terms. */
export const PUBLIC_PAGES = ['/access', '/welcome', '/terms'];

/** Files anyone can load: the sign-in page's own scripts and styles, and branding. */
export const PUBLIC_PREFIXES = ['/public-assets/', '/icons/', '/brand/'];
export const PUBLIC_FILES = ['/favicon.png', '/manifest.webmanifest', '/sw.js', '/robots.txt'];

export function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_FILES.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    PUBLIC_PAGES.includes(pathname.replace(/\/+$/, '') || '/')
  );
}

/** Rejects form posts from other websites. */
export function fromOtherSite(request: Request): boolean {
  const origin = request.headers.get('Origin');
  if (!origin) return false;
  try {
    return new URL(origin).host !== new URL(request.url).host;
  } catch {
    return true;
  }
}

export const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  });
