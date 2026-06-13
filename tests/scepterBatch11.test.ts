import { describe, it, expect } from 'vitest';
import { ultHero, enemyDummy, newWorld } from './scepterTestUtil';
import { MOR, DIS, TIK, VIS, BRO, BAN } from '../src/data/heroes/batch11';
import { abilityDefAt, abilityCooldown } from '../src/sim/abilities';
import { stateOf } from '../src/sim/combat';
import { makeItem } from '../src/sim/items';

// ---- MOR 精神虚妄 ----
describe('mor 精神虚妄 神杖升级', () => {
  it('神杖 CD 120→85', () => {
    const w = newWorld();
    const h = ultHero(w, MOR, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(120);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(85);
  });

  it('无杖:精神冲击命中后不眩晕', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, MOR, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7400, y: 8000 }); // 距 400 < 700
    h0.mp = 2000;
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 20; i++) w0.step();
    expect(t0.hp).toBeLessThan(5000); // 有伤害
    expect(stateOf(t0).stunned).toBeFalsy(); // 无杖不眩晕
  });

  it('有杖:精神冲击命中后眩晕 0.5 秒', () => {
    const w1 = newWorld();
    const h1 = ultHero(w1, MOR, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7400, y: 8000 });
    h1.mp = 2000;
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 15; i++) w1.step(); // castPoint 0.3s = ~9 步后施法
    expect(stateOf(t1).stunned).toBe(true); // 神杖眩晕
  });
});

// ---- DIS 静电风暴 ----
describe('dis 静电风暴 神杖升级', () => {
  it('神杖 CD 80→55', () => {
    const w = newWorld();
    const h = ultHero(w, DIS, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(80);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(55);
  });

  it('有杖:风暴持续时间延长(神杖=+2秒),敌人受到更多伤害', () => {
    // 无杖:风暴持续 4s = 120 步;在 140 步时已结束
    const w0 = newWorld();
    const h0 = ultHero(w0, DIS, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7300, y: 8000 }); // 距 300 < 450
    h0.mp = 2000;
    h0.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7300, y: 8000 } });
    for (let i = 0; i < 140; i++) w0.step();
    const dmg0 = 5000 - t0.hp;

    // 有杖:风暴持续 6s = 180 步;在 140 步时仍在持续
    const w1 = newWorld();
    const h1 = ultHero(w1, DIS, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7300, y: 8000 });
    h1.mp = 2000;
    h1.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7300, y: 8000 } });
    for (let i = 0; i < 140; i++) w1.step();
    const dmg1 = 5000 - t1.hp;

    expect(dmg1).toBeGreaterThan(dmg0); // 神杖时间更长,伤害更多
  });
});

// ---- TIK 重新装填 ----
describe('tik 重新装填 神杖升级', () => {
  it('无杖:施放不伤周围敌人', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, TIK, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7300, y: 8000 }); // 距 300 < 400
    h0.mp = 2000;
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 20; i++) w0.step();
    expect(t0.hp).toBe(5000); // 无杖无脉冲伤害
  });

  it('有杖:施放时脉冲伤害周围 400 内敌人', () => {
    const w1 = newWorld();
    const h1 = ultHero(w1, TIK, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7300, y: 8000 });
    h1.mp = 2000;
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 25; i++) w1.step(); // castPoint 0.6s = 18 步
    expect(t1.hp).toBeLessThan(5000); // 神杖脉冲 150 伤害
  });

  it('有杖:脉冲不打中范围外敌人', () => {
    const w2 = newWorld();
    const h2 = ultHero(w2, TIK, { x: 7000, y: 8000 }, true);
    const t2 = enemyDummy(w2, { x: 7500, y: 8000 }); // 距 500 > 400
    h2.mp = 2000;
    h2.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 25; i++) w2.step();
    expect(t2.hp).toBe(5000); // 范围外不受伤
  });
});

// ---- VIS 石像鬼 ----
describe('vis 石像鬼 神杖升级', () => {
  it('神杖 CD 120→85', () => {
    const w = newWorld();
    const h = ultHero(w, VIS, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(120);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(85);
  });

  it('无杖:召唤 2 只石像鬼', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, VIS, { x: 7000, y: 8000 });
    h0.mp = 2000;
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 20; i++) w0.step();
    const familiars = [...w0.units.values()].filter((u) => u.summonOwnerId === h0.id && u.alive);
    expect(familiars.length).toBe(2);
  });

  it('有杖:召唤 3 只石像鬼', () => {
    const w1 = newWorld();
    const h1 = ultHero(w1, VIS, { x: 7000, y: 8000 }, true);
    h1.mp = 2000;
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 20; i++) w1.step();
    const familiars = [...w1.units.values()].filter((u) => u.summonOwnerId === h1.id && u.alive);
    expect(familiars.length).toBe(3);
  });

  it('有杖:石像鬼血量提升 50%', () => {
    const w2 = newWorld();
    const h2 = ultHero(w2, VIS, { x: 7000, y: 8000 }, true);
    h2.mp = 2000;
    h2.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 20; i++) w2.step();
    const familiar = [...w2.units.values()].find((u) => u.summonOwnerId === h2.id && u.alive);
    // lvl 1: FAMILIAR_HP=400, 神杖 * 1.5 = 600
    expect(familiar!.calc.maxHp).toBeGreaterThan(400);
  });
});

// ---- BRO 蛛群 ----
describe('bro 蛛群 神杖升级', () => {
  it('神杖 CD 40→28', () => {
    const w = newWorld();
    const h = ultHero(w, BRO, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(40);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(28);
  });

  it('无杖 lvl1:召唤 3 只蛛子', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, BRO, { x: 7000, y: 8000 });
    h0.mp = 2000;
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 20; i++) w0.step();
    const spiders = [...w0.units.values()].filter((u) => u.summonOwnerId === h0.id && u.alive);
    expect(spiders.length).toBe(3); // SPIDER_COUNT[0]=3
  });

  it('有杖 lvl1:召唤 5 只蛛子(3+2)', () => {
    const w1 = newWorld();
    const h1 = ultHero(w1, BRO, { x: 7000, y: 8000 }, true);
    h1.mp = 2000;
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 20; i++) w1.step();
    const spiders = [...w1.units.values()].filter((u) => u.summonOwnerId === h1.id && u.alive);
    expect(spiders.length).toBe(5); // SPIDER_COUNT[0]+2 = 5
  });
});

// ---- BAN 末日缠绕 ----
describe('ban 末日缠绕 神杖升级', () => {
  it('神杖 CD 110→80', () => {
    const w = newWorld();
    const h = ultHero(w, BAN, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(110);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(80);
  });

  it('无杖:缠绕伤害正常,目标未额外受减速', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, BAN, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7300, y: 8000 }); // 距 300 < castRange 500
    h0.mp = 2000;
    h0.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t0.id });
    for (let i = 0; i < 120; i++) w0.step(); // 引导完成 ~3.5s=105步
    const dmg0 = 5000 - t0.hp;
    expect(dmg0).toBeGreaterThan(0); // 有伤害
  });

  it('有杖:缠绕期间额外伤害 80/tick,总伤高于无杖', () => {
    // 无杖
    const w0 = newWorld();
    const h0 = ultHero(w0, BAN, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7300, y: 8000 });
    h0.mp = 2000;
    h0.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t0.id });
    for (let i = 0; i < 120; i++) w0.step();
    const dmg0 = 5000 - t0.hp;

    // 有杖
    const w1 = newWorld();
    const h1 = ultHero(w1, BAN, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7300, y: 8000 });
    h1.mp = 2000;
    h1.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t1.id });
    for (let i = 0; i < 120; i++) w1.step();
    const dmg1 = 5000 - t1.hp;

    expect(dmg1).toBeGreaterThan(dmg0); // 神杖每 tick +80 伤害,总伤更高
  });
});
