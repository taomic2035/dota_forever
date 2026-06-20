import { describe, expect, it } from 'vitest';
import {
  buildShopSearchHighlightModel,
  buildShopVisibleItemRows,
  buildShopVisibleItems,
  orderShopVisibleItemsByAvailability,
} from '../src/ui/shopListModel';

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

  it('orders currently buyable rows before blocked rows while preserving stable row order', () => {
    const rows = [
      { key: 'broadsword', name: 'Broad Sword', category: 'weapon' as const, cost: 1000 },
      { key: 'boots', name: 'Boots', category: 'armor' as const, cost: 500 },
      { key: 'ward_obs', name: 'Observer Ward', category: 'consumable' as const, cost: 150 },
      { key: 'branch', name: 'Iron Branch', category: 'attribute' as const, cost: 53 },
    ];

    const result = orderShopVisibleItemsByAvailability(rows, new Map([
      ['broadsword', { canBuy: false }],
      ['boots', { canBuy: true }],
      ['ward_obs', { canBuy: false }],
      ['branch', { canBuy: true }],
    ]));

    expect(result.map((item) => item.key)).toEqual(['boots', 'branch', 'broadsword', 'ward_obs']);
    expect(rows.map((item) => item.key)).toEqual(['broadsword', 'boots', 'ward_obs', 'branch']);
  });
});

describe('buildShopSearchHighlightModel', () => {
  it('describes query tokens, matched fields, and buyable tone for visible search rows', () => {
    const model = buildShopSearchHighlightModel(catalog[2], {
      category: 'all',
      query: 'ward vision',
      recipePrefix: 'recipe_',
    }, { canBuy: true });

    expect(model).toMatchObject({
      tokens: ['ward', 'vision'],
      matchedFields: ['key', 'name', 'description'],
      label: 'ward / vision',
      tone: 'buyable',
      canBuy: true,
    });
    expect(model.score).toBeGreaterThan(0);
    expect(model.title).toContain('name');
    expect(model.title).toContain('description');
  });

  it('keeps blank-query metadata quiet while still exposing availability tone', () => {
    const model = buildShopSearchHighlightModel(catalog[0], {
      category: 'attribute',
      query: '',
      recipePrefix: 'recipe_',
    }, { canBuy: false });

    expect(model).toMatchObject({
      tokens: [],
      matchedFields: [],
      label: '',
      tone: 'blocked',
      canBuy: false,
      score: 0,
    });
  });
});

describe('buildShopVisibleItemRows', () => {
  it('returns visible rows with highlight metadata for every matched item', () => {
    const rows = buildShopVisibleItemRows(catalog, {
      category: 'weapon',
      query: 'ward',
      recipePrefix: 'recipe_',
    }, new Map([
      ['ward_obs', { canBuy: true }],
    ]));

    expect(rows).toHaveLength(1);
    expect(rows[0].item.key).toBe('ward_obs');
    expect(rows[0].highlight).toMatchObject({
      tokens: ['ward'],
      matchedFields: ['key', 'name'],
      tone: 'buyable',
    });
  });

  it('ranks stronger name/key/category matches above description-only matches for search queries', () => {
    const rows = buildShopVisibleItemRows([
      { key: 'plain_boots', name: 'Plain Boots', category: 'armor' as const, cost: 500, description: 'Useful before warding trips' },
      { key: 'ward_obs', name: 'Observer Ward', category: 'consumable' as const, cost: 150, description: 'Grants long vision' },
      { key: 'smoke', name: 'Smoke', category: 'consumable' as const, cost: 50, description: 'Hide while walking to ward' },
    ], {
      category: 'all',
      query: 'ward',
      recipePrefix: 'recipe_',
    });

    expect(rows.map((row) => row.item.key)).toEqual(['ward_obs', 'plain_boots', 'smoke']);
    expect(rows[0].highlight.score).toBeGreaterThan(rows[1].highlight.score);
  });
});
