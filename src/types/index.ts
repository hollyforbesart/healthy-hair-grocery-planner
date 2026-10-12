// Shared domain types. Data lives in src/data, logic in src/lib.

/** Food group used to organise ingredient selection (Step 2). */
export type FoodGroupId = 'proteins' | 'carbohydrates' | 'produce' | 'fats-extras';

/**
 * Grocery-store section used to organise the shopping list. IDs come from
 * src/data/library/store-sections.json ("other" is the catch-all).
 */
export type StoreSectionId = string;

export type MealCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type DietaryTag = 'vegetarian' | 'vegan' | 'dairy-free' | 'gluten-free' | 'pescatarian';

/** A standardized ingredient. `id` is the key used everywhere else. */
export interface Ingredient {
  id: string;
  name: string;
  category: FoodGroupId;
  /** Where it's usually found in a store, for the grocery list. */
  storeSection: StoreSectionId;
  /** Other names people search for, e.g. "garbanzo beans" for chickpeas. */
  aliases?: string[];
  /** True for entries the user typed in themselves. */
  custom?: boolean;
}

export interface IngredientSubstitution {
  /** The ingredient in the template being replaced. */
  ingredientId: string;
  /** Acceptable alternatives, in order of preference. */
  alternatives: string[];
  note?: string;
}

/** An editable meal template. References ingredients by ID only. */
export interface MealTemplate {
  id: string;
  name: string;
  category: MealCategory;
  description?: string;
  requiredIngredients: string[];
  optionalIngredients: string[];
  /** Reviewed swaps only. The v1 library has none. */
  substitutions?: IngredientSubstitution[];
  /**
   * Approximate time in minutes. The v1 library has none, so times are not
   * shown, filtered on or used for ranking. Never estimate one.
   */
  prepTimeMinutes?: number;
  /** Brief preparation steps (kept for a future recipes feature; not shown). */
  instructions?: string[];
  /** A short, reviewed preparation note shown on the meal card. */
  preparationNote?: string;
  /** Internal editorial metadata (where the meal came from). Not shown to users. */
  source?: string;
  dietaryTags?: DietaryTag[];
}

/** What the user told us about an ingredient in Step 2. */
export type IngredientStatus = 'have' | 'need';

export type IngredientStatusMap = Record<string, IngredientStatus>;

export type CookingStyle = 'quick' | 'batch' | 'mixed';

export interface WeekPreferences {
  cookingStyle: CookingStyle | null;
  mealCategories: MealCategory[];
  /** Free text so users can type "$80" or "about 100". */
  budget: string;
  householdSize: number | null;
  /** Ingredients nobody in the household eats. Meals swap them out or are hidden. */
  avoidIngredientIds: string[];
}

/** A user edit layered over a generated grocery item. */
export interface GroceryItemOverride {
  name?: string;
  checked?: boolean;
  removed?: boolean;
}

/** An item the user typed directly into the grocery list. */
export interface ManualGroceryItem {
  id: string;
  name: string;
  section: StoreSectionId;
  checked: boolean;
  /** Set when the typed name matches a catalog or custom ingredient. */
  ingredientId?: string;
}

/**
 * Why an item is on the list: chosen in Step 2, needed by a selected meal,
 * an optional extra or swap the user tapped on a meal card, or typed in.
 */
export type GrocerySource = 'chosen' | 'meal' | 'extra' | 'added';

export interface GroceryListItem {
  /** Ingredient ID for generated items; `manual-…` for hand-added ones. */
  id: string;
  name: string;
  section: StoreSectionId;
  checked: boolean;
  sources: GrocerySource[];
  /** Names of selected meals that need this item. */
  forMeals: string[];
  /** Labels for tapped extras, e.g. "Optional for Chickpea Quinoa Bowl". */
  extraNotes: string[];
}

/** Optional extras / swap alternatives the user tapped, keyed by meal ID. */
export type MealExtras = Record<string, string[]>;

export interface FeedbackDraft {
  rating: number | null;
  /** What made the planner helpful. */
  helpful: string;
  /** What else they wish it could do. */
  wish: string;
}
