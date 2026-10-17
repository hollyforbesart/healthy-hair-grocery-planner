# To do

## Content Holly is writing or supplying

The app already has a place for each one; nothing here should be invented.

- **Preparation cues** are in for 87 meals (13 simple snacks and bowls intentionally have none), from Holly's review sheet with her decisions applied. Each card also has a "Find a recipe ↗" web-search link.
- **Time categories** are reconciled with Holly's review; see [`TIME_CATEGORIES.md`](TIME_CATEGORIES.md).
- **Meal photos.** All 100 are in. For new or replacement photos, process with `python3 scripts/process_meal_photos.py photo.jpg=meal-id ...` — only the small `.webp` files go in the repo, never the originals.
- **Full recipes**, if and when they're committed to. The home page makes no promise about them, so add a mention only once they're certain.

## Before launch

- **Usage analytics.** The code is in (anonymous events plus a stats summary for a dashboard). Turn it on with the one-time Cloudflare setup in [`ANALYTICS.md`](ANALYTICS.md), and add the usage-statistics paragraph to the privacy policy first. Optional extra: Cloudflare Web Analytics (free, cookie-free) for visit counts and referrers.
- **Dashboard on Claude.** Once the setup is done and the key exists, build a dashboard that reads `/api/stats`.
- **Kit access + saved plans.** Sign-in by emailed code, checked against Kit purchases, with each person's plan saved to Cloudflare's free storage (KV). This also protects plans on iPhone, where Safari clears a site's saved data after 7 days without a visit unless it's on the home screen. Waiting on a Kit test purchase.
- **Custom address: done.** The planner lives at https://manemeals.thehairlossnutritionist.com (set up October 17, 2026). The old healthy-hair-grocery-planner.pages.dev address forwards there.
- **Test on a real iPhone and Android phone,** installed to the home screen, and have a couple of people plan a real week.
- **Terms page:** Terms published October 17, 2026 (update `TERMS_LAST_UPDATED` in `src/pages/TermsPage.tsx` whenever the wording changes). The terms and footer link to the Privacy Policy on thehairlossnutritionist.com; update it to cover the planner and purchases (draft additions in docs/PRIVACY_POLICY_ADDITIONS.md). Put "Digital product with instant access. All sales are final." (or similar) on the Kit offer page.

## Ideas for future improvements

- **Cooking with your appliances.** Holly wants to talk about appliances (air fryer, slow cooker, Instant Pot/pressure cooker, sheet pan, microwave, blender) and how to use them to make meal prep easier and faster. Discuss before building. Possible shapes: appliance tips on meals that suit them, an "I have an air fryer" style filter, or a short guide page.
- **manemeals.com.** Holly owns manemeals.com (bought to secure the name; not used yet). Possible later uses: a sales/info page, or moving the planner to it. Moving the planner to a new address would separate people's saved plans from the old one, so plan that carefully (or do it after accounts exist).

