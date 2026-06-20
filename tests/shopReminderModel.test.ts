import { describe, expect, it } from 'vitest';
import { buildShopReminderModel } from '../src/ui/shopReminderModel';

describe('buildShopReminderModel', () => {
  it('prioritizes ready quickbuy and stash retrieval before recipe reminders', () => {
    const model = buildShopReminderModel({
      access: { tone: 'home', detail: 'Full catalog and stash access' },
      quickbuy: { active: true, ready: true, label: '黑皇杖', glyph: '🛒', deficit: 0 },
      stashAction: { visible: true, enabled: true, label: '取回全部', detail: '2 items ready', tone: 'ready' },
      recipeBatchAction: {
        visible: true,
        parentItemKey: 'magic_wand',
        itemKeys: ['branch', 'branch'],
        label: 'Ctrl+Enter: Buy 2 components',
        detail: 'For 魔杖: 铁树枝 x2',
      },
      recipeNextAction: {
        visible: true,
        parentItemKey: 'magic_wand',
        itemKey: 'branch',
        label: 'Shift+Enter: Buy 铁树枝',
        detail: 'For 魔杖 / Goes to inventory',
      },
      quickAction: { visible: true, itemKey: 'branch', label: 'Enter: Buy 铁树枝', detail: 'Goes to inventory' },
    });

    expect(model.visible).toBe(true);
    expect(model.reminders.map((reminder) => reminder.headline)).toEqual([
      '快速购买已就绪',
      '储藏可取回',
      '合成组件可补',
    ]);
    expect(model.reminders[0]).toMatchObject({
      tone: 'ready',
      detail: '黑皇杖 可买齐',
      actionHint: '点击快速购买',
    });
  });

  it('falls back to next component and direct purchase when no high priority reminder exists', () => {
    const model = buildShopReminderModel({
      access: { tone: 'home', detail: 'Full catalog and stash access' },
      quickbuy: { active: false, ready: false, label: '', glyph: '', deficit: 0 },
      stashAction: { visible: false, enabled: false, label: '', detail: '', tone: 'muted' },
      recipeBatchAction: { visible: false, parentItemKey: null, itemKeys: [], label: '', detail: '' },
      recipeNextAction: {
        visible: true,
        parentItemKey: 'bracer',
        itemKey: 'circlet',
        label: 'Shift+Enter: Buy Circlet',
        detail: 'For Bracer / Goes to inventory',
      },
      quickAction: { visible: true, itemKey: 'boots', label: 'Enter: Buy Boots', detail: 'Goes to inventory' },
    });

    expect(model.reminders).toEqual([
      {
        tone: 'ready',
        headline: '下一件合成组件',
        detail: 'For Bracer / Goes to inventory',
        actionHint: 'Shift+Enter',
      },
      {
        tone: 'ready',
        headline: '可直接购买',
        detail: 'Goes to inventory',
        actionHint: 'Enter',
      },
    ]);
  });

  it('surfaces blocked purchase reasons when the shop is only being browsed remotely', () => {
    const model = buildShopReminderModel({
      access: { tone: 'away', detail: 'Move into a shop to buy' },
      quickbuy: { active: true, ready: false, label: '跳刀', glyph: '🛒', deficit: 350 },
      stashAction: { visible: false, enabled: false, label: '', detail: '', tone: 'muted' },
      recipeBatchAction: { visible: false, parentItemKey: null, itemKeys: [], label: '', detail: '' },
      recipeNextAction: { visible: false, parentItemKey: null, itemKey: null, label: '', detail: '' },
      quickAction: { visible: true, itemKey: null, label: 'Enter: blocked', detail: 'Need home shop' },
    });

    expect(model.reminders).toEqual([
      {
        tone: 'busy',
        headline: '快速购买目标',
        detail: '跳刀 还差 350 金',
        actionHint: '继续补刀/打钱',
      },
      {
        tone: 'blocked',
        headline: '当前不能购买',
        detail: 'Need home shop',
        actionHint: '移动到对应商店或补金币',
      },
      {
        tone: 'blocked',
        headline: '商店距离不足',
        detail: 'Move into a shop to buy',
        actionHint: '回到泉水/边路/秘密商店',
      },
    ]);
  });

  it('promotes courier delivery when stash exists away from the home shop', () => {
    const model = buildShopReminderModel({
      access: { tone: 'away', detail: 'Move into a shop to buy' },
      quickbuy: { active: false, ready: false, label: '', glyph: '', deficit: 0 },
      stashAction: { visible: true, enabled: false, label: 'Take all blocked', detail: 'Need home shop', tone: 'blocked' },
      courier: {
        status: 'ready',
        detail: 'Ready / stash x2',
        actionLabel: 'Deliver stash',
        primaryAction: 'deliver',
        tone: 'ready',
      },
      recipeBatchAction: { visible: false, parentItemKey: null, itemKeys: [], label: '', detail: '' },
      recipeNextAction: { visible: false, parentItemKey: null, itemKey: null, label: '', detail: '' },
      quickAction: { visible: true, itemKey: null, label: 'Enter: blocked', detail: 'Need home shop' },
    });

    expect(model.reminders[0]).toEqual({
      tone: 'ready',
      headline: '信使可派送',
      detail: 'Ready / stash x2',
      actionHint: 'Deliver stash',
    });
  });

  it('warns when stash delivery is blocked by a dead courier', () => {
    const model = buildShopReminderModel({
      access: { tone: 'home', detail: 'Full catalog and stash access' },
      quickbuy: { active: false, ready: false, label: '', glyph: '', deficit: 0 },
      stashAction: { visible: true, enabled: false, label: 'Take all blocked', detail: 'Inventory full', tone: 'blocked' },
      courier: {
        status: 'dead',
        detail: 'Dead / respawning',
        actionLabel: 'Wait respawn',
        primaryAction: 'none',
        tone: 'danger',
      },
      recipeBatchAction: { visible: false, parentItemKey: null, itemKeys: [], label: '', detail: '' },
      recipeNextAction: { visible: false, parentItemKey: null, itemKey: null, label: '', detail: '' },
      quickAction: { visible: false, itemKey: null, label: '', detail: '' },
    });

    expect(model.reminders[0]).toEqual({
      tone: 'blocked',
      headline: '信使暂不可用',
      detail: 'Dead / respawning',
      actionHint: 'Wait respawn',
    });
  });
});
