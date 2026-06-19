import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { installNeutralItems, unlockedTier, holdsNeutralItem } from '../src/sim/neutralItems';
import { grantItem } from '../src/sim/items';
import { kill } from '../src/sim/combat';
import type { Unit, UnitStats } from '../src/sim/unit';
import type { World } from '../src/sim/world';
import { itemDef } from '../src/data/items';

const map = new GameMap();
function stats(over: Partial<UnitStats> = {}): UnitStats {
  return {
    maxHp: 500, hpRegen: 0, maxMp: 200, mpRegen: 0, dmgMin: 50, dmgMax: 50,
    attackType: 'hero', armorType: 'hero', armor: 0, magicResist: 0.25, attackRange: 128,
    attackPoint: 0.45, bat: 1.7, projectileSpeed: 0, moveSpeed: 300, collisionRadius: 24,
    visionDay: 1800, visionNight: 800, acquireRange: 500, bountyMin: 0, bountyMax: 0, xpBounty: 0, ...over,
  };
}

describe('unlockedTier', () => {
  it('按时间分层:<18min=1,18-33=2,≥33=3', () => {
    expect(unlockedTier(0)).toBe(1);
    expect(unlockedTier(17 * 60)).toBe(1);
    expect(unlockedTier(18 * 60)).toBe(2);
    expect(unlockedTier(32 * 60)).toBe(2);
    expect(unlockedTier(33 * 60)).toBe(3);
  });
});

describe('holdsNeutralItem', () => {
  it('持有中立物品 → true;否则 false', () => {
    const w = createWorld(map, { seed: 7, startTime: 360 });
    const h = w.spawnUnit({ kind: 'hero', team: Team.Dawn, pos: { x: 7000, y: 8000 }, name: 'h', stats: stats() });
    expect(holdsNeutralItem(h)).toBe(false);
    grantItem(w, h, 'nt_whetstone');
    expect(holdsNeutralItem(h)).toBe(true);
    // 普通物品不算
    const w2 = createWorld(map, { seed: 7, startTime: 360 });
    const h2 = w2.spawnUnit({ kind: 'hero', team: Team.Dawn, pos: { x: 7000, y: 8000 }, name: 'h', stats: stats() });
    grantItem(w2, h2, 'boots');
    expect(holdsNeutralItem(h2)).toBe(false);
  });
});

describe('中立物品掉落系统', () => {
  function killNeutralBy(w: World, killer: Unit): void {
    const n = w.spawnUnit({ kind: 'neutral', team: Team.Neutral, pos: { x: killer.pos.x + 50, y: killer.pos.y }, name: '野怪', stats: stats({ maxHp: 1 }) });
    kill(w, n, killer.id); // emit unit_died(killer)
    w.step(); // 系统消费事件
  }

  it('英雄击杀野怪(>5min)最终掉落中立物品,且每英雄上限 1 件', () => {
    const w = createWorld(map, { seed: 123, startTime: 360 }); // 6min,无 creeps → 手动装系统
    installNeutralItems(w);
    const h = w.spawnUnit({ kind: 'hero', team: Team.Dawn, pos: { x: 7000, y: 8000 }, name: 'h', stats: stats() });
    for (let i = 0; i < 120; i++) killNeutralBy(w, h);
    const neutralCount = [...h.inventory, ...h.backpack, ...h.stash]
      .filter((s) => s && itemDef(s.itemKey).neutral).length;
    expect(neutralCount).toBe(1); // 掉到了 + 上限 1 件(120 次 @12% 近乎必中)
  });

  it('开局 5min 内不掉落', () => {
    const w = createWorld(map, { seed: 123, startTime: 60 }); // 1min
    installNeutralItems(w);
    const h = w.spawnUnit({ kind: 'hero', team: Team.Dawn, pos: { x: 7000, y: 8000 }, name: 'h', stats: stats() });
    for (let i = 0; i < 120; i++) killNeutralBy(w, h);
    const neutralCount = [...h.inventory, ...h.backpack, ...h.stash].filter((s) => s && itemDef(s.itemKey).neutral).length;
    expect(neutralCount).toBe(0);
  });
});
