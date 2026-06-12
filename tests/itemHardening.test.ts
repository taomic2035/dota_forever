import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { makeItem, afterInventoryChange } from '../src/sim/items';
import { recalcUnit } from '../src/sim/combat';
import { REIN, LIYA } from '../src/data/heroes';

// 夯实物品 Wave A:补齐现有物品被遗漏的属性/光环(非扩数量)。
describe('物品数据修复(Wave A)', () => {
  it('秘法之靴 +250 法力(含能量之球)', () => {
    const w = createWorld(new GameMap(), { seed: 1, noBuildings: true });
    const h = spawnHero(w, REIN, Team.Dawn, { x: 7000, y: 8000 });
    const mp0 = h.calc.maxMp;
    h.inventory[0] = makeItem('arcane_boots');
    afterInventoryChange(w, h);
    recalcUnit(h);
    expect(h.calc.maxMp - mp0).toBe(250);
  });

  it('吸血战旗光环:友军 +5 护甲', () => {
    const w = createWorld(new GameMap(), { seed: 1, noBuildings: true });
    const holder = spawnHero(w, REIN, Team.Dawn, { x: 7000, y: 8000 });
    const ally = spawnHero(w, LIYA, Team.Dawn, { x: 7200, y: 8000 });
    const armor0 = ally.calc.armor;
    holder.inventory[0] = makeItem('vladmir');
    afterInventoryChange(w, holder);
    for (let i = 0; i < 30; i++) w.step(); // 光环传播
    recalcUnit(ally);
    expect(ally.calc.armor - armor0).toBeCloseTo(5, 1);
  });

  it('战争号角光环:友军 +5 护甲 + 30% 攻速', () => {
    const w = createWorld(new GameMap(), { seed: 1, noBuildings: true });
    const holder = spawnHero(w, REIN, Team.Dawn, { x: 7000, y: 8000 });
    const ally = spawnHero(w, LIYA, Team.Dawn, { x: 7200, y: 8000 });
    const armor0 = ally.calc.armor;
    const ias0 = ally.calc.ias;
    holder.inventory[0] = makeItem('assault');
    afterInventoryChange(w, holder);
    for (let i = 0; i < 30; i++) w.step();
    recalcUnit(ally);
    expect(ally.calc.armor - armor0).toBeCloseTo(5, 1);
    expect(ally.calc.ias - ias0).toBeCloseTo(0.30, 2);
  });
});
