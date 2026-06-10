import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { applyDamage } from '../src/sim/combat';
import { addXp } from '../src/sim/economy';
import { XP_TABLE, STARTING_GOLD } from '../src/data/balance';
import type { World } from '../src/sim/world';
import type { Unit, UnitStats } from '../src/sim/unit';

const map = new GameMap();

function stats(over: Partial<UnitStats> = {}): UnitStats {
  return {
    maxHp: 550, hpRegen: 0, maxMp: 100, mpRegen: 0,
    dmgMin: 60, dmgMax: 60, attackType: 'hero', armorType: 'hero',
    armor: 0, magicResist: 0.25, attackRange: 150, attackPoint: 0.3,
    bat: 1.7, projectileSpeed: 0, moveSpeed: 300, collisionRadius: 24,
    visionDay: 1800, visionNight: 800, acquireRange: 500,
    bountyMin: 40, bountyMax: 40, xpBounty: 60,
    ...over,
  };
}

function mk(w: World, kind: 'hero' | 'creep', team: Team, x: number, y: number, over: Partial<UnitStats> = {}): Unit {
  return w.spawnUnit({ kind, team, pos: { x, y }, name: kind, stats: stats(over) });
}

describe('economy', () => {
  it('hero starts with 603 gold and earns periodic gold', () => {
    const w = createWorld(map, { seed: 3, noBuildings: true, startTime: 0 });
    const h = mk(w, 'hero', Team.Dawn, 7000, 8000);
    expect(h.heroMeta!.gold).toBe(STARTING_GOLD);
    for (let i = 0; i < 250; i++) w.step(); // 8.33 秒 → 10 次工资(容浮点边界)
    expect(h.heroMeta!.gold).toBe(STARTING_GOLD + 10);
  });

  it('last hit grants bounty and counts', () => {
    const w = createWorld(map, { seed: 3, noBuildings: true, startTime: 0 });
    const h = mk(w, 'hero', Team.Dawn, 7000, 8000);
    const c = mk(w, 'creep', Team.Night, 7100, 8000, { dmgMin: 0, dmgMax: 0, maxHp: 100 });
    const goldBefore = h.heroMeta!.gold;
    h.issueOrder({ type: 'attack', targetId: c.id });
    for (let i = 0; i < 300 && c.alive; i++) w.step();
    expect(c.alive).toBe(false);
    w.step();
    expect(h.heroMeta!.gold - goldBefore).toBeGreaterThanOrEqual(40 - 8); // 扣除工资误差,赏金 40
    expect(h.heroMeta!.lastHits).toBe(1);
    expect(h.heroMeta!.xp).toBeCloseTo(60, 5);
  });

  it('deny: no gold, halved xp to enemies in range only', () => {
    const w = createWorld(map, { seed: 3, noBuildings: true, startTime: 0 });
    const h = mk(w, 'hero', Team.Dawn, 7000, 8000);          // 反补者
    const enemyNear = mk(w, 'hero', Team.Night, 7400, 8000); // 圈内敌人
    const enemyFar = mk(w, 'hero', Team.Night, 11000, 4000); // 圈外敌人
    const own = mk(w, 'creep', Team.Dawn, 7100, 8000, { dmgMin: 0, dmgMax: 0, maxHp: 1000 });
    own.hp = 300; // <50%
    const goldBefore = h.heroMeta!.gold;
    h.issueOrder({ type: 'attack', targetId: own.id });
    for (let i = 0; i < 600 && own.alive; i++) w.step();
    expect(own.alive).toBe(false);
    expect(h.heroMeta!.denies).toBe(1);
    expect(h.heroMeta!.gold - goldBefore).toBeLessThanOrEqual(30); // 只有工资,无赏金
    expect(enemyNear.heroMeta!.xp).toBeCloseTo(30, 5); // 60 × 0.5
    expect(enemyFar.heroMeta!.xp).toBe(0);
    expect(h.heroMeta!.xp).toBe(0); // 反补己方不吃经验
  });

  it('cannot deny healthy own creep', () => {
    const w = createWorld(map, { seed: 3, noBuildings: true, startTime: 0 });
    const h = mk(w, 'hero', Team.Dawn, 7000, 8000);
    const own = mk(w, 'creep', Team.Dawn, 7100, 8000, { dmgMin: 0, dmgMax: 0, maxHp: 1000 });
    h.issueOrder({ type: 'attack', targetId: own.id });
    w.step();
    expect(h.order).toBeNull(); // 指令被拒绝
    expect(own.hp).toBe(1000);
  });

  it('xp shared equally among nearby heroes', () => {
    const w = createWorld(map, { seed: 3, noBuildings: true, startTime: 0 });
    const h1 = mk(w, 'hero', Team.Dawn, 7000, 8000);
    const h2 = mk(w, 'hero', Team.Dawn, 7200, 8000);
    const c = mk(w, 'creep', Team.Night, 7100, 8000, { dmgMin: 0, dmgMax: 0, maxHp: 60 });
    h1.issueOrder({ type: 'attack', targetId: c.id });
    for (let i = 0; i < 300 && c.alive; i++) w.step();
    expect(h1.heroMeta!.xp).toBeCloseTo(30, 5);
    expect(h2.heroMeta!.xp).toBeCloseTo(30, 5);
  });

  it('level ups follow XP_TABLE and grant skill points', () => {
    const w = createWorld(map, { seed: 3, noBuildings: true, startTime: 0 });
    const h = mk(w, 'hero', Team.Dawn, 7000, 8000);
    expect(h.level).toBe(1);
    expect(h.heroMeta!.skillPoints).toBe(1);
    addXp(w, h, XP_TABLE[0]);
    expect(h.level).toBe(2);
    expect(h.heroMeta!.skillPoints).toBe(2);
    addXp(w, h, XP_TABLE[3] - XP_TABLE[0]);
    expect(h.level).toBe(5);
    expect(h.heroMeta!.skillPoints).toBe(5);
  });

  it('hero kill: bounty, death gold loss, streak bookkeeping', () => {
    const w = createWorld(map, { seed: 3, noBuildings: true, startTime: 0 });
    const killer = mk(w, 'hero', Team.Dawn, 7000, 8000, { dmgMin: 500, dmgMax: 500 });
    const victim = mk(w, 'hero', Team.Night, 7100, 8000, { dmgMin: 0, dmgMax: 0, maxHp: 400 });
    victim.level = 5;
    const vGold = victim.heroMeta!.gold;
    const kGold = killer.heroMeta!.gold;
    killer.issueOrder({ type: 'attack', targetId: victim.id });
    for (let i = 0; i < 120 && victim.alive; i++) w.step();
    expect(victim.alive).toBe(false);
    expect(killer.heroMeta!.kills).toBe(1);
    expect(killer.heroMeta!.streak).toBe(1);
    expect(victim.heroMeta!.deaths).toBe(1);
    expect(killer.heroMeta!.gold - kGold).toBeGreaterThanOrEqual(245 - 5); // 200+9×5=245
    expect(vGold - victim.heroMeta!.gold).toBeGreaterThanOrEqual(150 - 5); // 30×5
    expect(victim.heroMeta!.respawnAt).toBeGreaterThan(w.time);
  });
});
