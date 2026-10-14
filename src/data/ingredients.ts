import type { Ingredient } from '../types';
import catalog from './library/ingredients.json';

/**
 * Ingredient catalog — Mane Meals library v1 (reconciled; see
 * docs/LIBRARY_IMPORT_REPORT.md).
 *
 * Edit src/data/library/ingredients.json to add or change ingredients:
 * - `id` is the permanent key used by meals and saved plans. Never rename
 *   one; change `name` or add `aliases` instead. If two records must be
 *   merged, add the old ID to src/data/legacyIds.ts.
 * - `category` is the nutrition food group; `storeSection` is the grocery
 *   aisle (one of store-sections.json).
 * Tests check every field, ID and alias.
 */
export const INGREDIENTS = catalog as Ingredient[];
