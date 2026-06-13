import { describe, it, expect } from 'vitest';
import { ultHero, enemyDummy, newWorld } from './scepterTestUtil';
import { VYN, LEON, KAOS, KOG, ENI, THEO } from '../src/data/heroes/batch9';
import { abilityDefAt, abilityCooldown } from '../src/sim/abilities';
import { stateOf } from '../src/sim/combat';
import { makeItem } from '../src/sim/items';

// ---- VYN 法力虚空 ----
describe('vyn 法力虚空 神杖升级', () => {
  it('神杖 CD 80→55', () => {
    const w = newWorld();
    const h = ultHero(w, VYN, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(80);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(55);
  });

  it('无杖:主目标眩晕短暂(0.3 秒后消散)', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, VYN, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7200, y: 8000 });
    h0.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t0.id });
    // castPoint 0.3s ≈ 9 steps, 再等 18 steps(0.6s) 确保眩晕 0.3s 已过
    for (let i = 0; i < 27; i++) w0.step();
    expect(stateOf(t0).stunned).toBeFalsy();
  });

  it('有杖:主目标受到持续 1.2 秒眩晕', () => {
    const w1 = newWorld();
    const h1 = ultHero(w1, VYN, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7200, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t1.id });
    // castPoint 0.3s ≈ 9 steps, 再等 6 steps(0.2s) = 0.5s 总经过,眩晕 1.2s 仍在
    for (let i = 0; i < 15; i++) w1.step();
    expect(stateOf(t1).stunned).toBe(true);
  });
});

// ---- LEON 决斗 ----
describe('leon 决斗 神杖升级', () => {
  it('神杖 CD 50→35', () => {
    const w = newWorld();
    const h = ultHero(w, LEON, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(50);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(35);
  });

  it('无杖:决斗结束后胜者不获得攻速 buff', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, LEON, { x: 7000, y: 8000 });
    // 假人血量极低,决斗一开始就死
    const t0 = enemyDummy(w0, { x: 7100, y: 8000 });
    t0.hp = 1;
    h0.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t0.id });
    for (let i = 0; i < 30; i++) w0.step();
    // 无杖:无 leon_duel_sc_as modifier
    expect(h0.modifiers.find((m) => m.key === 'leon_duel_sc_as')).toBeUndefined();
  });

  it('有杖:决斗胜者获得 50% 攻速 buff', () => {
    const w1 = newWorld();
    const h1 = ultHero(w1, LEON, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7100, y: 8000 });
    t1.hp = 1;
    h1.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t1.id });
    for (let i = 0; i < 30; i++) w1.step();
    // 有杖:获得攻速 buff
    expect(h1.modifiers.find((m) => m.key === 'leon_duel_sc_as')).toBeDefined();
  });
});

// ---- KAOS 混沌幻象 ----
describe('kaos 混沌幻象 神杖升级', () => {
  it('神杖 CD 120→85', () => {
    const w = newWorld();
    const h = ultHero(w, KAOS, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(120);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(85);
  });

  it('无杖:召唤 2 个幻象', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, KAOS, { x: 7000, y: 8000 });
    const before = w0.units.size;
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 12; i++) w0.step();
    const after = w0.units.size;
    expect(after - before).toBe(2); // 无杖 lvl1 召唤 2 个
  });

  it('有杖:额外+1 个幻象(共 3 个)', () => {
    const w1 = newWorld();
    const h1 = ultHero(w1, KAOS, { x: 7000, y: 8000 }, true);
    const before = w1.units.size;
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 12; i++) w1.step();
    const after = w1.units.size;
    expect(after - before).toBe(3); // 神杖 lvl1 召唤 3 个
  });
});

// ---- KOG 能量牢笼 ----
describe('kog 能量牢笼 神杖升级', () => {
  it('神杖 CD 70→50', () => {
    const w = newWorld();
    const h = ultHero(w, KOG, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(70);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(50);
  });

  it('无杖:距 450 的敌人不被牢笼(范围 400)', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, KOG, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7450, y: 8000 }); // 距 450 > 400
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 12; i++) w0.step();
    expect(t0.hp).toBe(5000); // 无杖不中
  });

  it('有杖:范围扩大至 550,命中更远敌人', () => {
    const w1 = newWorld();
    const h1 = ultHero(w1, KOG, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7450, y: 8000 }); // 距 450 < 550
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 12; i++) w1.step();
    expect(t1.hp).toBeLessThan(5000); // 神杖范围命中
  });
});

// ---- ENI 黑洞 ----
describe('eni 黑洞 神杖升级', () => {
  it('神杖 CD 180→130', () => {
    const w = newWorld();
    const h = ultHero(w, ENI, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(180);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(130);
  });

  it('无杖:距落点 450(> 420)的敌人不受伤', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, ENI, { x: 7000, y: 8000 });
    const castPos = { x: 7200, y: 8000 };
    const t0 = enemyDummy(w0, { x: 7650, y: 8000 }); // 距落点 450 > 420
    h0.issueOrder({ type: 'cast', abilityIndex: 3, pos: castPos });
    for (let i = 0; i < 60; i++) w0.step();
    expect(t0.hp).toBe(5000); // 无杖不中
  });

  it('有杖:引力半径扩至 550,命中更远敌人并造成更高伤害', () => {
    const w1 = newWorld();
    const h1 = ultHero(w1, ENI, { x: 7000, y: 8000 }, true);
    const castPos = { x: 7200, y: 8000 };
    const t1 = enemyDummy(w1, { x: 7650, y: 8000 }); // 距落点 450 < 550
    h1.issueOrder({ type: 'cast', abilityIndex: 3, pos: castPos });
    for (let i = 0; i < 60; i++) w1.step();
    expect(t1.hp).toBeLessThan(5000); // 神杖范围命中

    // 有杖伤害应高于无杖(150% tick)
    const w0 = newWorld();
    const h0 = ultHero(w0, ENI, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7300, y: 8000 }); // 距落点 100 < 420,两者均中
    const w1b = newWorld();
    const h1b = ultHero(w1b, ENI, { x: 7000, y: 8000 }, true);
    const t1c = enemyDummy(w1b, { x: 7300, y: 8000 });
    h0.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7200, y: 8000 } });
    h1b.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7200, y: 8000 } });
    for (let i = 0; i < 60; i++) { w0.step(); w1b.step(); }
    expect(5000 - t1c.hp).toBeGreaterThan(5000 - t0.hp); // 神杖伤害更高
  });
});

// ---- THEO 守护天使 ----
describe('theo 守护天使 神杖升级', () => {
  it('神杖 CD 120→85', () => {
    const w = newWorld();
    const h = ultHero(w, THEO, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(120);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(85);
  });

  it('无杖:900 范围外友军不获得 physImmune', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, THEO, { x: 7000, y: 8000 });
    // 友军在 1100 范围外(> 900)
    const ally0 = ultHero(w0, VYN, { x: 8100, y: 8000 });
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 14; i++) w0.step();
    expect(stateOf(ally0).physImmune).toBeFalsy();
  });

  it('有杖:范围扩大至 1200,更远的友军获得 physImmune', () => {
    const w1 = newWorld();
    const h1 = ultHero(w1, THEO, { x: 7000, y: 8000 }, true);
    const ally1 = ultHero(w1, VYN, { x: 8100, y: 8000 }); // 距 1100 < 1200
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 14; i++) w1.step();
    expect(stateOf(ally1).physImmune).toBe(true);
  });
});
