# Healthy Hair Grocery Planner

A responsive web app for **The Hair Loss Nutritionist**. It helps people plan groceries, find meal ideas that use ingredients they already have, and build one tidy shopping list.

Version 1 is a static React + TypeScript + Vite app. It has no AI service, no accounts and no database. Planning progress is saved in the browser's `localStorage`.

## How it works

1. **Start with your week:** cooking style, available time, the meals you're planning, foods the household avoids, and an optional budget and number of people. You can skip every question.
2. **Choose your ingredients:** foods are grouped into Proteins, Carbohydrates, Vegetables & Fruit, and Fats & Extras, sorted alphabetically, with search (aliases work, so "garbanzo beans" finds Chickpeas). Mark each one **Already have** or **Need to buy**, or add your own. Duplicates are blocked.
3. **Find meal ideas:** meals that use the most of what's already at home come first. Each card separates **Already have**, **Already on shopping list** and **Still need**. Optional extras and swaps ("+ Feta", "+ Tofu instead of salmon") are tappable chips that add the item to the list.
4. **Grocery list:** combines your "Need to buy" items, whatever your chosen meals still need, and any extras you tapped. Duplicates are removed, anything marked "Already have" is left out, and the list is grouped by category. You can add, edit, remove and check off items, then **Share**, **Copy** or **Print** the list. Instructions on the page explain how to save or send it.
5. **Feedback:** an optional rating and an open question, sent by email through Web3Forms once an access key is configured (see below).

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

- **Ingredients** live in `src/data/ingredients.ts`. Each has a permanent `id`, a display `name`, a `category` and optional `aliases`. Never change an existing `id`, because saved user data and meals refer to it. Change the `name` or add `aliases` instead.
- **Meals** live in `src/data/meals.ts`. Each template has an `id`, `name`, `category` (breakfast, lunch, dinner or snack), `requiredIngredients`, `optionalIngredients`, `substitutions`, `prepTimeMinutes`, short `instructions`, and optional `dietaryTags`. Meals refer to ingredients **by ID only**. A test checks that every referenced ID exists in the catalog.
- The included meals are **sample data**. Replace them with the curated library before launch. Do not add nutritional values or health claims.

### Matching rules

Each required ingredient lands in exactly one group:

- **Already have:** the user has it, or has one of its listed substitutes.
- **Already on shopping list:** it's marked "Need to buy".
- **Still need:** anything else. This goes on the list when the meal is chosen.

Ranking puts the meals with the fewest ingredients *not already at home* first. That counts Still need plus Already on shopping list, so a meal that's all shopping never outranks one cooked mostly from the kitchen. Ties go to fewer Still need, then meals that fit the available time, then more owned ingredients.

**Optional ingredients** are never counted as missing. They only go on the list when the user taps their "+" chip on a meal card. Tapping an extra on a meal that isn't in the plan yet adds the meal too, and removing the meal removes its extras.

**Avoided foods** (Step 1) are for things *nobody* in the household eats. A meal uses the first acceptable substitute and labels it ("Chicken breast (instead of salmon)"). If no substitute exists, the meal is hidden and the page says how many were hidden. When only *some* people avoid a food, users tap a swap chip on the meal ("+ Tofu instead of salmon") to buy an alternative just for them. Quick-pick groups (Fish & seafood, Dairy and so on) are defined in `src/data/avoidGroups.ts`. Keep them in sync with the ingredient catalog.

### Adding an AI recommendation service later

The UI only talks to the `RecommendationProvider` interface in `src/services/recommendations/types.ts`:

```ts
recommend(request: RecommendationRequest, options?: { signal?: AbortSignal }): Promise<MealRecommendation[]>
```

To switch providers, implement that interface (for example, by calling a Cloudflare Pages Function that calls your AI service), then export your provider from `src/services/recommendations/index.ts`. You can keep `localRecommendationProvider` as a fallback. No UI changes are needed, because the hook already handles loading and error states.

### Connecting feedback (Web3Forms)

Feedback is emailed to you through [Web3Forms](https://web3forms.com), a free form-to-email service that works from static sites.

1. Go to web3forms.com and create an access key with the email address that should receive feedback. No domain is needed for this.
2. Name the form something you'll recognize in your inbox, such as **Healthy Hair Grocery Planner Feedback**. Each email arrives with the subject "New feedback: Healthy Hair Grocery Planner".
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
