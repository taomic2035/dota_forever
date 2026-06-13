import { describe, it, expect } from 'vitest';
import { ultHero, enemyDummy, newWorld } from './scepterTestUtil';
import { KAZ, SELAS, GOLON, NAYA, VOS, VIRA } from '../src/data/heroes/batch3';
import { abilityDefAt, abilityCooldown } from '../src/sim/abilities';
import { stateOf } from '../src/sim/combat';
import { makeItem } from '../src/sim/items';
import { V } from '../src/core/vec2';

// ---- KAZ 狂战士之血 ----
describe('kaz 狂战士之血 神杖升级', () => {
  it('神杖 CD 60→40', () => {
    const w = newWorld();
    const h = ultHero(w, KAZ, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(60);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(40);
  });

  it('无杖:周围敌人不受到血浪伤害', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, KAZ, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7300, y: 8000 }); // 距 300 < 400
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 14; i++) w0.step();
    expect(t0.hp).toBe(5000); // 无杖不伤
  });

  it('有杖:施放时血浪伤害周围 400 内敌人', () => {
    const w1 = newWorld();
    const h1 = ultHero(w1, KAZ, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7300, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 14; i++) w1.step();
    expect(t1.hp).toBeLessThan(5000); // 神杖血浪命中
  });
});

// ---- SELAS 箭雨风暴 ----
describe('selas 箭雨风暴 神杖升级', () => {
  it('神杖 CD 70→50', () => {
    const w = newWorld();
    const h = ultHero(w, SELAS, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(70);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(50);
  });

  it('无杖:距落点 550(> 450 范围)的敌人不受影响', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, SELAS, { x: 7000, y: 8000 });
    const castPos = { x: 7500, y: 8000 };
    const t0 = enemyDummy(w0, { x: 8050, y: 8000 }); // 距落点 550 > 450
    h0.issueOrder({ type: 'cast', abilityIndex: 3, pos: castPos });
    for (let i = 0; i < 60; i++) w0.step();
    expect(t0.hp).toBe(5000); // 无杖不中
  });

  it('有杖:范围扩大至 650,命中更远的敌人', () => {
    const w1 = newWorld();
    const h1 = ultHero(w1, SELAS, { x: 7000, y: 8000 }, true);
    const castPos = { x: 7500, y: 8000 };
    const t1 = enemyDummy(w1, { x: 8050, y: 8000 }); // 距落点 550 < 650
    h1.issueOrder({ type: 'cast', abilityIndex: 3, pos: castPos });
    for (let i = 0; i < 60; i++) w1.step();
    expect(t1.hp).toBeLessThan(5000); // 神杖范围命中
  });
});

// ---- GOLON 大地禁锢 ----
describe('golon 大地禁锢 神杖升级', () => {
  it('神杖 CD 80→55', () => {
    const w = newWorld();
    const h = ultHero(w, GOLON, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(80);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(55);
  });

  it('无杖:距落点 430(> 350 范围)的敌人不被禁锢', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, GOLON, { x: 7000, y: 8000 });
    const castPos = { x: 7400, y: 8000 };
    const t0 = enemyDummy(w0, { x: 7830, y: 8000 }); // 距落点 430 > 350
    h0.issueOrder({ type: 'cast', abilityIndex: 3, pos: castPos });
    for (let i = 0; i < 20; i++) w0.step();
    expect(t0.hp).toBe(5000); // 无杖不中外圈
  });

  it('有杖:范围扩大至 500,命中更远的敌人并造成伤害', () => {
    const w1 = newWorld();
    const h1 = ultHero(w1, GOLON, { x: 7000, y: 8000 }, true);
    const castPos = { x: 7400, y: 8000 };
    const t1 = enemyDummy(w1, { x: 7830, y: 8000 }); // 距落点 430 < 500
    h1.issueOrder({ type: 'cast', abilityIndex: 3, pos: castPos });
    // castPoint 0.4s=12 steps, 首 tick 0.5s=15 steps 后; 共 ≥30 步
    for (let i = 0; i < 35; i++) w1.step();
    expect(t1.hp).toBeLessThan(5000); // 神杖范围命中并受到 DoT 伤害
  });
});

// ---- NAYA 自然之怒 ----
describe('naya 自然之怒 神杖升级', () => {
  it('神杖 CD 60→42', () => {
    const w = newWorld();
    const h = ultHero(w, NAYA, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(60);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(42);
  });

  it('无杖:命中目标不眩晕', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, NAYA, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7300, y: 8000 });
    h0.issueOrder({ type: 'cast', abilityIndex: 3, pos: V.clone(t0.pos) });
    for (let i = 0; i < 50; i++) w0.step(); // 等待首个 tick
    expect(t0.hp).toBeLessThan(5000); // 有伤害
    expect(stateOf(t0).stunned).toBeFalsy(); // 无杖不眩晕
  });

  it('有杖:命中目标受到眩晕', () => {
    const w1 = newWorld();
    const h1 = ultHero(w1, NAYA, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7300, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3, pos: V.clone(t1.pos) });
    for (let i = 0; i < 50; i++) w1.step(); // 等待首个 tick 并眩晕
    expect(stateOf(t1).stunned).toBe(true); // 神杖眩晕
  });
});

// ---- VOS 亡者脉冲 ----
describe('vos 亡者脉冲 神杖升级', () => {
  it('神杖 CD 30→20', () => {
    const w = newWorld();
    const h = ultHero(w, VOS, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(30);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(20);
  });

  it('无杖:范围 550,距 700 的敌人不受影响', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, VOS, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7700, y: 8000 }); // 距 700 > 550
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 18; i++) w0.step();
    expect(t0.hp).toBe(5000); // 无杖不中
  });

  it('有杖:范围扩大至 750,命中更远敌人', () => {
    const w1 = newWorld();
    const h1 = ultHero(w1, VOS, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7700, y: 8000 }); // 距 700 < 750
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 18; i++) w1.step();
    expect(t1.hp).toBeLessThan(5000); // 神杖范围命中
  });
});

// ---- VIRA 恐惧降临 ----
describe('vira 恐惧降临 神杖升级', () => {
  it('神杖 CD 90→65', () => {
    const w = newWorld();
    const h = ultHero(w, VIRA, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(90);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(65);
  });

  it('无杖:敌人不被眩晕', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, VIRA, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7400, y: 8000 }); // 距 400 < 600
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 18; i++) w0.step();
    expect(t0.hp).toBeLessThan(5000); // 有伤害
    expect(stateOf(t0).stunned).toBeFalsy(); // 无杖不眩晕
  });

  it('有杖:敌人被眩晕 1.5 秒且伤害更高', () => {
    const w1 = newWorld();
    const h1 = ultHero(w1, VIRA, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7400, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 18; i++) w1.step();
    expect(stateOf(t1).stunned).toBe(true); // 神杖眩晕

    // 神杖伤害 > 无杖伤害(220 vs 150)
    const w0 = newWorld();
    const h0 = ultHero(w0, VIRA, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7400, y: 8000 });
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 18; i++) w0.step();
    expect(5000 - t1.hp).toBeGreaterThan(5000 - t0.hp); // 神杖伤害更高
  });
});

