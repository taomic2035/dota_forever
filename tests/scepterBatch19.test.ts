import { describe, it, expect } from 'vitest';
import { ultHero, enemyDummy, newWorld } from './scepterTestUtil';
import { SNK, BAT, SHM, GRM, ENCH, ORA } from '../src/data/heroes/batch19';
import { abilityDefAt, abilityCooldown, syncScepterPassives } from '../src/sim/abilities';
import { stateOf, recalcUnit } from '../src/sim/combat';
import { makeItem } from '../src/sim/items';

// ---- SNK 地震(channel) ----
describe('snk 地震 神杖升级', () => {
  it('神杖 CD 80→55', () => {
    const w = newWorld();
    const h = ultHero(w, SNK, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(80);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(55);
  });

  it('无杖:channel tick 只命中 600 内的敌人(700 外不受影响)', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, SNK, { x: 7000, y: 8000 });
    const far = enemyDummy(w0, { x: 7710, y: 8000 }); // 距 710 > 600
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 60; i++) w0.step();
    expect(far.hp).toBe(5000); // 无杖范围 600,不命中
  });

  it('有杖:channel tick 范围扩大至 800,710 内的敌人受到伤害', () => {
    const w1 = newWorld();
    const h1 = ultHero(w1, SNK, { x: 7000, y: 8000 }, true);
    const mid = enemyDummy(w1, { x: 7710, y: 8000 }); // 距 710 < 800
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 60; i++) w1.step();
    expect(mid.hp).toBeLessThan(5000); // 神杖范围命中
  });

  it('有杖:命中的敌人不被眩晕(地震只减速)', () => {
    const w = newWorld();
    const h = ultHero(w, SNK, { x: 7000, y: 8000 }, true);
    const t = enemyDummy(w, { x: 7300, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 20; i++) w.step();
    expect(stateOf(t).stunned).toBeFalsy();
  });
});

// ---- BAT 烈焰套索(active unit) ----
describe('bat 烈焰套索 神杖升级', () => {
  it('神杖 CD 70→50', () => {
    const w = newWorld();
    const h = ultHero(w, BAT, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(70);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(50);
  });

  it('无杖:套索不附加减甲', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, BAT, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7400, y: 8000 });
    const armorBefore = t0.calc.armor;
    h0.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t0.id });
    for (let i = 0; i < 40; i++) w0.step();
    expect(t0.calc.armor).toBe(armorBefore); // 无杖不减甲
  });

  it('有杖:套索 tick 附带减甲(-4)', () => {
    const w1 = newWorld();
    const h1 = ultHero(w1, BAT, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7400, y: 8000 });
    const armorBefore = t1.calc.armor;
    h1.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t1.id });
    for (let i = 0; i < 40; i++) w1.step();
    expect(t1.calc.armor).toBeLessThan(armorBefore); // 神杖减甲生效
  });

  it('有杖:套索目标被眩晕', () => {
    const w = newWorld();
    const h = ultHero(w, BAT, { x: 7000, y: 8000 }, true);
    const t = enemyDummy(w, { x: 7400, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t.id });
    for (let i = 0; i < 20; i++) w.step();
    expect(stateOf(t).stunned).toBe(true);
  });
});

// ---- SHM 群蛇守卫(active summon) ----
describe('shm 群蛇守卫 神杖升级', () => {
  it('神杖 CD 90→65', () => {
    const w = newWorld();
    const h = ultHero(w, SHM, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(90);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(65);
  });

  it('无杖:召出 4 个守卫', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, SHM, { x: 7000, y: 8000 });
    h0.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7200, y: 8000 } });
    for (let i = 0; i < 20; i++) w0.step();
    const summoned = [...w0.units.values()].filter((u) => u.summonOwnerId === h0.id);
    expect(summoned.length).toBe(4);
  });

  it('有杖:召出 5 个守卫', () => {
    const w1 = newWorld();
    const h1 = ultHero(w1, SHM, { x: 7000, y: 8000 }, true);
    h1.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7200, y: 8000 } });
    for (let i = 0; i < 20; i++) w1.step();
    const summoned = [...w1.units.values()].filter((u) => u.summonOwnerId === h1.id);
    expect(summoned.length).toBe(5);
  });
});

// ---- GRM 灵魂链结(active point) ----
describe('grm 灵魂链结 神杖升级', () => {
  it('神杖 CD 70→50', () => {
    const w = newWorld();
    const h = ultHero(w, GRM, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(70);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(50);
  });

  it('无杖:灵魂链结命中敌人不被眩晕', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, GRM, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7200, y: 8000 }); // 距 200 < 400
    h0.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7200, y: 8000 } });
    for (let i = 0; i < 20; i++) w0.step();
    expect(t0.hp).toBeLessThan(5000); // 受到伤害
    expect(stateOf(t0).stunned).toBeFalsy(); // 无杖不眩晕
  });

  it('有杖:灵魂链结初始附加 1.2s 眩晕', () => {
    const w1 = newWorld();
    const h1 = ultHero(w1, GRM, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7200, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7200, y: 8000 } });
    for (let i = 0; i < 20; i++) w1.step();
    expect(stateOf(t1).stunned).toBe(true); // 神杖眩晕
  });

  it('有杖:400 外的敌人不受眩晕', () => {
    const w = newWorld();
    const h = ultHero(w, GRM, { x: 7000, y: 8000 }, true);
    const far = enemyDummy(w, { x: 7700, y: 8000 }); // 距落点 7000 位置 700 > 400
    h.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7200, y: 8000 } });
    for (let i = 0; i < 20; i++) w.step();
    expect(stateOf(far).stunned).toBeFalsy();
  });
});

// ---- ENCH 不可侵犯(passive scepterPassive) ----
describe('ench 不可侵犯 神杖升级', () => {
  it('无杖:不附带闪避(evasion=0)', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, ENCH, { x: 7000, y: 8000 }, false);
    recalcUnit(h0);
    expect(h0.calc.evasion).toBe(0);
  });

  it('有杖:神杖被动赋予 15% 闪避(lvl1: 0.13+0.02=0.15)', () => {
    const w1 = newWorld();
    const h1 = ultHero(w1, ENCH, { x: 7000, y: 8000 }, true);
    syncScepterPassives(w1, h1);
    recalcUnit(h1);
    expect(h1.calc.evasion).toBeCloseTo(0.15, 5);
  });

  it('出售神杖后闪避消失', () => {
    const w = newWorld();
    const h = ultHero(w, ENCH, { x: 7000, y: 8000 }, true);
    syncScepterPassives(w, h);
    recalcUnit(h);
    expect(h.calc.evasion).toBeCloseTo(0.15, 5);

    h.inventory[0] = null;
    syncScepterPassives(w, h);
    recalcUnit(h);
    expect(h.calc.evasion).toBe(0);
  });
});

// ---- ORA 虚妄之诺(active ally-target) ----
describe('ora 虚妄之诺 神杖升级', () => {
  it('神杖 CD 90→65', () => {
    const w = newWorld();
    const h = ultHero(w, ORA, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(90);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(65);
  });

  it('无杖:施放仅作用于指定目标自身', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, ORA, { x: 7000, y: 8000 });
    // 对自身施放虚妄之诺
    h0.issueOrder({ type: 'cast', abilityIndex: 3, targetId: h0.id });
    for (let i = 0; i < 15; i++) w0.step();
    // 验证 h0 身上有 buff(ora_promise_buff)
    const hasBuff = h0.modifiers.some((m) => m.key === 'ora_promise_buff');
    expect(hasBuff).toBe(true);
  });

  it('有杖:自身施放后 700 内其他友方英雄也获得 buff', () => {
    const w1 = newWorld();
    const h1 = ultHero(w1, ORA, { x: 7000, y: 8000 }, true);
    // 在范围内再生成一个友方英雄
    const ally = ultHero(w1, ORA, { x: 7300, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3, targetId: h1.id });
    for (let i = 0; i < 15; i++) w1.step();
    const allyHasBuff = ally.modifiers.some((m) => m.key === 'ora_promise_buff');
    expect(allyHasBuff).toBe(true); // 神杖传播给范围内友方
  });

  it('有杖:施放后敌人不被眩晕', () => {
    const w = newWorld();
    const h = ultHero(w, ORA, { x: 7000, y: 8000 }, true);
    const t = enemyDummy(w, { x: 7300, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: h.id });
    for (let i = 0; i < 15; i++) w.step();
    expect(stateOf(t).stunned).toBeFalsy();
  });
});
