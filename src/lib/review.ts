import { OTHER_SECTION, STORE_SECTIONS, STORE_SECTION_IDS } from '../data/categories';
import type { IngredientStatusMap, MealExtras, MealTemplate, StoreSectionId } from '../types';
import type { IngredientLookup } from './ingredients';
import { effectiveId, extraKind, matchMeal } from './matching';

export interface ReviewItem {
  id: string;
  name: string;
  section: StoreSectionId;
  /** True when the user has said they already have it. */
  have: boolean;
  /** Meals in the plan that use it. */
  forMeals: string[];
  /** True when it's only on the list because an optional extra was tapped. */
  optionalOnly: boolean;
}

export interface ReviewGroup {
  section: StoreSectionId;
  label: string;
  items: ReviewItem[];
}

/**
 * Every ingredient the chosen meals need (plus tapped extras), once each,
 * grouped by store section — the "check off what you already have" list on
 * the Review step. Avoided foods appear as their swap, never as themselves.
 */
export function buildReviewList({
  selectedMeals,
  statuses,
  lookup,
  mealExtras = {},
  avoidIngredientIds = [],
}: {
  selectedMeals: MealTemplate[];
  statuses: IngredientStatusMap;
  lookup: IngredientLookup;
  mealExtras?: MealExtras;
  avoidIngredientIds?: string[];
}): ReviewGroup[] {
  const avoid = new Set(avoidIngredientIds);
  const byId = new Map<string, ReviewItem>();
  const add = (id: string, mealName: string, optional: boolean) => {
    let item = byId.get(id);
    if (!item) {
      const ingredient = lookup.get(id);
      const section = ingredient?.storeSection ?? OTHER_SECTION;
      item = {
        id,
        name: ingredient?.name ?? id,
        section: STORE_SECTION_IDS.has(section) ? section : OTHER_SECTION,
        have: statuses[id] === 'have',
        forMeals: [],
        optionalOnly: optional,
      };
      byId.set(id, item);
    }
    if (!optional) item.optionalOnly = false;
    if (!item.forMeals.includes(mealName)) item.forMeals.push(mealName);
  };

  for (const meal of selectedMeals) {
    for (const r of matchMeal(meal, statuses, avoid).required) add(effectiveId(r), meal.name, false);
    for (const id of mealExtras[meal.id] ?? []) {
      if (extraKind(meal, id) && !avoid.has(id)) add(id, meal.name, true);
    }
  }

  return STORE_SECTIONS.map(({ id, label }) => ({
    section: id,
    label,
    items: [...byId.values()]
      .filter((item) => item.section === id)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
  })).filter((g) => g.items.length > 0);
}
