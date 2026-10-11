// Shared domain types. Data lives in src/data, logic in src/lib.

/** Grocery grouping. Ingredients use the four food groups; 'other' is for hand-added list items. */
export type GroceryCategoryId = 'proteins' | 'carbohydrates' | 'produce' | 'fats-extras' | 'other';

export type MealCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type DietaryTag = 'vegetarian' | 'vegan' | 'dairy-free' | 'gluten-free' | 'pescatarian';

/** A standardized ingredient. `id` is the key used everywhere else. */
export interface Ingredient {
  id: string;
  name: string;
  category: GroceryCategoryId;
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
  substitutions: IngredientSubstitution[];
  /** Approximate hands-on + cooking time in minutes. */
  prepTimeMinutes: number;
  /** Brief preparation steps. */
  instructions: string[];
  dietaryTags?: DietaryTag[];
}

/** What the user told us about an ingredient in Step 2. */
export type IngredientStatus = 'have' | 'need';

export type IngredientStatusMap = Record<string, IngredientStatus>;

export type CookingStyle = 'quick' | 'batch' | 'mixed';

export interface WeekPreferences {
  cookingStyle: CookingStyle | null;
  /** Typical time available to cook one meal, in minutes. 0 = no limit; null = not answered. */
  maxPrepMinutes: number | null;
  mealCategories: MealCategory[];
  /** Free text so users can type "$80" or "about 100". */
  budget: string;
  householdSize: number | null;
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
  category: GroceryCategoryId;
  checked: boolean;
  /** Set when the typed name matches a catalog or custom ingredient. */
  ingredientId?: string;
}

export type GrocerySource = 'chosen' | 'meal' | 'added';

export interface GroceryListItem {
  /** Ingredient ID for generated items; `manual-…` for hand-added ones. */
  id: string;
  name: string;
  category: GroceryCategoryId;
  checked: boolean;
  sources: GrocerySource[];
  /** Names of selected meals that need this item. */
  forMeals: string[];
}

export interface FeedbackDraft {
  rating: number | null;
  wish: string;
}
