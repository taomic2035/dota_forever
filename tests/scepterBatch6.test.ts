/** batch6 英雄大招阿哈利姆神杖升级测试 */
import { describe, it, expect } from 'vitest';
import { ultHero, enemyDummy, newWorld } from './scepterTestUtil';
import { LAIN, MORFIN, BROG, WIF, ZUKA, CEDRIC } from '../src/data/heroes/batch6';
import { abilityDefAt, abilityCooldown, syncScepterPassives } from '../src/sim/abilities';
import { stateOf, recalcUnit } from '../src/sim/combat';
import { makeItem } from '../src/sim/items';

// ============ LAIN 死亡之雷 ============
describe('lain 死亡之雷:神杖弹跳', () => {
  it('神杖 CD 50→35', () => {
    const w = newWorld();
    const h = ultHero(w, LAIN, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(50);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(35);
  });

  it('无杖:只伤害主目标,附近第二个敌人不受伤', () => {
    const w = newWorld();
    const h = ultHero(w, LAIN, { x: 7000, y: 8000 });
    h.mp = 1000;
    const t1 = enemyDummy(w, { x: 7300, y: 8000 }); // 主目标(距 300 < 700)
    const t2 = enemyDummy(w, { x: 7500, y: 8000 }); // 邻近目标(距主目标 200 < 500)
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t1.id });
    for (let i = 0; i < 20; i++) w.step();
    expect(t1.hp).toBeLessThan(5000); // 主目标受伤
    expect(t2.hp).toBe(5000);         // 无杖不弹跳
  });

  it('有杖:弹跳伤害至第二个敌人', () => {
    const w = newWorld();
    const h = ultHero(w, LAIN, { x: 7000, y: 8000 }, true);
    h.mp = 1000;
    const t1 = enemyDummy(w, { x: 7300, y: 8000 }); // 主目标
    const t2 = enemyDummy(w, { x: 7500, y: 8000 }); // 邻近目标(距 t1 约 200)
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t1.id });
    for (let i = 0; i < 20; i++) w.step();
    expect(t1.hp).toBeLessThan(5000); // 主目标受伤
    expect(t2.hp).toBeLessThan(5000); // 神杖弹跳命中第二个目标
  });
});

// ============ MORFIN 潮汐复体 ============
describe('morfin 潮汐复体:神杖双复体+延长闪避', () => {
  it('神杖 CD 50→35', () => {
    const w = newWorld();
    const h = ultHero(w, MORFIN, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(50);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(35);
  });

  it('无杖生成 1 个复体,有杖生成 2 个复体', () => {
    // 无杖
    const w0 = newWorld();
    const h0 = ultHero(w0, MORFIN, { x: 7000, y: 8000 });
    h0.mp = 1000;
    const countBefore0 = [...w0.units.values()].length;
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 10; i++) w0.step();
    const countAfter0 = [...w0.units.values()].length;
    expect(countAfter0 - countBefore0).toBe(1); // 1 个复体

    // 有杖
    const w1 = newWorld();
    const h1 = ultHero(w1, MORFIN, { x: 7000, y: 8000 }, true);
    h1.mp = 1000;
    const countBefore1 = [...w1.units.values()].length;
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 10; i++) w1.step();
    const countAfter1 = [...w1.units.values()].length;
    expect(countAfter1 - countBefore1).toBe(2); // 2 个复体
  });
});

// ============ BROG 战意(纯被动大招) ============
describe('brog 战意:神杖被动额外伤害减免', () => {
  it('无杖:无 scepter_passive_brog_warpath 修改器', () => {
    const w = newWorld();
    const h = ultHero(w, BROG, { x: 7000, y: 8000 }, false);
    syncScepterPassives(w, h);
    recalcUnit(h);
    const hasSCMod = h.modifiers.some((m) => m.key === 'scepter_passive_brog_warpath');
    expect(hasSCMod).toBe(false);
  });

  it('有杖:挂载 scepter_passive_brog_warpath 提供额外减伤 6%', () => {
    const w = newWorld();
    const h = ultHero(w, BROG, { x: 7000, y: 8000 }, true);
    syncScepterPassives(w, h);
    recalcUnit(h);
    const hasSCMod = h.modifiers.some((m) => m.key === 'scepter_passive_brog_warpath');
    expect(hasSCMod).toBe(true);
  });

  it('出售神杖后神杖被动修改器消失', () => {
    const w = newWorld();
    const h = ultHero(w, BROG, { x: 7000, y: 8000 }, true);
    syncScepterPassives(w, h);
    recalcUnit(h);
    expect(h.modifiers.some((m) => m.key === 'scepter_passive_brog_warpath')).toBe(true);

    h.inventory[0] = null;
    syncScepterPassives(w, h);
    recalcUnit(h);
    expect(h.modifiers.some((m) => m.key === 'scepter_passive_brog_warpath')).toBe(false);
  });
});

// ============ WIF 时光倒流 ============
describe('wif 时光倒流:神杖延长魔法免疫', () => {
  it('神杖 CD 60→45', () => {
    const w = newWorld();
    const h = ultHero(w, WIF, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(60);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(45);
  });

  it('无杖:魔法免疫持续 1 秒(30 步后已过期)', () => {
    const w = newWorld();
    const h = ultHero(w, WIF, { x: 7000, y: 8000 });
    h.mp = 1000;
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 5; i++) w.step(); // 施法即刻生效
    // 免疫应当存在(刚施法后)
    expect(stateOf(h).magicImmune).toBeTruthy();
    // 再等 35 步(共 ~1.2s),免疫到期
    for (let i = 0; i < 35; i++) w.step();
    expect(stateOf(h).magicImmune).toBeFalsy();
  });

  it('有杖:魔法免疫延长为 3 秒(5 步后仍存在,100 步后才过期)', () => {
    const w = newWorld();
    const h = ultHero(w, WIF, { x: 7000, y: 8000 }, true);
    h.mp = 1000;
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 5; i++) w.step();
    expect(stateOf(h).magicImmune).toBeTruthy(); // 施法后立刻免疫
    // 50 步后(~1.7s),无杖已过期,有杖仍在
    for (let i = 0; i < 45; i++) w.step();
    expect(stateOf(h).magicImmune).toBeTruthy(); // 有杖 3s 内仍免疫
  });
});

// ============ ZUKA 死亡守卫 ============
describe('zuka 死亡守卫:神杖伤害提升+减速', () => {
  it('神杖 CD 100→70', () => {
    const w = newWorld();
    const h = ultHero(w, ZUKA, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(100);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(70);
  });

  it('有杖引导伤害高于无杖', () => {
    // 无杖
    const w0 = newWorld();
    const h0 = ultHero(w0, ZUKA, { x: 7000, y: 8000 });
    h0.mp = 1000;
    const t0 = enemyDummy(w0, { x: 7200, y: 8000 }); // 距 200 < 900
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 170; i++) w0.step(); // 5s 引导 ≈ 150 步
    const dmg0 = 5000 - t0.hp;

    // 有杖
    const w1 = newWorld();
    const h1 = ultHero(w1, ZUKA, { x: 7000, y: 8000 }, true);
    h1.mp = 1000;
    const t1 = enemyDummy(w1, { x: 7200, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 170; i++) w1.step();
    const dmg1 = 5000 - t1.hp;

    expect(dmg1).toBeGreaterThan(dmg0); // 神杖伤害更高
  });

  it('无杖不施加减速,有杖减速目标', () => {
    // 无杖
    const w0 = newWorld();
    const h0 = ultHero(w0, ZUKA, { x: 7000, y: 8000 });
    h0.mp = 1000;
    const t0 = enemyDummy(w0, { x: 7200, y: 8000 });
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 30; i++) w0.step(); // 首 tick
    const hasSlow0 = t0.modifiers.some((m) => m.key === 'zuka_deathward_sc_slow');
    expect(hasSlow0).toBe(false);

    // 有杖
    const w1 = newWorld();
    const h1 = ultHero(w1, ZUKA, { x: 7000, y: 8000 }, true);
    h1.mp = 1000;
    const t1 = enemyDummy(w1, { x: 7200, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 30; i++) w1.step();
    const hasSlow1 = t1.modifiers.some((m) => m.key === 'zuka_deathward_sc_slow');
    expect(hasSlow1).toBe(true); // 神杖减速生效
  });
});

// ============ CEDRIC 藤蔓缠绕 ============
describe('cedric 藤蔓缠绕:神杖扩大范围', () => {
  it('神杖 CD 70→50', () => {
    const w = newWorld();
    const h = ultHero(w, CEDRIC, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(70);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(50);
  });

  it('无杖范围 700,距 800 的敌人不受缠绕', () => {
    const w = newWorld();
    const h = ultHero(w, CEDRIC, { x: 7000, y: 8000 });
    h.mp = 1000;
    const t = enemyDummy(w, { x: 7800, y: 8000 }); // 距 800 > 700
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 20; i++) w.step();
    expect(stateOf(t).stunned).toBeFalsy();
    expect(stateOf(t).rooted).toBeFalsy();
  });

  it('有杖范围扩大至 1000,距 800 的敌人被缠绕', () => {
    const w = newWorld();
    const h = ultHero(w, CEDRIC, { x: 7000, y: 8000 }, true);
    h.mp = 1000;
    const t = enemyDummy(w, { x: 7800, y: 8000 }); // 距 800 < 1000
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 20; i++) w.step();
    expect(stateOf(t).rooted).toBe(true); // 神杖范围命中
  });

  it('有杖伤害高于无杖(tickDmg ×1.6)', () => {
    // 无杖
    const w0 = newWorld();
    const h0 = ultHero(w0, CEDRIC, { x: 7000, y: 8000 });
    h0.mp = 1000;
    const t0 = enemyDummy(w0, { x: 7300, y: 8000 }); // 距 300 < 700
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 200; i++) w0.step(); // 等待藤蔓持续伤害触发
    const dmg0 = 5000 - t0.hp;

    // 有杖
    const w1 = newWorld();
    const h1 = ultHero(w1, CEDRIC, { x: 7000, y: 8000 }, true);
    h1.mp = 1000;
    const t1 = enemyDummy(w1, { x: 7300, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 200; i++) w1.step();
    const dmg1 = 5000 - t1.hp;

    expect(dmg1).toBeGreaterThan(dmg0); // 神杖 tick 伤害更高
  });
});
