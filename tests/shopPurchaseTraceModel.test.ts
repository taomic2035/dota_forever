import { describe, expect, it } from 'vitest';
import { buildShopPurchaseTraceModel } from '../src/ui/shopPurchaseTraceModel';

describe('buildShopPurchaseTraceModel', () => {
  it('summarizes recent successful purchase landing lanes newest first', () => {
    const model = buildShopPurchaseTraceModel({
      events: [
        { itemKey: 'branch', result: 'ok', source: 'direct', sequence: 1 },
        { itemKey: 'boots', result: 'ok_backpack', source: 'quickbuy', sequence: 2 },
        { itemKey: 'salve', result: 'ok_stash', source: 'recipe', sequence: 3 },
      ],
    });

    expect(model.visible).toBe(true);
    expect(model.summary).toBe('Latest purchase: 治疗药膏 -> Stash');
    expect(model.entries.map((entry) => [entry.label, entry.destinationLabel, entry.tone, entry.actionHint])).toEqual([
      ['治疗药膏', 'Stash', 'busy', 'Take stash / Deliver'],
      ['速度之靴', 'Backpack', 'busy', 'Move to inventory'],
      ['铁树枝', 'Hero', 'ready', 'Use from main slots'],
    ]);
  });

  it('turns blocked purchase results into clear next actions', () => {
    const model = buildShopPurchaseTraceModel({
      maxEntries: 2,
      events: [
        { itemKey: 'blink', result: 'no_gold', source: 'direct', sequence: 1 },
        { itemKey: 'blink', result: 'no_shop', source: 'direct', sequence: 2 },
        { itemKey: 'branch', result: 'full', source: 'direct', sequence: 3 },
      ],
    });

    expect(model.summary).toBe('Latest purchase: 铁树枝 blocked');
    expect(model.entries).toEqual([
      {
        itemKey: 'branch',
        label: '铁树枝',
        destinationLabel: 'Blocked',
        tone: 'blocked',
        detail: 'Inventory, backpack, and stash full',
        actionHint: 'Free a slot',
      },
      {
        itemKey: 'blink',
        label: '闪烁短刃',
        destinationLabel: 'Blocked',
        tone: 'blocked',
        detail: 'Need the correct shop or range',
        actionHint: 'Move to shop',
      },
    ]);
  });

  it('stays hidden when there is no purchase history', () => {
    const model = buildShopPurchaseTraceModel({ events: [] });

    expect(model).toEqual({
      visible: false,
      entries: [],
      summary: '',
    });
  });
});
