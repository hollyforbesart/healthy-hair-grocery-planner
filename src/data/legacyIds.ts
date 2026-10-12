/**
 * Ingredient IDs that were merged into another record. Saved plans that still
 * use an old ID are moved to the new one when they load, so nothing is lost.
 * Add a line here whenever two catalog records are merged.
 */
export const LEGACY_INGREDIENT_IDS: Record<string, string> = {
  egg: 'eggs',
  bananas: 'banana',
  lemons: 'lemon',
  feta: 'feta-cheese',
  tuna: 'canned-tuna',
  'rolled-oats': 'oats',
  'whole-wheat-tortillas': 'whole-grain-wraps',
  berries: 'mixed-berries',
  'brown-rice': 'rice',
};

export const canonicalIngredientId = (id: string): string => LEGACY_INGREDIENT_IDS[id] ?? id;
