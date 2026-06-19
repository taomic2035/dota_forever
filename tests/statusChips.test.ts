import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { applyModifier } from '../src/sim/modifiers';
import { statusChips, statusChipTime } from '../src/render/statusChips';
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
  const u = w.spawnUnit({ kind: 'hero', team: Team.Dawn, pos: { x: 7000, y: 7000 }, name: 'u', stats: STATS });
  const src = w.spawnUnit({ kind: 'hero', team: Team.Night, pos: { x: 7100, y: 7000 }, name: 's', stats: STATS });
  return { w, u, src };
}

describe('statusChips', () => {
  it('is empty for a clean unit and ignores permanent modifiers', () => {
    const { w, u, src } = setup();
    applyModifier(w, u, { key: 'aura_passive' }, src.id); // 无 duration = 永久,不计入限时状态条
    expect(statusChips(w, u, w.time)).toEqual([]);
  });

  it('names control states and tags buff/debuff', () => {
    const { w, u, src } = setup();
    applyModifier(w, u, { key: 'st', duration: 2, states: { stunned: true } }, src.id);
    applyModifier(w, u, { key: 'si', duration: 3, states: { silenced: true } }, src.id);
    applyModifier(w, u, { key: 'dot', duration: 4 }, src.id);
    applyModifier(w, u, { key: 'haste', duration: 5, isBuff: true }, u.id);

    const chips = statusChips(w, u, w.time);
    // 按到期升序:2/3/4/5
    expect(chips.map((c) => c.tag)).toEqual(['晕', '沉', '▼', '▲']);
    expect(chips.find((c) => c.tag === '晕')?.color).toBe('#ff4040');
    expect(chips.find((c) => c.tag === '▲')?.isBuff).toBe(true);
    expect(chips[0].remaining).toBeCloseTo(2, 5);
  });

  it('surfaces Break as a named status instead of a generic debuff', () => {
    const { w, u, src } = setup();
    applyModifier(w, u, { key: 'silveredge_break', duration: 5, states: { broken: true } }, src.id);

    const chips = statusChips(w, u, w.time);

    expect(chips[0]).toMatchObject({
      tag: '破',
      color: '#ff5fb7',
      isBuff: false,
      key: 'silveredge_break',
    });
  });

  it('caps the chip count', () => {
    const { w, u, src } = setup();
    for (let i = 0; i < 12; i++) applyModifier(w, u, { key: `d${i}`, duration: 5 }, src.id);
    expect(statusChips(w, u, w.time, 10)).toHaveLength(10);
  });

  it('formats remaining time: ceil at >=1s, one decimal under 1s', () => {
    expect(statusChipTime(2.3)).toBe('3');
    expect(statusChipTime(1)).toBe('1');
    expect(statusChipTime(0.4)).toBe('0.4');
  });
});
