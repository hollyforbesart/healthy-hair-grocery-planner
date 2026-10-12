# Library import report: Mane Meals library v1

This report covers how the content package in `content/mane-meals-v1/` (kept exactly as delivered) was turned into the app's data in `src/data/library/`.

## Summary

| | Package | App |
|---|---|---|
| Meals | 100 | 100 (25 breakfast, 27 lunch, 32 dinner, 16 snack) |
| Ingredient records | 138 | 129 |
| Store sections | 12 | 12 (unchanged) |

**Checks (all passed, and repeated automatically by `npm test`):**
- Every required and optional ingredient resolves to the catalog.
- There are no duplicate meal IDs or names.
- Every meal category, food group and store section is valid.
- No meal lists an ingredient as both required and optional.
- No name or alias points at two different ingredients.

**What was not changed:**
- Meal names, categories, ingredient lists and the two preparation notes are as reviewed.
- Only two meals changed, and only to point at a merged ID: `egg` became `eggs`.
- No prep times, instructions, swaps, dietary tags or nutrition data were added.

## Duplicate records merged

Each pair described the same food. The record the meals use is kept. The other record is removed, and its ID is listed in `src/data/legacyIds.ts`, so plans people have already saved move onto the kept record automatically.

| Removed ID | Kept ID | Shown as | Notes |
|---|---|---|---|
| `egg` | `eggs` | Eggs | 2 meals said `egg` and now say `eggs` |
| `bananas` | `banana` | Banana | Old app ID |
| `lemons` | `lemon` | Lemon | Old app ID |
| `feta` | `feta-cheese` | Feta Cheese | Old app ID; food group follows the reviewed record (Proteins) |
| `tuna` | `canned-tuna` | Canned Tuna | Old app ID; section Canned & Jarred |
| `rolled-oats` | `oats` | Rolled Oats | Package's own decision; reviewed name used |
| `whole-wheat-tortillas` | `whole-grain-wraps` | Whole Wheat Tortillas | Package's own decision; reviewed name used |
| `brown-rice` | `rice` | Rice | The reviewed `rice` record already lists "brown rice" as another name |
| `berries` | `mixed-berries` | Mixed Berries | Old generic record; no meal used it |

The removed records' names were kept as search terms on the kept record. For example, searching "Bananas" or "tuna" still finds the right food.

## Not merged on purpose

These sound alike but are different products, and treating them as the same would make matching misleading:

- **Strawberries, blueberries, raspberries and mixed berries:** having strawberries does not mean a meal calling for raspberries is covered.
- **Rice and noodles.** Pasta, penne, macaroni, jumbo shells and whole-wheat pasta are also separate from each other.
- **Fish:** salmon, canned salmon and smoked salmon; canned tuna, trout and white fish.
- **Tomatoes:** tomatoes, cherry tomatoes, canned tomatoes and tomato sauce.
- **Cheese:** cheddar and shredded cheese.
- **Greens:** lettuce and mixed greens.
- **Citrus:** orange and mandarin oranges.
- **Chocolate:** dark chocolate and dark chocolate chips.
- **Meat:** chicken breast, thighs and legs; ground turkey and sliced turkey breast.

## Search names

- **Split:** two package entries held two names in one, such as "sweet peppers | capsicum". They were split into separate search names.
- **Carried over** from the previous app catalog where still accurate, for example "garbanzos", "yams", "courgette", "pepitas" and "tamari".
- **Dropped** because they would now point at the wrong food:
  - "chicken" on chicken breast (thighs and legs exist);
  - "tomatoes" on cherry tomatoes (tomatoes exists);
  - "rice" on brown rice and "pasta" on whole-wheat pasta;
  - the specific berries on generic berries;
  - "flour tortillas" on whole-wheat tortillas.

## Store sections

The grocery list is now grouped by `storeSection`, in the order of `store-sections.json`. The four food groups still organise ingredient selection in Step 2. Items typed into the list choose a section, defaulting to Other. Items from older saved lists go to Other, or to Produce if they were filed under produce. The user's own ingredients use Produce if they're produce, otherwise Other.

## Other app changes from the brief and your prep-time update

- **Meal data:** `prepTimeMinutes`, `instructions` and `substitutions` are optional. `preparationNote` and `source` are added; `source` is never shown.
- **Prep times:** the Step 1 time question, the "longer than your usual time" warning and all time-based ranking are removed. Meal cards show no time. Ranking is pantry fit only.
- **Preparation notes:** the two notes (banana oat pancakes, roasted chickpeas) show on their meal cards under "Preparation note".
- **Avoid list:** the quick picks (Meat, Fish, Dairy, Eggs, Nuts, Soy, Wheat) were rebuilt from the new catalog.
- **Old sample meals:** the 8 sample meals are no longer in the app. They're kept only as test data, because they include swaps and the matching engine still supports swaps. A saved plan that had chosen one of them still loads; that meal just no longer appears.

## Content decisions (answered)

1. **Kale, tempeh and almonds:** kept. No meal uses them, so they don't affect meal ideas. People can still mark them, star them as staples or add them to their list, and older saved plans that use them still load.
2. **Mixed berries:** stays in Frozen Foods; single berries stay in Produce. (Fresh and frozen are both fine; see "Possible later" below.)
3. **Cheeses:** cheddar, feta, mozzarella, parmesan, ricotta and shredded cheese moved to **Fats & Extras** in Step 2. Cottage cheese stays in **Proteins**, where it was before; easy to move if preferred.
4. **Avoid-list judgement calls:** kept. To make them visible, Step 2 now says *why* something is avoided, e.g. "Avoiding (Dairy, Nuts & peanuts)" on basil pesto. Step 1 has a "What's in each group?" list, which also explains that brand-dependent foods (noodles, granola, protein powder, protein waffle mix) can be added individually.
5. **Names:** back to sentence case ("Chicken breast"). Proper names keep their capitals: Greek yogurt, Parmesan cheese, Brussels sprouts, Caribbean green seasoning, Sweet Thai chili sauce, BBQ sauce.

## Possible later

- **A short note on list items,** such as "fresh or frozen" for berries, mango, spinach, corn and edamame. This would be one optional field per ingredient, shown under the item on the grocery list.
- **An "Include anyway" option** on an avoided food in Step 2, so someone avoiding Dairy can still allow pesto.
