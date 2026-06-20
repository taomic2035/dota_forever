import { describe, expect, it } from 'vitest';
import { buildItemLogisticsModel } from '../src/ui/itemLogisticsModel';

describe('buildItemLogisticsModel', () => {
  it('maps hero, backpack, stash, tp, and courier lanes into one logistics summary', () => {
    const model = buildItemLogisticsModel({
      inventory: [{ itemKey: 'magic_stick' }, { itemKey: 'branch' }, null, null, null, null],
      backpack: [{ itemKey: 'branch' }, null, null],
      stash: [{ itemKey: 'branch' }, { itemKey: 'circlet' }, null, null, null, null],
      tpSlot: { itemKey: 'tp', charges: 2 },
      courier: {
        alive: true,
        task: 'delivering',
        etaSeconds: 12.2,
        cargo: [{ itemKey: 'boots' }, null, null, null, null, null],
      },
      quickbuyKey: 'magic_wand',
      selectedRecipeKey: 'magic_wand',
    });

    expect(model.summary).toBe('Hero 2/6 · Backpack 1/3 · Stash 2/6 · TP x2 · Courier delivering 1/6, 13s');
    expect(model.lanes.map((lane) => [lane.lane, lane.filled, lane.totalSlots, lane.tone])).toEqual([
      ['inventory', 2, 6, 'ready'],
      ['backpack', 1, 3, 'busy'],
      ['stash', 2, 6, 'busy'],
      ['tp', 2, 1, 'ready'],
      ['courier', 1, 6, 'busy'],
    ]);
  });

  it('highlights quickbuy components wherever they currently sit', () => {
    const model = buildItemLogisticsModel({
      inventory: [{ itemKey: 'magic_stick' }, { itemKey: 'branch' }, null, null, null, null],
      backpack: [{ itemKey: 'branch' }, null, null],
      stash: [{ itemKey: 'branch' }, { itemKey: 'circlet' }, null, null, null, null],
      tpSlot: null,
      courier: { alive: false, respawnSeconds: 21, cargo: [{ itemKey: 'branch' }, null, null, null, null, null] },
      quickbuyKey: 'magic_wand',
    });

    const quickbuySlots = model.slots
      .filter((slot) => slot.highlights.quickbuyComponent)
      .map((slot) => `${slot.lane}:${slot.index}:${slot.itemKey}`);

    expect(quickbuySlots).toEqual([
      'inventory:0:magic_stick',
      'inventory:1:branch',
      'backpack:0:branch',
      'stash:0:branch',
    ]);
    expect(model.quickbuyDetail).toBe('Quickbuy components: Hero x2 / Backpack x1 / Stash x1');
  });

  it('marks only hero-ready components as combine-ready when the selected recipe is complete in inventory', () => {
    const model = buildItemLogisticsModel({
      inventory: [
        { itemKey: 'magic_stick' },
        { itemKey: 'branch' },
        { itemKey: 'branch' },
        { itemKey: 'branch' },
        { itemKey: 'circlet' },
        null,
      ],
      backpack: [{ itemKey: 'branch' }, null, null],
      stash: [null, null, null, null, null, null],
      tpSlot: null,
      quickbuyKey: 'magic_wand',
      selectedRecipeKey: 'magic_wand',
    });

    expect(model.canCombineNow).toBe(true);
    expect(model.combineDetail).toBe('Ready to combine: 强化魔杖');
    expect(model.slots
      .filter((slot) => slot.highlights.combineReady)
      .map((slot) => `${slot.lane}:${slot.index}:${slot.itemKey}`)).toEqual([
        'inventory:0:magic_stick',
        'inventory:1:branch',
        'inventory:2:branch',
        'inventory:3:branch',
      ]);
  });

  it('surfaces live backpack ready-delay countdown on inventory slots after a backpack move', () => {
    const model = buildItemLogisticsModel({
      inventory: [{ itemKey: 'salve', backpackDelayRemaining: 4.4 }, null, null, null, null, null],
      backpack: [null, null, null],
      stash: [null, null, null, null, null, null],
      tpSlot: null,
    });

    expect(model.backpackDelayDetail).toBe('Backpack delay: 治疗药膏 5s');
    expect(model.summary).toBe('Hero 1/6 · Backpack 0/3 · Stash 0/6 · TP x0 · Courier none · Backpack delay: 治疗药膏 5s');
    expect(model.slots[0]).toMatchObject({
      lane: 'inventory',
      index: 0,
      itemKey: 'salve',
      backpackDelayRemaining: 5,
      highlights: {
        backpackDelay: true,
      },
    });
    expect(model.slots[0].title).toContain('backpack ready delay 5s');
  });

  it('suggests the next executable logistics action for backpack and stash recovery', () => {
    expect(buildItemLogisticsModel({
      inventory: [null, null, null, null, null, null],
      backpack: [{ itemKey: 'boots' }, null, null],
      stash: [null, null, null, null, null, null],
      tpSlot: null,
    }).primaryAction).toMatchObject({
      visible: true,
      id: 'move-backpack-to-inventory',
      label: 'Backpack -> Hero',
      detail: 'Click a backpack item to move it into inventory; it has a 6s ready delay',
      tone: 'ready',
    });

    expect(buildItemLogisticsModel({
      inventory: [{ itemKey: 'boots' }, null, null, null, null, null],
      backpack: [null, null, null],
      stash: [null, null, null, null, null, null],
      tpSlot: null,
    }).primaryAction).toMatchObject({
      visible: true,
      id: 'move-inventory-to-backpack',
      label: 'Hero -> Backpack',
      detail: 'Click a hero inventory item to free an active slot',
      tone: 'busy',
    });

    expect(buildItemLogisticsModel({
      inventory: [{ itemKey: 'boots' }, { itemKey: 'branch' }, { itemKey: 'circlet' }, { itemKey: 'magic_stick' }, { itemKey: 'salve' }, { itemKey: 'clarity' }],
      backpack: [{ itemKey: 'branch' }, { itemKey: 'branch' }, { itemKey: 'branch' }],
      stash: [{ itemKey: 'broadsword' }, null, null, null, null, null],
      tpSlot: null,
      courier: {
        alive: true,
        task: 'idle',
        cargo: [null, null, null, null, null, null],
      },
    }).primaryAction).toMatchObject({
      visible: true,
      id: 'deliver-stash',
      label: 'Deliver stash',
      detail: 'Use courier delivery to bring stash items to your hero',
      tone: 'ready',
    });
  });
});
