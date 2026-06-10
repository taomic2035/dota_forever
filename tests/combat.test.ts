import { describe, it, expect, beforeEach } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { applyDamage } from '../src/sim/combat';
import type { World } from '../src/sim/world';
import type { Unit, UnitStats } from '../src/sim/unit';

const map = new GameMap();

function stats(over: Partial<UnitStats> = {}): UnitStats {
  return {
    maxHp: 500, hpRegen: 0, maxMp: 0, mpRegen: 0,
    dmgMin: 50, dmgMax: 50, attackType: 'hero', armorType: 'hero',
    armor: 0, magicResist: 0.25, attackRange: 128, attackPoint: 0.45,
    bat: 1.7, projectileSpeed: 0, moveSpeed: 300, collisionRadius: 24,
    visionDay: 1800, visionNight: 800, acquireRange: 500,
    bountyMin: 100, bountyMax: 100, xpBounty: 50,
    ...over,
  };
}

let w: World;
beforeEach(() => {
  w = createWorld(map, { seed: 99, noBuildings: true });
});

function spawn(team: Team, x: number, y: number, over: Partial<UnitStats> = {}, kind: 'hero' | 'creep' = 'creep'): Unit {
  return w.spawnUnit({ kind, team, pos: { x, y }, name: 't', stats: stats(over) });
}

describe('attack cycle', () => {
  it('melee kills 500hp dummy in ~10 hits of BAT 1.7', () => {
    const a = spawn(Team.Dawn, 7000, 8000);
    const b = spawn(Team.Night, 7080, 8000, { dmgMin: 0, dmgMax: 0 });
    a.issueOrder({ type: 'attack', targetId: b.id });
    let ticks = 0;
    while (b.alive && ticks < 1000) { w.step(); ticks++; }
    expect(b.alive).toBe(false);
    // 首击 0.765s + 9×1.7s ≈ 16.07s ≈ 483 ticks(±容差)
    expect(ticks).toBeGreaterThan(420);
    expect(ticks).toBeLessThan(560);
  });

  it('armor reduces physical damage by formula', () => {
    const a = spawn(Team.Dawn, 7000, 8000);
    const b = spawn(Team.Night, 7080, 8000, { dmgMin: 0, dmgMax: 0, armor: 5 });
    a.issueOrder({ type: 'attack', targetId: b.id });
    while (b.hp >= 500 && w.tick < 200) w.step();
    // 50 × (1 − 0.2308) = 38.46
    expect(500 - b.hp).toBeCloseTo(38.46, 1);
  });

  it('ranged attack travels as projectile with flight time', () => {
    const a = spawn(Team.Dawn, 7000, 8000, { attackRange: 600, projectileSpeed: 900 });
    const b = spawn(Team.Night, 7500, 8000, { dmgMin: 0, dmgMax: 0 });
    a.issueOrder({ type: 'attack', targetId: b.id });
    let launchTick = -1, hitTick = -1;
    for (let i = 0; i < 300 && hitTick < 0; i++) {
      w.step();
      for (const e of w.events) {
        if (e.kind === 'attack_launched' && launchTick < 0) launchTick = w.tick;
        if (e.kind === 'unit_damaged' && hitTick < 0) hitTick = w.tick;
      }
    }
    expect(launchTick).toBeGreaterThan(0);
    expect(hitTick).toBeGreaterThan(launchTick);
    // 飞行 ≈ (500−碰撞半径)/900 ≈ 0.53s ≈ 16 ticks;前摇 0.765s≈23 ticks → 总 ≈ 39
    const total = hitTick - launchTick;
    expect(total).toBeGreaterThan(28);
    expect(total).toBeLessThan(55);
  });

  it('projectile fizzles when target dies mid-flight', () => {
    const a = spawn(Team.Dawn, 7000, 8000, { attackRange: 600, projectileSpeed: 200 });
    const b = spawn(Team.Night, 7500, 8000, { dmgMin: 0, dmgMax: 0 });
    a.issueOrder({ type: 'attack', targetId: b.id });
    // 等弹道出手
    for (let i = 0; i < 200 && w.projectiles.length === 0; i++) w.step();
    expect(w.projectiles.length).toBeGreaterThan(0);
    applyDamage(w, b, { source: a.id, attackType: 'hero', amount: 9999, flags: { pure: true } });
    expect(b.alive).toBe(false);
    const before = w.units.size;
    for (let i = 0; i < 60; i++) w.step();
    expect(w.projectiles.length).toBe(0); // 作废
    expect(w.units.size).toBeLessThanOrEqual(before);
  });

  it('attackmove acquires enemies on the way', () => {
    const a = spawn(Team.Dawn, 7000, 8000);
    const b = spawn(Team.Night, 7400, 8000, { dmgMin: 0, dmgMax: 0 });
    a.issueOrder({ type: 'attackmove', pos: { x: 8200, y: 8000 } });
    for (let i = 0; i < 600 && b.alive; i++) w.step();
    expect(b.alive).toBe(false);
  });
});

describe('damage types', () => {
  it('spell damage reduced by magic resist on heroes', () => {
    const b = spawn(Team.Night, 7000, 8000, {}, 'hero');
    const dealt = applyDamage(w, b, { source: 0, attackType: 'spell', amount: 100, flags: { spell: true } });
    expect(dealt).toBeCloseTo(75, 5);
  });
  it('buildings immune to spells', () => {
    const b = spawn(Team.Night, 7000, 8000, { armorType: 'fortified' });
    const dealt = applyDamage(w, b, { source: 0, attackType: 'spell', amount: 100, flags: { spell: true } });
    expect(dealt).toBe(0);
  });
  it('pure damage ignores armor and resist', () => {
    const b = spawn(Team.Night, 7000, 8000, { armor: 20 });
    const dealt = applyDamage(w, b, { source: 0, attackType: 'hero', amount: 100, flags: { pure: true } });
    expect(dealt).toBe(100);
  });
  it('hero attack does half damage to fortified', () => {
    const b = spawn(Team.Night, 7000, 8000, { armorType: 'fortified', armor: 0 });
    const dealt = applyDamage(w, b, { source: 0, attackType: 'hero', amount: 100 });
    expect(dealt).toBeCloseTo(50, 5);
  });
  it('uphill attacks can miss at 25%', () => {
    // 攻击者在河道(0),目标在高台(2)
    const a = spawn(Team.Dawn, 7520, 7520); // 河道
    const b = spawn(Team.Night, 2000, 13000, { dmgMin: 0, dmgMax: 0, maxHp: 100000 }); // 晨曦高台当目标
    let missed = 0, hits = 0;
    for (let i = 0; i < 2000; i++) {
      const dealt = applyDamage(w, b, { source: a.id, attackType: 'hero', amount: 1 });
      if (dealt === 0) missed++; else hits++;
    }
    expect(missed / (missed + hits)).toBeGreaterThan(0.18);
    expect(missed / (missed + hits)).toBeLessThan(0.32);
  });
});
