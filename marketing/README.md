# Marketing images

- `mane-meals-mockup.png` / `.jpg` (3200×2360): three phones showing the planner's flow —
  add what's in your kitchen → pick meal ideas → get your grocery list. Made from real
  screenshots of the app with a sample plan.
- `mane-meals-phone-transparent.png` (2080×3440): one phone showing the home screen with the
  Mane Meals header, on a transparent background to place on any page.
- `mane-meals-phone-cream.jpg`: the same phone on a soft cream background.

## Regenerating

`mockup-source/` holds the scripts. With the app running on `http://localhost:4174`
(`npm run build && npx vite preview --port 4174`), from that folder:

1. `node capture.mjs` — takes the three phone screenshots (`s1-kitchen.png`, `s2-meals.png`, `s3-list.png`).
2. Copy `public/brand/mane-meals-mark.png` and `public/brand/mane-meals-wordmark.png` next to `mockup.html`.
3. `node render.mjs` — renders `mane-meals-mockup.png` at 2× (3200×2360).

For the single phone: `node capture-single.mjs` (takes `s0-home.png`), then `node render-single.mjs`.
