# Recipes, nutrition and The Iron Refill meals (not launched yet)

## What's built

- **27 meals and snack combos from The Iron Refill** (8 breakfasts, 12 lunch-or-dinner meals, 7 snacks) are in `src/data/library/meals.json`, each with `"source": "The Iron Refill"`, `"highIron": true` and `"preview": true`. The 12 lunch-or-dinner meals have `"category": "lunch"` and `"extraCategories": ["dinner"]`, so they show under both.
- **Full recipes** are in `src/data/library/recipes.json`, keyed by meal ID: serves, time, ingredients with amounts, steps, swaps and tips, word for word from the guide, plus **nutrition per serving** (calories, protein, carbs, fat, fiber, iron, vitamin C, B12, sodium). Snack combos have their items and the four values the guide gives.
- **22 new grocery ingredients** these meals need are in `ingredients.json`, also marked `"preview": true`.

## Hidden until launch

Everything above is invisible on the live planner. To see it in a browser, open the planner with `?preview=recipes` on the end, for example `https://manemeals.thehairlossnutritionist.com/planner?preview=recipes`. It stays on in that browser until you open a page with `?preview=off`.

In preview you see the 27 meals (with a **High iron** tag), and **See the recipe** on any meal that has a recipe, which opens it in a panel with a **Back** button (the phone's back gesture works too). Meals without a recipe keep **Find a recipe ↗**.

**To launch:** in `src/lib/preview.ts`, change `RECIPES_LAUNCHED = false` to `true`.

## Updating The Iron Refill recipes

Edit the guide's files in the meals-and-recipes repo (`tool-a/data/final-recipes.csv` for nutrition, `tool-a/TOOL-A-CONTENT.md` for the recipes), then run:

    python3 scripts/import_iron_refill.py /path/to/meals-and-recipes

Ingredient matching, names, time categories and the short prep notes are in `scripts/iron_refill_meals.py`.

## Adding a recipe (or just nutrition) to one of the other 100 meals

Add an entry to `src/data/library/recipes.json` under the meal's ID, in the same shape as the Iron Refill ones. Every nutrition value is optional; only the ones you fill in are shown:

```json
"strawberry-overnight-oats": {
  "source": "Mane Meals",
  "serves": "1",
  "time": "5 min, plus overnight",
  "packable": null,
  "labels": [],
  "sections": [
    { "title": "Ingredients", "blocks": [{ "type": "ul", "items": ["1/2 cup rolled oats", "..."] }] },
    { "title": "Instructions", "blocks": [{ "type": "ol", "items": ["Stir ...", "Cover and chill overnight."] }] }
  ],
  "nutrition": { "calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0, "fiber_g": 0, "iron_mg": 0, "vitamin_c_mg": 0, "b12_mcg": 0, "sodium_mg": 0 },
  "nutritionNotes": []
}
```

Block types: `"h"` (a small heading), `"p"` (a paragraph), `"ul"` (a bulleted list), `"ol"` (numbered steps). `**bold**` and `*italic*` work inside the text. The tests check every recipe belongs to a real meal and every nutrition value is a number.
