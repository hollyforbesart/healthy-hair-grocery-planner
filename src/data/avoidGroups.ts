import { INGREDIENTS } from './ingredients';

const PREVIEW_INGREDIENT_IDS = new Set(INGREDIENTS.filter((i) => i.preview).map((i) => i.id));

/**
 * Quick-pick groups for "Foods to leave out" on the meal ideas page.
 * Each group simply expands to catalog ingredient IDs — keep in sync when
 * the ingredient catalog changes. These are convenience shortcuts, not
 * allergy guarantees; the UI reminds people to check labels.
 */
export interface AvoidGroup {
  id: string;
  label: string;
  ingredientIds: string[];
}

export const AVOID_GROUPS: AvoidGroup[] = [
  {
    id: 'meat',
    label: 'Meat & poultry',
    ingredientIds: ['beef-strips', 'chicken-breast', 'chicken-legs', 'chicken-thighs', 'ground-beef', 'ground-turkey', 'sliced-turkey-breast', 'bison', 'beef-jerky'],
  },
  {
    id: 'fish',
    label: 'Fish & seafood',
    ingredientIds: ['canned-salmon', 'canned-tuna', 'salmon', 'sardines', 'shrimp', 'smoked-salmon', 'trout', 'white-fish', 'canned-mackerel', 'fish-sauce'],
  },
  {
    id: 'dairy',
    label: 'Dairy',
    // Pesto is traditionally made with cheese.
    ingredientIds: [
      'basil-pesto',
      'cheddar-cheese',
      'cottage-cheese',
      'feta-cheese',
      'greek-yogurt',
      'milk',
      'mozzarella-cheese',
      'parmesan-cheese',
      'ricotta-cheese',
      'shredded-cheese',
      'tzatziki',
    ],
  },
  { id: 'eggs', label: 'Eggs', ingredientIds: ['eggs'] },
  {
    id: 'nuts',
    label: 'Nuts & peanuts',
    // Pesto is traditionally made with pine nuts.
    ingredientIds: ['almond-butter', 'almonds', 'basil-pesto', 'cashews', 'peanut-butter', 'walnuts'],
  },
  { id: 'soy', label: 'Soy', ingredientIds: ['edamame', 'soy-sauce', 'tempeh', 'tofu', 'soy-milk'] },
  {
    id: 'wheat',
    label: 'Wheat',
    // Most soy sauce is brewed with wheat.
    ingredientIds: [
      'breadcrumbs',
      'burger-buns',
      'couscous',
      'jumbo-pasta-shells',
      'macaroni',
      'pasta',
      'penne-pasta',
      'pita-bread',
      'soy-sauce',
      'whole-grain-crackers',
      'whole-grain-wraps',
      'whole-wheat-bread',
      'whole-wheat-pasta',
      'bagels',
      'bulgur',
    ],
  },
];

/**
 * Which ticked quick-pick groups explain why an ingredient is avoided, so the
 * UI can say "Avoiding (Dairy, Nuts)" instead of leaving people guessing.
 * A group counts as ticked when all of its ingredients are on the avoid list.
 */
export function avoidGroupsFor(ingredientId: string, avoidIngredientIds: string[]): string[] {
  const avoid = new Set(avoidIngredientIds);
  return AVOID_GROUPS.filter((g) => g.ingredientIds.includes(ingredientId) && g.ingredientIds.every((id) => avoid.has(id))).map(
    (g) => g.label,
  );
}

/**
 * Ingredients added to a group after people may already have ticked it (the
 * "preview" ones, e.g. from The Iron Refill). If someone's saved list has every
 * other ingredient of a group, the group was ticked, so the newcomers are added
 * too and it stays ticked.
 */
export function addNewGroupMembers(avoidIngredientIds: string[]): string[] {
  const avoid = new Set(avoidIngredientIds);
  const added = AVOID_GROUPS.filter((g) => g.ingredientIds.some((id) => PREVIEW_INGREDIENT_IDS.has(id)))
    .filter((g) => g.ingredientIds.every((id) => avoid.has(id) || PREVIEW_INGREDIENT_IDS.has(id)))
    .flatMap((g) => g.ingredientIds.filter((id) => !avoid.has(id)));
  return added.length ? [...avoidIngredientIds, ...new Set(added)] : avoidIngredientIds;
}
