import { describe, expect, it } from 'vitest';
import { GameMap } from '../src/sim/map';
import { Unit, type UnitStats } from '../src/sim/unit';
import { createWorld } from '../src/sim/setup';

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
  moveSpeed: 10000,
  collisionRadius: 24,
  visionDay: 800,
  visionNight: 800,
  acquireRange: 500,
  bountyMin: 0,
  bountyMax: 0,
  xpBounty: 0,
};

describe('queued unit orders', () => {
  it('keeps the current order active and appends shifted orders', () => {
    const unit = new Unit({ kind: 'hero', team: 0, name: 'Queue Tester', pos: { x: 1000, y: 1000 }, stats });

    unit.issueOrder({ type: 'move', pos: { x: 1400, y: 1000 } });
    unit.queueOrder({ type: 'attackmove', pos: { x: 1800, y: 1000 } });

    expect(unit.order).toEqual({ type: 'move', pos: { x: 1400, y: 1000 } });
    expect(unit.orderQueue).toEqual([{ type: 'attackmove', pos: { x: 1800, y: 1000 } }]);
  });

  it('promotes queued orders when movement reaches its destination', () => {
    const world = createWorld(new GameMap(), { seed: 1, creeps: false });
    const unit = world.spawnUnit({ kind: 'hero', team: 0, name: 'Queue Runner', pos: { x: 1000, y: 1000 }, stats });

    unit.issueOrder({ type: 'move', pos: { x: 1050, y: 1000 } });
    unit.queueOrder({ type: 'attackmove', pos: { x: 1300, y: 1000 } });
    world.step();

    expect(unit.order).toEqual({ type: 'attackmove', pos: { x: 1300, y: 1000 } });
    expect(unit.orderQueue).toEqual([]);
  });
});
