import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { isVisibleTo, cellVisible } from '../src/sim/vision';
import { applyModifier } from '../src/sim/modifiers';
import { acquireTarget } from '../src/sim/combat';
import type { UnitStats } from '../src/sim/unit';

const map = new GameMap();

function stats(over: Partial<UnitStats> = {}): UnitStats {
  return {
    maxHp: 500, hpRegen: 0, maxMp: 0, mpRegen: 0, dmgMin: 50, dmgMax: 50,
    attackType: 'hero', armorType: 'hero', armor: 0, magicResist: 0.25,
    attackRange: 600, attackPoint: 0.4, bat: 1.7, projectileSpeed: 900,
    moveSpeed: 300, collisionRadius: 24, visionDay: 1200, visionNight: 800,
    acquireRange: 600, bountyMin: 0, bountyMax: 0, xpBounty: 0,
    ...over,
  };
}

describe('vision', () => {
  it('sees nearby cells, not far cells', () => {
    const w = createWorld(map, { seed: 16, noBuildings: true });
    w.spawnUnit({ kind: 'hero', team: Team.Dawn, pos: { x: 7520, y: 7520 }, name: 'a', stats: stats() });
    for (let i = 0; i < 10; i++) w.step();
    expect(cellVisible(w, Team.Dawn, { x: 7700, y: 7700 })).toBe(true);
    expect(cellVisible(w, Team.Dawn, { x: 11000, y: 11000 })).toBe(false);
  });

  it('lowground cannot see highground; highground sees lowground', () => {
    const w = createWorld(map, { seed: 16, noBuildings: true });
    // 河道(高度0)单位 vs 晨曦高台(高度2)上的点
    w.spawnUnit({ kind: 'hero', team: Team.Dawn, pos: { x: 3000, y: 12000 }, name: 'low', stats: stats({ visionDay: 2000 }) }); // 高台边缘外平地(高度1)
    for (let i = 0; i < 10; i++) w.step();
    // 平地看不到高台内部
    expect(cellVisible(w, Team.Dawn, { x: 2000, y: 13000 })).toBe(false);
    // 高台上的单位看得到平地
    const w2 = createWorld(map, { seed: 16, noBuildings: true });
    w2.spawnUnit({ kind: 'hero', team: Team.Night, pos: { x: 2000, y: 13000 }, name: 'high', stats: stats({ visionDay: 2000 }) });
    for (let i = 0; i < 10; i++) w2.step();
    expect(cellVisible(w2, Team.Night, { x: 3000, y: 12200 })).toBe(true);
  });

  it('night shrinks vision radius', () => {
    // 平地(高度1)中路走廊上,目标点同高度
    const eye = { x: 5790, y: 9530 };
    const mark = { x: 6500, y: 8820 }; // 沿中路方向 ~1000 距离
    // 夜晚窗口(5:10)
    const wNight = createWorld(map, { seed: 16, noBuildings: true, startTime: 310 });
    wNight.spawnUnit({ kind: 'hero', team: Team.Dawn, pos: eye, name: 'a', stats: stats({ visionDay: 1800, visionNight: 800 }) });
    for (let i = 0; i < 10; i++) wNight.step();
    expect(wNight.isNight).toBe(true);
    expect(cellVisible(wNight, Team.Dawn, mark)).toBe(false); // 夜里 800 看不到 ~1000 外
    // 白昼窗口(0:30)
    const wDay = createWorld(map, { seed: 16, noBuildings: true, startTime: 30 });
    wDay.spawnUnit({ kind: 'hero', team: Team.Dawn, pos: eye, name: 'a', stats: stats({ visionDay: 1800, visionNight: 800 }) });
    for (let i = 0; i < 10; i++) wDay.step();
    expect(cellVisible(wDay, Team.Dawn, mark)).toBe(true);
  });

  it('river (height 0) cannot see the banks (height 1) — classic river vision', () => {
    const w = createWorld(map, { seed: 16, noBuildings: true });
    w.spawnUnit({ kind: 'hero', team: Team.Dawn, pos: { x: 7520, y: 7520 }, name: 'r', stats: stats({ visionDay: 1800 }) });
    for (let i = 0; i < 10; i++) w.step();
    expect(cellVisible(w, Team.Dawn, { x: 8520, y: 7520 })).toBe(false); // 岸上
    expect(cellVisible(w, Team.Dawn, { x: 7800, y: 7800 })).toBe(true); // 河道内
  });

  it('invisible unit hidden unless true sight', () => {
    const w = createWorld(map, { seed: 16, noBuildings: true });
    const viewer = w.spawnUnit({ kind: 'hero', team: Team.Dawn, pos: { x: 7520, y: 7520 }, name: 'v', stats: stats() });
    const sneak = w.spawnUnit({ kind: 'hero', team: Team.Night, pos: { x: 7700, y: 7520 }, name: 's', stats: stats() });
    applyModifier(w, sneak, { key: 'invis', duration: 99, states: { invisible: true } }, sneak.id);
    for (let i = 0; i < 10; i++) w.step();
    expect(isVisibleTo(w, Team.Dawn, sneak)).toBe(false);
    expect(acquireTarget(w, viewer)).toBeUndefined(); // 不可获取
    // 给观察者真视
    applyModifier(w, viewer, { key: 'gem', stats: { trueSightRadius: 900 } }, viewer.id);
    for (let i = 0; i < 10; i++) w.step();
    expect(isVisibleTo(w, Team.Dawn, sneak)).toBe(true);
  });

  it('enemy in fog cannot be acquired', () => {
    const w = createWorld(map, { seed: 16, noBuildings: true });
    const a = w.spawnUnit({ kind: 'hero', team: Team.Dawn, pos: { x: 7520, y: 7520 }, name: 'a', stats: stats({ acquireRange: 3000, visionDay: 600 }) });
    const far = w.spawnUnit({ kind: 'hero', team: Team.Night, pos: { x: 8800, y: 7520 }, name: 'f', stats: stats() });
    for (let i = 0; i < 10; i++) w.step();
    // 在获取范围内但视野外
    expect(isVisibleTo(w, Team.Dawn, far)).toBe(false);
    expect(acquireTarget(w, a)).toBeUndefined();
  });
});
