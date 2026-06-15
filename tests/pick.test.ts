import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { pickUnitAt, pickUnitsInWorldRect } from '../src/sim/pick';
import type { UnitStats } from '../src/sim/unit';

const HERO_STATS: UnitStats = {
  maxHp: 500, hpRegen: 2, maxMp: 200, mpRegen: 1,
  dmgMin: 40, dmgMax: 50, attackType: 'hero', armorType: 'hero',
  armor: 2, magicResist: 0.25, attackRange: 128, attackPoint: 0.45,
  bat: 1.7, projectileSpeed: 0, moveSpeed: 300, collisionRadius: 24,
  visionDay: 1800, visionNight: 800, acquireRange: 500,
  bountyMin: 100, bountyMax: 100, xpBounty: 50,
};
const CREEP_STATS: UnitStats = { ...HERO_STATS, maxHp: 300, attackType: 'normal', armorType: 'light', collisionRadius: 16 };

describe('pickUnitAt', () => {
  it('returns null when nothing is near the point', () => {
    const w = createWorld(new GameMap(), { seed: 1 });
    expect(pickUnitAt(w, null, { x: 200, y: 200 }, 90)).toBeNull();
  });

  it('returns the nearest unit within the radius', () => {
    const w = createWorld(new GameMap(), { seed: 1 });
    const near = w.spawnUnit({ kind: 'creep', team: Team.Dawn, pos: { x: 7000, y: 7000 }, name: 'near', stats: CREEP_STATS });
    w.spawnUnit({ kind: 'creep', team: Team.Dawn, pos: { x: 7070, y: 7000 }, name: 'far', stats: CREEP_STATS });
    expect(pickUnitAt(w, null, { x: 7010, y: 7000 }, 90)?.id).toBe(near.id);
  });

  it('prefers a hero over an overlapping creep even if the creep is closer', () => {
    const w = createWorld(new GameMap(), { seed: 1 });
    w.spawnUnit({ kind: 'creep', team: Team.Dawn, pos: { x: 7000, y: 7000 }, name: 'creep', stats: CREEP_STATS });
    const hero = w.spawnUnit({ kind: 'hero', team: Team.Dawn, pos: { x: 7040, y: 7000 }, name: 'hero', stats: HERO_STATS });
    expect(pickUnitAt(w, null, { x: 7005, y: 7000 }, 90)?.id).toBe(hero.id);
  });

  it('does not select an enemy hidden in fog of war', () => {
    const w = createWorld(new GameMap(), { seed: 1 });
    const pos = { x: 7520, y: 7520 };
    expect(pickUnitAt(w, null, pos, 120)).toBeNull(); // 该处为空地,后续断言只受待测英雄影响
    const night = w.spawnUnit({ kind: 'hero', team: Team.Night, pos, name: 'lurker', stats: HERO_STATS });
    // 确定性迷雾:晨方该格无视野(不 step,避免触发视野重算覆盖)
    w.vision!.grids[Team.Dawn].fill(0);
    expect(pickUnitAt(w, Team.Dawn, pos, 90)).toBeNull();          // 晨方看不见
    expect(pickUnitAt(w, Team.Night, pos, 90)?.id).toBe(night.id); // 己方始终可见
    expect(pickUnitAt(w, null, pos, 90)?.id).toBe(night.id);       // 全图可见
  });

  it('box-selects visible units with commandable units first', () => {
    const w = createWorld(new GameMap(), { seed: 1 });
    const hero = w.spawnUnit({ kind: 'hero', team: Team.Dawn, pos: { x: 7000, y: 7000 }, name: 'hero', stats: HERO_STATS });
    const summon = w.spawnUnit({ kind: 'creep', team: Team.Dawn, pos: { x: 7080, y: 7040 }, name: 'summon', stats: CREEP_STATS });
    summon.summonOwnerId = hero.id;
    const enemyHero = w.spawnUnit({ kind: 'hero', team: Team.Night, pos: { x: 7160, y: 7080 }, name: 'enemy', stats: HERO_STATS });
    const laneCreep = w.spawnUnit({ kind: 'creep', team: Team.Dawn, pos: { x: 7120, y: 7120 }, name: 'lane', stats: CREEP_STATS });

    const picked = pickUnitsInWorldRect(
      w,
      null,
      { minX: 6900, minY: 6900, maxX: 7250, maxY: 7250 },
      { playerTeam: Team.Dawn, playerHeroId: hero.id },
    );

    expect(picked.map((u) => u.id)).toEqual([hero.id, summon.id, enemyHero.id, laneCreep.id]);
  });
});
