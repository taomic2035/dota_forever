import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { applyModifier } from '../src/sim/modifiers';
import {
  unitStatusPips,
  STATUS_CONTROL_COLOR,
  STATUS_ENEMY_DEBUFF_COLOR,
  STATUS_BUFF_COLOR,
} from '../src/render/statusPips';
import type { UnitStats } from '../src/sim/unit';

const STATS: UnitStats = {
  maxHp: 500, hpRegen: 2, maxMp: 200, mpRegen: 1,
  dmgMin: 40, dmgMax: 50, attackType: 'hero', armorType: 'hero',
  armor: 2, magicResist: 0.25, attackRange: 128, attackPoint: 0.45,
  bat: 1.7, projectileSpeed: 0, moveSpeed: 300, collisionRadius: 24,
  visionDay: 1800, visionNight: 800, acquireRange: 500,
  bountyMin: 100, bountyMax: 100, xpBounty: 50,
};

function setup() {
  const w = createWorld(new GameMap(), { seed: 1 });
  const target = w.spawnUnit({ kind: 'hero', team: Team.Dawn, pos: { x: 7000, y: 7000 }, name: 't', stats: STATS });
  const enemy = w.spawnUnit({ kind: 'hero', team: Team.Night, pos: { x: 7100, y: 7000 }, name: 'e', stats: STATS });
  return { w, target, enemy };
}

describe('unitStatusPips', () => {
  it('returns no pips for a clean unit', () => {
    const { w, target } = setup();
    expect(unitStatusPips(w, target, w.time)).toEqual([]);
  });

  it('classifies control > enemy-debuff > buff and sorts by priority', () => {
    const { w, target, enemy } = setup();
    applyModifier(w, target, { key: 'buff_haste', duration: 6, isBuff: true }, target.id);
    applyModifier(w, target, { key: 'enemy_slow', duration: 4 }, enemy.id);
    applyModifier(w, target, { key: 'stun', duration: 2, states: { stunned: true } }, enemy.id);

    const pips = unitStatusPips(w, target, w.time);
    expect(pips.map((p) => p.color)).toEqual([STATUS_CONTROL_COLOR, STATUS_ENEMY_DEBUFF_COLOR, STATUS_BUFF_COLOR]);
    expect(pips.map((p) => p.prio)).toEqual([0, 1, 2]);
    expect(pips[0].frac).toBeCloseTo(1, 5); // 刚施加,剩余比例≈1
  });

  it('reuses modifier display semantics for hex-like disables', () => {
    const { w, target, enemy } = setup();
    applyModifier(w, target, {
      key: 'item_hex',
      duration: 3.5,
      states: { silenced: true, muted: true, disarmed: true },
      stats: { setMoveSpeed: 100 },
    }, enemy.id);

    const pips = unitStatusPips(w, target, w.time);

    expect(pips).toHaveLength(1);
    expect(pips[0].color).toBe(STATUS_CONTROL_COLOR);
    expect(pips[0].prio).toBe(0);
    expect(pips[0].label).toBe('妖');
  });

  it('dedupes by modifier key', () => {
    const { w, target, enemy } = setup();
    applyModifier(w, target, { key: 'enemy_slow', duration: 4 }, enemy.id);
    applyModifier(w, target, { key: 'enemy_slow', duration: 4 }, enemy.id);
    expect(unitStatusPips(w, target, w.time)).toHaveLength(1);
  });

  it('caps the pip count', () => {
    const { w, target, enemy } = setup();
    for (let i = 0; i < 7; i++) applyModifier(w, target, { key: `dot_${i}`, duration: 5 }, enemy.id);
    expect(unitStatusPips(w, target, w.time, 6)).toHaveLength(6);
  });
});
