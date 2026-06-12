import { describe, expect, it } from 'vitest';
import {
  findFilteredTarget,
  targetFilterRejectReason,
  targetMatchesFilter,
  type TargetableUnit,
} from '../src/engine/targetFilters';

const caster: TargetableUnit = { id: 1, team: 0, alive: true, pos: { x: 0, y: 0 } };
const ally: TargetableUnit = { id: 2, team: 0, alive: true, pos: { x: 20, y: 0 } };
const enemy: TargetableUnit = { id: 3, team: 1, alive: true, pos: { x: 30, y: 0 } };
const deadEnemy: TargetableUnit = { id: 4, team: 1, alive: false, pos: { x: 10, y: 0 } };
const enemyHero: TargetableUnit = { id: 5, team: 1, alive: true, pos: { x: 8, y: 0 }, kind: 'hero' };
const enemyCreep: TargetableUnit = { id: 6, team: 1, alive: true, pos: { x: 28, y: 0 }, kind: 'creep' };
const enemyTower: TargetableUnit = { id: 7, team: 1, alive: true, pos: { x: 38, y: 0 }, kind: 'tower' };
const allyHero: TargetableUnit = { id: 8, team: 0, alive: true, pos: { x: 14, y: 0 }, kind: 'hero' };
const allyCreep: TargetableUnit = { id: 9, team: 0, alive: true, pos: { x: 24, y: 0 }, kind: 'creep' };

describe('target filters', () => {
  it('matches enemy, ally, self, ally-or-self, and any filters', () => {
    expect(targetMatchesFilter(caster, enemy, 'enemy')).toBe(true);
    expect(targetMatchesFilter(caster, ally, 'enemy')).toBe(false);
    expect(targetMatchesFilter(caster, ally, 'ally')).toBe(true);
    expect(targetMatchesFilter(caster, caster, 'ally')).toBe(false);
    expect(targetMatchesFilter(caster, caster, 'self')).toBe(true);
    expect(targetMatchesFilter(caster, ally, 'allyOrSelf')).toBe(true);
    expect(targetMatchesFilter(caster, caster, 'allyOrSelf')).toBe(true);
    expect(targetMatchesFilter(caster, enemy, 'any')).toBe(true);
  });

  it('rejects dead targets for every filter', () => {
    expect(targetMatchesFilter(caster, deadEnemy, 'enemy')).toBe(false);
    expect(targetMatchesFilter(caster, deadEnemy, 'any')).toBe(false);
  });

  it('defaults missing filters to any living non-self target', () => {
    expect(targetMatchesFilter(caster, enemy)).toBe(true);
    expect(targetMatchesFilter(caster, ally)).toBe(true);
    expect(targetMatchesFilter(caster, caster)).toBe(false);
  });

  it('selects the nearest unit that matches the filter', () => {
    const units = [deadEnemy, ally, enemy];
    const query = (pos: { x: number; y: number }, radius: number, pred: (u: TargetableUnit) => boolean) =>
      units.filter((u) => Math.hypot(u.pos.x - pos.x, u.pos.y - pos.y) <= radius && pred(u));

    expect(findFilteredTarget(query, caster, { x: 0, y: 0 }, 90, 'enemy')?.id).toBe(enemy.id);
    expect(findFilteredTarget(query, caster, { x: 0, y: 0 }, 90, 'ally')?.id).toBe(ally.id);
    expect(findFilteredTarget(query, caster, { x: 0, y: 0 }, 15, 'enemy')).toBeUndefined();
  });

  it('matches target kind filters after team filters pass', () => {
    expect(targetMatchesFilter(caster, enemyHero, 'enemy', 'hero')).toBe(true);
    expect(targetMatchesFilter(caster, enemyHero, 'enemy', 'nonHeroNonBuilding')).toBe(false);
    expect(targetMatchesFilter(caster, enemyCreep, 'enemy', 'nonHeroNonBuilding')).toBe(true);
    expect(targetMatchesFilter(caster, enemyTower, 'enemy', 'nonHeroNonBuilding')).toBe(false);
    expect(targetMatchesFilter(caster, allyHero, 'ally', 'creep')).toBe(false);
    expect(targetMatchesFilter(caster, allyCreep, 'ally', 'creep')).toBe(true);
  });

  it('selects the nearest unit that matches both team and kind filters', () => {
    const units = [enemyHero, allyCreep, enemyCreep, enemyTower];
    const query = (pos: { x: number; y: number }, radius: number, pred: (u: TargetableUnit) => boolean) =>
      units.filter((u) => Math.hypot(u.pos.x - pos.x, u.pos.y - pos.y) <= radius && pred(u));

    expect(findFilteredTarget(query, caster, { x: 0, y: 0 }, 90, 'enemy', 'nonHeroNonBuilding')?.id).toBe(enemyCreep.id);
    expect(findFilteredTarget(query, caster, { x: 0, y: 0 }, 90, 'ally', 'creep')?.id).toBe(allyCreep.id);
  });

  it('reports why a visible unit failed target filters', () => {
    expect(targetFilterRejectReason(caster, deadEnemy, 'enemy')).toBe('dead');
    expect(targetFilterRejectReason(caster, allyCreep, 'enemy', 'creep')).toBe('team');
    expect(targetFilterRejectReason(caster, enemyHero, 'enemy', 'nonHeroNonBuilding')).toBe('kind');
    expect(targetFilterRejectReason(caster, enemyCreep, 'enemy', 'nonHeroNonBuilding')).toBeNull();
  });
});
