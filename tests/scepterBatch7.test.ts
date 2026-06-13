/** batch7 英雄大招阿哈利姆神杖升级测试 */
import { describe, it, expect } from 'vitest';
import { ultHero, enemyDummy, newWorld } from './scepterTestUtil';
import { GRAF, SELENE, DRAK, VENONA, GROM, OLIVE } from '../src/data/heroes/batch7';
import { abilityDefAt, abilityCooldown, learnAbility } from '../src/sim/abilities';
import { stateOf } from '../src/sim/combat';
import { makeItem } from '../src/sim/items';
import { V } from '../src/core/vec2';

// ============ GRAF 引爆 ============
describe('graf 引爆:神杖扩大范围+眩晕', () => {
  it('神杖 CD 16→10', () => {
    const w = newWorld();
    const h = ultHero(w, GRAF, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(16);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(10);
  });

  it('无杖:距地雷 420 外的敌人不受伤(范围 350)', () => {
    const w = newWorld();
    const h = ultHero(w, GRAF, { x: 7000, y: 8000 });
    h.mp = 1000;
    // 额外给一点技能点,学习地雷技能
    h.heroMeta!.skillPoints = 1;
    learnAbility(w, h, 0);
    const t = enemyDummy(w, { x: 7420, y: 8000 }); // 距地雷落点 420 > 350
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: V.clone({ x: 7000, y: 8000 }) });
    for (let i = 0; i < 15; i++) w.step(); // 等地雷埋好
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 15; i++) w.step();
    expect(t.hp).toBe(5000); // 无杖范围不及
  });

  it('有杖:范围扩至 500,距地雷 450 内敌人受伤', () => {
    const w = newWorld();
    const h = ultHero(w, GRAF, { x: 7000, y: 8000 }, true);
    h.mp = 1000;
    h.heroMeta!.skillPoints = 1;
    learnAbility(w, h, 0);
    const t = enemyDummy(w, { x: 7450, y: 8000 }); // 距地雷落点 450 < 500
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: V.clone({ x: 7000, y: 8000 }) });
    for (let i = 0; i < 15; i++) w.step();
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 15; i++) w.step();
    expect(t.hp).toBeLessThan(5000); // 神杖范围命中
  });

  it('有杖:爆炸区域内敌人被眩晕', () => {
    const w = newWorld();
    const h = ultHero(w, GRAF, { x: 7000, y: 8000 }, true);
    h.mp = 1000;
    h.heroMeta!.skillPoints = 1;
    learnAbility(w, h, 0);
    const t = enemyDummy(w, { x: 7200, y: 8000 }); // 距地雷落点 200 < 500
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: V.clone({ x: 7000, y: 8000 }) });
    for (let i = 0; i < 15; i++) w.step();
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 15; i++) w.step();
    expect(t.modifiers.some((m) => m.key === 'graf_detonate_sc_stun')).toBe(true);
  });

  it('无杖:不施加眩晕', () => {
    const w = newWorld();
    const h = ultHero(w, GRAF, { x: 7000, y: 8000 });
    h.mp = 1000;
    h.heroMeta!.skillPoints = 1;
    learnAbility(w, h, 0);
    const t = enemyDummy(w, { x: 7200, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: V.clone({ x: 7000, y: 8000 }) });
    for (let i = 0; i < 15; i++) w.step();
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 15; i++) w.step();
    expect(stateOf(t).stunned).toBeFalsy();
  });
});

// ============ SELENE 月华倾泻 ============
describe('selene 月华倾泻:神杖强化治疗+减速', () => {
  it('神杖 CD 120→80', () => {
    const w = newWorld();
    const h = ultHero(w, SELENE, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(120);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(80);
  });

  it('有杖治疗量高于无杖', () => {
    // 无杖: 记录施法后血量
    const w0 = newWorld();
    const h0 = ultHero(w0, SELENE, { x: 7000, y: 8000 });
    h0.mp = 1000;
    h0.hp = h0.calc.maxHp * 0.5; // 扣到半血
    const hpBefore0 = h0.hp;
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 20; i++) w0.step(); // 足够等过 castPoint 0.4s
    const hpAfter0 = h0.hp;

    // 有杖
    const w1 = newWorld();
    const h1 = ultHero(w1, SELENE, { x: 7000, y: 8000 }, true);
    h1.mp = 1000;
    h1.hp = h1.calc.maxHp * 0.5;
    const hpBefore1 = h1.hp;
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 20; i++) w1.step();
    const hpAfter1 = h1.hp;

    expect(hpAfter0).toBeGreaterThan(hpBefore0); // 无杖也治疗
    expect(hpAfter1).toBeGreaterThan(hpAfter0);  // 有杖治疗更多
  });

  it('无杖:不施加减速', () => {
    const w = newWorld();
    const h = ultHero(w, SELENE, { x: 7000, y: 8000 });
    h.mp = 1000;
    const t = enemyDummy(w, { x: 7200, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 20; i++) w.step();
    expect(t.modifiers.some((m) => m.key === 'selene_shower_sc_slow')).toBe(false);
  });

  it('有杖:对敌方英雄施加减速', () => {
    const w = newWorld();
    const h = ultHero(w, SELENE, { x: 7000, y: 8000 }, true);
    h.mp = 1000;
    const t = enemyDummy(w, { x: 7200, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 20; i++) w.step();
    expect(t.modifiers.some((m) => m.key === 'selene_shower_sc_slow')).toBe(true);
  });
});

// ============ DRAK 远古巨龙 ============
describe('drak 远古巨龙:神杖延长形态+变身爆炸', () => {
  it('神杖 CD 110→75', () => {
    const w = newWorld();
    const h = ultHero(w, DRAK, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(110);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(75);
  });

  it('有杖:龙形态持续时间更长(45s modifier)', () => {
    const w = newWorld();
    const h = ultHero(w, DRAK, { x: 7000, y: 8000 }, true);
    h.mp = 1000;
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 10; i++) w.step();
    const buff = h.modifiers.find((m) => m.key === 'drak_elder_buff');
    expect(buff).toBeDefined();
    // expiresAt should be ~45s from now, not ~30s
    expect(buff!.expiresAt).toBeGreaterThan(w.time + 40);
  });

  it('无杖:形态持续 30s(expiresAt < time+35)', () => {
    const w = newWorld();
    const h = ultHero(w, DRAK, { x: 7000, y: 8000 });
    h.mp = 1000;
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 10; i++) w.step();
    const buff = h.modifiers.find((m) => m.key === 'drak_elder_buff');
    expect(buff).toBeDefined();
    expect(buff!.expiresAt).toBeLessThan(w.time + 35);
  });

  it('有杖:变身时伤害周围 400 内敌人', () => {
    const w = newWorld();
    const h = ultHero(w, DRAK, { x: 7000, y: 8000 }, true);
    h.mp = 1000;
    const t = enemyDummy(w, { x: 7300, y: 8000 }); // 距 300 < 400
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 10; i++) w.step();
    expect(t.hp).toBeLessThan(5000); // 神杖爆炸伤害命中
  });

  it('无杖:变身不伤害周围敌人', () => {
    const w = newWorld();
    const h = ultHero(w, DRAK, { x: 7000, y: 8000 });
    h.mp = 1000;
    const t = enemyDummy(w, { x: 7300, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 10; i++) w.step();
    expect(t.hp).toBe(5000); // 无杖不伤
  });
});

// ============ VENONA 剧毒新星 ============
describe('venona 剧毒新星:神杖扩大范围+纯粹伤害', () => {
  it('神杖 CD 80→55', () => {
    const w = newWorld();
    const h = ultHero(w, VENONA, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(80);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(55);
  });

  it('无杖:距 700 外的敌人不受新星伤害(范围 600)', () => {
    const w = newWorld();
    const h = ultHero(w, VENONA, { x: 7000, y: 8000 });
    h.mp = 1000;
    const t = enemyDummy(w, { x: 7700, y: 8000 }); // 距 700 > 600
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 10; i++) w.step();
    expect(t.hp).toBe(5000); // 无杖范围不及
  });

  it('有杖:范围扩至 900,距 700 的敌人受到伤害', () => {
    const w = newWorld();
    const h = ultHero(w, VENONA, { x: 7000, y: 8000 }, true);
    h.mp = 1000;
    const t = enemyDummy(w, { x: 7700, y: 8000 }); // 距 700 < 900
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 10; i++) w.step();
    expect(t.hp).toBeLessThan(5000); // 神杖范围命中
  });
});

// ============ GROM 战斗专注·爆发 ============
describe('grom 战斗专注·爆发:神杖延长持续+增加移速', () => {
  it('神杖 CD 45→30', () => {
    const w = newWorld();
    const h = ultHero(w, GROM, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(45);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(30);
  });

  it('有杖:trance_buff 持续时间更长(10s)', () => {
    const w = newWorld();
    const h = ultHero(w, GROM, { x: 7000, y: 8000 }, true);
    h.mp = 1000;
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 5; i++) w.step();
    const buff = h.modifiers.find((m) => m.key === 'grom_trance_buff');
    expect(buff).toBeDefined();
    expect(buff!.expiresAt).toBeGreaterThan(w.time + 8); // > 8s 意味着有杖 10s
  });

  it('无杖:trance_buff 持续 7s(expiresAt < time+9)', () => {
    const w = newWorld();
    const h = ultHero(w, GROM, { x: 7000, y: 8000 });
    h.mp = 1000;
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 5; i++) w.step();
    const buff = h.modifiers.find((m) => m.key === 'grom_trance_buff');
    expect(buff).toBeDefined();
    expect(buff!.expiresAt).toBeLessThan(w.time + 9); // 无杖 7s
  });

  it('有杖:buff 包含移速加成', () => {
    const w = newWorld();
    const h = ultHero(w, GROM, { x: 7000, y: 8000 }, true);
    h.mp = 1000;
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 5; i++) w.step();
    const buff = h.modifiers.find((m) => m.key === 'grom_trance_buff');
    expect(buff?.def.stats?.bonusMoveSpeedPct).toBe(0.2);
  });

  it('无杖:buff 不包含移速加成', () => {
    const w = newWorld();
    const h = ultHero(w, GROM, { x: 7000, y: 8000 });
    h.mp = 1000;
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 5; i++) w.step();
    const buff = h.modifiers.find((m) => m.key === 'grom_trance_buff');
    expect(buff?.def.stats?.bonusMoveSpeedPct).toBeFalsy();
  });
});

// ============ OLIVE 灵能陷阱 ============
describe('olive 灵能陷阱:神杖扩大范围+沉默', () => {
  it('神杖 CD 11→7', () => {
    const w = newWorld();
    const h = ultHero(w, OLIVE, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(11);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(7);
  });

  it('无杖:距落点 450 外的敌人不受伤(范围 400)', () => {
    const w = newWorld();
    const h = ultHero(w, OLIVE, { x: 7000, y: 8000 });
    h.mp = 1000;
    const trapPos = { x: 8000, y: 8000 };
    const t = enemyDummy(w, { x: 8450, y: 8000 }); // 距落点 450 > 400
    h.issueOrder({ type: 'cast', abilityIndex: 3, pos: V.clone(trapPos) });
    for (let i = 0; i < 10; i++) w.step();
    expect(t.hp).toBe(5000); // 无杖范围不及
  });

  it('有杖:范围扩至 600,距落点 550 内敌人受伤', () => {
    const w = newWorld();
    const h = ultHero(w, OLIVE, { x: 7000, y: 8000 }, true);
    h.mp = 1000;
    const trapPos = { x: 8000, y: 8000 };
    const t = enemyDummy(w, { x: 8550, y: 8000 }); // 距落点 550 < 600
    h.issueOrder({ type: 'cast', abilityIndex: 3, pos: V.clone(trapPos) });
    for (let i = 0; i < 10; i++) w.step();
    expect(t.hp).toBeLessThan(5000); // 神杖范围命中
  });

  it('无杖:不施加沉默', () => {
    const w = newWorld();
    const h = ultHero(w, OLIVE, { x: 7000, y: 8000 });
    h.mp = 1000;
    const trapPos = { x: 8000, y: 8000 };
    const t = enemyDummy(w, { x: 8200, y: 8000 }); // 距落点 200 < 400
    h.issueOrder({ type: 'cast', abilityIndex: 3, pos: V.clone(trapPos) });
    for (let i = 0; i < 10; i++) w.step();
    expect(stateOf(t).silenced).toBeFalsy();
  });

  it('有杖:对陷阱范围内敌人施加沉默', () => {
    const w = newWorld();
    const h = ultHero(w, OLIVE, { x: 7000, y: 8000 }, true);
    h.mp = 1000;
    const trapPos = { x: 8000, y: 8000 };
    const t = enemyDummy(w, { x: 8200, y: 8000 }); // 距落点 200 < 600
    h.issueOrder({ type: 'cast', abilityIndex: 3, pos: V.clone(trapPos) });
    for (let i = 0; i < 10; i++) w.step();
    expect(t.modifiers.some((m) => m.key === 'olive_trap_sc_silence')).toBe(true);
  });
});
