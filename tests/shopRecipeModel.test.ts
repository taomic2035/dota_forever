import { describe, expect, it } from 'vitest';
import { buildShopRecipeProgressModel } from '../src/ui/shopRecipeModel';

describe('buildShopRecipeProgressModel', () => {
  it('stays hidden for items without recipes', () => {
    expect(buildShopRecipeProgressModel({
      recipe: null,
      inventory: [{ itemKey: 'branch' }, null, null, null, null, null],
      backpack: [null, null, null],
      stash: [null, null, null, null, null, null],
      tpSlot: null,
    })).toEqual({
      visible: false,
      ownedLabel: '',
      readyLabel: '',
      missing: [],
      detail: '',
    });
  });

  it('summarizes owned and hero-ready components for a duplicate-component recipe', () => {
    expect(buildShopRecipeProgressModel({
      recipe: { components: ['magic_stick', 'branch', 'branch', 'branch'], recipeCost: 150 },
      inventory: [{ itemKey: 'magic_stick' }, { itemKey: 'branch' }, null, null, null, null],
      backpack: [{ itemKey: 'branch' }, null, null],
      stash: [{ itemKey: 'branch' }, null, null, null, null, null],
      tpSlot: null,
    })).toMatchObject({
      visible: true,
      ownedLabel: '4/4',
      readyLabel: '2/4',
      missing: [],
      detail: 'Owned 4/4 / Hero-ready 2/4 / recipe 150g',
    });
  });

  it('reports missing components after counting duplicate requirements', () => {
    expect(buildShopRecipeProgressModel({
      recipe: { components: ['gauntlet', 'circlet'], recipeCost: 190 },
      inventory: [{ itemKey: 'gauntlet' }, null, null, null, null, null],
      backpack: [null, null, null],
      stash: [null, null, null, null, null, null],
      tpSlot: null,
    })).toMatchObject({
      visible: true,
      ownedLabel: '1/2',
      readyLabel: '1/2',
      missing: [{ key: 'circlet', required: 1, owned: 0, heroReady: 0, missing: 1 }],
      detail: 'Owned 1/2 / Hero-ready 1/2 / missing circlet x1 / recipe 190g',
    });
  });

  it('counts TP slot components when a recipe ever requires TP scrolls', () => {
    expect(buildShopRecipeProgressModel({
      recipe: { components: ['tp', 'tp'], recipeCost: 0 },
      inventory: [null, null, null, null, null, null],
      backpack: [null, null, null],
      stash: [null, null, null, null, null, null],
      tpSlot: { itemKey: 'tp', charges: 3 },
    })).toMatchObject({
      visible: true,
      ownedLabel: '2/2',
      readyLabel: '0/2',
      missing: [],
    });
  });
});
