# To do

## Content Holly is writing or supplying

The app already has a place for each one; nothing here should be invented.

- **Preparation cues** are in for 87 meals (13 simple snacks and bowls intentionally have none), from Holly's review sheet with her decisions applied. Each card also has a "Find a recipe ↗" web-search link.
- **Time categories** are reconciled with Holly's review; see [`TIME_CATEGORIES.md`](TIME_CATEGORIES.md).
- **Meal photos.** All 100 are in. For new or replacement photos, process with `python3 scripts/process_meal_photos.py photo.jpg=meal-id ...` — only the small `.webp` files go in the repo, never the originals.
- **Full recipes**, if and when they're committed to. The home page makes no promise about them, so add a mention only once they're certain.

## Before launch

- **Usage analytics: live** (set up October 2026; privacy policy updated). Optional extra: Cloudflare Web Analytics (free, cookie-free) for visit counts and referrers.
- **Stats dashboard: done.** At `/stats` (see [`ANALYTICS.md`](ANALYTICS.md)).
- **Sign-in: live and tested** (October 19, 2026). Email + 6-digit code, accounts in D1, emails via Resend, Kit product at $29 sending buyers to `/welcome#<code>`. A $0 test purchase worked end to end. Kit (free plan) doesn't tag buyers, so the access code stays as the proof of purchase ([`ACCESS.md`](ACCESS.md)). Still to do: the Mane Meals sales page (WordPress page with a Kit Product block, like the grocery guide), then point `PURCHASE_URL` in `src/access/AccessApp.tsx` at it.
- **Saved plans across devices.** Now that there are accounts, plans could be saved to the account instead of only the browser. This also protects plans on iPhone, where Safari clears a site's saved data after 7 days without a visit unless it's on the home screen.
- **Custom address: done.** The planner lives at https://manemeals.thehairlossnutritionist.com (set up October 17, 2026). The old healthy-hair-grocery-planner.pages.dev address forwards there.
- **Test on a real iPhone and Android phone,** installed to the home screen, and have a couple of people plan a real week.
- **Terms page:** Terms published October 17, 2026 (update `TERMS_LAST_UPDATED` in `src/pages/TermsPage.tsx` whenever the wording changes). The terms and footer link to the Privacy Policy on thehairlossnutritionist.com; update it to cover the planner and purchases (draft additions in docs/PRIVACY_POLICY_ADDITIONS.md). Put "Digital product with instant access. All sales are final." (or similar) on the Kit offer page.

## Ideas for future improvements

- **My week: built** (October 2026, from a client conversation: "I never have a plan, I just go by the day"). Watch the dashboard ("My week" opens, spots filled, Fill in, prints) to see if people use it. Saved for future updates:
  - **Add to my calendar:** put the week's meals and prep reminders in the phone's calendar (real reminders without building notifications).
  - **Shopping amounts:** when a meal repeats (e.g. oats ×6), say so on the grocery list so people buy enough.
  - **Recipes** for the meals.
  - Also possible: "Move to another day", jumping to today on long weeks, copying last week's plan, and saving plans to accounts so they follow people between devices.
  - Decided against for now: sharing the week as text (clunky); planning more than one week at a time.

- **Cooking with your appliances.** Holly wants to talk about appliances (air fryer, slow cooker, Instant Pot/pressure cooker, sheet pan, microwave, blender) and how to use them to make meal prep easier and faster. Discuss before building. Possible shapes: appliance tips on meals that suit them, an "I have an air fryer" style filter, or a short guide page.
- **manemeals.com.** Holly owns manemeals.com (bought to secure the name; not used yet). Possible later uses: a sales/info page, or moving the planner to it. Moving the planner to a new address would separate people's saved plans from the old one, so plan that carefully (or do it after accounts exist).

