import { describe, expect, it } from 'vitest';
import { buildShopDestinationModel } from '../src/ui/shopDestinationModel';

describe('buildShopDestinationModel', () => {
  const baseHero = {
    alive: true,
    gold: 1000,
    shop: 'home' as const,
    inventoryFreeSlots: 1,
    backpackFreeSlots: 1,
    stashFreeSlots: 1,
    tpSlotOccupied: false,
    stackInInventory: false,
    stackInStash: false,
  };

  it('previews normal purchases going into hero inventory first', () => {
    expect(buildShopDestinationModel({
      item: { key: 'branch', cost: 53 },
      hero: baseHero,
    })).toEqual({
      canBuy: true,
      destination: 'hero',
      label: 'Hero',
      detail: 'Goes to inventory',
      tone: 'ready',
    });
  });

  it('previews backpack overflow before stash for living home-shop purchases', () => {
    const model = buildShopDestinationModel({
      item: { key: 'broadsword', cost: 1000 },
      hero: { ...baseHero, inventoryFreeSlots: 0, backpackFreeSlots: 1 },
    });

    expect(model.destination).toBe('backpack');
    expect(model.detail).toBe('Inventory full: goes to backpack');
  });

  it('previews stash overflow when inventory and backpack are full', () => {
    const model = buildShopDestinationModel({
      item: { key: 'broadsword', cost: 1000 },
      hero: { ...baseHero, inventoryFreeSlots: 0, backpackFreeSlots: 0, stashFreeSlots: 1 },
    });

    expect(model.destination).toBe('stash');
    expect(model.label).toBe('Stash');
    expect(model.tone).toBe('busy');
  });

  it('previews TP scrolls using the dedicated TP slot while alive', () => {
    const model = buildShopDestinationModel({
      item: { key: 'tp', cost: 135, stackCharges: true },
      hero: { ...baseHero, inventoryFreeSlots: 0, backpackFreeSlots: 0, stashFreeSlots: 0, tpSlotOccupied: true },
    });

    expect(model.destination).toBe('tp');
    expect(model.detail).toBe('Adds TP charge');
  });

  it('blocks secret items outside the secret shop before checking gold', () => {
    const model = buildShopDestinationModel({
      item: { key: 'demon_edge', cost: 2400, secretShop: true },
      hero: { ...baseHero, gold: 0, shop: 'home' },
    });

    expect(model).toMatchObject({
      canBuy: false,
      destination: 'blocked',
      label: 'Secret',
      detail: 'Need secret shop',
      tone: 'blocked',
    });
  });

  it('shows not enough gold after the shop requirement is satisfied', () => {
    const model = buildShopDestinationModel({
      item: { key: 'branch', cost: 53 },
      hero: { ...baseHero, gold: 20 },
    });

    expect(model).toMatchObject({
      canBuy: false,
      destination: 'blocked',
      label: 'Gold',
      detail: 'Need 33 more gold',
      tone: 'blocked',
    });
  });

  it('previews dead hero purchases going to stash', () => {
    const model = buildShopDestinationModel({
      item: { key: 'branch', cost: 53 },
      hero: { ...baseHero, alive: false, shop: null, inventoryFreeSlots: 6, stashFreeSlots: 1 },
    });

    expect(model.destination).toBe('stash');
    expect(model.detail).toBe('Dead: goes to stash');
  });
});
