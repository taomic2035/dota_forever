import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { World } from '../src/sim/world';
import { V } from '../src/core/vec2';
import type { UnitStats } from '../src/sim/unit';

const TEST_STATS: UnitStats = {
  maxHp: 500, hpRegen: 2, maxMp: 200, mpRegen: 1,
  dmgMin: 40, dmgMax: 50, attackType: 'hero', armorType: 'hero',
  armor: 2, magicResist: 0.25, attackRange: 128, attackPoint: 0.45,
  bat: 1.7, projectileSpeed: 0, moveSpeed: 300, collisionRadius: 24,
  visionDay: 1800, visionNight: 800, acquireRange: 500,
  bountyMin: 100, bountyMax: 100, xpBounty: 50,
};

describe('world movement', () => {
  it('unit walks to ordered position', () => {
    const map = new GameMap();
    const w = new World(map, 42);
    const u = w.spawnUnit({ kind: 'hero', team: Team.Dawn, pos: { x: 7000, y: 8200 }, name: 't', stats: TEST_STATS });
    const goal = { x: 8200, y: 7000 };
    u.issueOrder({ type: 'move', pos: goal });
    for (let i = 0; i < 300; i++) w.step();
    expect(V.dist(u.pos, goal)).toBeLessThan(80);
  });

  it('regen ticks up hp/mp', () => {
    const map = new GameMap();
    const w = new World(map, 42);
    const u = w.spawnUnit({ kind: 'hero', team: Team.Dawn, pos: { x: 7000, y: 8200 }, name: 't', stats: TEST_STATS });
    u.hp = 100; u.mp = 50;
    for (let i = 0; i < 30; i++) w.step(); // 1 秒
    expect(u.hp).toBeCloseTo(102, 0);
    expect(u.mp).toBeCloseTo(51, 0);
  });

  it('deterministic with same seed', () => {
    const run = () => {
      const w = new World(new GameMap(), 7);
      const u = w.spawnUnit({ kind: 'hero', team: Team.Dawn, pos: { x: 4000, y: 11000 }, name: 't', stats: TEST_STATS });
      u.issueOrder({ type: 'move', pos: { x: 7520, y: 7520 } });
      for (let i = 0; i < 200; i++) w.step();
      return { x: u.pos.x, y: u.pos.y };
    };
    expect(run()).toEqual(run());
  });
});
