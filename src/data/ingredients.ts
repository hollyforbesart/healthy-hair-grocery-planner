import type { Ingredient } from '../types';

/**
 * Ingredient catalog — sample data for development.
 *
 * `id` is the standardized key used by meal templates and saved user data.
 * Never rename an existing id; change `name` or add `aliases` instead.
 * Order here does not matter: the UI sorts alphabetically by name.
 */
export const INGREDIENTS: Ingredient[] = [
  // Proteins
  { id: 'black-beans', name: 'Black beans', category: 'proteins' },
  { id: 'chicken-breast', name: 'Chicken breast', category: 'proteins', aliases: ['chicken'] },
  { id: 'chickpeas', name: 'Chickpeas', category: 'proteins', aliases: ['garbanzo beans', 'garbanzos'] },
  { id: 'cottage-cheese', name: 'Cottage cheese', category: 'proteins' },
  { id: 'eggs', name: 'Eggs', category: 'proteins', aliases: ['egg'] },
  { id: 'greek-yogurt', name: 'Greek yogurt', category: 'proteins', aliases: ['yogurt', 'yoghurt'] },
  { id: 'ground-beef', name: 'Lean ground beef', category: 'proteins', aliases: ['ground beef', 'beef mince', 'minced beef'] },
  { id: 'ground-turkey', name: 'Ground turkey', category: 'proteins', aliases: ['turkey mince'] },
  { id: 'lentils', name: 'Lentils', category: 'proteins', aliases: ['red lentils', 'green lentils'] },
  { id: 'salmon', name: 'Salmon', category: 'proteins', aliases: ['salmon fillet'] },
  { id: 'sardines', name: 'Sardines', category: 'proteins' },
  { id: 'shrimp', name: 'Shrimp', category: 'proteins', aliases: ['prawns'] },
  { id: 'tempeh', name: 'Tempeh', category: 'proteins' },
  { id: 'tofu', name: 'Tofu', category: 'proteins', aliases: ['bean curd'] },
  { id: 'tuna', name: 'Canned tuna', category: 'proteins', aliases: ['tuna'] },

  // Carbohydrates
  { id: 'brown-rice', name: 'Brown rice', category: 'carbohydrates', aliases: ['rice'] },
  { id: 'corn-tortillas', name: 'Corn tortillas', category: 'carbohydrates' },
  { id: 'oats', name: 'Rolled oats', category: 'carbohydrates', aliases: ['oats', 'oatmeal', 'porridge oats'] },
  { id: 'potatoes', name: 'Potatoes', category: 'carbohydrates', aliases: ['potato'] },
  { id: 'quinoa', name: 'Quinoa', category: 'carbohydrates' },
  { id: 'sweet-potatoes', name: 'Sweet potatoes', category: 'carbohydrates', aliases: ['sweet potato', 'yams'] },
  { id: 'whole-grain-wraps', name: 'Whole grain wraps', category: 'carbohydrates', aliases: ['flour tortillas', 'wraps'] },
  { id: 'whole-wheat-bread', name: 'Whole wheat bread', category: 'carbohydrates', aliases: ['bread', 'wholemeal bread', 'whole grain bread'] },
  { id: 'whole-wheat-pasta', name: 'Whole wheat pasta', category: 'carbohydrates', aliases: ['pasta', 'wholemeal pasta'] },

  // Vegetables & Fruit
  { id: 'bananas', name: 'Bananas', category: 'produce', aliases: ['banana'] },
  { id: 'bell-peppers', name: 'Bell peppers', category: 'produce', aliases: ['peppers', 'capsicum', 'sweet peppers'] },
  { id: 'berries', name: 'Berries', category: 'produce', aliases: ['blueberries', 'strawberries', 'raspberries', 'mixed berries'] },
  { id: 'broccoli', name: 'Broccoli', category: 'produce' },
  { id: 'carrots', name: 'Carrots', category: 'produce', aliases: ['carrot'] },
  { id: 'cherry-tomatoes', name: 'Cherry tomatoes', category: 'produce', aliases: ['tomatoes', 'grape tomatoes'] },
  { id: 'cucumber', name: 'Cucumber', category: 'produce' },
  { id: 'garlic', name: 'Garlic', category: 'produce' },
  { id: 'kale', name: 'Kale', category: 'produce' },
  { id: 'lemons', name: 'Lemons', category: 'produce', aliases: ['lemon'] },
  { id: 'mushrooms', name: 'Mushrooms', category: 'produce' },
  { id: 'onions', name: 'Onions', category: 'produce', aliases: ['onion', 'yellow onion'] },
  { id: 'spinach', name: 'Spinach', category: 'produce', aliases: ['baby spinach'] },
  { id: 'zucchini', name: 'Zucchini', category: 'produce', aliases: ['courgette'] },

  // Fats & Extras
  { id: 'almonds', name: 'Almonds', category: 'fats-extras' },
  { id: 'avocado', name: 'Avocado', category: 'fats-extras', aliases: ['avocados'] },
  { id: 'chia-seeds', name: 'Chia seeds', category: 'fats-extras', aliases: ['chia'] },
  { id: 'feta', name: 'Feta cheese', category: 'fats-extras', aliases: ['feta'] },
  { id: 'ground-flaxseed', name: 'Ground flaxseed', category: 'fats-extras', aliases: ['flaxseed', 'flax seeds', 'linseed'] },
  { id: 'honey', name: 'Honey', category: 'fats-extras' },
  { id: 'hummus', name: 'Hummus', category: 'fats-extras', aliases: ['houmous'] },
  { id: 'olive-oil', name: 'Olive oil', category: 'fats-extras', aliases: ['extra virgin olive oil', 'evoo'] },
  { id: 'peanut-butter', name: 'Peanut butter', category: 'fats-extras' },
  { id: 'pumpkin-seeds', name: 'Pumpkin seeds', category: 'fats-extras', aliases: ['pepitas'] },
  { id: 'salsa', name: 'Salsa', category: 'fats-extras' },
  { id: 'soy-sauce', name: 'Soy sauce', category: 'fats-extras', aliases: ['tamari'] },
  { id: 'tahini', name: 'Tahini', category: 'fats-extras', aliases: ['sesame paste'] },
  { id: 'walnuts', name: 'Walnuts', category: 'fats-extras' },
];
