import type { MealTemplate } from '../types';
import library from './library/meals.json';

/**
 * Meal library — Mane Meals library v1 (100 reviewed meals).
 *
 * Edit src/data/library/meals.json to add or change meals. Each meal lists
 * ingredient IDs from ingredients.json; required ones drive matching and the
 * grocery list, optional ones are only added when the user taps them.
 * Leave out prep times, instructions, swaps or tags unless they've been
 * reviewed — never invent them. Tests check every meal.
 */
export const MEALS = library as MealTemplate[];
