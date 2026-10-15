# Content to add later

Things Holly is writing or supplying. The app already has a place for each one; nothing here should be invented.

- **Preparation cues for the more involved meals.** A line or two on how the meal comes together (e.g. for Jerk Chicken Pasta), not a full recipe. Add each as `preparationNote` in `src/data/library/meals.json`; cards already show it under "Preparation note". Simple meals like quesadillas don't need one.
- **Time categories** are in (Quick, Moderate, More involved). Please review the 16 flagged in [`TIME_CATEGORIES.md`](TIME_CATEGORIES.md).
- **Meal photos.** All 100 are in. For new or replacement photos, process with `python3 scripts/process_meal_photos.py photo.jpg=meal-id ...` — only the small `.webp` files go in the repo, never the originals.
- **Full recipes**, if and when they're committed to. The home page makes no promise about them, so add a mention only once they're certain.
