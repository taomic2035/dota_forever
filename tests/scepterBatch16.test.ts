import { describe, it, expect } from 'vitest';
import { ultHero, enemyDummy, newWorld } from './scepterTestUtil';
import { EMB, VIP, AA, MPH, SDM, MKY } from '../src/data/heroes/batch16';
import { abilityDefAt, abilityCooldown } from '../src/sim/abilities';
import { stateOf } from '../src/sim/combat';
import { makeItem } from '../src/sim/items';

// ---- EMB 残焰 ----
describe('emb 残焰 神杖升级', () => {
  it('神杖 CD 30→20', () => {
    const w = newWorld();
    const h = ultHero(w, EMB, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(30);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(20);
  });

  it('无杖:爆裂半径 400,距落点 500 的敌人不受伤', () => {
    const w = newWorld();
    const h = ultHero(w, EMB, { x: 7000, y: 8000 });
    const t = enemyDummy(w, { x: 7500, y: 8000 }); // 距落点(7000,8000)→跳到 {x:7200,y:8000},距离 300 < 400
    // 放置敌人于 7000+501=7501,落点就是施法位,跳到落点后 500 > 400
    const far = enemyDummy(w, { x: 7501, y: 8000 }); // 距施法落点 501 > 400
    h.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7000, y: 8000 } });
    for (let i = 0; i < 10; i++) w.step();
    expect(far.hp).toBe(5000); // 无杖范围外不受伤
    expect(stateOf(far).stunned).toBeFalsy(); // 无杖不眩晕
  });

  it('有杖:爆裂半径扩大至 600,500 距离的敌人受到伤害', () => {
    const w = newWorld();
    const h = ultHero(w, EMB, { x: 7000, y: 8000 }, true);
    const t = enemyDummy(w, { x: 7500, y: 8000 }); // 距落点 500 < 600
    h.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7000, y: 8000 } });
    for (let i = 0; i < 10; i++) w.step();
    expect(t.hp).toBeLessThan(5000); // 神杖范围命中
  });

  it('有杖:爆裂范围内的敌人被眩晕 1 秒', () => {
    const w = newWorld();
    const h = ultHero(w, EMB, { x: 7000, y: 8000 }, true);
    const t = enemyDummy(w, { x: 7300, y: 8000 }); // 距落点 300 < 600
    h.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7000, y: 8000 } });
    for (let i = 0; i < 10; i++) w.step();
    expect(stateOf(t).stunned).toBe(true); // 神杖眩晕
  });

  it('无杖:范围内敌人不被眩晕', () => {
    const w = newWorld();
    const h = ultHero(w, EMB, { x: 7000, y: 8000 });
    const t = enemyDummy(w, { x: 7200, y: 8000 }); // 距落点 200 < 400
    h.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7000, y: 8000 } });
    for (let i = 0; i < 10; i++) w.step();
    expect(stateOf(t).stunned).toBeFalsy(); // 无杖不眩晕
  });
});

// ---- VIP 毒裔 ----
describe('vip 毒裔 神杖升级', () => {
  it('神杖 CD 40→28', () => {
    const w = newWorld();
    const h = ultHero(w, VIP, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(40);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(28);
  });

  it('无杖:周围其他敌人不受毒液蔓延伤害', () => {
    const w = newWorld();
    const h = ultHero(w, VIP, { x: 7000, y: 8000 });
    const primary = enemyDummy(w, { x: 7300, y: 8000 }); // 距 300 < 700 射程
    const nearby = enemyDummy(w, { x: 7450, y: 8000 }); // 距 primary 150 < 350
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: primary.id });
    for (let i = 0; i < 15; i++) w.step();
    expect(nearby.hp).toBe(5000); // 无杖不蔓延
    expect(stateOf(nearby).stunned).toBeFalsy();
  });

  it('有杖:周围 350 内敌人受到毒液蔓延伤害(等 DoT tick)', () => {
    const w = newWorld();
    const h = ultHero(w, VIP, { x: 7000, y: 8000 }, true);
    const primary = enemyDummy(w, { x: 7300, y: 8000 });
    const nearby = enemyDummy(w, { x: 7450, y: 8000 }); // 距 primary 150 < 350
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: primary.id });
    // castPoint 0.3s=9步 + DoT tick 0.5s=15步
    for (let i = 0; i < 40; i++) w.step();
    expect(nearby.hp).toBeLessThan(5000); // 神杖蔓延命中并受到 DoT
  });

  it('有杖:350 外的敌人不受蔓延伤害', () => {
    const w = newWorld();
    const h = ultHero(w, VIP, { x: 7000, y: 8000 }, true);
    const primary = enemyDummy(w, { x: 7300, y: 8000 });
    const far = enemyDummy(w, { x: 7700, y: 8000 }); // 距 primary 400 > 350
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: primary.id });
    for (let i = 0; i < 40; i++) w.step();
    expect(far.hp).toBe(5000); // 超出蔓延范围
    expect(stateOf(far).stunned).toBeFalsy();
  });
});

// ---- AA 极寒之触 ----
describe('aa 极寒之触 神杖升级', () => {
  it('神杖 CD 60→45', () => {
    const w = newWorld();
    const h = ultHero(w, AA, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(60);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(45);
  });

  it('无杖:命中敌人不被眩晕', () => {
    const w = newWorld();
    const h = ultHero(w, AA, { x: 7000, y: 8000 });
    const t = enemyDummy(w, { x: 7300, y: 8000 }); // 距落点 300 < 350 半径
    h.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7300, y: 8000 } });
    for (let i = 0; i < 15; i++) w.step();
    expect(t.hp).toBeLessThan(5000); // 有伤害
    expect(stateOf(t).stunned).toBeFalsy(); // 无杖不眩晕
  });

  it('有杖:命中敌人被眩晕 1.5 秒', () => {
    const w = newWorld();
    const h = ultHero(w, AA, { x: 7000, y: 8000 }, true);
    const t = enemyDummy(w, { x: 7300, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7300, y: 8000 } });
    for (let i = 0; i < 15; i++) w.step();
    expect(stateOf(t).stunned).toBe(true); // 神杖眩晕
  });

  it('有杖:350 范围外的敌人不被眩晕', () => {
    const w = newWorld();
    const h = ultHero(w, AA, { x: 7000, y: 8000 }, true);
    const far = enemyDummy(w, { x: 7800, y: 8000 }); // 距落点(7300)= 500 > 350
    h.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7300, y: 8000 } });
    for (let i = 0; i < 15; i++) w.step();
    expect(stateOf(far).stunned).toBeFalsy(); // 超出范围不被眩晕
  });
});

// ---- MPH 复制 ----
describe('mph 复制 神杖升级', () => {
  it('神杖 CD 60→45', () => {
    const w = newWorld();
    const h = ultHero(w, MPH, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(60);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(45);
  });

  it('无杖:只召唤 1 个复制体', () => {
    const w = newWorld();
    const h = ultHero(w, MPH, { x: 7000, y: 8000 });
    const unitsBefore = w.units.size;
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 10; i++) w.step();
    const newUnits = w.units.size - unitsBefore;
    expect(newUnits).toBe(1); // 无杖 1 个
  });

  it('有杖:召唤 2 个复制体', () => {
    const w = newWorld();
    const h = ultHero(w, MPH, { x: 7000, y: 8000 }, true);
    const unitsBefore = w.units.size;
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 10; i++) w.step();
    const newUnits = w.units.size - unitsBefore;
    expect(newUnits).toBe(2); // 神杖 2 个
  });
});

// ---- SDM 恶魔清算 ----
describe('sdm 恶魔清算 神杖升级', () => {
  it('神杖 CD 70→50', () => {
    const w = newWorld();
    const h = ultHero(w, SDM, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(70);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(50);
  });

  it('无杖:周围其他敌人不受蔓延伤害', () => {
    const w = newWorld();
    const h = ultHero(w, SDM, { x: 7000, y: 8000 });
    const primary = enemyDummy(w, { x: 7300, y: 8000 }); // 距 300 < 700 射程
    const nearby = enemyDummy(w, { x: 7500, y: 8000 }); // 距 primary 200 < 400
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: primary.id });
    for (let i = 0; i < 15; i++) w.step();
    expect(nearby.hp).toBe(5000); // 无杖不蔓延
    expect(stateOf(nearby).stunned).toBeFalsy();
  });

  it('有杖:周围 400 内其他敌人受到 150 蔓延伤害', () => {
    const w = newWorld();
    const h = ultHero(w, SDM, { x: 7000, y: 8000 }, true);
    const primary = enemyDummy(w, { x: 7300, y: 8000 });
    const nearby = enemyDummy(w, { x: 7500, y: 8000 }); // 距 primary 200 < 400
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: primary.id });
    for (let i = 0; i < 15; i++) w.step();
    expect(nearby.hp).toBeLessThan(5000); // 神杖蔓延命中
    expect(stateOf(nearby).stunned).toBeFalsy(); // 蔓延不眩晕
  });

  it('有杖:400 外的敌人不受蔓延', () => {
    const w = newWorld();
    const h = ultHero(w, SDM, { x: 7000, y: 8000 }, true);
    const primary = enemyDummy(w, { x: 7300, y: 8000 });
    const far = enemyDummy(w, { x: 7750, y: 8000 }); // 距 primary 450 > 400
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: primary.id });
    for (let i = 0; i < 15; i++) w.step();
    expect(far.hp).toBe(5000); // 超出范围不蔓延
    expect(stateOf(far).stunned).toBeFalsy();
  });
});

// ---- MKY 大圣天兵 ----
describe('mky 大圣天兵 神杖升级', () => {
  it('神杖 CD 90→65', () => {
    const w = newWorld();
    const h = ultHero(w, MKY, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(90);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(65);
  });

  it('无杖:450 范围,距落点 500 的敌人不受伤', () => {
    const w = newWorld();
    const h = ultHero(w, MKY, { x: 7000, y: 8000 });
    const castPos = { x: 7300, y: 8000 };
    const far = enemyDummy(w, { x: 7800, y: 8000 }); // 距落点 500 > 450
    h.issueOrder({ type: 'cast', abilityIndex: 3, pos: castPos });
    for (let i = 0; i < 30; i++) w.step();
    expect(far.hp).toBe(5000); // 无杖不中
    expect(stateOf(far).stunned).toBeFalsy();
  });

  it('有杖:范围扩大至 600,距落点 500 的敌人受伤', () => {
    const w = newWorld();
    const h = ultHero(w, MKY, { x: 7000, y: 8000 }, true);
    const castPos = { x: 7300, y: 8000 };
    const t = enemyDummy(w, { x: 7800, y: 8000 }); // 距落点 500 < 600
    h.issueOrder({ type: 'cast', abilityIndex: 3, pos: castPos });
    for (let i = 0; i < 30; i++) w.step();
    expect(t.hp).toBeLessThan(5000); // 神杖范围命中
  });

  it('有杖:范围内敌人被眩晕', () => {
    const w = newWorld();
    const h = ultHero(w, MKY, { x: 7000, y: 8000 }, true);
    const castPos = { x: 7300, y: 8000 };
    const t = enemyDummy(w, { x: 7400, y: 8000 }); // 距落点 100 < 600
    h.issueOrder({ type: 'cast', abilityIndex: 3, pos: castPos });
    for (let i = 0; i < 30; i++) w.step();
    expect(stateOf(t).stunned).toBe(true); // 神杖眩晕
  });

  it('无杖:范围内敌人不被眩晕', () => {
    const w = newWorld();
    const h = ultHero(w, MKY, { x: 7000, y: 8000 });
    const castPos = { x: 7300, y: 8000 };
    const t = enemyDummy(w, { x: 7400, y: 8000 }); // 距落点 100 < 450
    h.issueOrder({ type: 'cast', abilityIndex: 3, pos: castPos });
    for (let i = 0; i < 30; i++) w.step();
    expect(stateOf(t).stunned).toBeFalsy(); // 无杖不眩晕
  });
});
