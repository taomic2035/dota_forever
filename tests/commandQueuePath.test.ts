import { describe, expect, it } from 'vitest';
import { buildCommandQueuePath } from '../src/render/commandQueuePath';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import type { UnitStats } from '../src/sim/unit';

const stats: UnitStats = {
  maxHp: 100,
  hpRegen: 0,
  maxMp: 0,
  mpRegen: 0,
  dmgMin: 10,
  dmgMax: 10,
  attackType: 'hero',
  armorType: 'hero',
  armor: 0,
  magicResist: 0,
  attackRange: 100,
  attackPoint: 0.3,
  bat: 1.7,
  projectileSpeed: 0,
  moveSpeed: 300,
  collisionRadius: 24,
  visionDay: 800,
  visionNight: 800,
  acquireRange: 500,
  bountyMin: 0,
  bountyMax: 0,
  xpBounty: 0,
};

describe('command queue path preview', () => {
  it('builds continuous legs from the active order through queued point orders', () => {
    const world = createWorld(new GameMap(), { seed: 1 });
    const unit = world.spawnUnit({
      kind: 'hero',
      team: Team.Dawn,
      pos: { x: 1000, y: 1000 },
      stats,
      name: 'Queue Tester',
    });

    unit.issueOrder({ type: 'move', pos: { x: 1200, y: 1000 } });
    unit.queueOrder({ type: 'attackmove', pos: { x: 1400, y: 1200 } });
    unit.queueOrder({ type: 'move', pos: { x: 1600, y: 1200 } });

    expect(buildCommandQueuePath(world, unit)).toEqual([
      { from: { x: 1000, y: 1000 }, to: { x: 1200, y: 1000 }, kind: 'current', index: 0 },
      { from: { x: 1200, y: 1000 }, to: { x: 1400, y: 1200 }, kind: 'queued', index: 1 },
      { from: { x: 1400, y: 1200 }, to: { x: 1600, y: 1200 }, kind: 'queued', index: 2 },
    ]);
  });

  it('resolves unit-target orders to the target position', () => {
    const world = createWorld(new GameMap(), { seed: 1 });
    const hero = world.spawnUnit({
      kind: 'hero',
      team: Team.Dawn,
      pos: { x: 1000, y: 1000 },
      stats,
      name: 'Queue Tester',
    });
    const enemy = world.spawnUnit({
      kind: 'hero',
      team: Team.Night,
      pos: { x: 1300, y: 1100 },
      stats,
      name: 'Target',
    });

    hero.issueOrder({ type: 'move', pos: { x: 1150, y: 1000 } });
    hero.queueOrder({ type: 'attack', targetId: enemy.id });

    expect(buildCommandQueuePath(world, hero)).toEqual([
      { from: { x: 1000, y: 1000 }, to: { x: 1150, y: 1000 }, kind: 'current', index: 0 },
      { from: { x: 1150, y: 1000 }, to: { x: 1300, y: 1100 }, kind: 'queued', index: 1 },
    ]);
  });

  it('skips orders without drawable destinations', () => {
    const world = createWorld(new GameMap(), { seed: 1 });
    const unit = world.spawnUnit({
      kind: 'hero',
      team: Team.Dawn,
      pos: { x: 1000, y: 1000 },
      stats,
      name: 'Queue Tester',
    });

    unit.issueOrder({ type: 'hold' });
    unit.queueOrder({ type: 'cast', abilityIndex: 3 });
    unit.queueOrder({ type: 'move', pos: { x: 1300, y: 1000 } });

    expect(buildCommandQueuePath(world, unit)).toEqual([
      { from: { x: 1000, y: 1000 }, to: { x: 1300, y: 1000 }, kind: 'queued', index: 2 },
    ]);
  });
});
