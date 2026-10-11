import type { MealTemplate } from '../types';

/**
 * Meal template library — SAMPLE DATA for development only.
 * To be replaced with a professionally curated library before launch.
 *
 * Rules for editing:
 * - Reference ingredients by catalog `id` (see src/data/ingredients.ts).
 * - `requiredIngredients` drive matching; `optionalIngredients` are never
 *   counted as missing.
 * - Do not add nutritional values or health/hair-loss claims.
 * - Pantry staples like salt, pepper, water and dried spices are assumed and
 *   not listed.
 */
export const MEALS: MealTemplate[] = [
  {
    id: 'berry-overnight-oats',
    name: 'Berry Overnight Oats',
    category: 'breakfast',
    description: 'Make-ahead oats layered with yogurt and berries.',
    requiredIngredients: ['oats', 'greek-yogurt', 'berries'],
    optionalIngredients: ['chia-seeds', 'walnuts', 'honey'],
    substitutions: [
      { ingredientId: 'berries', alternatives: ['bananas'] },
      { ingredientId: 'walnuts', alternatives: ['almonds', 'pumpkin-seeds'] },
    ],
    prepTimeMinutes: 10,
    instructions: [
      'Stir oats and Greek yogurt together with a splash of water or milk.',
      'Top with berries and any seeds or nuts you like.',
      'Cover and refrigerate overnight, or at least 4 hours.',
    ],
    dietaryTags: ['vegetarian'],
  },
  {
    id: 'spinach-egg-scramble',
    name: 'Spinach & Egg Scramble on Toast',
    category: 'breakfast',
    requiredIngredients: ['eggs', 'spinach', 'whole-wheat-bread'],
    optionalIngredients: ['feta', 'cherry-tomatoes', 'olive-oil'],
    substitutions: [
      { ingredientId: 'spinach', alternatives: ['kale'] },
      { ingredientId: 'whole-wheat-bread', alternatives: ['corn-tortillas', 'whole-grain-wraps'] },
    ],
    prepTimeMinutes: 15,
    instructions: [
      'Wilt the spinach in a pan with a little oil.',
      'Add beaten eggs and stir gently until just set.',
      'Serve on toast, topped with crumbled feta or tomatoes if using.',
    ],
    dietaryTags: ['vegetarian'],
  },
  {
    id: 'chickpea-quinoa-bowl',
    name: 'Chickpea Quinoa Bowl',
    category: 'lunch',
    description: 'A colourful grain bowl that keeps well for packed lunches.',
    requiredIngredients: ['chickpeas', 'quinoa', 'cucumber', 'cherry-tomatoes', 'olive-oil'],
    optionalIngredients: ['feta', 'lemons', 'tahini'],
    substitutions: [
      { ingredientId: 'quinoa', alternatives: ['brown-rice'] },
      { ingredientId: 'chickpeas', alternatives: ['lentils'] },
    ],
    prepTimeMinutes: 25,
    instructions: [
      'Cook quinoa according to the package and let it cool slightly.',
      'Rinse and drain chickpeas; chop cucumber and halve tomatoes.',
      'Toss everything with olive oil, plus lemon juice or tahini if using.',
    ],
    dietaryTags: ['vegetarian'],
  },
  {
    id: 'lentil-vegetable-soup',
    name: 'Lentil & Vegetable Soup',
    category: 'lunch',
    description: 'A big pot that reheats well through the week.',
    requiredIngredients: ['lentils', 'carrots', 'onions', 'garlic', 'spinach', 'olive-oil'],
    optionalIngredients: ['lemons', 'whole-wheat-bread'],
    substitutions: [{ ingredientId: 'spinach', alternatives: ['kale'] }],
    prepTimeMinutes: 40,
    instructions: [
      'Soften chopped onion, carrot and garlic in olive oil.',
      'Add rinsed lentils and water or stock; simmer until tender, about 25 minutes.',
      'Stir in spinach until wilted. Finish with lemon juice if using.',
    ],
    dietaryTags: ['vegan', 'dairy-free'],
  },
  {
    id: 'sheet-pan-salmon',
    name: 'Sheet-Pan Salmon, Sweet Potato & Broccoli',
    category: 'dinner',
    requiredIngredients: ['salmon', 'sweet-potatoes', 'broccoli', 'olive-oil'],
    optionalIngredients: ['lemons', 'garlic'],
    substitutions: [
      { ingredientId: 'salmon', alternatives: ['chicken-breast', 'tofu'], note: 'Chicken needs a little longer in the oven.' },
      { ingredientId: 'sweet-potatoes', alternatives: ['potatoes'] },
    ],
    prepTimeMinutes: 35,
    instructions: [
      'Roast cubed sweet potato with olive oil at 200°C / 400°F for 15 minutes.',
      'Add broccoli and salmon to the tray and roast 12–15 minutes more.',
      'Finish with lemon juice and garlic if using.',
    ],
    dietaryTags: ['pescatarian', 'dairy-free', 'gluten-free'],
  },
  {
    id: 'black-bean-tacos',
    name: 'Black Bean & Sweet Potato Tacos',
    category: 'dinner',
    requiredIngredients: ['black-beans', 'sweet-potatoes', 'corn-tortillas'],
    optionalIngredients: ['avocado', 'salsa', 'onions'],
    substitutions: [
      { ingredientId: 'corn-tortillas', alternatives: ['whole-grain-wraps'] },
      { ingredientId: 'sweet-potatoes', alternatives: ['potatoes'] },
    ],
    prepTimeMinutes: 30,
    instructions: [
      'Roast or pan-fry diced sweet potato until tender.',
      'Warm black beans with a pinch of cumin.',
      'Fill warm tortillas and top with avocado and salsa if using.',
    ],
    dietaryTags: ['vegan', 'dairy-free'],
  },
  {
    id: 'tofu-veggie-stir-fry',
    name: 'Tofu & Veggie Stir-Fry',
    category: 'dinner',
    requiredIngredients: ['tofu', 'broccoli', 'bell-peppers', 'brown-rice', 'soy-sauce'],
    optionalIngredients: ['garlic', 'mushrooms', 'pumpkin-seeds'],
    substitutions: [
      { ingredientId: 'tofu', alternatives: ['tempeh', 'chicken-breast', 'shrimp'] },
      { ingredientId: 'brown-rice', alternatives: ['quinoa'] },
      { ingredientId: 'broccoli', alternatives: ['zucchini'] },
    ],
    prepTimeMinutes: 25,
    instructions: [
      'Start the rice cooking.',
      'Brown cubed tofu in a hot pan, then set aside.',
      'Stir-fry the vegetables, return the tofu and toss with soy sauce. Serve over rice.',
    ],
    dietaryTags: ['vegan', 'dairy-free'],
  },
  {
    id: 'egg-veggie-snack-plate',
    name: 'Egg & Veggie Snack Plate',
    category: 'snack',
    requiredIngredients: ['eggs', 'carrots', 'cucumber'],
    optionalIngredients: ['hummus', 'almonds'],
    substitutions: [
      { ingredientId: 'carrots', alternatives: ['bell-peppers'] },
      { ingredientId: 'hummus', alternatives: ['greek-yogurt'] },
    ],
    prepTimeMinutes: 15,
    instructions: [
      'Hard-boil eggs for about 10 minutes, then cool in cold water.',
      'Slice carrots and cucumber into sticks.',
      'Serve together with hummus for dipping if using.',
    ],
    dietaryTags: ['vegetarian', 'gluten-free'],
  },
];
