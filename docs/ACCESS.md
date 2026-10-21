# Sign-in

The planner is for buyers only. Everyone signs in with their email: no passwords.

## How buyers get in

1. **They buy Mane Meals in Kit.** Kit's "Go to page" button (on the thank-you page and in the receipt email) opens `https://manemeals.thehairlossnutritionist.com/welcome#<ACCESS CODE>`.
2. **The welcome page sets up their account.** They enter their email, get a 6-digit code by email, type it in, and the planner opens. The access code rides along in the link, so they never type it.
3. **Any other device, any time later:** they open the planner, enter their email, and type the 6-digit code we email them. They stay signed in on that device for a year.

Anyone who opens the planner without signing in sees the sign-in page, with a "Get Mane Meals" button to the Kit product page. The Terms stay public.

**Ways to create an account** (only needed once per person):
- **The access code** from the purchase link (or typed in, under "New here? I have an access code").
- **The guest list** (`GUEST_EMAILS`): you, mentors, anyone you want to give access. They just sign in with their email.
- **Optional, later: a Kit tag.** If Kit tags buyers, set `KIT_API_KEY` and `KIT_BUYER_TAG` and buyers can sign up with just their email. See "Kit tag" below.

After that, the account is what counts: changing the access code doesn't sign anyone out.

## How it works

- `functions/_middleware.ts` checks every request. Without a valid session, pages show the sign-in app and planner files (scripts, meal list, photos) return 401. The sign-in app is built separately (`access.html`, `src/access/`) and contains no planner content.
- `functions/api/auth/`: `start` (emails a code), `verify` (checks it, creates the account, signs in), `me` (who's signed in; counts today as an active day), `signout`.
- Accounts live in the same D1 database as the usage statistics (`users`, `user_days`, `sign_in_codes`; created automatically, also in `migrations/0002_accounts.sql`). Live and preview accounts are kept apart.
- Sign-in emails are sent by Resend from `Mane Meals <signin@mail.thehairlossnutritionist.com>`, with replies going to hello@thehairlossnutritionist.com.
- Safety: codes expire after 15 minutes, 5 wrong tries cancel a code, 5 codes per email per hour, a pause after a wrong access code, and requests from other websites are refused. Codes are stored only as a keyed hash; access codes only as a short fingerprint.

**Signing out** (footer, on planner pages) saves the latest changes to the account, signs out, then removes the plan from that device. If the latest changes can't be saved (e.g. offline), they're asked whether to sign out anyway and lose them, or stay signed in. Signing out needs a connection; offline, it says so and nothing changes. A plan stays in a browser where someone never signs out (e.g. the session simply expires), until another account signs in there and replaces it.

**The cookie.** `mm_session` holds an account number, a version and a signature. It can't be read by scripts on the page and isn't used for advertising. It's a "strictly necessary" cookie, so it doesn't need a cookie banner.

## Settings in Cloudflare

**Workers & Pages → healthy-hair-grocery-planner → Settings → Variables and Secrets**, as **Secrets**. Add them to Production, and to Preview if you want preview links locked too. Then redeploy (Deployments → retry the latest).

| Name | What it is |
|---|---|
| `SESSION_SECRET` | A long random password (32+ characters) nobody needs to type. It signs sessions and codes. Changing it signs everyone out. |
| `ACCESS_CODES` | The access code in the Kit purchase link, e.g. `MANE-7KQ4-X9TP`. More than one is fine, separated by commas. |
| `GUEST_EMAILS` | Emails that can sign in without buying, separated by commas. |
| `RESEND_API_KEY` | From Resend (Sending access, domain mail.thehairlossnutritionist.com). |
| `KIT_API_KEY`, `KIT_BUYER_TAG` | Optional. See "Kit tag". |

Sign-in switches on once `SESSION_SECRET`, the `DB` database binding and at least one way to create an account (`ACCESS_CODES`, `GUEST_EMAILS` or the Kit tag) are set. Until then the planner stays open, so set `RESEND_API_KEY` first.

## Kit settings

- **Fulfillment → Go to URL:** `https://manemeals.thehairlossnutritionist.com/welcome#<ACCESS CODE>` (the same code as in `ACCESS_CODES`).
- **Receipt email:** tell buyers to use the button to set up their account, and that afterwards they can sign in at manemeals.thehairlossnutritionist.com with their email on any device.

## Day to day

- **Give someone access** (a mentor, a friend, a buyer whose purchase went wrong): add their email to `GUEST_EMAILS` and redeploy. Once they've signed in, their account stays even if you take them off the list; to remove their access, switch off the account (below).
- **The code is being shared:** change `ACCESS_CODES` and the Kit Go-to URL to a new code. Existing accounts keep working; only new sign-ups need the new code. Compare the number of accounts with your Kit sales (on `/api/stats`, under `accounts`) to spot sharing.
- **Delete someone's account** (a deletion request): open **/stats**, scroll to **Delete someone's account**, enter their email and confirm. It removes their account, saved plan, days used and any pending sign-in code, on the live site and test links (`POST /api/admin/delete-account`, protected by `STATS_KEY`). It doesn't touch Kit (purchase record) or Resend (sign-in email logs); delete those in each service if asked. The anonymous usage numbers aren't linked to anyone, so there's nothing to remove there. A copy of the plan can stay in their own browser until they sign out or clear it.
- **Switch off one account:** in Cloudflare, open the D1 database → Console, and run
  `UPDATE users SET disabled = 1 WHERE email = 'their@email.com';`
  (`disabled = 0` turns it back on.)
- **Sign someone out everywhere:** `UPDATE users SET session_version = session_version + 1 WHERE email = 'their@email.com';`
- **"My code never arrived":** ask them to check spam or promotions, and to make sure they're using the email they signed up with. Resend's dashboard (Emails) shows whether it was sent and delivered.

## Kit tag

If a test purchase shows that Kit adds a tag to buyers, you can let buyers sign up with only their email:
`KIT_API_KEY` is a Kit API key (Settings → Developer → V4 key), and `KIT_BUYER_TAG` is that tag's exact name (or its ID). The access code keeps working alongside it.
