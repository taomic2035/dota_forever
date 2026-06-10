import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { applyDamage } from '../src/sim/combat';
import { REIN } from '../src/data/heroes';
import { V } from '../src/core/vec2';
import type { Unit } from '../src/sim/unit';

const map = new GameMap();

function findBoss(w: ReturnType<typeof createWorld>): Unit | undefined {
  return [...w.units.values()].find((u) => u.kind === 'boss' && u.alive);
}

describe('深渊领主', () => {
  it('spawns at the pit at 0:00', () => {
    const w = createWorld(map, { seed: 25, creeps: true, startTime: -1 });
    for (let i = 0; i < 60; i++) w.step();
    const boss = findBoss(w)!;
    expect(boss).toBeTruthy();
    expect(V.dist(boss.pos, map.pitPos)).toBeLessThan(500);
  });

  it('killer hero receives aegis; boss respawn scheduled 8-11 min', () => {
    const w = createWorld(map, { seed: 25, creeps: true, startTime: -1 });
    for (let i = 0; i < 60; i++) w.step();
    const boss = findBoss(w)!;
    const h = spawnHero(w, REIN, Team.Dawn, w.map.nearestWalkable(V.add(boss.pos, { x: 200, y: 0 })));
    applyDamage(w, boss, { source: h.id, attackType: 'hero', amount: 1e7, flags: { pure: true } });
    expect(boss.alive).toBe(false);
    for (let i = 0; i < 5; i++) w.step();
    expect(h.inventory.some((s) => s?.itemKey === 'aegis')).toBe(true);
    // 复活最早 8 分钟,5 分钟时必然未复活
    while (w.time < 60 * 5) w.step();
    expect(findBoss(w)).toBeUndefined();
  }, 60000);

  it('aegis holder revives in place after 5s, aegis consumed', () => {
    const w = createWorld(map, { seed: 25, creeps: true, startTime: -1 });
    for (let i = 0; i < 60; i++) w.step();
    const boss = findBoss(w)!;
    const h = spawnHero(w, REIN, Team.Dawn, w.map.nearestWalkable(V.add(boss.pos, { x: 200, y: 0 })));
    applyDamage(w, boss, { source: h.id, attackType: 'hero', amount: 1e7, flags: { pure: true } });
    for (let i = 0; i < 5; i++) w.step();
    expect(h.inventory.some((s) => s?.itemKey === 'aegis')).toBe(true);
    // 把英雄挪到中路杀死
    h.pos = w.map.nearestWalkable({ x: 5790, y: 9530 });
    const deathPos = V.clone(h.pos);
    applyDamage(w, h, { source: 0, attackType: 'hero', amount: 1e7, flags: { pure: true } });
    expect(h.alive).toBe(false);
    for (let i = 0; i < 30 * 7; i++) w.step(); // 7 秒
    expect(h.alive).toBe(true);
    expect(V.dist(h.pos, deathPos)).toBeLessThan(300); // 原地复活
    expect(h.inventory.some((s) => s?.itemKey === 'aegis')).toBe(false); // 已消耗
    expect(h.hp).toBeCloseTo(h.calc.maxHp, 0);
  });

  it('boss leashes back to pit and heals', () => {
    const w = createWorld(map, { seed: 25, creeps: true, startTime: -1 });
    for (let i = 0; i < 60; i++) w.step();
    const boss = findBoss(w)!;
    boss.hp = boss.calc.maxHp * 0.3;
    boss.pos = w.map.nearestWalkable({ x: 3600, y: 3600 }); // 上符文点(河道,可达)
    for (let i = 0; i < 30 * 25; i++) w.step();
    expect(V.dist(boss.pos, map.pitPos)).toBeLessThan(300);
    expect(boss.hp / boss.calc.maxHp).toBeGreaterThan(0.9);
  });
});
