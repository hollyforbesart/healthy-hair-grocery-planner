/** The outside services sign-in uses: Resend (sends the code) and, optionally, Kit (checks for a buyer tag). */
import type { Env } from './cloudflareTypes';

const SUPPORT_EMAIL = 'hello@thehairlossnutritionist.com';
const DEFAULT_FROM = 'Mane Meals <signin@mail.thehairlossnutritionist.com>';

export function signInEmail(code: string, newAccount: boolean) {
  const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
  const intro = newAccount ? 'Welcome to Mane Meals! Here’s your code to finish setting up your account:' : 'Here’s your code to sign in to Mane Meals:';
  const subject = `${spaced} is your Mane Meals code`;
  const text = [
    intro,
    '',
    spaced,
    '',
    'It works for 15 minutes. If you didn’t ask for it, you can ignore this email.',
    '',
    `Questions? Reply to this email or write to ${SUPPORT_EMAIL}.`,
    '',
    'Mane Meals: Meal & Grocery Planner',
    'https://manemeals.thehairlossnutritionist.com',
  ].join('\n');
  const html = `<!doctype html><html><body style="margin:0;background:#faf6f0;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#2e1a47">
<div style="max-width:480px;margin:0 auto;padding:32px 24px">
<p style="font-family:Georgia,'Times New Roman',serif;font-size:22px;margin:0 0 24px">Mane Meals</p>
<p style="font-size:16px;line-height:1.5;margin:0 0 16px">${intro}</p>
<p style="font-size:32px;font-weight:700;letter-spacing:6px;background:#ffffff;border:1px solid #ddd0e6;border-radius:12px;padding:16px;text-align:center;margin:0 0 16px">${spaced}</p>
<p style="font-size:14px;line-height:1.5;margin:0 0 16px">It works for 15 minutes. If you didn’t ask for it, you can ignore this email.</p>
<p style="font-size:14px;line-height:1.5;margin:0 0 24px">Questions? Reply to this email or write to <a style="color:#2e1a47" href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
<p style="font-size:12px;color:#6b5a7e;margin:0">Mane Meals: Meal &amp; Grocery Planner · <a style="color:#6b5a7e" href="https://manemeals.thehairlossnutritionist.com">manemeals.thehairlossnutritionist.com</a></p>
</div></body></html>`;
  return { subject, text, html };
}

/** Sends the sign-in code. Returns false if the email couldn't be sent. */
export async function sendSignInCode(env: Env, to: string, code: string, newAccount: boolean): Promise<boolean> {
  if (!env.RESEND_API_KEY) return false;
  const { subject, text, html } = signInEmail(code, newAccount);
  try {
    const res = await fetch(env.RESEND_API_URL || 'https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.EMAIL_FROM || DEFAULT_FROM, to: [to], reply_to: SUPPORT_EMAIL, subject, text, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * True if this email is a Kit subscriber with the buyer tag (KIT_BUYER_TAG, a
 * tag name or ID). Only used when KIT_API_KEY and KIT_BUYER_TAG are set.
 */
export async function isKitBuyer(env: Env, email: string): Promise<boolean> {
  if (!env.KIT_API_KEY || !env.KIT_BUYER_TAG) return false;
  const get = async (path: string) => {
    const res = await fetch(`https://api.kit.com/v4${path}`, {
      headers: { 'X-Kit-Api-Key': env.KIT_API_KEY!, Accept: 'application/json' },
    });
    return res.ok ? ((await res.json()) as Record<string, unknown>) : null;
  };
  try {
    const found = await get(`/subscribers?email_address=${encodeURIComponent(email)}&status=all`);
    const subscriber = (found?.subscribers as { id: number }[] | undefined)?.[0];
    if (!subscriber) return false;
    const tagged = await get(`/subscribers/${subscriber.id}/tags?per_page=1000`);
    const wanted = env.KIT_BUYER_TAG.trim().toLowerCase();
    return ((tagged?.tags as { id: number; name: string }[] | undefined) ?? []).some(
      (t) => String(t.id) === wanted || t.name.trim().toLowerCase() === wanted,
    );
  } catch {
    return false;
  }
}
