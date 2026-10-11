# Implementation Plan — Version 1

## Folder structure

```
healthy-hair-grocery-planner/
├── index.html                    Vite entry HTML
├── public/                       Static assets copied as-is (favicon, Cloudflare _headers)
├── src/
│   ├── main.tsx                  React bootstrap
│   ├── App.tsx                   Step shell: header, step navigation, current step
│   ├── types/                    Shared domain types (no logic)
│   │   └── index.ts
│   ├── data/                     Editable content — no logic
│   │   ├── categories.ts         Grocery categories + meal categories (display order, labels)
│   │   ├── ingredients.ts        Ingredient catalog (standardized IDs + aliases)
│   │   └── meals.ts              Meal template library (references ingredient IDs only)
│   ├── lib/                      Pure, framework-free logic (unit tested)
│   │   ├── text.ts               Name normalization / slugs
│   │   ├── ingredients.ts        Lookup, alias resolution, search, custom-entry de-duplication
│   │   ├── matching.ts           Meal ↔ pantry matching (required vs optional, substitutions)
│   │   ├── groceryList.ts        Build, de-duplicate, filter and group the grocery list
│   │   ├── format.ts             Plain-text export of the list (for Copy)
│   │   └── storage.ts            Versioned localStorage load/save with safe fallback
│   ├── services/                 Swappable boundaries to the outside world
│   │   ├── recommendations/
│   │   │   ├── types.ts          RecommendationProvider interface (async)
│   │   │   ├── localProvider.ts  V1 rules-based provider using lib/matching
│   │   │   └── index.ts          Selects the active provider
│   │   └── feedback.ts           FeedbackService; only "submits" when an endpoint is configured
│   ├── state/
│   │   ├── plannerReducer.ts     All planner state transitions (pure)
│   │   └── PlannerContext.tsx    Context + persistence to localStorage
│   ├── hooks/
│   │   └── useRecommendations.ts Loading/error handling around the provider
│   ├── components/               Reusable presentational pieces
│   │   ├── StepNav.tsx, StepFooter.tsx, IngredientRow.tsx, MealCard.tsx, …
│   ├── steps/                    One component per step of the flow
│   │   ├── WeekStep.tsx
│   │   ├── IngredientsStep.tsx
│   │   ├── MealsStep.tsx
│   │   ├── GroceryListStep.tsx
│   │   └── FeedbackStep.tsx
│   └── styles/
│       └── global.css            Brand tokens, layout, print styles
└── tests live next to the code they cover: src/lib/*.test.ts
```

## Key design decisions

1. **Standardized ingredient IDs.** Every catalog entry has a stable `id`
   (`chickpeas`), a display `name`, and `aliases` (`garbanzo beans`). Meals
   reference IDs only. Searching, custom entries and matching all resolve
   names to IDs first, so “garbanzo beans” and “chickpeas” are the same food.
2. **Meal templates are data.** Each template has ID, name, category,
   required ingredient IDs, optional ingredient IDs, substitutions
   (`ingredientId → [alternative IDs]`), approximate prep minutes, short
   steps and optional dietary tags. No nutrition values, no health claims.
3. **Matching engine** (`lib/matching.ts`) classifies each *required*
   ingredient as: have it, have a substitute, already on the list, or
   missing. Optional ingredients are reported separately and are never
   counted as missing.
4. **Recommendation provider interface.** The UI calls
   `provider.recommend(request) → Promise<MealRecommendation[]>`. V1 uses the
   local rules-based provider (ranks by fewest additional ingredients, then
   fit with available time, then most ingredients used). An AI provider can
   implement the same interface later with no UI changes.
5. **Grocery list is derived, edits are overlays.** The list is recomputed
   from (manual “Need to Buy” items ∪ missing required ingredients of
   selected meals) − “Already Have”, de-duplicated by ingredient ID. User
   edits (rename, remove, check off) are stored as overrides keyed by item
   ID, and hand-added items are stored separately, so the list stays correct
   when selections change.
6. **Persistence.** Whole planner state saved to `localStorage` under a
   versioned key; corrupt or outdated data falls back to defaults.
7. **Feedback.** `FeedbackService` posts JSON to `VITE_FEEDBACK_ENDPOINT`
   when set. Without it, the form is still usable, the draft is saved
   locally, and the UI states plainly that sending isn't connected yet.

## Build order

1. Tooling: Vite + React + TypeScript + Vitest.
2. Types and sample data (≈55 ingredients, 8 meal templates).
3. Pure logic + tests (matching, de-duplication, “Already Have” exclusion).
4. State, persistence, recommendation + feedback services.
5. UI steps 1–5, responsive styling, print styles.
6. README (local dev + Cloudflare Pages).
