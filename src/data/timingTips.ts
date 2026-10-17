import type { MealTemplate } from '../types';

/**
 * Short notes shown under a meal's prep notes when it uses an ingredient
 * whose form changes the time a lot. Time categories assume the quicker form.
 */
export const TIMING_TIPS: { ingredientIds: string[]; text: string }[] = [
  {
    ingredientIds: ['black-beans', 'black-eyed-peas', 'chickpeas', 'kidney-beans', 'white-beans'],
    text: 'Times assume canned beans. Using dried? Soak and cook them first, which adds time.',
  },
  {
    ingredientIds: ['rice'],
    text: 'Times assume white rice. Brown rice takes about 25–30 minutes longer.',
  },
];

export const timingTipsFor = (meal: MealTemplate): string[] =>
  TIMING_TIPS.filter((tip) => tip.ingredientIds.some((id) => meal.requiredIngredients.includes(id))).map((t) => t.text);
