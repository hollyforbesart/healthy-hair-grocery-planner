# Mane Meals Planner — content library v1

- 100 unique meals; 138 catalog ingredient records, including retained legacy IDs.
- Source: reviewed meal CSV from v0.2 and user's reviewed `ingredients_updated.xlsx`.
- No quantities, nutritional claims, cooking instructions, or unverified dietary tags. Two short preparation notes included.
- `category` uses existing food-group IDs; `storeSection` is separate and uses `grocery-sections.json`.
- Do not blindly overwrite the app: compare the current live ingredient and meal files first. Existing saved user plans must keep resolving.
- `oats` retained as existing ID for reviewed `rolled-oats`; `whole-grain-wraps` retained for `whole-wheat-tortillas`. These are normalization decisions; display labels can be revised.
- Other overlapping ingredients are intentionally not automatically merged, to avoid ungrounded equivalence. Audit duplicates before shipping.
- Store sections are sensible defaults and may vary by store. Fresh/frozen flexibility is not implemented as duplicate ingredient entries.
- Prep times left out because they were blank in reviewed CSV. No recipes or serving quantities.
- `source` is internal editorial metadata, not a consumer-facing badge.
