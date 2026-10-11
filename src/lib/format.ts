import type { GroceryGroup } from './groceryList';

/** Plain-text version of the list for copying into notes or messages. */
export function groceryListToText(groups: GroceryGroup[], title = 'Grocery List'): string {
  if (groups.length === 0) return `${title}\n\n(Your list is empty.)`;
  const sections = groups.map(
    (group) => `${group.label}\n${group.items.map((item) => `${item.checked ? '[x]' : '[ ]'} ${item.name}`).join('\n')}`,
  );
  return `${title}\n\n${sections.join('\n\n')}`;
}
