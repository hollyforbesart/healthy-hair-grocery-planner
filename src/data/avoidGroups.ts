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
  { id: 'meat', label: 'Meat & poultry', ingredientIds: ['chicken-breast', 'ground-beef', 'ground-turkey'] },
  { id: 'fish', label: 'Fish & seafood', ingredientIds: ['salmon', 'sardines', 'shrimp', 'tuna'] },
  { id: 'dairy', label: 'Dairy', ingredientIds: ['cottage-cheese', 'feta', 'greek-yogurt'] },
  { id: 'eggs', label: 'Eggs', ingredientIds: ['eggs'] },
  { id: 'nuts', label: 'Nuts & peanuts', ingredientIds: ['almonds', 'peanut-butter', 'walnuts'] },
  { id: 'soy', label: 'Soy', ingredientIds: ['soy-sauce', 'tempeh', 'tofu'] },
  {
    id: 'wheat',
    label: 'Wheat',
    ingredientIds: ['soy-sauce', 'whole-grain-wraps', 'whole-wheat-bread', 'whole-wheat-pasta'],
  },
];
