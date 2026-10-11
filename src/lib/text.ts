/** Lowercase, strip accents and punctuation, collapse whitespace. */
export function normalizeName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function singularizeWord(word: string): string {
  if (word.length > 4 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && word.endsWith('oes')) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

/**
 * Key used to decide whether two names refer to the same thing.
 * "Cherry Tomatoes", "cherry tomato" and " cherry-tomatoes " share a key.
 */
export function matchKey(value: string): string {
  const words = normalizeName(value).split(' ').filter(Boolean);
  if (words.length === 0) return '';
  words[words.length - 1] = singularizeWord(words[words.length - 1]);
  return words.join(' ');
}

export function slugify(value: string): string {
  return normalizeName(value).replace(/ /g, '-');
}

/** Trim and collapse internal whitespace, keeping the user's casing. */
export function tidyName(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
