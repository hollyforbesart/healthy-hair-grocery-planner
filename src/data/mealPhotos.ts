import photoIds from './library/meal-photos.json';

/**
 * Meals that have a photo in public/meal-photos/<meal-id>.webp. Add photos
 * with scripts/process_meal_photos.py, which crops/compresses them and
 * rebuilds library/meal-photos.json.
 */
const PHOTOS = new Set<string>(photoIds);

export const mealPhotoUrl = (mealId: string): string | undefined =>
  PHOTOS.has(mealId) ? `/meal-photos/${mealId}.webp` : undefined;
