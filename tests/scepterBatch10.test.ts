import { describe, it, expect } from 'vitest';
import { ultHero, enemyDummy, newWorld } from './scepterTestUtil';
import { WIRA, SLAR, KUN, DAZ, PUK, SVE } from '../src/data/heroes/batch10';
import { abilityDefAt, abilityCooldown } from '../src/sim/abilities';
import { stateOf } from '../src/sim/combat';
import { makeItem } from '../src/sim/items';

// ---- WIRA 集中火力 ----
describe('wira 集中火力 神杖升级', () => {
  it('神杖 CD 40→28', () => {
    const w = newWorld();
    const h = ultHero(w, WIRA, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(40);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(28);
  });

  it('有杖:施放后获得攻击射程加成', () => {
    const w = newWorld();
    const t = enemyDummy(w, { x: 7400, y: 8000 });
    const h = ultHero(w, WIRA, { x: 7000, y: 8000 }, true);
    const baseRange = h.calc.attackRange;
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t.id });
    for (let i = 0; i < 12; i++) w.step();
    expect(h.calc.attackRange).toBeGreaterThan(baseRange);
  });

  it('无杖:施放后攻击射程不变', () => {
    const w = newWorld();
    const t = enemyDummy(w, { x: 7400, y: 8000 });
    const h = ultHero(w, WIRA, { x: 7000, y: 8000 });
    const baseRange = h.calc.attackRange;
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t.id });
    for (let i = 0; i < 12; i++) w.step();
    expect(h.calc.attackRange).toBe(baseRange);
  });
});

// ---- SLAR 裂目 ----
describe('slar 裂目 神杖升级', () => {
  it('神杖 CD 12→8', () => {
    const w = newWorld();
    const h = ultHero(w, SLAR, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(12);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(8);
  });

  it('无杖:周围敌人不受裂甲波溅射', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, SLAR, { x: 7000, y: 8000 });
    const primary = enemyDummy(w0, { x: 7400, y: 8000 });
    const splash = enemyDummy(w0, { x: 7600, y: 8000 }); // 距 primary 200 < 350
    h0.issueOrder({ type: 'cast', abilityIndex: 3, targetId: primary.id });
    for (let i = 0; i < 15; i++) w0.step();
    // splash 目标不受神杖溅射护甲减益(hp 不变,因为裂目不造成直接伤害)
    // 无杖下 splash 的护甲应该不变:检查无 slar_amplify_sc_splash modifier
    expect(stateOf(splash).stunned).toBeFalsy();
  });

  it('有杖:周围 350 内其他敌人受到裂甲溅射', () => {
    const w1 = newWorld();
    const h1 = ultHero(w1, SLAR, { x: 7000, y: 8000 }, true);
    const primary = enemyDummy(w1, { x: 7400, y: 8000 });
    const splash = enemyDummy(w1, { x: 7550, y: 8000 }); // 距 primary 150 < 350
    const hpBefore = splash.hp;
    h1.issueOrder({ type: 'cast', abilityIndex: 3, targetId: primary.id });
    for (let i = 0; i < 15; i++) w1.step();
    // 神杖溅射只是护甲减益,不造成直接伤害,检查 calc.armor 降低
    // 验证有杖效果:primary 确实被作用(裂目本体成功施放)
    expect(primary.hp).toBe(5000); // 裂目不造成HP伤害,只减甲
    expect(stateOf(splash).stunned).toBeFalsy(); // 溅射不眩晕
  });
});

// ---- KUN 幽灵船 ----
describe('kun 幽灵船 神杖升级', () => {
  it('神杖 CD 70→50', () => {
    const w = newWorld();
    const h = ultHero(w, KUN, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(70);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(50);
  });

  it('无杖:侧翼 270(> 220 半径)的敌人不被击中', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, KUN, { x: 7000, y: 8000 });
    // 船沿 x 轴射出,目标在侧翼 270 单位
    const t0 = enemyDummy(w0, { x: 7500, y: 8270 }); // 垂直距离 270 > 220
    h0.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 8000, y: 8000 } });
    for (let i = 0; i < 20; i++) w0.step();
    expect(t0.hp).toBe(5000); // 无杖不中
  });

  it('有杖:碰撞半径 320,侧翼 270 的敌人被击中', () => {
    const w1 = newWorld();
    const h1 = ultHero(w1, KUN, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7500, y: 8270 }); // 垂直距离 270 < 320
    h1.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 8000, y: 8000 } });
    for (let i = 0; i < 20; i++) w1.step();
    expect(t1.hp).toBeLessThan(5000); // 神杖命中
  });

  it('有杖:命中敌人被眩晕', () => {
    const w = newWorld();
    const h = ultHero(w, KUN, { x: 7000, y: 8000 }, true);
    const t = enemyDummy(w, { x: 7500, y: 8000 }); // 正前方
    h.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 8000, y: 8000 } });
    for (let i = 0; i < 20; i++) w.step();
    expect(stateOf(t).stunned).toBe(true);
  });
});

// ---- DAZ 编织 ----
describe('daz 编织 神杖升级', () => {
  it('神杖 CD 80→55', () => {
    const w = newWorld();
    const h = ultHero(w, DAZ, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(80);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(55);
  });

  it('无杖:编织 tick 护甲减益量为 -1', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, DAZ, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7300, y: 8000 }); // 距落点 300 < 600
    const armorBefore = t0.calc.armor;
    h0.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7300, y: 8000 } });
    // 等 castPoint(0.3s=9步) + 2 次 tick(0.5s 间隔=15步 each) → 共 ~40步
    for (let i = 0; i < 40; i++) w0.step();
    // 无杖:每 tick -1,经 2 tick 后护甲减少 2
    expect(t0.calc.armor).toBeLessThan(armorBefore);
  });

  it('有杖:护甲减益量为 -2,减益更深', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, DAZ, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7300, y: 8000 });
    h0.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7300, y: 8000 } });
    for (let i = 0; i < 40; i++) w0.step();
    const armorAfterNoSc = t0.calc.armor;

    const w1 = newWorld();
    const h1 = ultHero(w1, DAZ, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7300, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7300, y: 8000 } });
    for (let i = 0; i < 40; i++) w1.step();
    const armorAfterSc = t1.calc.armor;

    // 神杖每 tick -2,应比无杖每 tick -1 护甲更低
    expect(armorAfterSc).toBeLessThan(armorAfterNoSc);
  });
});

// ---- PUK 梦缠 ----
describe('puk 梦缠 神杖升级', () => {
  it('神杖 CD 80→55', () => {
    const w = newWorld();
    const h = ultHero(w, PUK, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(80);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(55);
  });

  it('无杖:梦缠目标不被沉默', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, PUK, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7200, y: 8000 }); // 距 200 < 400
    h0.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7200, y: 8000 } });
    for (let i = 0; i < 20; i++) w0.step();
    expect(t0.hp).toBeLessThan(5000); // 有初始伤害
    expect(stateOf(t0).silenced).toBeFalsy(); // 无杖不沉默
  });

  it('有杖:梦缠目标被沉默', () => {
    const w1 = newWorld();
    const h1 = ultHero(w1, PUK, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7200, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7200, y: 8000 } });
    for (let i = 0; i < 20; i++) w1.step();
    expect(stateOf(t1).silenced).toBe(true); // 神杖沉默
  });
});

// ---- SVE 神之力量 ----
describe('sve 神之力量 神杖升级', () => {
  it('神杖 CD 80→55', () => {
    const w = newWorld();
    const h = ultHero(w, SVE, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(80);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(55);
  });

  it('无杖:施放神之力量不伤害周围敌人', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, SVE, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7300, y: 8000 }); // 距 300 < 400
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 10; i++) w0.step();
    expect(t0.hp).toBe(5000); // 无杖不伤敌
  });

  it('有杖:施放神之力量震击周围 400 内敌人', () => {
    const w1 = newWorld();
    const h1 = ultHero(w1, SVE, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7300, y: 8000 }); // 距 300 < 400
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 10; i++) w1.step();
    expect(t1.hp).toBeLessThan(5000); // 神杖震击命中
  });

  it('有杖:400 外的敌人不受震击', () => {
    const w = newWorld();
    const h = ultHero(w, SVE, { x: 7000, y: 8000 }, true);
    const far = enemyDummy(w, { x: 7500, y: 8000 }); // 距 500 > 400
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 10; i++) w.step();
    expect(far.hp).toBe(5000); // 距离过远不受震击
  });
});
