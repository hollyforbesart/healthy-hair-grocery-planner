# To do

## Content Holly is writing or supplying

The app already has a place for each one; nothing here should be invented.

- **Preparation cues for the more involved meals.** A line or two on how the meal comes together (e.g. for Jerk Chicken Pasta), not a full recipe. Add each as `preparationNote` in `src/data/library/meals.json`; cards show it under "Prep notes", in the same row as the optional ingredients. Simple meals like quesadillas don't need one.
- **Time categories** are in (Quick, Moderate, More involved), not merged yet. Holly is sending suggestions to reconcile against [`TIME_CATEGORIES.md`](TIME_CATEGORIES.md).
- **Meal photos.** All 100 are in. For new or replacement photos, process with `python3 scripts/process_meal_photos.py photo.jpg=meal-id ...` — only the small `.webp` files go in the repo, never the originals.
- **Full recipes**, if and when they're committed to. The home page makes no promise about them, so add a mention only once they're certain.

## Before launch

- **Cloudflare Web Analytics.** Free and cookie-free, so it doesn't change the privacy promise. Turn it on for the Pages project in the Cloudflare dashboard (Web Analytics); for Pages it needs no code change.
- **Kit access + saved plans.** Sign-in by emailed code, checked against Kit purchases, with each person's plan saved to Cloudflare's free storage (KV). This also protects plans on iPhone, where Safari clears a site's saved data after 7 days without a visit unless it's on the home screen. Waiting on a Kit test purchase.
- **Custom address** on a manemeals subdomain.
- **Test on a real iPhone and Android phone,** installed to the home screen, and have a couple of people plan a real week.
- **Terms page:** add your support email (`SUPPORT_EMAIL` in `src/pages/TermsPage.tsx`), put "Digital product with instant access. All sales are final." on the Kit product/checkout page, and have the wording checked. Update the "Your information" section when accounts arrive.
