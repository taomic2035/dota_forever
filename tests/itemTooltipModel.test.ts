import { describe, expect, it } from 'vitest';
import {
  buildBackpackItemSlotTitle,
  buildEmptyBackpackSlotTitle,
  buildEmptyItemSlotTitle,
  buildItemSlotTitle,
} from '../src/ui/itemTooltipModel';

describe('item tooltip model', () => {
  it('labels empty item slots and the dedicated TP slot', () => {
    expect(buildEmptyItemSlotTitle({ hotkey: '1', isTpSlot: false })).toBe('');
    expect(buildEmptyItemSlotTitle({ hotkey: 'T', isTpSlot: true })).toBe('回城卷轴槽(按 T 使用)\n当前: 空槽');
  });

  it('shows current cooldown, mana and ready states for active items', () => {
    expect(buildItemSlotTitle({
      name: '闪烁匕首',
      description: '传送到目标点。',
      hotkey: '2',
      active: { cooldown: 15, manaCost: 0, castRange: 1200 },
      cooldownRemaining: 11.1,
      currentMana: 200,
    })).toContain('当前: 冷却 12s');

    expect(buildItemSlotTitle({
      name: '魔瓶',
      description: '恢复生命和法力。',
      hotkey: '4',
      active: { cooldown: 0, manaCost: 0 },
      cooldownRemaining: 5.5,
      backpackDelayRemaining: 5.5,
      currentMana: 100,
      charges: 2,
    })).toContain('当前: 背包延迟 6s');

    expect(buildItemSlotTitle({
      name: '黑皇杖',
      description: '获得魔法免疫。',
      hotkey: '3',
      active: { cooldown: 90, manaCost: 50 },
      cooldownRemaining: 0,
      currentMana: 25,
    })).toContain('当前: 法力不足 25/50');

    expect(buildItemSlotTitle({
      name: '魔瓶',
      description: '恢复生命和法力。',
      hotkey: '4',
      active: { cooldown: 0, manaCost: 0 },
      cooldownRemaining: 0,
      currentMana: 100,
      charges: 2,
    })).toContain('当前: 就绪 · 2 次');
  });

  it('labels passive items and keeps backpack/sell affordance', () => {
    const title = buildItemSlotTitle({
      name: '锁子甲',
      description: '+5 护甲。',
      hotkey: '5',
      active: null,
      cooldownRemaining: 0,
      currentMana: 100,
      canBackpack: true,
    });
    expect(title).toContain('当前: 被动');
    expect(title).toContain('左键移入背包栏 · 右键出售');
  });

  it('explains backpack empty and occupied slot constraints', () => {
    expect(buildEmptyBackpackSlotTitle()).toBe('背包栏(随身·不提供加成)\n当前: 空槽');

    const title = buildBackpackItemSlotTitle({
      name: '魔瓶',
      description: '恢复生命和法力。',
      charges: 2,
    });
    expect(title).toContain('魔瓶');
    expect(title).toContain('恢复生命和法力。');
    expect(title).toContain('当前: 背包栏 · 无加成 · 2 次');
    expect(title).toContain('点击移入物品栏,移入后 6 秒就绪');
  });
});
