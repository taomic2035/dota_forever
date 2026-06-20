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
    })).toMatchObject({
      canBuy: true,
      destination: 'hero',
      label: 'Hero',
      detail: 'Goes to inventory',
      tone: 'ready',
      availability: { reason: 'ready', ready: true },
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
      availability: { reason: 'wrongShop', ready: false },
    });
  });

  it('previews side-shop basics as lane purchases', () => {
    const model = buildShopDestinationModel({
      item: { key: 'boots', cost: 500, sideShop: true },
      hero: { ...baseHero, shop: 'side' },
    });

    expect(model).toMatchObject({
      canBuy: true,
      destination: 'hero',
      label: 'Hero',
      detail: 'Side shop: goes to inventory',
      tone: 'ready',
    });
  });

  it('blocks non-side-shop basics at the side shop before checking gold', () => {
    const model = buildShopDestinationModel({
      item: { key: 'broadsword', cost: 1000 },
      hero: { ...baseHero, gold: 0, shop: 'side' },
    });

    expect(model).toMatchObject({
      canBuy: false,
      destination: 'blocked',
      label: 'Side',
      detail: 'Need home shop',
      tone: 'blocked',
    });
  });

  it('previews full side-shop purchases as blocked instead of stashing them', () => {
    const model = buildShopDestinationModel({
      item: { key: 'boots', cost: 500, sideShop: true },
      hero: { ...baseHero, shop: 'side', inventoryFreeSlots: 0, backpackFreeSlots: 0, stashFreeSlots: 1 },
    });

    expect(model).toMatchObject({
      canBuy: false,
      destination: 'blocked',
      label: 'Full',
      detail: 'Side shop cannot stash',
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
      availability: { reason: 'noGold', ready: false, goldDeficit: 33 },
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

  it('blocks when inventory, backpack, and stash are all full (final fallback)', () => {
    // 可达兜底:存活、基地、非秘密物品,三处皆满 → buyItem 也返回 'full'(items.ts)。预览须一致。
    const model = buildShopDestinationModel({
      item: { key: 'broadsword', cost: 1000 },
      hero: { ...baseHero, inventoryFreeSlots: 0, backpackFreeSlots: 0, stashFreeSlots: 0 },
    });

    expect(model).toMatchObject({
      canBuy: false,
      destination: 'blocked',
      label: 'Full',
      detail: 'Inventory, backpack, and stash full',
      tone: 'blocked',
      availability: { reason: 'noSpace', ready: false },
    });
  });

  it('blocks secret items when inventory is full (secret shop never stashes)', () => {
    // 秘密商店物品无背包/暂存回退:满物品栏即拒(与 buyItem 的 `secretShop && alive → full` 对齐)。
    const model = buildShopDestinationModel({
      item: { key: 'demon_edge', cost: 2400, secretShop: true },
      hero: { ...baseHero, gold: 3000, shop: 'secret', inventoryFreeSlots: 0, backpackFreeSlots: 1, stashFreeSlots: 1 },
    });

    expect(model).toMatchObject({
      canBuy: false,
      destination: 'blocked',
      label: 'Full',
      detail: 'Secret shop cannot stash',
      tone: 'blocked',
    });
  });

  it('previews stacking into inventory when already holding the item', () => {
    // 堆叠合并预览(stackInInventory):与 buyItem 的充能合并分支对齐,即使物品栏已满也并入现有堆叠。
    // 用非 tp 的可堆叠消耗品(dust),避免先命中 TP 专属槽分支。
    const model = buildShopDestinationModel({
      item: { key: 'dust', cost: 80, stackCharges: true },
      hero: { ...baseHero, inventoryFreeSlots: 0, stackInInventory: true },
    });

    expect(model).toMatchObject({
      canBuy: true,
      destination: 'hero',
      detail: 'Adds inventory charge',
      tone: 'ready',
    });
  });
});
