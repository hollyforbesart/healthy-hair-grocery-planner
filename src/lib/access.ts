/**
 * Access to the planner: buyers enter an access code once per device, and
 * the server sets a signed "has access" cookie. Used by functions/_middleware.ts
 * and functions/api/access.ts; runs in Cloudflare and in tests (Web Crypto).
 *
 * The cookie holds only which code was used (as a short hash) and when, plus a
 * signature, so it can't be forged, and changing a code signs out everyone who
 * used the old one.
 */

export const ACCESS_COOKIE = 'mm_access';
/** One year; browsers cap cookies at about 400 days anyway. */
export const ACCESS_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

/** "mane-7kq4 x9tp" and "MANE7KQ4X9TP" are the same code. */
export const normalizeCode = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, '');

/** Codes from the ACCESS_CODES setting: one or more, separated by commas, spaces or new lines. */
export const parseCodes = (setting: string | undefined): string[] =>
  (setting ?? '')
    .split(/[\s,]+/)
    .map(normalizeCode)
    .filter((c) => c.length >= 6);

const encoder = new TextEncoder();

const toBase64Url = (bytes: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

/** A short, one-way ID for a code, so the cookie never contains the code itself. */
export async function codeId(code: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`mane-meals:${normalizeCode(code)}`));
  return toBase64Url(digest).slice(0, 16);
}

async function sign(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toBase64Url(await crypto.subtle.sign('HMAC', key, encoder.encode(payload)));
}

/** Compares without leaking how much matched. */
function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** The cookie value for someone who entered a valid code. */
export async function createAccessToken(secret: string, code: string, now = Date.now()): Promise<string> {
  const payload = `v1.${await codeId(code)}.${Math.floor(now / 1000)}`;
  return `${payload}.${await sign(secret, payload)}`;
}

/** True if the token was signed by us and its code is still one of the current codes. */
export async function verifyAccessToken(token: string | undefined, secret: string, codes: string[]): Promise<boolean> {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') return false;
  const [version, id, issued, signature] = parts;
  const expected = await sign(secret, `${version}.${id}.${issued}`);
  if (!sameText(signature, expected)) return false;
  const ids = await Promise.all(codes.map(codeId));
  return ids.includes(id);
}

/** Reads one cookie from a Cookie header. */
export function readCookie(header: string | null, name: string): string | undefined {
  for (const part of (header ?? '').split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return undefined;
}

export const accessCookie = (token: string) =>
  `${ACCESS_COOKIE}=${token}; Path=/; Max-Age=${ACCESS_MAX_AGE_SECONDS}; HttpOnly; Secure; SameSite=Lax`;

/** Pages anyone can open without access: the access page itself and the Terms. */
export const PUBLIC_PAGES = ['/access', '/terms'];

/** Files anyone can load: the access page's own scripts and styles, and branding. */
export const PUBLIC_PREFIXES = ['/public-assets/', '/icons/', '/brand/'];
export const PUBLIC_FILES = ['/favicon.png', '/manifest.webmanifest', '/sw.js', '/robots.txt'];

export function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_FILES.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    PUBLIC_PAGES.includes(pathname.replace(/\/+$/, '') || '/')
  );
}
