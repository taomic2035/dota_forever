import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { makeItem, afterInventoryChange, useItem } from '../src/sim/items';
import { recalcUnit, applyDamage } from '../src/sim/combat';
import { applyModifier, hasModifier, removeModifier } from '../src/sim/modifiers';
import { REIN, LIYA } from '../src/data/heroes';
import type { UnitStats } from '../src/sim/unit';

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

  it('战争号角光环:敌军 -5 护甲(多光环框架)', () => {
    const w = createWorld(new GameMap(), { seed: 1, noBuildings: true });
    const holder = spawnHero(w, REIN, Team.Dawn, { x: 7000, y: 8000 });
    const enemy = spawnHero(w, LIYA, Team.Night, { x: 7200, y: 8000 });
    const armor0 = enemy.calc.armor;
    holder.inventory[0] = makeItem('assault');
    afterInventoryChange(w, holder);
    for (let i = 0; i < 30; i++) w.step();
    recalcUnit(enemy);
    expect(enemy.calc.armor - armor0).toBeCloseTo(-5, 1);
  });

  it('点金手:点化给经验(此前漏给)', () => {
    const w = createWorld(new GameMap(), { seed: 1, noBuildings: true });
    const h = spawnHero(w, REIN, Team.Dawn, { x: 7000, y: 8000 });
    h.inventory[0] = makeItem('midas');
    const stats: UnitStats = {
      maxHp: 500, hpRegen: 0, maxMp: 0, mpRegen: 0, dmgMin: 0, dmgMax: 0,
      attackType: 'normal', armorType: 'medium', armor: 0, magicResist: 0,
      attackRange: 100, attackPoint: 0.3, bat: 1, projectileSpeed: 0, moveSpeed: 0,
      collisionRadius: 22, visionDay: 0, visionNight: 0, acquireRange: 0,
      bountyMin: 0, bountyMax: 0, xpBounty: 88,
    };
    const creep = w.spawnUnit({ kind: 'creep', team: Team.Night, pos: { x: 7100, y: 8000 }, name: 'c', stats });
    const xp0 = h.heroMeta!.xp;
    expect(useItem(w, h, 0, undefined, creep)).toBe(true);
    expect(creep.alive).toBe(false);
    expect(h.heroMeta!.xp - xp0).toBeCloseTo(88, 1); // 吸收该单位经验
  });

  it('诡计之雾靠近敌方英雄即失效(V4)', () => {
    const w = createWorld(new GameMap(), { seed: 1, noBuildings: true });
    const h = spawnHero(w, REIN, Team.Dawn, { x: 7000, y: 8000 });
    applyModifier(w, h, { key: 'item_smoke', duration: 35, isBuff: true, states: { invisible: true } }, h.id);
    for (let i = 0; i < 12; i++) w.step();
    expect(hasModifier(h, 'item_smoke')).toBe(true); // 无敌人时保持隐身
    // 敌方英雄进入 1025 内(但在双方索敌距离外,隔离出"近敌失效"而非攻击解除)
    spawnHero(w, LIYA, Team.Night, { x: 7800, y: 8000 });
    for (let i = 0; i < 12; i++) w.step();
    expect(hasModifier(h, 'item_smoke')).toBe(false); // 近敌 → 失效
  });

  it('飓风之杖旋风:目标升空不可被伤害,驱散后恢复(无泄漏)', () => {
    const w = createWorld(new GameMap(), { seed: 1, noBuildings: true });
    const caster = spawnHero(w, REIN, Team.Dawn, { x: 7000, y: 8000 });
    caster.inventory[0] = makeItem('eul');
    caster.mp = 500;
    const enemy = spawnHero(w, LIYA, Team.Night, { x: 7300, y: 8000 });
    expect(useItem(w, caster, 0, undefined, enemy)).toBe(true);
    expect(hasModifier(enemy, 'item_eul_cyclone')).toBe(true);
    const hp0 = enemy.hp;
    expect(applyDamage(w, enemy, { source: caster.id, attackType: 'hero', amount: 200 })).toBe(0); // 升空免伤
    expect(enemy.hp).toBe(hp0);
    removeModifier(w, enemy, 'item_eul_cyclone'); // 驱散
    expect(applyDamage(w, enemy, { source: caster.id, attackType: 'hero', amount: 200 })).toBeGreaterThan(0); // 恢复承伤(无泄漏)
  });
});
