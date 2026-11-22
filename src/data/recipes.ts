import library from './library/recipes.json';

/** A piece of recipe text. Inline **bold** and *italic* are kept as written. */
export type RecipeBlock =
  | { type: 'h'; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[]; start?: number };

/** Per serving. Any value can be missing; only the ones present are shown. */
export interface RecipeNutrition {
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  iron_mg?: number;
  vitamin_c_mg?: number;
  b12_mcg?: number;
  sodium_mg?: number;
}

export interface Recipe {
  /** Where the recipe comes from (e.g. "The Iron Refill"). */
  source: string;
  serves: string;
  time: string | null;
  packable: string | null;
  labels: string[];
  /** Ingredients, Instructions, Swaps ... in the order written. */
  sections: { title: string; blocks: RecipeBlock[] }[];
  nutrition?: RecipeNutrition;
  nutritionNotes: string[];
}

/**
 * Full recipes, keyed by meal ID (src/data/library/recipes.json). The Iron
 * Refill ones are written by scripts/import_iron_refill.py; recipes for other
 * meals can be added by hand in the same shape. Meals without one keep the
 * "Find a recipe" web search.
 */
export const RECIPES = library as unknown as Record<string, Recipe>;
