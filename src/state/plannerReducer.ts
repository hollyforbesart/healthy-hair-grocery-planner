import { KITCHEN_GROUP_IDS, OTHER_SECTION, STORE_SECTION_IDS, defaultStoreSection } from '../data/categories';
import { canonicalIngredientId } from '../data/legacyIds';
import type {
  FeedbackDraft,
  FoodGroupId,
  GroceryItemOverride,
  Ingredient,
  IngredientStatus,
  IngredientStatusMap,
  KitchenGroupId,
  ManualGroceryItem,
  MealExtras,
  MealHistoryEntry,
  PlannerPath,
  WeekPreferences,
} from '../types';
import { firstStep, savedStepId, stepsForPath, type StepId } from './steps';

export const STATE_VERSION = 1;

export interface PlannerState {
  version: typeof STATE_VERSION;
  currentStep: StepId;
  /** Chosen on the home page (or the planner's chooser); null until the user picks. */
  path: PlannerPath | null;
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
  /** True right after "Start a new week", until the user leaves the kitchen step. */
  reviewingPantry: boolean;
  /** Meals the user hearted; never pushed down for being recent. */
  favorites: string[];
  /** Meals from earlier weeks, newest first (kept for HISTORY_WEEKS weeks). */
  mealHistory: MealHistoryEntry[];
}

/** How many past weeks of meal choices to remember. */
export const HISTORY_WEEKS = 8;

/** Today's local date as YYYY-MM-DD. */
export const todayIso = (now = new Date()) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

export const DEFAULT_PREFERENCES: WeekPreferences = {
  mealCategories: [],
  avoidIngredientIds: [],
};

export function createInitialState(): PlannerState {
  return {
    version: STATE_VERSION,
    currentStep: 'kitchen',
    path: null,
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
    favorites: [],
    mealHistory: [],
  };
}

/** True once the user has started planning, so the home page can offer "Continue". */
export function hasPlannerProgress(state: PlannerState): boolean {
  return (
    state.path !== null ||
    Object.keys(state.ingredientStatuses).length > 0 ||
    state.selectedMealIds.length > 0 ||
    state.manualItems.length > 0 ||
    state.staples.length > 0
  );
}

export type PlannerAction =
  | { type: 'goToStep'; step: StepId }
  | { type: 'choosePath'; path: PlannerPath }
  | { type: 'toggleFavorite'; mealId: string }
  | { type: 'updatePreferences'; patch: Partial<WeekPreferences> }
  | { type: 'setIngredientStatus'; ingredientId: string; status: IngredientStatus | null }
  | { type: 'addCustomIngredient'; ingredient: Ingredient; status?: IngredientStatus }
  | { type: 'removeCustomIngredient'; ingredientId: string }
  | { type: 'toggleMeal'; mealId: string }
  | { type: 'toggleMealExtra'; mealId: string; ingredientId: string }
  | { type: 'updateGroceryItem'; itemId: string; patch: GroceryItemOverride }
  | { type: 'restoreRemovedItems' }
  | { type: 'addManualItem'; item: ManualGroceryItem }
  | { type: 'updateManualItem'; itemId: string; patch: Partial<Pick<ManualGroceryItem, 'name' | 'checked' | 'section'>> }
  | { type: 'removeManualItem'; itemId: string }
  | { type: 'clearChecked'; generatedIds: string[] }
  | { type: 'updateFeedback'; patch: Partial<FeedbackDraft> }
  | { type: 'toggleStaple'; ingredientId: string }
  | { type: 'startNewWeek'; today?: string }
  | { type: 'reset' };

function withoutKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  const next = { ...record };
  delete next[key];
  return next;
}

export function plannerReducer(state: PlannerState, action: PlannerAction): PlannerState {
  switch (action.type) {
    case 'goToStep':
      // The pantry check-in note only belongs to the first visit to the kitchen in a new week.
      return { ...state, currentStep: action.step, reviewingPantry: state.reviewingPantry && action.step === 'kitchen' };

    case 'choosePath':
      // Stay on the current step when it's part of the new path (e.g. meal ideas); otherwise start the path.
      return {
        ...state,
        path: action.path,
        currentStep: stepsForPath(action.path).includes(state.currentStep) ? state.currentStep : firstStep(action.path),
      };

    case 'toggleFavorite':
      return {
        ...state,
        favorites: state.favorites.includes(action.mealId)
          ? state.favorites.filter((id) => id !== action.mealId)
          : [...state.favorites, action.mealId],
      };

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
      // A fresh Have / Need to buy choice should bring a previously removed item back.
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
      // Remember this week's meals so the next suggestions can rotate.
      const mealHistory = state.selectedMealIds.length
        ? [{ date: action.today ?? todayIso(), mealIds: [...state.selectedMealIds] }, ...state.mealHistory].slice(0, HISTORY_WEEKS)
        : state.mealHistory;
      return {
        ...state,
        currentStep: firstStep(state.path),
        mealHistory,
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

const FOOD_GROUPS: FoodGroupId[] = ['proteins', 'carbohydrates', 'produce', 'fats-extras'];

/** Ingredient IDs as saved, moved onto merged catalog records. */
const migrateIds = (ids: string[]) => [...new Set(ids.map(canonicalIngredientId))];

/**
 * Re-key a saved ID→value map onto current ingredient IDs. When a plan has
 * both an old and a current ID, the current one wins.
 */
function migrateKeys<T>(record: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [id, value] of Object.entries(record)) if (canonicalIngredientId(id) === id) out[id] = value;
  for (const [id, value] of Object.entries(record)) {
    const current = canonicalIngredientId(id);
    if (current !== id && !(current in out)) out[current] = value;
  }
  return out;
}

/** Manual list items saved before store sections used food groups as their category. */
const sectionForSavedItem = (item: Record<string, unknown>): string => {
  if (typeof item.section === 'string' && STORE_SECTION_IDS.has(item.section)) return item.section;
  if (item.category === 'produce') return 'produce';
  return OTHER_SECTION;
};

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
    mealCategories: Array.isArray(prefs.mealCategories)
      ? (prefs.mealCategories.filter((c) =>
          ['breakfast', 'lunch', 'dinner', 'snack'].includes(c as string),
        ) as WeekPreferences['mealCategories'])
      : [],
    avoidIngredientIds: migrateIds(stringArray(prefs.avoidIngredientIds)),
  };

  const savedStatuses: IngredientStatusMap = {};
  if (isRecord(saved.ingredientStatuses)) {
    for (const [id, status] of Object.entries(saved.ingredientStatuses)) {
      if (status === 'have' || status === 'need') savedStatuses[id] = status;
    }
  }
  const ingredientStatuses = migrateKeys(savedStatuses);

  const customIngredients = Array.isArray(saved.customIngredients)
    ? saved.customIngredients
        .filter(
          (i): i is Ingredient =>
            isRecord(i) &&
            typeof i.id === 'string' &&
            typeof i.name === 'string' &&
            FOOD_GROUPS.includes(i.category as FoodGroupId),
        )
        .map((i) => ({
          id: i.id,
          name: i.name,
          category: i.category,
          kitchenGroup: (typeof i.kitchenGroup === 'string' && KITCHEN_GROUP_IDS.has(i.kitchenGroup)
            ? i.kitchenGroup
            : 'own') as KitchenGroupId,
          storeSection:
            typeof i.storeSection === 'string' && STORE_SECTION_IDS.has(i.storeSection)
              ? i.storeSection
              : defaultStoreSection(i.category),
          custom: true,
        }))
    : [];

  const manualItems = Array.isArray(saved.manualItems)
    ? saved.manualItems
        .filter(
          (i): i is Record<string, unknown> & { id: string; name: string } =>
            isRecord(i) && typeof i.id === 'string' && typeof i.name === 'string',
        )
        .map(
          (i): ManualGroceryItem => ({
            id: i.id,
            name: i.name,
            section: sectionForSavedItem(i),
            checked: Boolean(i.checked),
            ...(typeof i.ingredientId === 'string' ? { ingredientId: canonicalIngredientId(i.ingredientId) } : {}),
          }),
        )
    : [];

  const savedOverrides: Record<string, GroceryItemOverride> = {};
  if (isRecord(saved.groceryOverrides)) {
    for (const [id, o] of Object.entries(saved.groceryOverrides)) {
      if (!isRecord(o)) continue;
      savedOverrides[id] = {
        ...(typeof o.name === 'string' ? { name: o.name } : {}),
        ...(typeof o.checked === 'boolean' ? { checked: o.checked } : {}),
        ...(typeof o.removed === 'boolean' ? { removed: o.removed } : {}),
      };
    }
  }

  const groceryOverrides = migrateKeys(savedOverrides);

  // Steps used to be numbered; plans saved then used the ingredient list, i.e. the "pantry" path.
  const path: PlannerPath | null =
    saved.path === 'pantry' || saved.path === 'ideas'
      ? saved.path
      : typeof saved.currentStep === 'number' && saved.currentStep > 0
        ? 'pantry'
        : null;
  const currentStep = savedStepId(saved.currentStep, path);
  const mealHistory: MealHistoryEntry[] = Array.isArray(saved.mealHistory)
    ? saved.mealHistory
        .filter((e): e is Record<string, unknown> => isRecord(e) && typeof e.date === 'string')
        .map((e) => ({ date: e.date as string, mealIds: stringArray(e.mealIds) }))
        .slice(0, HISTORY_WEEKS)
    : [];
  const feedback = isRecord(saved.feedback) ? saved.feedback : {};

  return {
    version: STATE_VERSION,
    currentStep,
    path,
    preferences,
    ingredientStatuses,
    customIngredients,
    selectedMealIds: stringArray(saved.selectedMealIds),
    mealExtras: isRecord(saved.mealExtras)
      ? Object.fromEntries(Object.entries(saved.mealExtras).map(([id, v]) => [id, migrateIds(stringArray(v))]))
      : {},
    groceryOverrides,
    manualItems,
    feedback: {
      rating: typeof feedback.rating === 'number' ? feedback.rating : null,
      helpful: typeof feedback.helpful === 'string' ? feedback.helpful : '',
      wish: typeof feedback.wish === 'string' ? feedback.wish : '',
    },
    staples: migrateIds(stringArray(saved.staples)),
    reviewingPantry: saved.reviewingPantry === true,
    favorites: stringArray(saved.favorites),
    mealHistory,
  };
}
