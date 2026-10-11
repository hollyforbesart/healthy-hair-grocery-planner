import type { IngredientStatusMap, MealTemplate } from '../types';

/**
 * How a required ingredient is covered:
 * - have:            the user already has it
 * - have-substitute: the user has an accepted alternative
 * - on-list:         the user already marked it Need to Buy
 * - missing:         it would be an additional purchase
 */
export type RequirementStatus = 'have' | 'have-substitute' | 'on-list' | 'missing';

export interface RequirementMatch {
  ingredientId: string;
  status: RequirementStatus;
  /** The alternative being used when status is 'have-substitute'. */
  substituteId?: string;
}

/** Optional ingredients are reported for display only — never "missing". */
export type OptionalStatus = 'have' | 'on-list' | 'not-have';

export interface OptionalMatch {
  ingredientId: string;
  status: OptionalStatus;
  substituteId?: string;
}

export interface MealMatch {
  mealId: string;
  required: RequirementMatch[];
  optional: OptionalMatch[];
  /** Required ingredients covered by what the user has (incl. substitutes). */
  haveCount: number;
  /** Required ingredients already on the shopping list. */
  onListCount: number;
  /** Required ingredients that would be additional purchases. */
  missingCount: number;
  missingIds: string[];
  /** True when nothing extra needs buying. */
  isComplete: boolean;
}

function findOwnedAlternative(
  meal: MealTemplate,
  ingredientId: string,
  statuses: IngredientStatusMap,
): string | undefined {
  const substitution = meal.substitutions.find((s) => s.ingredientId === ingredientId);
  return substitution?.alternatives.find((alt) => statuses[alt] === 'have');
}

export function matchMeal(meal: MealTemplate, statuses: IngredientStatusMap): MealMatch {
  const required: RequirementMatch[] = meal.requiredIngredients.map((ingredientId) => {
    if (statuses[ingredientId] === 'have') return { ingredientId, status: 'have' };
    const substituteId = findOwnedAlternative(meal, ingredientId, statuses);
    if (substituteId) return { ingredientId, status: 'have-substitute', substituteId };
    if (statuses[ingredientId] === 'need') return { ingredientId, status: 'on-list' };
    return { ingredientId, status: 'missing' };
  });

  const optional: OptionalMatch[] = meal.optionalIngredients.map((ingredientId) => {
    if (statuses[ingredientId] === 'have') return { ingredientId, status: 'have' };
    const substituteId = findOwnedAlternative(meal, ingredientId, statuses);
    if (substituteId) return { ingredientId, status: 'have', substituteId };
    if (statuses[ingredientId] === 'need') return { ingredientId, status: 'on-list' };
    return { ingredientId, status: 'not-have' };
  });

  const missingIds = required.filter((r) => r.status === 'missing').map((r) => r.ingredientId);
  const haveCount = required.filter((r) => r.status === 'have' || r.status === 'have-substitute').length;
  const onListCount = required.filter((r) => r.status === 'on-list').length;

  return {
    mealId: meal.id,
    required,
    optional,
    haveCount,
    onListCount,
    missingCount: missingIds.length,
    missingIds,
    isComplete: missingIds.length === 0,
  };
}

/**
 * Order: fewest additional ingredients first, then most ingredients already
 * owned, then alphabetical for a stable result.
 */
export function compareMatches(
  a: { match: MealMatch; name: string },
  b: { match: MealMatch; name: string },
): number {
  return (
    a.match.missingCount - b.match.missingCount ||
    b.match.haveCount - a.match.haveCount ||
    a.name.localeCompare(b.name)
  );
}
