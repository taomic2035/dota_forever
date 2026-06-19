import { describe, expect, it } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import type { World } from '../src/sim/world';
import type { Unit, UnitKind, UnitStats } from '../src/sim/unit';
import { applyModifier } from '../src/sim/modifiers';
import { canDenyTarget } from '../src/sim/denyRules';

const map = new GameMap();

function stats(over: Partial<UnitStats> = {}): UnitStats {
  return {
    maxHp: 1000, hpRegen: 0, maxMp: 0, mpRegen: 0,
    dmgMin: 500, dmgMax: 500, attackType: 'hero', armorType: 'hero',
    armor: 0, magicResist: 0, attackRange: 180, attackPoint: 0.2,
    bat: 1.2, projectileSpeed: 0, moveSpeed: 300, collisionRadius: 24,
    visionDay: 1800, visionNight: 800, acquireRange: 600,
    bountyMin: 0, bountyMax: 0, xpBounty: 0,
    ...over,
  };
}

function mk(w: World, kind: UnitKind, team: Team, x: number, y: number, over: Partial<UnitStats> = {}): Unit {
  return w.spawnUnit({ kind, team, pos: { x, y }, name: kind, stats: stats(over) });
}

describe('deny target rules', () => {
  it('allows denying allied buildings only below 10 percent hp', () => {
    const w = createWorld(map, { seed: 2, noBuildings: true, startTime: 0 });
    const hero = mk(w, 'hero', Team.Dawn, 7000, 8000);
    const tower = mk(w, 'building', Team.Dawn, 7100, 8000);

    tower.hp = 101;
    expect(canDenyTarget(w, hero, tower)).toBe(false);

    tower.hp = 99;
    expect(canDenyTarget(w, hero, tower)).toBe(true);
  });

  it('allows denying allied heroes below 25 percent only while an enemy DoT is active', () => {
    const w = createWorld(map, { seed: 2, noBuildings: true, startTime: 0 });
    const hero = mk(w, 'hero', Team.Dawn, 7000, 8000);
    const ally = mk(w, 'hero', Team.Dawn, 7100, 8000);
    const enemy = mk(w, 'hero', Team.Night, 7300, 8000);
    ally.hp = 240;

    expect(canDenyTarget(w, hero, ally)).toBe(false);

    applyModifier(w, ally, {
      key: 'enemy_burn',
      duration: 5,
      tickInterval: 1,
      onTick() {},
    }, enemy.id);
    expect(canDenyTarget(w, hero, ally)).toBe(true);
  });

  it('rejects direct allied hero denies without a hostile DoT', () => {
    const w = createWorld(map, { seed: 2, noBuildings: true, startTime: 0 });
    const hero = mk(w, 'hero', Team.Dawn, 7000, 8000);
    const ally = mk(w, 'hero', Team.Dawn, 7100, 8000);
    ally.hp = 240;

    hero.issueOrder({ type: 'attack', targetId: ally.id });
    w.step();

    expect(hero.order).toBeNull();
    expect(ally.hp).toBe(240);
  });

  it('executes allied building denies below 10 percent hp', () => {
    const w = createWorld(map, { seed: 2, noBuildings: true, startTime: 0 });
    const hero = mk(w, 'hero', Team.Dawn, 7000, 8000);
    const tower = mk(w, 'building', Team.Dawn, 7100, 8000, { maxHp: 1000 });
    tower.hp = 80;

    hero.issueOrder({ type: 'attack', targetId: tower.id });
    for (let i = 0; i < 120 && tower.alive; i++) w.step();

    expect(tower.alive).toBe(false);
  });

  it('executes allied hero denies below 25 percent hp while an enemy DoT is active', () => {
    const w = createWorld(map, { seed: 2, noBuildings: true, startTime: 0 });
    const hero = mk(w, 'hero', Team.Dawn, 7000, 8000);
    const ally = mk(w, 'hero', Team.Dawn, 7100, 8000, { maxHp: 1000 });
    const enemy = mk(w, 'hero', Team.Night, 7300, 8000);
    ally.hp = 200;
    applyModifier(w, ally, {
      key: 'enemy_burn',
      duration: 5,
      tickInterval: 1,
      onTick() {},
    }, enemy.id);

    hero.issueOrder({ type: 'attack', targetId: ally.id });
    for (let i = 0; i < 120 && ally.alive; i++) w.step();

    expect(ally.alive).toBe(false);
  });
});
