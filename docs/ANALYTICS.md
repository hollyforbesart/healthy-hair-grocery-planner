# Usage analytics

The planner sends **anonymous** usage events to a small Cloudflare function, which stores them in a free Cloudflare D1 database. A second function returns a summary for a dashboard.

**What is never collected:** names, emails, IP addresses, cookies, a visitor ID, plan contents, or anything typed into the grocery list or feedback. The only free text kept is meal searches (trimmed to 40 characters), so you can see what people look for. Visitors whose browser sends "Do Not Track" or "Global Privacy Control" send nothing.

## How it fits together

- `src/lib/analyticsSchema.ts`: the list of events (below) and validation.
- `src/lib/analytics.ts`: `track()`, which the planner calls. It's off in development and tests.
- `src/lib/analyticsActions.ts`: works out events from planner actions (meals added, foods added and so on) in one place.
- `functions/api/event.ts`: `POST /api/event`, which stores one event. It does nothing until the database is connected.
- `functions/api/stats.ts`: `GET /api/stats`, which returns the summary. It needs the `STATS_KEY` secret.
- `migrations/0001_create_events.sql`: the database table.

Each event row has the time, day, `env` (`live`, or `preview` for branch previews), the event name, an optional value, and a coarse device type (`app` for the installed app, `mobile` or `desktop`).

## One-time setup in Cloudflare (about 10 minutes)

Cloudflare's menus move around a little, but these are the pieces:

1. **Create the database.** In the Cloudflare dashboard, go to **Storage & Databases → D1** and create a database called `mane-meals-analytics`.
2. **Create the table.** Open the database, go to **Console**, paste everything in `migrations/0001_create_events.sql`, and run it.
3. **Connect it to the planner.** Go to **Workers & Pages → healthy-hair-grocery-planner → Settings → Bindings**, add a **D1 database** binding named exactly `DB`, and choose `mane-meals-analytics`. Do this for **Production**, and for **Preview** too if you want preview data.
4. **Add the dashboard key.** In **Settings → Variables and Secrets**, add a **Secret** named `STATS_KEY`. Make the value a long random password (32+ characters, from a password manager) and keep it somewhere safe. This key is what lets a dashboard read your numbers.
5. **Redeploy.** Under **Deployments**, retry the latest production deployment, or just wait for the next update to go live.
6. **Check it.** Visit `https://manemeals.thehairlossnutritionist.com/api/stats?key=<your key>`. You should see JSON with zeros, which fill in as people use the planner.

Until steps 1–4 are done, the planner works normally and simply doesn't record anything.

## The dashboard

Open **https://manemeals.thehairlossnutritionist.com/stats**, sign in like you do for the planner (your email is on the guest list), and enter your `STATS_KEY` once; that device remembers it. It shows:

- **People:** how many used Mane Meals in the period, active today / this week / this month, new accounts, how many used it on 2+ days, and how many came back after their first week, plus a daily chart.
- **What they do:** planner opens, meals added, grocery lists viewed and shared, new weeks, recipe taps, installs, feedback, a daily chart of meals added, and how far people get from opening the planner to a grocery list.
- **Favorites and searches:** most-added and favorited meals, searches, kitchen foods, optional ingredients, recipe taps, foods left out and filters used.
- **Devices and sign-ups:** phone vs computer vs installed app, sign-in page activity, how accounts were created, and accounts per access code (to spot sharing).

Pick 7 days, 30 days, 90 days or a year, and "Test previews" to see activity on preview links. The dashboard's code (`stats.html`, `src/stats/`) contains no planner content and needs both sign-in and the key.

## Reading the numbers

`GET /api/stats?days=30&env=live` with the header `Authorization: Bearer <STATS_KEY>` (or `?key=<STATS_KEY>`). It returns:

- `headline`: planner opens, homepage visits, meals added, lists viewed, lists shared/copied/printed, new weeks planned, recipe links opened, feedback sent, app installs, plus the sign-in pages: views of the sign-in and welcome pages, sign-ins, and "Get Mane Meals" clicks.
- `funnel`: opened the planner → chose how to start → saw meal ideas → reviewed their plan → reached the grocery list → shared, copied or printed it.
- `daily`: per-day page views, meals added, lists viewed, lists shared, new weeks.
- `top`: the top 15 values for each ranked event, with meal and ingredient names filled in. Examples: most-added meals, favorites, optional ingredients, recipe links, kitchen foods, staples, searches, foods left out, filters used.
- `devices`: app vs. mobile vs. desktop page views.
- `totals`: a count for every event.

- `accounts`: people, from the sign-in accounts (never emails): total accounts, new in this period, active today / last 7 days / last 30 days, how many used it on 2+ days in this period, how many came back a week or more after signing up, accounts by how they were created (access code, guest list, Kit), a daily series of active people and new accounts, and accounts per access code (to spot a code being shared).

`days` can be 1–365. Use `env=preview` to see test traffic from preview links.

The responses allow cross-site reads, so a dashboard hosted elsewhere (for example on Claude) can fetch them with the key.

## Events

| Event | Value |
|---|---|
| `page_view` | value: home, planner, week, about, nutrients, terms, access (sign-in page), welcome |
| `path_chosen` | value: pantry | ideas |
| `step_view` | value: kitchen | meals | review | list |
| `food_added` | value: ingredient ID (own items: "own") |
| `staple_marked` | value: ingredient ID |
| `meal_added` | value: meal ID |
| `meal_removed` | value: meal ID |
| `favorite_added` | value: meal ID |
| `extra_added` | value: optional-ingredient ID |
| `meal_type_filter` | value: all | breakfast | lunch | dinner | snack |
| `time_filter` | value: any | quick | moderate | more-involved |
| `favorites_filter` | — |
| `see_all` | value: meal type |
| `search` | value: what was typed (trimmed, lowercased, max 40 characters) |
| `leave_out_group` | value: avoid-group ID |
| `leave_out_food` | value: ingredient ID |
| `recipe_link` | value: meal ID |
| `list_view` | value: number of items |
| `list_share` | — |
| `list_copy` | — |
| `list_print` | — |
| `list_item_added` | no value: what people type stays private |
| `week_slot_set` | value: meal, custom (never the text), or a quick pick (eating-out, leftovers, pizza-night, takeout, skipping) |
| `week_filled` | value: how many meals "Fill in my week" placed |
| `week_print` | — |
| `new_week` | — |
| `start_over` | — |
| `install_click` | — |
| `app_installed` | — |
| `feedback_sent` | value: rating 1–5, if given |
| `signed_in` | value: new (account just created) or returning |
| `purchase_link` | "Get Mane Meals" tapped on the sign-in page |

## Privacy policy

Add the "usage statistics" paragraph from `docs/PRIVACY_POLICY_ADDITIONS.md` to the privacy policy before turning this on.
