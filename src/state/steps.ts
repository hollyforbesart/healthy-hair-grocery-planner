import type { PlannerPath } from '../types';

/** Every screen in the planner. Which ones appear depends on the path. */
export type StepId = 'kitchen' | 'meals' | 'review' | 'list';

export const STEP_LABELS: Record<StepId, string> = {
  kitchen: 'Your kitchen',
  meals: 'Meal ideas',
  review: 'Review',
  list: 'Grocery list',
};

export const ALL_STEP_IDS = Object.keys(STEP_LABELS) as StepId[];

/**
 * "Start with what I have" begins in the kitchen; "Browse meal ideas" goes
 * straight to the meals. Both end on Review → Grocery list.
 */
export function stepsForPath(path: PlannerPath | null): StepId[] {
  return path === 'ideas' ? ['meals', 'review', 'list'] : ['kitchen', 'meals', 'review', 'list'];
}

/** Where a path begins. */
export const firstStep = (path: PlannerPath | null): StepId => stepsForPath(path)[0];

/** The step before/after `step` on this path (or undefined at either end). */
export function adjacentStep(path: PlannerPath | null, step: StepId, offset: -1 | 1): StepId | undefined {
  const steps = stepsForPath(path);
  const index = steps.indexOf(step);
  return index === -1 ? undefined : steps[index + offset];
}

/**
 * Steps saved by earlier versions: numbered positions from before steps had
 * names, and the old Start and Feedback screens (now part of the meal ideas
 * page and the grocery list).
 */
export const LEGACY_STEP_ORDER = ['setup', 'kitchen', 'meals', 'list', 'feedback'] as const;
export function savedStepId(saved: unknown, path: PlannerPath | null): StepId {
  const name = typeof saved === 'number' ? LEGACY_STEP_ORDER[Math.floor(saved)] : saved;
  if (name === 'feedback') return 'list';
  if (typeof name === 'string' && (ALL_STEP_IDS as string[]).includes(name) && stepsForPath(path).includes(name as StepId)) {
    return name as StepId;
  }
  return firstStep(path);
}
