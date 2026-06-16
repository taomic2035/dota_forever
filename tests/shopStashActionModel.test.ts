import { describe, expect, it } from 'vitest';
import { buildShopStashActionModel } from '../src/ui/shopStashActionModel';

describe('buildShopStashActionModel', () => {
  it('stays hidden when the stash is empty', () => {
    expect(buildShopStashActionModel({
      stashItemCount: 0,
      atHomeShop: true,
      inventoryFreeSlots: 6,
    })).toEqual({
      visible: false,
      enabled: false,
      label: '',
      detail: '',
      tone: 'muted',
    });
  });

  it('enables take-all when the hero is at the home shop with inventory room', () => {
    expect(buildShopStashActionModel({
      stashItemCount: 3,
      atHomeShop: true,
      inventoryFreeSlots: 4,
    })).toEqual({
      visible: true,
      enabled: true,
      label: 'Take all x3',
      detail: 'Move stash items into inventory',
      tone: 'ready',
    });
  });

  it('blocks take-all away from the home shop', () => {
    expect(buildShopStashActionModel({
      stashItemCount: 2,
      atHomeShop: false,
      inventoryFreeSlots: 5,
    })).toEqual({
      visible: true,
      enabled: false,
      label: 'Take all blocked',
      detail: 'Need home shop',
      tone: 'blocked',
    });
  });

  it('warns when there are more stash items than inventory room', () => {
    expect(buildShopStashActionModel({
      stashItemCount: 4,
      atHomeShop: true,
      inventoryFreeSlots: 2,
    })).toEqual({
      visible: true,
      enabled: true,
      label: 'Take 2 / 4',
      detail: 'Inventory room is limited',
      tone: 'busy',
    });
  });

  it('blocks when there is no inventory room for normal stash items', () => {
    expect(buildShopStashActionModel({
      stashItemCount: 1,
      atHomeShop: true,
      inventoryFreeSlots: 0,
    })).toEqual({
      visible: true,
      enabled: false,
      label: 'Take all blocked',
      detail: 'Inventory full',
      tone: 'blocked',
    });
  });
});
