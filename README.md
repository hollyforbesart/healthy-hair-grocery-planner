# Healthy Hair Grocery Planner

A responsive web app for **The Hair Loss Nutritionist**. It helps people plan groceries, find meal ideas that use ingredients they already have, and build one tidy shopping list.

Version 1 is a static React + TypeScript + Vite app. It has no AI service, no accounts and no database. Planning progress is saved in the browser's `localStorage`.

## How it works

1. **Start with your week:** cooking style, available time, the meals you're planning, and an optional budget and household size. You can skip every question.
2. **Choose your ingredients:** foods are grouped into Proteins, Carbohydrates, Vegetables & Fruit, and Fats & Extras, sorted alphabetically, with search (aliases work, so "garbanzo beans" finds Chickpeas). Mark each one **Already have** or **Need to buy**, or add your own. Duplicates are blocked.
3. **Find meal ideas:** meals are ranked so the ones needing the fewest extra ingredients come first. Each card shows what you have, what's already on your list, what you'd need to buy, and the optional extras.
4. **Grocery list:** combines your "Need to buy" items with whatever your chosen meals are missing. Duplicates are removed, anything marked "Already have" is left out, and the list is grouped by category. You can add, edit, remove and check off items, then **Copy** or **Print** the list.
5. **Feedback:** an optional rating and an open question. Nothing is sent until a feedback endpoint is configured (see below).

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

- Required ingredients are covered by: having the ingredient, having one of its listed substitutes, or having it already marked "Need to buy". Anything else counts as an additional purchase.
- Optional ingredients are only shown for information. They are never counted as missing and never added to the list.
- Ranking: fewest additional ingredients first, then meals that fit the user's available time, then the most ingredients already owned.

### Adding an AI recommendation service later

The UI only talks to the `RecommendationProvider` interface in `src/services/recommendations/types.ts`:

```ts
recommend(request: RecommendationRequest, options?: { signal?: AbortSignal }): Promise<MealRecommendation[]>
```

To switch providers, implement that interface (for example, by calling a Cloudflare Pages Function that calls your AI service), then export your provider from `src/services/recommendations/index.ts`. You can keep `localRecommendationProvider` as a fallback. No UI changes are needed, because the hook already handles loading and error states.

### Connecting feedback collection

`src/services/feedback.ts` sends a JSON `POST` to `VITE_FEEDBACK_ENDPOINT`:

```json
{ "rating": 4, "wish": "…", "submittedAt": "2026-01-01T12:00:00.000Z", "appVersion": "1.0.0" }
```

If that variable is not set, the form says plainly that sending isn't connected yet and keeps answers on the device only. It never shows a "sent" message unless the server actually accepted the request. Copy `.env.example` to `.env.local` to set the endpoint locally. On Cloudflare Pages, add it as an environment variable. `VITE_` variables are embedded at build time, so redeploy after you change one.

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

## Privacy

Version 1 stores everything in the visitor's own browser (`localStorage` key `healthy-hair-grocery-planner:v1`). Nothing is sent anywhere. **Start over** clears all of it.
