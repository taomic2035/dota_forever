import { describe, expect, it } from 'vitest';
import { abilityStatusBroadcastLabel, itemStatusBroadcastLabel } from '../src/ui/statusBroadcastModel';

describe('status broadcast model', () => {
  it('labels unlearned abilities before other checks', () => {
    expect(abilityStatusBroadcastLabel({
      name: '火球',
      hotkey: 'Q',
      learned: false,
      passive: false,
      cooldownRemaining: 12,
      manaCost: 100,
      currentMana: 0,
    })).toBe('Q 火球: 未学习');
  });

  it('labels passive abilities', () => {
    expect(abilityStatusBroadcastLabel({
      name: '余震',
      hotkey: 'W',
      learned: true,
      passive: true,
      cooldownRemaining: 0,
      manaCost: 0,
      currentMana: 220,
    })).toBe('W 余震: 被动');
  });

  it('labels learned autocast and toggle ability states before generic passive', () => {
    expect(abilityStatusBroadcastLabel({
      name: '霜寒之箭',
      hotkey: 'Q',
      learned: true,
      passive: true,
      cooldownRemaining: 0,
      manaCost: 0,
      currentMana: 220,
      autocastOn: true,
    })).toBe('Q 霜寒之箭: AUTO ON');

    expect(abilityStatusBroadcastLabel({
      name: '燃烧姿态',
      hotkey: 'E',
      learned: true,
      passive: true,
      cooldownRemaining: 0,
      manaCost: 0,
      currentMana: 220,
      toggleOn: false,
    })).toBe('E 燃烧姿态: OFF');
  });

  it('labels ability cooldown and no-mana states before ready', () => {
    expect(abilityStatusBroadcastLabel({
      name: '闪烁',
      hotkey: 'E',
      learned: true,
      passive: false,
      cooldownRemaining: 7.2,
      manaCost: 60,
      currentMana: 200,
    })).toBe('E 闪烁: 冷却 8s');

    expect(abilityStatusBroadcastLabel({
      name: '神力',
      hotkey: 'R',
      learned: true,
      passive: false,
      cooldownRemaining: 0,
      manaCost: 100,
      currentMana: 30,
    })).toBe('R 神力: 法力不足 30/100');
  });

  it('labels ready abilities', () => {
    expect(abilityStatusBroadcastLabel({
      name: '火球',
      hotkey: 'Q',
      learned: true,
      passive: false,
      cooldownRemaining: 0,
      manaCost: 90,
      currentMana: 160,
    })).toBe('Q 火球: 就绪');
  });

  it('labels empty, passive, cooldown, mana and charged item slots', () => {
    expect(itemStatusBroadcastLabel({ hotkey: '1', empty: true, cooldownRemaining: 0, hasActive: false }))
      .toBe('1: 空槽');

    expect(itemStatusBroadcastLabel({ hotkey: '2', name: '闪烁匕首', cooldownRemaining: 11.1, hasActive: true }))
      .toBe('2 闪烁匕首: 冷却 12s');

    expect(itemStatusBroadcastLabel({
      hotkey: '3',
      name: '黑皇杖',
      cooldownRemaining: 0,
      hasActive: true,
      manaCost: 50,
      currentMana: 25,
    })).toBe('3 黑皇杖: 法力不足 25/50');

    expect(itemStatusBroadcastLabel({ hotkey: '4', name: '魔瓶', cooldownRemaining: 0, hasActive: true, charges: 2 }))
      .toBe('4 魔瓶: 就绪 · 2 次');

    expect(itemStatusBroadcastLabel({ hotkey: '5', name: '锁子甲', cooldownRemaining: 0, hasActive: false }))
      .toBe('5 锁子甲: 被动');
  });
});
