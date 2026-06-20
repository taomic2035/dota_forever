import { describe, expect, it } from 'vitest';
import { buildShopRelatedItemsModel, type ShopRelatedCatalogItem } from '../src/ui/shopRelatedItemsModel';

const catalog: ShopRelatedCatalogItem[] = [
  { key: 'boots', name: 'Boots', cost: 500 },
  { key: 'gloves', name: 'Gloves', cost: 450 },
  { key: 'demon_edge', name: 'Demon Edge', cost: 2400, secretShop: true },
  { key: 'phase_boots', name: 'Phase Boots', cost: 1500, recipe: { components: ['boots', 'gloves'], recipeCost: 550 } },
  { key: 'greater_edge', name: 'Greater Edge', cost: 5200, recipe: { components: ['demon_edge', 'gloves', 'gloves'], recipeCost: 1900 } },
  { key: 'butterfly', name: 'Butterfly', cost: 6000, recipe: { components: ['demon_edge', 'phase_boots'], recipeCost: 2100 } },
];

describe('buildShopRelatedItemsModel', () => {
  it('stays hidden for missing selected items', () => {
    expect(buildShopRelatedItemsModel({
      selectedKey: null,
      catalog,
      inventory: [],
      backpack: [],
      stash: [],
      tpSlot: null,
      shop: 'home',
    })).toEqual({
      visible: false,
      selectedKey: null,
      title: '',
      buildsFrom: [],
      buildsInto: [],
      summary: '',
    });
  });

  it('summarizes selected item components with owned and missing states', () => {
    const model = buildShopRelatedItemsModel({
      selectedKey: 'phase_boots',
      catalog,
      inventory: [{ itemKey: 'boots' }],
      backpack: [],
      stash: [],
      tpSlot: null,
      shop: 'home',
    });

    expect(model.visible).toBe(true);
    expect(model.title).toBe('Phase Boots');
    expect(model.buildsFrom.map((item) => [item.key, item.state, item.countLabel])).toEqual([
      ['boots', 'owned', '1/1'],
      ['gloves', 'missing', '0/1'],
    ]);
    expect(model.summary).toBe('From 1/2 · Into 1');
  });

  it('marks secret-shop gated missing components without changing owned components', () => {
    const model = buildShopRelatedItemsModel({
      selectedKey: 'greater_edge',
      catalog,
      inventory: [{ itemKey: 'gloves' }],
      backpack: [],
      stash: [],
      tpSlot: null,
      shop: 'home',
    });

    expect(model.buildsFrom.map((item) => [item.key, item.state, item.countLabel, item.detail])).toEqual([
      ['demon_edge', 'gated', '0/1', 'Need secret shop'],
      ['gloves', 'missing', '1/2', 'Owned 1 / need 2'],
    ]);
  });

  it('lists parent items that build from the selected component', () => {
    const model = buildShopRelatedItemsModel({
      selectedKey: 'demon_edge',
      catalog,
      inventory: [],
      backpack: [],
      stash: [],
      tpSlot: null,
      shop: 'secret',
    });

    expect(model.buildsInto.map((item) => [item.key, item.state, item.detail])).toEqual([
      ['greater_edge', 'missing', 'Missing gloves x2'],
      ['butterfly', 'missing', 'Missing phase_boots x1'],
    ]);
  });

  it('counts backpack, stash, and TP slot as owned planning state', () => {
    const model = buildShopRelatedItemsModel({
      selectedKey: 'phase_boots',
      catalog,
      inventory: [],
      backpack: [{ itemKey: 'boots' }],
      stash: [{ itemKey: 'gloves' }],
      tpSlot: { itemKey: 'boots' },
      shop: 'home',
    });

    expect(model.buildsFrom.map((item) => [item.key, item.state, item.countLabel])).toEqual([
      ['boots', 'owned', '1/1'],
      ['gloves', 'owned', '1/1'],
    ]);
  });
});
