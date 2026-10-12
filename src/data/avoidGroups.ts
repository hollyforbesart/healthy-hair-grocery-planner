/**
 * Quick-pick groups for "Anything you're avoiding?" in Step 1.
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
    ingredientIds: ['beef-strips', 'chicken-breast', 'chicken-legs', 'chicken-thighs', 'ground-beef', 'ground-turkey', 'sliced-turkey-breast'],
  },
  {
    id: 'fish',
    label: 'Fish & seafood',
    ingredientIds: ['canned-salmon', 'canned-tuna', 'salmon', 'sardines', 'shrimp', 'smoked-salmon', 'trout', 'white-fish'],
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
  { id: 'soy', label: 'Soy', ingredientIds: ['edamame', 'soy-sauce', 'tempeh', 'tofu'] },
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
    ],
  },
];
