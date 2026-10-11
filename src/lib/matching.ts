import type { IngredientStatusMap, MealTemplate } from '../types';

/**
 * How a required ingredient is covered:
 * - have:            the user already has it
 * - have-substitute: the user has an accepted alternative
 * - on-list:         it (or its swap) is already marked Need to Buy
 * - missing:         it (or its swap) would be an additional purchase
 */
export type RequirementStatus = 'have' | 'have-substitute' | 'on-list' | 'missing';

export interface RequirementMatch {
  /** The ingredient the template asks for. */
  ingredientId: string;
  status: RequirementStatus;
  /** The alternative used instead, when one is. */
  substituteId?: string;
  /** True when the swap was made because the household avoids the original. */
  avoided?: boolean;
}

/** Optional ingredients are reported for display only — never "missing". */
export type OptionalStatus = 'have' | 'on-list' | 'not-have';

export interface OptionalMatch {
  ingredientId: string;
  status: OptionalStatus;
  substituteId?: string;
}

/** Alternatives the user could buy for someone who can't have an ingredient. */
export interface SwapOption {
  ingredientId: string;
  alternatives: string[];
}

export interface MealMatch {
  mealId: string;
  required: RequirementMatch[];
  optional: OptionalMatch[];
  /** Swaps for required ingredients, for households that eat differently. */
  swapOptions: SwapOption[];
  /** Required ingredients covered by what the user has (incl. substitutes). */
  haveCount: number;
  /** Required ingredients already on the shopping list. */
  onListCount: number;
  /** Required ingredients that would be additional purchases. */
  missingCount: number;
  /** IDs to buy (the swap when one is used). */
  missingIds: string[];
  /** True when nothing extra needs buying. */
  isComplete: boolean;
  /** True when an avoided required ingredient has no acceptable swap. */
  blocked: boolean;
  blockedBy: string[];
}

/** The ID actually being used for a requirement or optional extra. */
export const effectiveId = (m: { ingredientId: string; substituteId?: string }) => m.substituteId ?? m.ingredientId;

export function matchMeal(
  meal: MealTemplate,
  statuses: IngredientStatusMap,
  avoid: ReadonlySet<string> = new Set(),
): MealMatch {
  const alternativesFor = (id: string) =>
    (meal.substitutions.find((s) => s.ingredientId === id)?.alternatives ?? []).filter((alt) => !avoid.has(alt));

  const blockedBy: string[] = [];

  const required: RequirementMatch[] = [];
  for (const ingredientId of meal.requiredIngredients) {
    const alternatives = alternativesFor(ingredientId);
    const ownedAlt = alternatives.find((alt) => statuses[alt] === 'have');

    if (avoid.has(ingredientId)) {
      if (alternatives.length === 0) {
        blockedBy.push(ingredientId);
        continue;
      }
      if (ownedAlt) {
        required.push({ ingredientId, status: 'have-substitute', substituteId: ownedAlt, avoided: true });
        continue;
      }
      const listedAlt = alternatives.find((alt) => statuses[alt] === 'need');
      required.push({
        ingredientId,
        status: listedAlt ? 'on-list' : 'missing',
        substituteId: listedAlt ?? alternatives[0],
        avoided: true,
      });
      continue;
    }

    if (statuses[ingredientId] === 'have') required.push({ ingredientId, status: 'have' });
    else if (ownedAlt) required.push({ ingredientId, status: 'have-substitute', substituteId: ownedAlt });
    else if (statuses[ingredientId] === 'need') required.push({ ingredientId, status: 'on-list' });
    else required.push({ ingredientId, status: 'missing' });
  }

  const optional: OptionalMatch[] = [];
  for (const ingredientId of meal.optionalIngredients) {
    const alternatives = alternativesFor(ingredientId);
    const ownedAlt = alternatives.find((alt) => statuses[alt] === 'have');
    if (avoid.has(ingredientId)) {
      // Offer the first acceptable alternative, or leave the extra out.
      const alt = ownedAlt ?? alternatives[0];
      if (!alt) continue;
      const status = statuses[alt] === 'have' ? 'have' : statuses[alt] === 'need' ? 'on-list' : 'not-have';
      optional.push({ ingredientId, status, substituteId: alt });
      continue;
    }
    if (statuses[ingredientId] === 'have') optional.push({ ingredientId, status: 'have' });
    else if (ownedAlt) optional.push({ ingredientId, status: 'have', substituteId: ownedAlt });
    else if (statuses[ingredientId] === 'need') optional.push({ ingredientId, status: 'on-list' });
    else optional.push({ ingredientId, status: 'not-have' });
  }

  // Other acceptable alternatives (excluding any swap already in use).
  const swapOptions: SwapOption[] = required
    .map((r) => ({
      ingredientId: r.ingredientId,
      alternatives: alternativesFor(r.ingredientId).filter((alt) => alt !== r.substituteId),
    }))
    .filter((s) => s.alternatives.length > 0);

  const missingIds = required.filter((r) => r.status === 'missing').map(effectiveId);
  const haveCount = required.filter((r) => r.status === 'have' || r.status === 'have-substitute').length;
  const onListCount = required.filter((r) => r.status === 'on-list').length;

  return {
    mealId: meal.id,
    required,
    optional,
    swapOptions,
    haveCount,
    onListCount,
    missingCount: missingIds.length,
    missingIds,
    isComplete: missingIds.length === 0,
    blocked: blockedBy.length > 0,
    blockedBy,
  };
}

/**
 * How a tapped extra relates to a meal, for labelling it on the list.
 * Returns null when the ID isn't an optional extra or swap for this meal.
 */
export function extraKind(meal: MealTemplate, ingredientId: string): 'optional' | 'swap' | null {
  const isAltFor = (ids: string[]) =>
    meal.substitutions.some((s) => ids.includes(s.ingredientId) && s.alternatives.includes(ingredientId));
  if (meal.optionalIngredients.includes(ingredientId) || isAltFor(meal.optionalIngredients)) return 'optional';
  if (isAltFor(meal.requiredIngredients)) return 'swap';
  return null;
}

/**
 * Order, best first:
 * 1. Fewest ingredients not already at home (need to buy + already on list),
 *    so a meal cooked from the kitchen beats one that is all shopping.
 * 2. Fewest new items to buy, so items already planned for purchase break ties.
 * 3. Most ingredients already at home, then alphabetical for stability.
 */
export function compareMatches(
  a: { match: MealMatch; name: string },
  b: { match: MealMatch; name: string },
): number {
  const notAtHome = (m: MealMatch) => m.missingCount + m.onListCount;
  return (
    notAtHome(a.match) - notAtHome(b.match) ||
    a.match.missingCount - b.match.missingCount ||
    b.match.haveCount - a.match.haveCount ||
    a.name.localeCompare(b.name)
  );
}
