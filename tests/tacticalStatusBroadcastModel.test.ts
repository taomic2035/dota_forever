import { describe, expect, it } from 'vitest';
import {
  bossStatusBroadcastLabel,
  buybackStatusBroadcastLabel,
  gameClockBroadcastLabel,
  glyphStatusBroadcastLabel,
  resourceStatusBroadcastLabel,
  runeStatusBroadcastLabel,
} from '../src/ui/tacticalStatusBroadcastModel';

describe('tacticalStatusBroadcastModel', () => {
  it('formats game clock broadcasts with day and night state', () => {
    expect(gameClockBroadcastLabel({ time: 754.2, isNight: false })).toBe('时间 12:34 · 白昼');
    expect(gameClockBroadcastLabel({ time: -8.1, isNight: true })).toBe('时间 -0:08 · 夜晚');
  });

  it('formats health and mana resources with exact and percent values', () => {
    expect(resourceStatusBroadcastLabel({
      hp: 640,
      maxHp: 1_000,
      mp: 95,
      maxMp: 300,
    })).toBe('资源: 生命 640/1000 (64%) · 法力 95/300 (32%)');
  });

  it('formats glyph ready and cooldown states', () => {
    expect(glyphStatusBroadcastLabel({ readyIn: 0 })).toBe('守护符文: 就绪');
    expect(glyphStatusBroadcastLabel({ readyIn: 83 })).toBe('守护符文: 冷却 1:23');
  });

  it('formats rune objective broadcasts with active rune names or next wave', () => {
    expect(runeStatusBroadcastLabel({
      activeRunes: [{ type: 'haste' }, { type: 'bounty' }],
      readyIn: 57,
    })).toBe('神符: 已刷新 极速 / 赏金');

    expect(runeStatusBroadcastLabel({
      activeRunes: [],
      readyIn: 83,
    })).toBe('神符: 下波 1:23');
  });

  it('formats boss objective broadcasts for alive, respawn, and unknown states', () => {
    expect(bossStatusBroadcastLabel({ active: true, alive: true, respawnIn: 0 })).toBe('Boss: 在世');
    expect(bossStatusBroadcastLabel({ active: true, alive: false, respawnIn: 185 })).toBe('Boss: 重生 3:05');
    expect(bossStatusBroadcastLabel({ active: false, alive: false, respawnIn: 0 })).toBe('Boss: 状态未知');
  });

  it('formats buyback state without pretending alive heroes need it', () => {
    expect(buybackStatusBroadcastLabel({
      alive: true,
      gold: 1_500,
      cost: 1_200,
      cooldownRemaining: 0,
    })).toBe('买活: 英雄存活');

    expect(buybackStatusBroadcastLabel({
      alive: false,
      gold: 1_500,
      cost: 1_200,
      cooldownRemaining: 0,
    })).toBe('买活: 就绪 · 需要 1200 金');

    expect(buybackStatusBroadcastLabel({
      alive: false,
      gold: 900,
      cost: 1_200,
      cooldownRemaining: 0,
    })).toBe('买活: 金币不足 900/1200');

    expect(buybackStatusBroadcastLabel({
      alive: false,
      gold: 2_000,
      cost: 1_200,
      cooldownRemaining: 95,
    })).toBe('买活: 冷却 1:35');
  });
});
