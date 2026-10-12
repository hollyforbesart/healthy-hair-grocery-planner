# Claude Code implementation brief — Mane Meals Planner

Work in `hollyforbesart/healthy-hair-grocery-planner`. I have attached `ingredients.json`, `meals.json`, and `grocery-sections.json` from the Mane Meals content package. These contain the reviewed 100-meal collection and my approved ingredient section changes. **Inspect the actual repo before making changes.**

## Phase 1 — Content integration (do first)
1. Review `src/types/index.ts`, `src/data/ingredients.ts`, `src/data/meals.ts`, `src/data/categories.ts`, all grocery-list logic, and any localStorage persistence code. Preserve stable existing IDs and saved user data.
2. Import the 100 reviewed meals and the expanded ingredient catalog. **Audit and reconcile duplicate or near-duplicate ingredient records** (e.g., `rolled-oats`/`oats`, `whole-wheat-tortillas`/`whole-grain-wraps`, singular/plural produce, generic berries vs specific berries). The package retains legacy records on purpose; it is not a final deduplicated catalog. Avoid broad ingredient equivalences that would make matching misleading. Produce a brief mapping report of changes.
3. Adapt the current `MealTemplate` type safely: `prepTimeMinutes`, `instructions`, and `substitutions` are currently required, but the reviewed dataset intentionally has no verified prep times, full instructions, or substitutions. Make fields optional or provide safe empty values; do **not** fabricate times, instructions, dietary tags, or nutrient claims. Two short preparation notes are present and should appear where useful.
4. Preserve the four ingredient-selection groups (`proteins`, `carbohydrates`, `produce`, `fats-extras`). Introduce a **separate** `storeSection` property for the grocery list using `grocery-sections.json`. Do not reuse the food-group category as a shopping aisle. Handle custom/manual grocery items and old persisted lists gracefully.
5. Verify every required and optional ingredient ID resolves, no duplicate meal IDs, no invalid categories, and all 100 meals render. Keep optional ingredients from inflating the required shopping list unless selected.
6. Keep pantry-first ingredient matching and existing features working. Do not delete saved custom meals, favorites, or user selections.

## Phase 2 — UX improvements, after Phase 1 works
- Two clear entry paths: **Use what I already have** and **Help me find meal ideas**. Both share the same meal library and grocery list. Allow switching paths.
- Browsing by meal category, search by name/ingredient, and a simple all-meals view. Make ingredient matching accurate and explain why a meal was suggested.
- If recent meal history/favorites already exist, preserve them; if not, propose a minimal approach rather than adding a complicated recommendation engine.
- No cooking-preference questionnaire, no nutrient scoring, no AI, no serving-size or quantity calculations, and no full recipes in this release.
- Show a plain note: grocery list identifies ingredients to buy, not amounts.
- Use broad grocery-store sections. Treat fresh/frozen as flexible choices, not a claim about where every store stocks items.

## QA and delivery
- Run lint/typecheck/tests/build, inspect the grocery list for 3 representative meal selections and an existing saved plan, and confirm old IDs still resolve.
- Summarize exact files changed, mapping/dedup decisions, any content questions, and manual tests for me to run.
- Do not deploy to production or overwrite existing user data without asking me first.
