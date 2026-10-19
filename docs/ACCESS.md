# Access lock

The planner is for buyers only. Anyone who opens the address without access sees a welcome page asking for their **access code**, with a link to buy Mane Meals in case someone shared the link with them. The Terms page stays public.

## How it works

- Buyers get an access code in their Kit purchase email, along with the planner link.
- They enter it once per device and browser. The server then sets a cookie that remembers access for a year (365 days), so they don't have to enter it again. Installing the app to the home screen keeps it too.
- The check runs on Cloudflare's servers (`functions/_middleware.ts`), not in the browser, so the planner's pages, scripts, meal list and photos can't be loaded without access. The access page is built separately (`access.html`, `src/access/`) and contains no planner content.
- Codes are checked by `functions/api/access.ts`. A wrong code waits a moment before answering, to slow down guessing.
- Codes can be typed in any case, with or without dashes or spaces.

**The cookie.** It's called `mm_access` and holds only a short one-way fingerprint of the code that was used, the date it was set and a signature. It isn't the code itself. It can't be read by scripts on the page and isn't used for tracking. It's a "strictly necessary" cookie, so it doesn't need a cookie banner.

## Turning it on in Cloudflare (about 5 minutes)

The lock stays **off** (the planner is open) until both secrets below are set. That way, setting them is what turns it on.

1. Go to **Workers & Pages → healthy-hair-grocery-planner → Settings → Variables and Secrets**.
2. Add a **Secret** named `ACCESS_CODES`. The value is your access code, for example `MANE-7KQ4-X9TP`:
   - Use 12 or more letters and numbers that are hard to guess. A password manager can make one.
   - You can list more than one code, separated by commas, for example a new code for new buyers while the old one still works.
3. Add a **Secret** named `SESSION_SECRET`. The value is a long random password (32+ characters) that nobody needs to know or type. It signs the cookies.
4. Add both to **Production**. Add them to **Preview** too if you want preview links locked.
5. **Redeploy.** Under **Deployments**, retry the latest production deployment.
6. **Check it.** Open the planner in a private window: you should see the welcome page. Enter the code and the planner should open.

## Day to day

- **Put the code in the Kit purchase email**, with the planner link and a line like "Enter this code the first time you open the planner on each device."
- **Changing a code** (for example if it's been shared widely): change `ACCESS_CODES` and redeploy. Everyone who used the old code is asked for a code again next time. To give people time, keep both codes for a while, email buyers the new one, then remove the old one.
- **Changing `SESSION_SECRET`** asks everyone, on every code, to enter a code again. Only do this if you need to.
- **Someone can't find their code:** the access page tells them to email hello@thehairlossnutritionist.com.

## The "Get Mane Meals" link

`PURCHASE_URL` in `src/access/AccessApp.tsx` is where the access page sends people who don't have Mane Meals yet. Until it's set, the button says "Learn more" and goes to thehairlossnutritionist.com. Once the Kit product page exists, paste its address there and the button changes to "Get Mane Meals".

## Later

The plan is to replace the code with sign-in by email, checked against Kit purchases, once the Kit product exists. That would give each buyer their own access (and saved plans across devices) instead of one shared code.
