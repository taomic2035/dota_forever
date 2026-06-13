import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { applyDamage } from '../src/sim/combat';
import { activateGlyph, glyphReady } from '../src/sim/glyph';

const map = new GameMap();

describe('防御符文 Glyph', () => {
  it('激活后己方建筑短时免疫一切伤害', () => {
    const w = createWorld(map, { seed: 3, startTime: 0 });
    const tower = [...w.units.values()].find((u) => u.team === Team.Dawn && u.buildingKind === 'tower1')!;
    expect(activateGlyph(w, Team.Dawn)).toBe(true);
    expect(applyDamage(w, tower, { source: 0, attackType: 'hero', amount: 500 })).toBe(0);
  });

  it('长冷却:激活后即时再次激活失败,且 6 秒后护盾消失', () => {
    const w = createWorld(map, { seed: 3, startTime: 0 });
    const tower = [...w.units.values()].find((u) => u.team === Team.Dawn && u.buildingKind === 'tower1')!;
    activateGlyph(w, Team.Dawn);
    expect(glyphReady(w, Team.Dawn)).toBe(false);
    expect(activateGlyph(w, Team.Dawn)).toBe(false); // 冷却中
    for (let i = 0; i < 7 * 30; i++) w.step(); // 6s 护盾期过
    expect(applyDamage(w, tower, { source: 0, attackType: 'hero', amount: 100 })).toBeGreaterThan(0);
  });

  it('只护己方建筑,不护敌方', () => {
    const w = createWorld(map, { seed: 3, startTime: 0 });
    const nightTower = [...w.units.values()].find((u) => u.team === Team.Night && u.buildingKind === 'tower1')!;
    activateGlyph(w, Team.Dawn); // 晨曦开符文
    expect(applyDamage(w, nightTower, { source: 0, attackType: 'hero', amount: 200 })).toBeGreaterThan(0); // 永夜塔不受护
  });
});
