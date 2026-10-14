import { describe, expect, it } from 'vitest';
import { INGREDIENTS } from '../data/ingredients';
import { createCustomIngredient, findIngredientByName, searchIngredients } from './ingredients';

describe('ingredient lookup', () => {
  it('resolves aliases and plural/singular forms to standard IDs', () => {
    expect(findIngredientByName('garbanzo beans', INGREDIENTS)?.id).toBe('chickpeas');
    expect(findIngredientByName('Chickpea', INGREDIENTS)?.id).toBe('chickpeas');
    expect(findIngredientByName('  EGG ', INGREDIENTS)?.id).toBe('eggs');
    expect(findIngredientByName('dragon fruit', INGREDIENTS)).toBeUndefined();
  });

  it('search finds ingredients by alias and reports the alias', () => {
    const results = searchIngredients('garbanzo', INGREDIENTS);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ ingredient: { id: 'chickpeas' }, matchedAlias: 'garbanzo beans' });
  });
});

describe('createCustomIngredient', () => {
  it('creates a custom entry with a stable ID', () => {
    const result = createCustomIngredient('  dragon   fruit ', 'produce', INGREDIENTS);
    expect(result).toEqual({
      ok: true,
      ingredient: { id: 'custom-dragon-fruit', name: 'Dragon fruit', category: 'produce', kitchenGroup: 'own', storeSection: 'produce', custom: true },
    });
  });

  it('prevents duplicates of catalog items, including aliases', () => {
    const result = createCustomIngredient('Garbanzo beans', 'proteins', INGREDIENTS);
    expect(result).toMatchObject({ ok: false, reason: 'duplicate', existing: { id: 'chickpeas' } });
  });

  it('prevents duplicates of earlier custom entries', () => {
    const first = createCustomIngredient('Dragon fruit', 'produce', INGREDIENTS);
    if (!first.ok) throw new Error('expected ok');
    const second = createCustomIngredient('dragon fruits', 'produce', [...INGREDIENTS, first.ingredient]);
    expect(second).toMatchObject({ ok: false, reason: 'duplicate' });
  });

  it('rejects empty names', () => {
    expect(createCustomIngredient('   ', 'produce', INGREDIENTS)).toEqual({ ok: false, reason: 'empty' });
  });
});

describe('searchIngredients ranking', () => {
  it('puts an exact match first, then names that start with the text', () => {
    expect(searchIngredients('milk', INGREDIENTS)[0].ingredient.id).toBe('milk');
    expect(searchIngredients('chick', INGREDIENTS).map((r) => r.ingredient.name)[0]).toMatch(/^Chick/);
    expect(searchIngredients('garbanzo', INGREDIENTS)[0].ingredient.id).toBe('chickpeas');
  });
});
