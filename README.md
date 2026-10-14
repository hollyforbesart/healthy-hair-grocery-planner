# Mane Meals: Meal & Grocery Planner

A responsive web app for **The Hair Loss Nutritionist**: choose meal ideas, use what you have, and build your grocery list.

(The repository, package and browser-storage names still say `healthy-hair-grocery-planner`. They are internal, and renaming the storage key would erase saved plans, so they stay.)

Version 1 is a static React + TypeScript + Vite app. It has no AI service, no accounts and no database. Planning progress is saved in the browser's `localStorage`.

## How it works

The site has these pages:

- **`/` (home):** what the planner is, the two ways to start, the weekly routine, the nutrient guide, privacy and how to install it on a phone. Everyone sees the two ways to start; returning visitors also get a "Welcome back" bar with **Continue where you left off** and **Plan a new week**. This is the link to send buyers.
- **`/planner`:** the planner itself. It can be linked directly.
- **`/about`:** "Why these meals?" (Holly's note) plus what's included and what's not included yet.
- **`/nutrients`:** *Food for Your Follicles*, the ten-nutrient guide. Its text is in `src/data/nutrients.ts` and its icons are in `public/nutrients/`. Keep the wording in sync with the guide.

The footer links to all of these.

The two path cards on the home page open the planner straight at the first step of that path. (Someone who opens `/planner` directly before choosing gets the same two choices.) Both paths share the same meal library and grocery list, and the user can switch at any time:

- **Start with what I have:** Your kitchen → Meal ideas → Review → Grocery list
- **Browse meal ideas:** Meal ideas → Review → Grocery list

1. **Your kitchen** (first path only): one search box for every food, then everyday groups: Fruits & vegetables, Proteins, Dairy & eggs, Grains, bread & pasta, Pantry & extras (plus "Your own items").
   - People tap common foods or search. Exact matches come first, and other names work, so "garbanzo" finds Chickpeas.
   - Adding something means "I have this". Anything not in the catalog can be added as the user's own item.
   - ☆ marks a staple, which is added automatically each new week.
2. **Meal ideas:** search by meal or ingredient, pick meal types (remembered for next time) or ♥ favorites.
   - With several meal types showing, ideas come in one section per type (Breakfast, Lunch, Dinner, Snack), four at a time with **See all**. A single type, a search or favorites shows one list, 20 at a time.
   - **Foods to leave out** is a collapsible panel on this page (see Avoided foods below).
   - Ranking is pantry fit: the smallest *share* of ingredients not already at home, so a 5-ingredient dinner with 1 to buy beats a 2-ingredient snack with 1 to buy. Meals chosen in the last 14 days move down unless they're favorites, never-chosen meals win ties, and otherwise the library's own order is kept. With nothing at home, meals appear in library order.
   - Each card shows how many of its ingredients you have ("You have 3 of 4 ingredients"), plus **Already have** and **Need to buy**; when nothing is at home it shows a plain **Ingredients** list. A short line says why it's suggested when that adds something ("One of your favorites", "You had this recently", "New to you"). Optional extras are in a collapsed section and only go on the list when tapped.
   - Once a meal is picked, a bar at the bottom shows "N selected · Review →".
3. **Review:** the chosen meals (removable), then every ingredient they need, once each and grouped by store section. People tick off what they already have; anything left unticked goes on the list.
4. **Grocery list** (the finish line): grouped by store section. It shows what to buy, not how much. Items can be added, edited, removed and checked off, and the list can be shared, copied or printed. A short tip explains adding the planner to the phone's home screen. Below the list is an optional feedback card (a rating, "What made this planner helpful?" and "What do you wish this planner could also do?"), sent through Web3Forms (see below).

**Plan a new week** (on the home page, or at the bottom of the grocery list):
- **Kept:** meal types, foods to leave out, own ingredients, staples and favorites.
- **Remembered:** this week's meals go into the history used for rotation.
- **Cleared:** meals, extras and the grocery list.
- **Where it opens:** the kitchen, with a "check your kitchen" note, or meal ideas on the second path.
- **Staples:** they start as already in the kitchen, so the user only removes the ones that ran out. Everything else is cleared to be checked again, since last week's food may have been used up.

**Start over** erases everything.

### Works offline and installs like an app

The site is a Progressive Web App. `public/manifest.webmanifest` holds the name, colours and icons; the installed app opens on the home page. `public/sw.js` is the service worker: it caches the page and its files on the first visit, so the planner opens with no connection, which is handy in a store with poor signal. Pages are fetched fresh when online. Install instructions for iPhone, Android and computers are on the home page.

The Mane Meals "M" mark is the app's logo. `public/brand/mane-meals-mark.png` is the master copy (transparent background), and `mane-meals-mark-light.png` is the cream-and-lavender version used on the dark header. The icons are made from the master copy:

- `public/icons/icon-192.png` and `icon-512.png`: the installed-app icon, on white.
- `icon-maskable-512.png`: the same with more padding, so Android's round crop doesn't clip it.
- `apple-touch-icon.png` (180×180): iPhone and iPad.
- `public/favicon.png` (64×64): the browser tab.

To replace them, keep the same file names and sizes. If you change cached files in a way that must reach installed apps immediately, bump `CACHE` in `public/sw.js`.

## Local development

You need Node.js 20.19+ (22 recommended; see `.nvmrc`).

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (Vitest)
npm run typecheck  # TypeScript only
npm run build      # production build into dist/
npm run preview    # serve the built dist/ locally
```

## Project structure

```
src/
  types/        Shared domain types
  data/         Editable content: ingredient catalog, meal library, categories
  lib/          Pure logic: name matching, meal matching, grocery list building, storage
  services/     Swappable boundaries: recommendation provider, feedback service
  state/        Reducer + context, with persistence to localStorage
  hooks/        useRecommendations (loading/error handling around the provider)
  components/   Reusable UI pieces
  steps/        One component per step
  styles/       Brand tokens, layout, print styles
```

See [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) for the design decisions.

### Editing ingredients and meals

The content lives in three JSON files in `src/data/library/`. Edit those, not the code:

- **`ingredients.json`:** the ingredient catalog. Each entry has these fields:
  - `id`: permanent, used by meals and saved plans. Never rename an existing `id`; change the `name` or add `aliases` instead.
  - `name`
  - `category`: the nutrition food group (`proteins`, `carbohydrates`, `produce` or `fats-extras`).
  - `kitchenGroup`: where it appears on the Your kitchen page (`produce`, `proteins`, `dairy-eggs`, `grains` or `pantry`). These are everyday shopper groups, so milk sits in Dairy & eggs and canned beans in Proteins, whatever their nutrition group.
  - `storeSection`: the grocery-list section.
  - `aliases`: optional other names people search for.
  
  If two records ever need merging, delete one and add its ID to `src/data/legacyIds.ts`, so saved plans move over automatically.
- **`meals.json`:** the meal library. Each meal has these fields:
  - `id`, `name`
  - `category`: `breakfast`, `lunch`, `dinner` or `snack`.
  - `requiredIngredients` and `optionalIngredients`, as ingredient IDs.
  - `source`: internal only, never shown.
  - `preparationNote`: optional.
  
  Optional fields for later, once reviewed: `prepTimeMinutes`, `instructions`, `substitutions` and `dietaryTags`. Never invent these, and don't add nutritional values or health claims.
- **`store-sections.json`:** the grocery-list sections, in the order a shopper walks the store. `other` must stay.

`npm test` checks the whole library: every ingredient ID resolves, there are no duplicate IDs, every category and section is valid, and no name or alias points at two ingredients. A failing test names the meal or ingredient to fix. `content/mane-meals-v1/` keeps the original content package as delivered. `docs/LIBRARY_IMPORT_REPORT.md` records how it was reconciled.

### Meal photos

Photos are optional, one per meal. Meals without a photo show a soft branded placeholder, so photos can be added gradually.

- **Adding photos:** run `python3 scripts/process_meal_photos.py path/to/photo.jpg=meal-id ...` (needs Python with Pillow). It crops each photo to a centred square, resizes it to 480×480, and saves it as `public/meal-photos/<meal-id>.webp` (roughly 35–60 KB). It also rebuilds `src/data/library/meal-photos.json`. Square or portrait source photos work best.
- **Display:** cards show photos as 88 px squares that load as people scroll. The offline worker keeps the photos people have seen.
- **Tests:** they check that every listed photo exists and belongs to a real meal.

### Matching rules

Each required ingredient lands in exactly one group:

- **Already have:** the user has it, or has one of its listed substitutes.
- **Already on shopping list:** it's marked "Need to buy".
- **Need to buy:** anything else. This goes on the list when the meal is chosen.

Ranking puts the meals with the smallest share of ingredients *not already at home* first. That counts Need to buy plus Already on shopping list, so a meal that's all shopping never outranks one cooked mostly from the kitchen. Ties go to a smaller share of new items to buy, then meals never chosen before, then library order. Preparation time is not used: the library has no reviewed times, so none are shown, asked about or used for ranking.

**Optional ingredients** are never counted as missing. They only go on the list when the user taps their "+" chip on a meal card. Tapping an extra on a meal that isn't in the plan yet adds the meal too, and removing the meal removes its extras.

**Avoided foods** ("Foods to leave out" on the meal ideas page) are for things *nobody* in the household eats. A meal uses the first acceptable substitute and labels it ("Chicken breast (instead of salmon)"). If no substitute exists, the meal is hidden and the page says how many were hidden. When only *some* people avoid a food, users tap a swap chip on the meal ("+ Tofu instead of salmon") to buy an alternative just for them. Quick-pick groups (Fish & seafood, Dairy and so on) are defined in `src/data/avoidGroups.ts`. Keep them in sync with the ingredient catalog.

### Adding an AI recommendation service later

The UI only talks to the `RecommendationProvider` interface in `src/services/recommendations/types.ts`:

```ts
recommend(request: RecommendationRequest, options?: { signal?: AbortSignal }): Promise<MealRecommendation[]>
```

To switch providers, implement that interface (for example, by calling a Cloudflare Pages Function that calls your AI service), then export your provider from `src/services/recommendations/index.ts`. You can keep `localRecommendationProvider` as a fallback. No UI changes are needed, because the hook already handles loading and error states.

### Connecting feedback (Web3Forms)

Feedback is emailed to you through [Web3Forms](https://web3forms.com), a free form-to-email service that works from static sites.

1. Go to web3forms.com and create an access key with the email address that should receive feedback. No domain is needed for this.
2. Name the form something you'll recognize in your inbox, such as **Mane Meals Feedback**. Each email arrives with the subject "New feedback: Mane Meals".
3. In Cloudflare Pages, open your project, then **Settings → Variables and Secrets**, and add `VITE_WEB3FORMS_ACCESS_KEY` with your key, for both Production and Preview.
4. Redeploy. `VITE_` variables are built into the site, so a change only takes effect after a new deployment.

To test locally, copy `.env.example` to `.env.local`, add the key, and run `npm run dev`.

The access key is designed to be public, since it can only send email to your inbox. A hidden "botcheck" field filters simple spam bots. Until a key is set, the form says plainly that sending isn't connected and keeps answers on the device. It only shows "sent" when Web3Forms confirms it received the feedback. If you later use your own backend instead, set `VITE_FEEDBACK_ENDPOINT` to a URL that accepts a JSON `POST`.

## Deploying to Cloudflare Pages

The app is a single static page. It needs no server and no SPA redirect rules.

**Option A: Git integration (recommended)**

1. In the Cloudflare dashboard, go to **Workers & Pages → Create → Pages → Connect to Git** and choose this repository.
2. Use these build settings:
   - Framework preset: **Vite** (or None)
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Environment variable: `NODE_VERSION` = `22` (optional, since `.nvmrc` is also respected)
3. Click **Save and Deploy**. Every push to the production branch redeploys, and other branches get preview URLs.

**Option B: Direct upload with Wrangler**

```bash
npm run build
npx wrangler pages deploy dist --project-name healthy-hair-grocery-planner
```

`public/_headers` adds basic security headers and long-term caching for hashed assets.

### Using a custom subdomain

The site works on its free `*.pages.dev` address right away. To use your own subdomain (for example `planner.yourdomain.com`), open the Pages project, go to **Custom domains → Set up a custom domain**, and enter the subdomain. If your domain's DNS is on Cloudflare, the record is added for you. If not, Cloudflare shows a CNAME record to add at your DNS provider. Nothing in the code needs to change.

## Privacy

Planning data stays in the visitor's own browser (`localStorage` key `healthy-hair-grocery-planner:v1`) and is never uploaded. **Start over** clears all of it. The only data that leaves the browser is feedback, and only when the visitor presses **Send feedback**.
