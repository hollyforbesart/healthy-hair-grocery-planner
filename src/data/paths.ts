import type { IconName } from '../components/Icon';
import type { PlannerPath } from '../types';

/** The two ways to start, worded once for the home page and the Start step. */
export const PATH_OPTIONS: { value: PlannerPath; icon: IconName; title: string; text: string; bestFor: string }[] = [
  {
    value: 'pantry',
    icon: 'basket',
    title: 'Start with what I have',
    text: 'Add the foods in your kitchen and get meal ideas that use them.',
    bestFor: 'Best when your fridge and cupboards are stocked.',
  },
  {
    value: 'ideas',
    icon: 'bowl',
    title: 'Browse meal ideas',
    text: 'Pick meals you like first, then tick off what you already have.',
    bestFor: 'Best when you need inspiration.',
  },
];
