import type {
  FeedbackDraft,
  GroceryCategoryId,
  GroceryItemOverride,
  Ingredient,
  IngredientStatus,
  IngredientStatusMap,
  ManualGroceryItem,
  MealExtras,
  WeekPreferences,
} from '../types';

export const STEPS = [
  { id: 'week', label: 'Your week' },
  { id: 'ingredients', label: 'Ingredients' },
  { id: 'meals', label: 'Meal ideas' },
  { id: 'list', label: 'Grocery list' },
  { id: 'feedback', label: 'Feedback' },
] as const;

export const STATE_VERSION = 1;

export interface PlannerState {
  version: typeof STATE_VERSION;
  currentStep: number;
  preferences: WeekPreferences;
  ingredientStatuses: IngredientStatusMap;
  customIngredients: Ingredient[];
  selectedMealIds: string[];
  /** Optional extras and swaps tapped on meal cards. */
  mealExtras: MealExtras;
  groceryOverrides: Record<string, GroceryItemOverride>;
  manualItems: ManualGroceryItem[];
  feedback: FeedbackDraft;
  /** Ingredients the user always keeps on hand; pre-marked each new week. */
  staples: string[];
  /** True right after "Start a new week", until the user leaves Step 2. */
  reviewingPantry: boolean;
}

export const DEFAULT_PREFERENCES: WeekPreferences = {
  cookingStyle: null,
  maxPrepMinutes: null,
  mealCategories: [],
  budget: '',
  householdSize: null,
  avoidIngredientIds: [],
};

export function createInitialState(): PlannerState {
  return {
    version: STATE_VERSION,
    currentStep: 0,
    preferences: { ...DEFAULT_PREFERENCES, avoidIngredientIds: [] },
    ingredientStatuses: {},
    customIngredients: [],
    selectedMealIds: [],
    mealExtras: {},
    groceryOverrides: {},
    manualItems: [],
    feedback: { rating: null, helpful: '', wish: '' },
    staples: [],
    reviewingPantry: false,
  };
}

/** True once the user has started planning, so the home page can offer "Continue". */
export function hasPlannerProgress(state: PlannerState): boolean {
  return (
    state.currentStep > 0 ||
    Object.keys(state.ingredientStatuses).length > 0 ||
    state.selectedMealIds.length > 0 ||
    state.manualItems.length > 0 ||
    state.staples.length > 0
  );
}

export type PlannerAction =
  | { type: 'goToStep'; step: number }
  | { type: 'updatePreferences'; patch: Partial<WeekPreferences> }
  | { type: 'setIngredientStatus'; ingredientId: string; status: IngredientStatus | null }
  | { type: 'addCustomIngredient'; ingredient: Ingredient; status?: IngredientStatus }
  | { type: 'removeCustomIngredient'; ingredientId: string }
  | { type: 'toggleMeal'; mealId: string }
  | { type: 'toggleMealExtra'; mealId: string; ingredientId: string }
  | { type: 'updateGroceryItem'; itemId: string; patch: GroceryItemOverride }
  | { type: 'restoreRemovedItems' }
  | { type: 'addManualItem'; item: ManualGroceryItem }
  | { type: 'updateManualItem'; itemId: string; patch: Partial<Pick<ManualGroceryItem, 'name' | 'checked' | 'category'>> }
  | { type: 'removeManualItem'; itemId: string }
  | { type: 'clearChecked'; generatedIds: string[] }
  | { type: 'updateFeedback'; patch: Partial<FeedbackDraft> }
  | { type: 'toggleStaple'; ingredientId: string }
  | { type: 'startNewWeek' }
  | { type: 'reset' };

function withoutKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  const next = { ...record };
  delete next[key];
  return next;
}

export function plannerReducer(state: PlannerState, action: PlannerAction): PlannerState {
  switch (action.type) {
    case 'goToStep': {
      const currentStep = Math.min(Math.max(action.step, 0), STEPS.length - 1);
      // The pantry check-in banner only belongs to the first visit to Step 2 of a new week.
      return { ...state, currentStep, reviewingPantry: state.reviewingPantry && currentStep === 1 };
    }

    case 'updatePreferences': {
      const preferences = { ...state.preferences, ...action.patch };
      if (!action.patch.avoidIngredientIds) return { ...state, preferences };
      // Avoided foods can't be marked Have / Need to buy, so drop any earlier choice.
      const ingredientStatuses = { ...state.ingredientStatuses };
      for (const id of action.patch.avoidIngredientIds) delete ingredientStatuses[id];
      return { ...state, preferences, ingredientStatuses };
    }

    case 'setIngredientStatus': {
      const ingredientStatuses = action.status
        ? { ...state.ingredientStatuses, [action.ingredientId]: action.status }
        : withoutKey(state.ingredientStatuses, action.ingredientId);
      // A fresh choice in Step 2 should bring a previously removed item back.
      return { ...state, ingredientStatuses, groceryOverrides: withoutKey(state.groceryOverrides, action.ingredientId) };
    }

    case 'addCustomIngredient':
      if (state.customIngredients.some((i) => i.id === action.ingredient.id)) return state;
      return {
        ...state,
        customIngredients: [...state.customIngredients, action.ingredient],
        ingredientStatuses: action.status
          ? { ...state.ingredientStatuses, [action.ingredient.id]: action.status }
          : state.ingredientStatuses,
      };

    case 'removeCustomIngredient':
      return {
        ...state,
        customIngredients: state.customIngredients.filter((i) => i.id !== action.ingredientId),
        ingredientStatuses: withoutKey(state.ingredientStatuses, action.ingredientId),
        groceryOverrides: withoutKey(state.groceryOverrides, action.ingredientId),
      };

    case 'toggleMeal':
      return state.selectedMealIds.includes(action.mealId)
        ? {
            ...state,
            selectedMealIds: state.selectedMealIds.filter((id) => id !== action.mealId),
            // Removing a meal also drops the extras tapped for it.
            mealExtras: withoutKey(state.mealExtras, action.mealId),
          }
        : { ...state, selectedMealIds: [...state.selectedMealIds, action.mealId] };

    case 'toggleMealExtra': {
      const current = state.mealExtras[action.mealId] ?? [];
      const adding = !current.includes(action.ingredientId);
      const next = adding ? [...current, action.ingredientId] : current.filter((id) => id !== action.ingredientId);
      return {
        ...state,
        mealExtras: { ...state.mealExtras, [action.mealId]: next },
        // Adding an extra implies the user wants to make the meal.
        selectedMealIds:
          adding && !state.selectedMealIds.includes(action.mealId)
            ? [...state.selectedMealIds, action.mealId]
            : state.selectedMealIds,
        // Bring the item back if it was removed from the list earlier.
        groceryOverrides: adding ? withoutKey(state.groceryOverrides, action.ingredientId) : state.groceryOverrides,
      };
    }

    case 'updateGroceryItem':
      return {
        ...state,
        groceryOverrides: {
          ...state.groceryOverrides,
          [action.itemId]: { ...state.groceryOverrides[action.itemId], ...action.patch },
        },
      };

    case 'restoreRemovedItems':
      return {
        ...state,
        groceryOverrides: Object.fromEntries(
          Object.entries(state.groceryOverrides).map(([id, o]) => [id, { ...o, removed: false }]),
        ),
      };

    case 'addManualItem':
      return { ...state, manualItems: [...state.manualItems, action.item] };

    case 'updateManualItem':
      return {
        ...state,
        manualItems: state.manualItems.map((i) => (i.id === action.itemId ? { ...i, ...action.patch } : i)),
      };

    case 'removeManualItem':
      return { ...state, manualItems: state.manualItems.filter((i) => i.id !== action.itemId) };

    case 'clearChecked': {
      const groceryOverrides = { ...state.groceryOverrides };
      for (const id of action.generatedIds) groceryOverrides[id] = { ...groceryOverrides[id], checked: false };
      return { ...state, groceryOverrides, manualItems: state.manualItems.map((i) => ({ ...i, checked: false })) };
    }

    case 'updateFeedback':
      return { ...state, feedback: { ...state.feedback, ...action.patch } };

    case 'toggleStaple': {
      const isStaple = state.staples.includes(action.ingredientId);
      return {
        ...state,
        staples: isStaple
          ? state.staples.filter((id) => id !== action.ingredientId)
          : [...state.staples, action.ingredientId],
        // A new staple is something the user has right now.
        ingredientStatuses:
          !isStaple && !state.ingredientStatuses[action.ingredientId]
            ? { ...state.ingredientStatuses, [action.ingredientId]: 'have' }
            : state.ingredientStatuses,
      };
    }

    case 'startNewWeek': {
      // Keep preferences, own ingredients, staples and feedback. Staples start
      // as "Already have" so the user only has to switch the ones that ran out;
      // everything else is re-checked from scratch, since last week's food
      // may have been used up.
      const avoid = new Set(state.preferences.avoidIngredientIds);
      const ingredientStatuses: IngredientStatusMap = {};
      for (const id of state.staples) if (!avoid.has(id)) ingredientStatuses[id] = 'have';
      return {
        ...state,
        currentStep: 1,
        ingredientStatuses,
        selectedMealIds: [],
        mealExtras: {},
        groceryOverrides: {},
        manualItems: [],
        reviewingPantry: true,
      };
    }

    case 'reset':
      return createInitialState();
  }
}

// ---------- Loading saved state ----------

const CATEGORY_IDS: GroceryCategoryId[] = ['proteins', 'carbohydrates', 'produce', 'fats-extras', 'other'];

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

const stringArray = (v: unknown): string[] =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string'))] : [];

/**
 * Rebuild state from untrusted saved JSON. Anything malformed falls back to
 * its default so an old or corrupt save can never crash the app.
 */
export function hydrateState(saved: unknown): PlannerState {
  const base = createInitialState();
  if (!isRecord(saved) || saved.version !== STATE_VERSION) return base;

  const prefs = isRecord(saved.preferences) ? saved.preferences : {};
  const preferences: WeekPreferences = {
    cookingStyle: ['quick', 'batch', 'mixed'].includes(prefs.cookingStyle as string)
      ? (prefs.cookingStyle as WeekPreferences['cookingStyle'])
      : null,
    maxPrepMinutes: typeof prefs.maxPrepMinutes === 'number' ? prefs.maxPrepMinutes : null,
    mealCategories: Array.isArray(prefs.mealCategories)
      ? (prefs.mealCategories.filter((c) =>
          ['breakfast', 'lunch', 'dinner', 'snack'].includes(c as string),
        ) as WeekPreferences['mealCategories'])
      : [],
    budget: typeof prefs.budget === 'string' ? prefs.budget : '',
    householdSize: typeof prefs.householdSize === 'number' ? prefs.householdSize : null,
    avoidIngredientIds: stringArray(prefs.avoidIngredientIds),
  };

  const ingredientStatuses: IngredientStatusMap = {};
  if (isRecord(saved.ingredientStatuses)) {
    for (const [id, status] of Object.entries(saved.ingredientStatuses)) {
      if (status === 'have' || status === 'need') ingredientStatuses[id] = status;
    }
  }

  const customIngredients = Array.isArray(saved.customIngredients)
    ? saved.customIngredients
        .filter(
          (i): i is Ingredient =>
            isRecord(i) &&
            typeof i.id === 'string' &&
            typeof i.name === 'string' &&
            CATEGORY_IDS.includes(i.category as GroceryCategoryId) &&
            i.category !== 'other',
        )
        .map((i) => ({ id: i.id, name: i.name, category: i.category, custom: true }))
    : [];

  const manualItems = Array.isArray(saved.manualItems)
    ? saved.manualItems
        .filter(
          (i): i is ManualGroceryItem =>
            isRecord(i) &&
            typeof i.id === 'string' &&
            typeof i.name === 'string' &&
            CATEGORY_IDS.includes(i.category as GroceryCategoryId),
        )
        .map((i) => ({ ...i, checked: Boolean(i.checked) }))
    : [];

  const groceryOverrides: Record<string, GroceryItemOverride> = {};
  if (isRecord(saved.groceryOverrides)) {
    for (const [id, o] of Object.entries(saved.groceryOverrides)) {
      if (!isRecord(o)) continue;
      groceryOverrides[id] = {
        ...(typeof o.name === 'string' ? { name: o.name } : {}),
        ...(typeof o.checked === 'boolean' ? { checked: o.checked } : {}),
        ...(typeof o.removed === 'boolean' ? { removed: o.removed } : {}),
      };
    }
  }

  const feedback = isRecord(saved.feedback) ? saved.feedback : {};

  return {
    version: STATE_VERSION,
    currentStep:
      typeof saved.currentStep === 'number' && saved.currentStep >= 0 && saved.currentStep < STEPS.length
        ? Math.floor(saved.currentStep)
        : 0,
    preferences,
    ingredientStatuses,
    customIngredients,
    selectedMealIds: stringArray(saved.selectedMealIds),
    mealExtras: isRecord(saved.mealExtras)
      ? Object.fromEntries(Object.entries(saved.mealExtras).map(([id, v]) => [id, stringArray(v)]))
      : {},
    groceryOverrides,
    manualItems,
    feedback: {
      rating: typeof feedback.rating === 'number' ? feedback.rating : null,
      helpful: typeof feedback.helpful === 'string' ? feedback.helpful : '',
      wish: typeof feedback.wish === 'string' ? feedback.wish : '',
    },
    staples: stringArray(saved.staples),
    reviewingPantry: saved.reviewingPantry === true,
  };
}
