import type { GroceryGroup } from './groceryList';

export interface ListNotes {
  meals?: string[];
}

/** Short reminder line shown above the list: this week's meals. */
export function listNoteLines({ meals = [] }: ListNotes = {}): string[] {
  return meals.length > 0 ? [`Meals: ${meals.join(', ')}`] : [];
}

/** Plain-text version of the list for copying into notes or messages. */
export function groceryListToText(groups: GroceryGroup[], notes: ListNotes = {}, title = 'Grocery List'): string {
  const header = [title, ...listNoteLines(notes)].join('\n');
  if (groups.length === 0) return `${header}\n\n(Your list is empty.)`;
  const sections = groups.map(
    (group) => `${group.label}\n${group.items.map((item) => `${item.checked ? '[x]' : '[ ]'} ${item.name}`).join('\n')}`,
  );
  return `${header}\n\n${sections.join('\n\n')}`;
}
