import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import type { World } from '../src/sim/world';
import type { Unit, UnitStats } from '../src/sim/unit';
import {
  parseAutoAttackMode, cycleAutoAttackMode, autoAttackModeLabel,
  normalizeControlSettings, DEFAULT_CONTROL_SETTINGS,
} from '../src/engine/controlSettings';

const map = new GameMap();

function stats(over: Partial<UnitStats> = {}): UnitStats {
  return {
    maxHp: 600, hpRegen: 0, maxMp: 0, mpRegen: 0,
    dmgMin: 100, dmgMax: 100, attackType: 'hero', armorType: 'hero',
    armor: 0, magicResist: 0, attackRange: 150, attackPoint: 0.3,
    bat: 1.7, projectileSpeed: 0, moveSpeed: 300, collisionRadius: 24,
    visionDay: 1800, visionNight: 800, acquireRange: 600,
    bountyMin: 0, bountyMax: 0, xpBounty: 0,
    ...over,
  };
}
function mk(w: World, kind: 'hero' | 'creep', team: Team, x: number, y: number, over: Partial<UnitStats> = {}): Unit {
  return w.spawnUnit({ kind, team, pos: { x, y }, name: kind, stats: stats(over) });
}

describe('autoAttack policy (last-hit protection)', () => {
  it("never: an idle hero does NOT auto-acquire/attack an adjacent enemy", () => {
    const w = createWorld(map, { seed: 1, noBuildings: true, startTime: 0 });
    const hero = mk(w, 'hero', Team.Dawn, 7000, 8000);
    hero.autoAttack = 'never';
    const creep = mk(w, 'creep', Team.Night, 7090, 8000, { dmgMin: 0, dmgMax: 0, maxHp: 500 });
    for (let i = 0; i < 60; i++) w.step(); // 2s idle
    expect(creep.hp).toBe(500);       // 未被自动平A → 正补不被偷
    expect(hero.attackTargetId).toBe(0);
  });

  it('standard: an idle hero auto-acquires and attacks an adjacent enemy', () => {
    const w = createWorld(map, { seed: 1, noBuildings: true, startTime: 0 });
    const hero = mk(w, 'hero', Team.Dawn, 7000, 8000);
    hero.autoAttack = 'standard';
    const creep = mk(w, 'creep', Team.Night, 7090, 8000, { dmgMin: 0, dmgMax: 0, maxHp: 500 });
    for (let i = 0; i < 60; i++) w.step();
    expect(creep.hp).toBeLessThan(500); // 标准:空闲自动平A
  });
});

describe('autoAttack control setting', () => {
  it('parses / cycles / labels the three modes', () => {
    expect(parseAutoAttackMode('never')).toBe('never');
    expect(parseAutoAttackMode('bogus')).toBeUndefined();
    expect(cycleAutoAttackMode('never')).toBe('standard');
    expect(cycleAutoAttackMode('standard')).toBe('always');
    expect(cycleAutoAttackMode('always')).toBe('never');
    expect(autoAttackModeLabel('never')).toBe('不攻');
  });

  it('defaults to standard and round-trips through normalize', () => {
    expect(DEFAULT_CONTROL_SETTINGS.autoAttack).toBe('standard');
    expect(normalizeControlSettings({ autoAttack: 'never' }).autoAttack).toBe('never');
    expect(normalizeControlSettings({ autoAttack: 'nonsense' }).autoAttack).toBe('standard');
  });
});
