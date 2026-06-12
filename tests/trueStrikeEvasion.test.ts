import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { HEROES } from '../src/data/heroes';
import { applyModifier } from '../src/sim/modifiers';
import { applyDamage, recalcUnit } from '../src/sim/combat';
import { makeItem } from '../src/sim/items';

function world() {
  const w = createWorld(new GameMap(), { seed: 1, noBuildings: true });
  const atk = spawnHero(w, HEROES[0], Team.Dawn, { x: 7520, y: 7520 });
  const tgt = spawnHero(w, HEROES[1], Team.Night, { x: 7560, y: 7520 }); // 同高度,避免低打高 miss
  return { w, atk, tgt };
}

describe('闪避独立概率叠加(M2)', () => {
  it('两件 30% 闪避 → 51%(非 30%)', () => {
    const { w, tgt } = world();
    applyModifier(w, tgt, { key: 'eva_a', duration: 99, isBuff: true, stats: { evasion: 0.3 } }, tgt.id);
    applyModifier(w, tgt, { key: 'eva_b', duration: 99, isBuff: true, stats: { evasion: 0.3 } }, tgt.id);
    recalcUnit(tgt);
    expect(tgt.calc.evasion).toBeCloseTo(0.51, 5);
  });
});

describe('必中无视闪避(M2)', () => {
  it('100% 闪避目标:普通攻击必落空,必中攻击必命中', () => {
    const { w, atk, tgt } = world();
    applyModifier(w, tgt, { key: 'eva_full', duration: 99, isBuff: true, stats: { evasion: 1 } }, tgt.id);
    recalcUnit(tgt);
    // 普通攻击:必落空
    const missed = applyDamage(w, tgt, { source: atk.id, attackType: 'hero', amount: 100, flags: {} });
    expect(missed).toBe(0);
    // 攻击者获得必中
    applyModifier(w, atk, { key: 'ts', duration: 99, isBuff: true, stats: { trueStrike: true } }, atk.id);
    recalcUnit(atk);
    const hit = applyDamage(w, tgt, { source: atk.id, attackType: 'hero', amount: 100, flags: {} });
    expect(hit).toBeGreaterThan(0);
  });

  it('金箍棒(MKB)赋予必中', () => {
    const { w, atk } = world();
    atk.inventory[0] = makeItem('mkb');
    recalcUnit(atk);
    expect(atk.calc.trueStrike).toBe(true);
  });
});

describe('承伤减免独立乘算(M7)', () => {
  it('两件 20% 减免 → 36%(非 20%)', () => {
    const { w, tgt } = world();
    applyModifier(w, tgt, { key: 'red_a', duration: 99, isBuff: true, stats: { incomingDamageReduction: 0.2 } }, tgt.id);
    applyModifier(w, tgt, { key: 'red_b', duration: 99, isBuff: true, stats: { incomingDamageReduction: 0.2 } }, tgt.id);
    recalcUnit(tgt);
    expect(tgt.calc.incomingDamageReduction).toBeCloseTo(0.36, 5);
    // 纯粹 100 伤害 → 实扣 64
    const dealt = applyDamage(w, tgt, { source: 0, attackType: 'hero', amount: 100, flags: { pure: true } });
    expect(dealt).toBeCloseTo(64, 1);
  });
});
