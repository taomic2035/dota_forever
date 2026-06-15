import { describe, expect, it } from 'vitest';
import { buildShopVisibleItems } from '../src/ui/shopListModel';

const catalog = [
  { key: 'branch', name: 'Iron Branch', category: 'attribute' as const, cost: 53, description: '+1 all stats' },
  { key: 'broadsword', name: 'Broad Sword', category: 'weapon' as const, cost: 1000, description: '+10 damage' },
  { key: 'ward_obs', name: 'Observer Ward', category: 'consumable' as const, cost: 150, description: 'Grants long vision' },
  { key: 'recipe_magic_wand', name: 'Magic Wand Recipe', category: 'combined' as const, cost: 150, description: 'Recipe scroll' },
  { key: 'debug_free', name: 'Debug Free', category: 'arcane' as const, cost: 0, description: 'Hidden debug item' },
];

describe('buildShopVisibleItems', () => {
  it('keeps the selected category when no query is provided', () => {
    const result = buildShopVisibleItems(catalog, {
      category: 'weapon',
      query: '',
      recipePrefix: 'recipe_',
    });

    expect(result.map((item) => item.key)).toEqual(['broadsword']);
  });

  it('searches across all categories while preserving normal shop exclusions', () => {
    const result = buildShopVisibleItems(catalog, {
      category: 'weapon',
      query: 'ward',
      recipePrefix: 'recipe_',
    });

    expect(result.map((item) => item.key)).toEqual(['ward_obs']);
  });

  it('matches query tokens against key, name, and description', () => {
    const result = buildShopVisibleItems(catalog, {
      category: 'all',
      query: 'long vision',
      recipePrefix: 'recipe_',
    });

    expect(result.map((item) => item.key)).toEqual(['ward_obs']);
  });

  it('requires every query token to match somewhere in the item text', () => {
    const result = buildShopVisibleItems(catalog, {
      category: 'all',
      query: 'broad vision',
      recipePrefix: 'recipe_',
    });

    expect(result).toEqual([]);
  });

  it('excludes recipes and zero-cost utility entries from visible rows', () => {
    const result = buildShopVisibleItems(catalog, {
      category: 'all',
      query: '',
      recipePrefix: 'recipe_',
    });

    expect(result.map((item) => item.key)).toEqual(['branch', 'broadsword', 'ward_obs']);
  });
});
