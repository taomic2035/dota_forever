import { describe, it, expect } from 'vitest';
import { separationOffsets, collisionSystem, collides, MAX_SEPARATION_PER_TICK, type Collider } from '../src/sim/collision';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { applyModifier } from '../src/sim/modifiers';
import { V } from '../src/core/vec2';
import type { World } from '../src/sim/world';
import type { Unit, UnitStats, UnitKind } from '../src/sim/unit';

const map = new GameMap();

function stats(over: Partial<UnitStats> = {}): UnitStats {
  return {
    maxHp: 600, hpRegen: 0, maxMp: 0, mpRegen: 0,
    dmgMin: 50, dmgMax: 50, attackType: 'hero', armorType: 'hero',
    armor: 0, magicResist: 0, attackRange: 150, attackPoint: 0.3,
    bat: 1.7, projectileSpeed: 0, moveSpeed: 300, collisionRadius: 24,
    visionDay: 1800, visionNight: 800, acquireRange: 500,
    bountyMin: 0, bountyMax: 0, xpBounty: 0, ...over,
  };
}

// 地图中央开阔地,避免撞墙干扰分离断言。
const C = { x: 7000, y: 7000 };

function spawn(w: World, kind: UnitKind, x: number, y: number, r = 24): Unit {
  return w.spawnUnit({ kind, team: Team.Dawn, pos: { x, y }, name: 'u', stats: stats({ collisionRadius: r }) });
}

describe('separationOffsets (纯函数:碰撞分离位移)', () => {
  it('未重叠的单位无位移', () => {
    const cs: Collider[] = [
      { id: 1, pos: { x: 0, y: 0 }, r: 24 },
      { id: 2, pos: { x: 100, y: 0 }, r: 24 }, // dist 100 > rsum 48
    ];
    expect(separationOffsets(cs).size).toBe(0);
  });

  it('一对重叠单位获得等大反向、各分担一半 overlap 的位移', () => {
    // dist 10, rsum 48 → overlap 38;各分担 19,沿 x 轴反向
    const cs: Collider[] = [
      { id: 1, pos: { x: 0, y: 0 }, r: 24 },
      { id: 2, pos: { x: 10, y: 0 }, r: 24 },
    ];
    const off = separationOffsets(cs);
    const a = off.get(1)!;
    const b = off.get(2)!;
    expect(a.x).toBeCloseTo(-19, 5); // id1 在左,被推向 -x
    expect(b.x).toBeCloseTo(19, 5);  // id2 在右,被推向 +x
    expect(a.y).toBeCloseTo(0, 5);
    // 合计分离 = overlap(两边相加正好分开 overlap)
    expect(b.x - a.x).toBeCloseTo(38, 5);
  });

  it('完全重叠(同点)按 id 派生确定性方向散开,且非零', () => {
    const cs: Collider[] = [
      { id: 1, pos: { x: 5000, y: 5000 }, r: 24 },
      { id: 2, pos: { x: 5000, y: 5000 }, r: 24 },
    ];
    const off = separationOffsets(cs);
    const a = off.get(1)!;
    const b = off.get(2)!;
    expect(Math.hypot(a.x, a.y)).toBeGreaterThan(0);
    expect(Math.hypot(b.x, b.y)).toBeGreaterThan(0);
    // 不同 id → 不同方向(不应完全同向)
    expect(a.x === b.x && a.y === b.y).toBe(false);
  });

  it('结果与输入顺序无关(确定性)', () => {
    const base: Collider[] = [
      { id: 1, pos: { x: 0, y: 0 }, r: 24 },
      { id: 2, pos: { x: 20, y: 0 }, r: 24 },
      { id: 3, pos: { x: 10, y: 15 }, r: 24 },
    ];
    const a = separationOffsets(base);
    const b = separationOffsets([base[2], base[0], base[1]]); // 打乱顺序
    for (const id of [1, 2, 3]) {
      expect(b.get(id)!.x).toBeCloseTo(a.get(id)!.x, 9);
      expect(b.get(id)!.y).toBeCloseTo(a.get(id)!.y, 9);
    }
  });
});

describe('collisionSystem (集成:世界内 body-block)', () => {
  it('两个重叠的英雄被推开至互不重叠', () => {
    const w = createWorld(map, { seed: 1, noBuildings: true, startTime: 0 });
    const a = spawn(w, 'hero', C.x, C.y);
    const b = spawn(w, 'hero', C.x + 12, C.y); // overlap 36
    expect(V.dist(a.pos, b.pos)).toBeLessThan(48);
    for (let i = 0; i < 5; i++) collisionSystem(w);
    // 分离至 ≥ 两半径和(允许极小数值误差)
    expect(V.dist(a.pos, b.pos)).toBeGreaterThanOrEqual(48 - 1e-6);
  });

  it('phased 单位穿越:既不被推也不推开他人', () => {
    const w = createWorld(map, { seed: 1, noBuildings: true, startTime: 0 });
    const ghost = spawn(w, 'hero', C.x, C.y);
    const solid = spawn(w, 'hero', C.x + 5, C.y);
    applyModifier(w, ghost, { key: 'test_phase', duration: 99, isBuff: true, states: { phased: true } }, ghost.id);
    expect(collides(ghost)).toBe(false);
    const ghostBefore = V.clone(ghost.pos);
    const solidBefore = V.clone(solid.pos);
    for (let i = 0; i < 5; i++) collisionSystem(w);
    // 二者皆不动(solid 唯一邻居是 phased 的 ghost,被排除 → 无推力)
    expect(V.dist(ghost.pos, ghostBefore)).toBeCloseTo(0, 6);
    expect(V.dist(solid.pos, solidBefore)).toBeCloseTo(0, 6);
  });

  it('守卫(ward)不参与碰撞', () => {
    const w = createWorld(map, { seed: 1, noBuildings: true, startTime: 0 });
    const ward = spawn(w, 'ward', C.x, C.y, 16);
    const hero = spawn(w, 'hero', C.x + 5, C.y);
    expect(collides(ward)).toBe(false);
    const wardBefore = V.clone(ward.pos);
    const heroBefore = V.clone(hero.pos);
    for (let i = 0; i < 5; i++) collisionSystem(w);
    expect(V.dist(ward.pos, wardBefore)).toBeCloseTo(0, 6);
    expect(V.dist(hero.pos, heroBefore)).toBeCloseTo(0, 6);
  });

  it('单 tick 位移不超过上限(密集堆叠不爆炸)', () => {
    const w = createWorld(map, { seed: 1, noBuildings: true, startTime: 0 });
    const units: Unit[] = [];
    for (let i = 0; i < 6; i++) units.push(spawn(w, 'creep', C.x, C.y, 22)); // 6 个完全重叠
    const before = units.map((u) => V.clone(u.pos));
    collisionSystem(w);
    for (let i = 0; i < units.length; i++) {
      expect(V.dist(units[i].pos, before[i])).toBeLessThanOrEqual(MAX_SEPARATION_PER_TICK + 1e-6);
    }
  });
});
