import { describe, expect, it } from 'vitest';
import { buildShopOwnershipModel } from '../src/ui/shopOwnershipModel';

describe('buildShopOwnershipModel', () => {
  it('stays hidden when the hero owns no matching item', () => {
    expect(buildShopOwnershipModel({
      itemKey: 'blink',
      inventory: [{ itemKey: 'branch' }, null, null, null, null, null],
      backpack: [null, null, null],
      stash: [null, null, null, null, null, null],
      tpSlot: null,
    })).toEqual({ visible: false, badges: [], detail: '' });
  });

  it('summarizes matching items across inventory, backpack, and stash', () => {
    expect(buildShopOwnershipModel({
      itemKey: 'branch',
      inventory: [{ itemKey: 'branch' }, null, null, null, null, null],
      backpack: [{ itemKey: 'branch' }, null, null],
      stash: [{ itemKey: 'branch' }, { itemKey: 'branch' }, null, null, null, null],
      tpSlot: null,
    })).toEqual({
      visible: true,
      detail: 'Owned: Hero x1 / Backpack x1 / Stash x2',
      badges: [
        { lane: 'inventory', label: 'Hero', count: 1 },
        { lane: 'backpack', label: 'Backpack', count: 1 },
        { lane: 'stash', label: 'Stash', count: 2 },
      ],
    });
  });

  it('counts stack charges for TP slot ownership', () => {
    expect(buildShopOwnershipModel({
      itemKey: 'tp',
      inventory: [null, null, null, null, null, null],
      backpack: [null, null, null],
      stash: [null, null, null, null, null, null],
      tpSlot: { itemKey: 'tp', charges: 3 },
    })).toEqual({
      visible: true,
      detail: 'Owned: TP x3',
      badges: [{ lane: 'tp', label: 'TP', count: 3 }],
    });
  });

  it('counts stackable consumable charges in normal lanes', () => {
    expect(buildShopOwnershipModel({
      itemKey: 'dust',
      inventory: [{ itemKey: 'dust', charges: 2 }, null, null, null, null, null],
      backpack: [null, null, null],
      stash: [{ itemKey: 'dust', charges: 4 }, null, null, null, null, null],
      tpSlot: null,
    }).detail).toBe('Owned: Hero x2 / Stash x4');
  });
});
