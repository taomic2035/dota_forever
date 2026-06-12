import { describe, it, expect } from 'vitest';
import {
  DAMAGE_MATRIX, armorReduction, XP_TABLE, MAX_LEVEL,
  heroKillBounty, respawnTime, buybackCost,
  type AttackType, type ArmorType,
} from '../src/data/balance';

const ATTACKS: AttackType[] = ['hero', 'normal', 'pierce', 'siege', 'spell'];
const ARMORS: ArmorType[] = ['hero', 'unarmored', 'light', 'medium', 'heavy', 'fortified'];

describe('damage matrix', () => {
  it('covers all 5x6 combinations with finite factors', () => {
    for (const a of ATTACKS)
      for (const d of ARMORS) {
        const v = DAMAGE_MATRIX[a][d];
        expect(Number.isFinite(v), `${a} vs ${d}`).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
      }
  });
  it('classic key matchups', () => {
    expect(DAMAGE_MATRIX.hero.fortified).toBe(0.5);
    expect(DAMAGE_MATRIX.siege.fortified).toBe(1.5);
    expect(DAMAGE_MATRIX.pierce.hero).toBe(0.5);
    expect(DAMAGE_MATRIX.spell.fortified).toBe(0);
  });
});

describe('armor formula', () => {
  it('zero armor = no reduction', () => {
    expect(armorReduction(0)).toBe(0);
  });
  it('5 armor ≈ 23.1%', () => {
    expect(armorReduction(5)).toBeCloseTo(0.2308, 3);
  });
  it('monotonic increasing', () => {
    let prev = -Infinity;
    for (let a = -20; a <= 40; a += 1) {
      const r = armorReduction(a);
      expect(r).toBeGreaterThan(prev);
      prev = r;
    }
  });
  it('negative armor amplifies damage', () => {
    expect(armorReduction(-5)).toBeLessThan(0);
    expect(armorReduction(-5)).toBeGreaterThan(-1);
  });
});

describe('xp table', () => {
  it('has entries to reach max level', () => {
    expect(XP_TABLE.length).toBe(MAX_LEVEL - 1);
  });
  it('strictly increasing', () => {
    for (let i = 1; i < XP_TABLE.length; i++) expect(XP_TABLE[i]).toBeGreaterThan(XP_TABLE[i - 1]);
  });
});

describe('economy formulas', () => {
  it('kill bounty scales with level and streak', () => {
    expect(heroKillBounty(1, 0)).toBe(111); // 100 + 11×1(M10 校准)
    expect(heroKillBounty(10, 0)).toBe(210); // 100 + 11×10
    // 终结连杀阶梯:3→+50 5→+200 8+→+500(经典)
    expect(heroKillBounty(10, 3)).toBe(260);
    expect(heroKillBounty(10, 5)).toBe(410);
    expect(heroKillBounty(10, 8)).toBe(710);
    expect(heroKillBounty(10, 20)).toBe(710); // 8+ 封顶 +500
  });
  it('respawn capped', () => {
    expect(respawnTime(25)).toBeLessThanOrEqual(110);
    expect(respawnTime(1)).toBe(6);
  });
  it('buyback grows quadratically', () => {
    expect(buybackCost(10)).toBe(300); // 100 + 10²×2
    expect(buybackCost(20)).toBe(900); // 100 + 20²×2
  });
});

import { isNightAt } from '../src/sim/daynight';
describe('day/night cycle', () => {
  it('flips at 5:00 boundaries', () => {
    expect(isNightAt(-30)).toBe(false);
    expect(isNightAt(100)).toBe(false);
    expect(isNightAt(301)).toBe(true);
    expect(isNightAt(599)).toBe(true);
    expect(isNightAt(601)).toBe(false);
  });
});
