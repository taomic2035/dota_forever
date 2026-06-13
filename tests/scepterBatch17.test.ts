import { describe, it, expect } from 'vitest';
import { ultHero, enemyDummy, newWorld } from './scepterTestUtil';
import { DRU, PUG, LES, DWL, DWN, PBST } from '../src/data/heroes/batch17';
import { abilityDefAt, abilityCooldown } from '../src/sim/abilities';
import { stateOf } from '../src/sim/combat';
import { makeItem } from '../src/sim/items';

// ---- DRU 真身形态 ----
describe('dru 真身形态 神杖升级', () => {
  it('神杖 CD 70→50', () => {
    const w = newWorld();
    const h = ultHero(w, DRU, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(70);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(50);
  });

  it('无杖:真身形态不召唤神兽灵熊', () => {
    const w = newWorld();
    const h = ultHero(w, DRU, { x: 7000, y: 8000 });
    const before = w.units.size;
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 12; i++) w.step();
    // 无杖只有自身 buff,单位数不变(无召唤)
    const summons = [...w.units.values()].filter((u) => u.alive && u.name === '神兽灵熊');
    expect(summons.length).toBe(0);
  });

  it('有杖:召唤神兽灵熊', () => {
    const w = newWorld();
    const h = ultHero(w, DRU, { x: 7000, y: 8000 }, true);
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 12; i++) w.step();
    const summons = [...w.units.values()].filter((u) => u.alive && u.name === '神兽灵熊');
    expect(summons.length).toBe(1);
  });

  it('有杖:400 内敌人受到震击伤害', () => {
    const w = newWorld();
    const h = ultHero(w, DRU, { x: 7000, y: 8000 }, true);
    const t = enemyDummy(w, { x: 7300, y: 8000 }); // 距 300 < 400
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 12; i++) w.step();
    expect(t.hp).toBeLessThan(5000);
  });

  it('无杖:400 内敌人不受震击伤害', () => {
    const w = newWorld();
    const h = ultHero(w, DRU, { x: 7000, y: 8000 });
    const t = enemyDummy(w, { x: 7300, y: 8000 }); // 距 300 < 400
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 12; i++) w.step();
    expect(t.hp).toBe(5000);
  });

  it('stateOf 未眩晕→toBeFalsy', () => {
    const w = newWorld();
    const h = ultHero(w, DRU, { x: 7000, y: 8000 }, true);
    const t = enemyDummy(w, { x: 7300, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 12; i++) w.step();
    expect(stateOf(t).stunned).toBeFalsy();
  });
});

// ---- PUG 生命汲取 ----
describe('pug 生命汲取 神杖升级', () => {
  it('神杖 CD 16→10', () => {
    const w = newWorld();
    const h = ultHero(w, PUG, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(16);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(10);
  });

  it('有杖:主目标每 tick 伤害高于无杖(1.5x)', () => {
    // 对比:有杖 vs 无杖主目标掉血量
    const w0 = newWorld();
    const h0 = ultHero(w0, PUG, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7300, y: 8000 });
    h0.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t0.id });
    for (let i = 0; i < 40; i++) w0.step();
    const dmg0 = 5000 - t0.hp;

    const w1 = newWorld();
    const h1 = ultHero(w1, PUG, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7300, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t1.id });
    for (let i = 0; i < 40; i++) w1.step();
    const dmg1 = 5000 - t1.hp;

    expect(dmg1).toBeGreaterThan(dmg0);
  });

  it('有杖:溢出波及周围 350 内第二目标', () => {
    const w = newWorld();
    const h = ultHero(w, PUG, { x: 7000, y: 8000 }, true);
    const primary = enemyDummy(w, { x: 7300, y: 8000 });
    const splash = enemyDummy(w, { x: 7450, y: 8000 }); // 距 primary 150 < 350
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: primary.id });
    for (let i = 0; i < 40; i++) w.step();
    expect(splash.hp).toBeLessThan(5000);
  });

  it('无杖:溢出波不波及第二目标', () => {
    const w = newWorld();
    const h = ultHero(w, PUG, { x: 7000, y: 8000 });
    const primary = enemyDummy(w, { x: 7300, y: 8000 });
    const splash = enemyDummy(w, { x: 7450, y: 8000 }); // 距 primary 150 < 350
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: primary.id });
    for (let i = 0; i < 40; i++) w.step();
    expect(splash.hp).toBe(5000);
  });

  it('stateOf 未眩晕→toBeFalsy', () => {
    const w = newWorld();
    const h = ultHero(w, PUG, { x: 7000, y: 8000 }, true);
    const t = enemyDummy(w, { x: 7300, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t.id });
    for (let i = 0; i < 10; i++) w.step();
    expect(stateOf(t).stunned).toBeFalsy();
  });
});

// ---- LES 脉冲新星 ----
describe('les 脉冲新星 神杖升级', () => {
  it('神杖 CD 60→42', () => {
    const w = newWorld();
    const h = ultHero(w, LES, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(60);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(42);
  });

  it('无杖:距 620(> 500)的敌人不受脉冲初始 tick 伤害', () => {
    // 只跑 castPoint(9步)+首个 tick(15步)=24步,避免英雄移动缩短距离
    const w = newWorld();
    const h = ultHero(w, LES, { x: 7000, y: 8000 });
    const t = enemyDummy(w, { x: 7620, y: 8000 }); // 距 620 > 500
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 24; i++) w.step();
    expect(t.hp).toBe(5000);
  });

  it('有杖:范围扩大至 700,距 620 的敌人被命中', () => {
    const w = newWorld();
    const h = ultHero(w, LES, { x: 7000, y: 8000 }, true);
    const t = enemyDummy(w, { x: 7620, y: 8000 }); // 距 620 < 700
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 24; i++) w.step();
    expect(t.hp).toBeLessThan(5000);
  });

  it('stateOf 未眩晕→toBeFalsy', () => {
    const w = newWorld();
    const h = ultHero(w, LES, { x: 7000, y: 8000 }, true);
    const t = enemyDummy(w, { x: 7300, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 15; i++) w.step();
    expect(stateOf(t).stunned).toBeFalsy();
  });
});

// ---- DWL 恐惧 ----
describe('dwl 恐惧 神杖升级', () => {
  it('神杖 CD 60→42', () => {
    const w = newWorld();
    const h = ultHero(w, DWL, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(60);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(42);
  });

  it('无杖:600 内敌人不被眩晕', () => {
    const w = newWorld();
    const h = ultHero(w, DWL, { x: 7000, y: 8000 });
    const t = enemyDummy(w, { x: 7400, y: 8000 }); // 距 400 < 600
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 12; i++) w.step();
    // 无杖恐惧只有 disarmed+silenced,无 stunned
    expect(stateOf(t).stunned).toBeFalsy();
  });

  it('有杖:600 内敌人被眩晕 0.8 秒', () => {
    const w = newWorld();
    const h = ultHero(w, DWL, { x: 7000, y: 8000 }, true);
    const t = enemyDummy(w, { x: 7400, y: 8000 }); // 距 400 < 800
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    // castPoint 0.3s = 9 steps;再走 3 steps(0.1s 仍在 0.8s 眩晕内)
    for (let i = 0; i < 12; i++) w.step();
    expect(stateOf(t).stunned).toBe(true);
  });

  it('有杖:范围扩大至 800,距 750 的敌人被恐惧', () => {
    const w = newWorld();
    const h = ultHero(w, DWL, { x: 7000, y: 8000 }, true);
    const t = enemyDummy(w, { x: 7750, y: 8000 }); // 距 750 < 800
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 12; i++) w.step();
    // 有杖范围 800 应命中
    expect(stateOf(t).stunned).toBe(true);
  });

  it('无杖:距 750(> 600)的敌人不受恐惧', () => {
    const w = newWorld();
    const h = ultHero(w, DWL, { x: 7000, y: 8000 });
    const t = enemyDummy(w, { x: 7750, y: 8000 }); // 距 750 > 600
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 12; i++) w.step();
    expect(stateOf(t).stunned).toBeFalsy();
  });
});

// ---- DWN 旭日守护 ----
describe('dwn 旭日守护 神杖升级', () => {
  it('神杖 CD 100→70', () => {
    const w = newWorld();
    const h = ultHero(w, DWN, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(100);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(70);
  });

  it('无杖:范围 600,距 700(> 600)的敌人不受伤', () => {
    const w = newWorld();
    const h = ultHero(w, DWN, { x: 7000, y: 8000 });
    const t = enemyDummy(w, { x: 7700, y: 8000 }); // 距 700 > 600
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: h.id });
    for (let i = 0; i < 15; i++) w.step();
    expect(t.hp).toBe(5000);
  });

  it('有杖:范围扩大至 900,距 700 的敌人受到伤害', () => {
    const w = newWorld();
    const h = ultHero(w, DWN, { x: 7000, y: 8000 }, true);
    const t = enemyDummy(w, { x: 7700, y: 8000 }); // 距 700 < 900
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: h.id });
    for (let i = 0; i < 15; i++) w.step();
    expect(t.hp).toBeLessThan(5000);
  });

  it('有杖:范围内友军获得护甲 buff', () => {
    const w = newWorld();
    const h = ultHero(w, DWN, { x: 7000, y: 8000 }, true);
    const armorBefore = h.calc.armor;
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: h.id });
    for (let i = 0; i < 15; i++) w.step();
    expect(h.calc.armor).toBeGreaterThan(armorBefore);
  });

  it('stateOf 未眩晕→toBeFalsy', () => {
    const w = newWorld();
    const h = ultHero(w, DWN, { x: 7000, y: 8000 }, true);
    const t = enemyDummy(w, { x: 7300, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: h.id });
    for (let i = 0; i < 15; i++) w.step();
    expect(stateOf(t).stunned).toBeFalsy();
  });
});

// ---- PBST 痛击 ----
describe('pbst 痛击 神杖升级', () => {
  it('神杖 CD 90→65', () => {
    const w = newWorld();
    const h = ultHero(w, PBST, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(90);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(65);
  });

  it('无杖:主目标 200 内的第二敌人不受波及', () => {
    const w = newWorld();
    const h = ultHero(w, PBST, { x: 7000, y: 8000 });
    const primary = enemyDummy(w, { x: 7200, y: 8000 }); // 距 h 200 < 300
    const splash = enemyDummy(w, { x: 7300, y: 8000 }); // 距 primary 100 < 300
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: primary.id });
    for (let i = 0; i < 40; i++) w.step();
    expect(splash.hp).toBe(5000);
  });

  it('有杖:主目标 300 内的第二敌人受到溅射伤害', () => {
    const w = newWorld();
    const h = ultHero(w, PBST, { x: 7000, y: 8000 }, true);
    const primary = enemyDummy(w, { x: 7200, y: 8000 }); // 距 h 200 < 300
    const splash = enemyDummy(w, { x: 7300, y: 8000 }); // 距 primary 100 < 300
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: primary.id });
    for (let i = 0; i < 40; i++) w.step();
    expect(splash.hp).toBeLessThan(5000);
  });

  it('有杖:溅射目标也被眩晕', () => {
    const w = newWorld();
    const h = ultHero(w, PBST, { x: 7000, y: 8000 }, true);
    const primary = enemyDummy(w, { x: 7200, y: 8000 });
    const splash = enemyDummy(w, { x: 7300, y: 8000 }); // 距 primary 100 < 300
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: primary.id });
    // castPoint 0.3s = 9 steps; tick 0.5s = 15 steps; 等 25 steps 捕捉首 tick 眩晕
    for (let i = 0; i < 25; i++) w.step();
    expect(stateOf(splash).stunned).toBe(true);
  });
});
