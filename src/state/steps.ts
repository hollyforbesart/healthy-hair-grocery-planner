import type { PlannerPath } from '../types';

/** Every screen in the planner. Which ones appear depends on the path. */
export type StepId = 'setup' | 'kitchen' | 'meals' | 'review' | 'list' | 'feedback';

export const STEP_LABELS: Record<StepId, string> = {
  setup: 'Start',
  kitchen: 'Your kitchen',
  meals: 'Meal ideas',
  review: 'Review',
  list: 'Grocery list',
  feedback: 'Feedback',
};

export const ALL_STEP_IDS = Object.keys(STEP_LABELS) as StepId[];

/**
 * "Use what I already have" starts by entering the kitchen; "Help me find
 * meal ideas" goes straight to browsing. Both end on Review → Grocery list.
 */
export function stepsForPath(path: PlannerPath | null): StepId[] {
  return path === 'ideas'
    ? ['setup', 'meals', 'review', 'list', 'feedback']
    : ['setup', 'kitchen', 'meals', 'review', 'list', 'feedback'];
}

/** The step before/after `step` on this path (or undefined at either end). */
export function adjacentStep(path: PlannerPath | null, step: StepId, offset: -1 | 1): StepId | undefined {
  const steps = stepsForPath(path);
  const index = steps.indexOf(step);
  return index === -1 ? undefined : steps[index + offset];
}

/** Step positions used by saved plans from before steps had names. */
export const LEGACY_STEP_ORDER: StepId[] = ['setup', 'kitchen', 'meals', 'list', 'feedback'];
