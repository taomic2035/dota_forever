import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { HEROES } from '../src/data/heroes';
import { applyModifier } from '../src/sim/modifiers';
import { recalcUnit } from '../src/sim/combat';
import { MAGIC_RESIST_CAP } from '../src/data/balance';

// A1:经典 DotA 多源魔抗**乘算**叠加 1-∏(1-r_i),而非加算。
// 基础 25% + Hood 30% 经典受伤 47.5%(抗 47.5%),加算会误得 55%。
describe('魔抗多源乘算叠加(A1)', () => {
  it('基础 0.25 + 一源 0.30 → 0.475(乘算,非加算 0.55)', () => {
    const w = createWorld(new GameMap(), { seed: 1, noBuildings: true });
    const h = spawnHero(w, HEROES[0], Team.Night, { x: 7520, y: 7520 });
    applyModifier(w, h, { key: 'mr1', duration: 99, isBuff: true, stats: { bonusMagicResist: 0.30 } }, h.id);
    recalcUnit(h);
    expect(h.calc.magicResist).toBeCloseTo(0.475, 4); // 1-(1-0.25)(1-0.30)
  });

  it('两源 0.30 + 0.20 → 0.58(乘算,非加算 0.75)', () => {
    const w = createWorld(new GameMap(), { seed: 1, noBuildings: true });
    const h = spawnHero(w, HEROES[0], Team.Night, { x: 7520, y: 7520 });
    applyModifier(w, h, { key: 'mr1', duration: 99, isBuff: true, stats: { bonusMagicResist: 0.30 } }, h.id);
    applyModifier(w, h, { key: 'mr2', duration: 99, isBuff: true, stats: { bonusMagicResist: 0.20 } }, h.id);
    recalcUnit(h);
    expect(h.calc.magicResist).toBeCloseTo(0.58, 4); // 1-(0.75)(0.70)(0.80)
  });

  it('负魔抗(削抗)亦乘算:0.25 与 -0.20 → 0.10', () => {
    const w = createWorld(new GameMap(), { seed: 1, noBuildings: true });
    const h = spawnHero(w, HEROES[0], Team.Night, { x: 7520, y: 7520 });
    applyModifier(w, h, { key: 'mrdown', duration: 99, isBuff: true, stats: { bonusMagicResist: -0.20 } }, h.id);
    recalcUnit(h);
    expect(h.calc.magicResist).toBeCloseTo(0.10, 4); // 1-(1-0.25)(1+0.20)
  });

  it('上限仍 clamp 至 0.85', () => {
    const w = createWorld(new GameMap(), { seed: 1, noBuildings: true });
    const h = spawnHero(w, HEROES[0], Team.Night, { x: 7520, y: 7520 });
    applyModifier(w, h, { key: 'mrhuge', duration: 99, isBuff: true, stats: { bonusMagicResist: 0.95 } }, h.id);
    recalcUnit(h);
    expect(h.calc.magicResist).toBe(MAGIC_RESIST_CAP);
  });
});
