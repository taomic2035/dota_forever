/** batch8 英雄大招阿哈利姆神杖升级测试 */
import { describe, it, expect } from 'vitest';
import { ultHero, enemyDummy, newWorld } from './scepterTestUtil';
import { OGRE, QUEN, TED, MAG, LYK, DUM } from '../src/data/heroes/batch8';
import { abilityDefAt, abilityCooldown } from '../src/sim/abilities';
import { stateOf } from '../src/sim/combat';
import { makeItem } from '../src/sim/items';
import { V } from '../src/core/vec2';

// ============ OGRE 点燃 ============
describe('ogre 点燃:神杖升级', () => {
  it('神杖 CD 14→9', () => {
    const w = newWorld();
    const h = ultHero(w, OGRE, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(14);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(9);
  });

  it('无杖:爆发伤害为基础值(不超过 1.5× 升级后的)', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, OGRE, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7150, y: 8000 }); // 距 150 < 300 AOE
    h0.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7150, y: 8000 } });
    for (let i = 0; i < 15; i++) w0.step();
    const dmg0 = 5000 - t0.hp;
    expect(dmg0).toBeGreaterThan(0); // 有伤害

    // 有杖:burst ×1.5,总初始伤害应更高
    const w1 = newWorld();
    const h1 = ultHero(w1, OGRE, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7150, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7150, y: 8000 } });
    for (let i = 0; i < 15; i++) w1.step();
    const dmg1 = 5000 - t1.hp;
    expect(dmg1).toBeGreaterThan(dmg0); // 神杖爆发伤害 ×1.5 更高
  });
});

// ============ QUEN 音波冲击 ============
describe('quen 音波冲击:神杖升级', () => {
  it('神杖 CD 60→40', () => {
    const w = newWorld();
    const h = ultHero(w, QUEN, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(60);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(40);
  });

  it('无杖:命中直线敌人不眩晕', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, QUEN, { x: 7000, y: 8000 });
    // 敌人在正东方向距 400,音波向东发射
    const t0 = enemyDummy(w0, { x: 7400, y: 8000 });
    h0.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7900, y: 8000 } });
    for (let i = 0; i < 20; i++) w0.step();
    expect(t0.hp).toBeLessThan(5000); // 有伤害
    expect(stateOf(t0).stunned).toBeFalsy(); // 无杖不眩晕
  });

  it('有杖:命中直线敌人附加 0.6 秒眩晕', () => {
    const w1 = newWorld();
    const h1 = ultHero(w1, QUEN, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7400, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7900, y: 8000 } });
    for (let i = 0; i < 20; i++) w1.step();
    expect(t1.hp).toBeLessThan(5000); // 有伤害
    expect(stateOf(t1).stunned).toBe(true); // 神杖眩晕
  });
});

// ============ TED 巨浪 ============
describe('ted 巨浪:神杖升级', () => {
  it('神杖 CD 140→90', () => {
    const w = newWorld();
    const h = ultHero(w, TED, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(140);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(90);
  });

  it('无杖:目标在范围内受到伤害+眩晕', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, TED, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7400, y: 8000 }); // 距 400 < 1000
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 20; i++) w0.step();
    expect(t0.hp).toBeLessThan(5000); // 受到伤害
    expect(stateOf(t0).stunned).toBeTruthy(); // 眩晕
  });

  it('有杖:眩晕时间比无杖更长', () => {
    // 无杖:步进恰好超过基础眩晕时间 2.0s(=60步),验证眩晕消失
    const w0 = newWorld();
    const h0 = ultHero(w0, TED, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7300, y: 8000 });
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 80; i++) w0.step(); // 施法+眩晕 2.0s=60步 已超过
    expect(stateOf(t0).stunned).toBeFalsy(); // 无杖眩晕到期

    // 有杖:眩晕 2.5s=75步,80步仍眩晕
    const w1 = newWorld();
    const h1 = ultHero(w1, TED, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7300, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 75; i++) w1.step(); // castPoint 0.4s=12步 + 眩晕 2.5s=75步 ≈ 87步总,75步时仍在眩晕
    expect(stateOf(t1).stunned).toBe(true); // 神杖眩晕 2.5s 尚未到期
  });
});

// ============ MAG 两极反转 ============
describe('mag 两极反转:神杖升级', () => {
  it('神杖 CD 120→80', () => {
    const w = newWorld();
    const h = ultHero(w, MAG, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(120);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(80);
  });

  it('有杖:被拉入敌人受到额外 100 伤害(总伤高于无杖)', () => {
    // 无杖
    const w0 = newWorld();
    const h0 = ultHero(w0, MAG, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7300, y: 8000 }); // 距 300 < 340 范围
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 20; i++) w0.step();
    const dmg0 = 5000 - t0.hp;
    expect(dmg0).toBeGreaterThan(0); // 无杖也有伤害

    // 有杖:额外 100 纯粹伤害
    const w1 = newWorld();
    const h1 = ultHero(w1, MAG, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7300, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 20; i++) w1.step();
    const dmg1 = 5000 - t1.hp;
    expect(dmg1).toBeGreaterThan(dmg0); // 神杖额外 100 伤害
  });

  it('无杖:目标被拉近后眩晕', () => {
    const w = newWorld();
    const h = ultHero(w, MAG, { x: 7000, y: 8000 });
    const t = enemyDummy(w, { x: 7300, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 20; i++) w.step();
    expect(stateOf(t).stunned).toBeTruthy(); // 两极反转眩晕
  });
});

// ============ LYK 寒霜连锁 ============
describe('lyk 寒霜连锁:神杖升级', () => {
  it('神杖 CD 120→80', () => {
    const w = newWorld();
    const h = ultHero(w, LYK, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(120);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(80);
  });

  it('无杖:命中主目标并减速,第二目标也受伤', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, LYK, { x: 7000, y: 8000 });
    h0.mp = 1000;
    const t0 = enemyDummy(w0, { x: 7300, y: 8000 }); // 主目标
    const t1 = enemyDummy(w0, { x: 7500, y: 8000 }); // 弹跳目标(距 t0 约 200 < 600)
    h0.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t0.id });
    for (let i = 0; i < 25; i++) w0.step();
    expect(t0.hp).toBeLessThan(5000); // 主目标受伤
    expect(t1.hp).toBeLessThan(5000); // 6次弹跳,第二目标也受伤
  });

  it('有杖:额外 4 次弹跳,多敌人时总伤害更高', () => {
    // 无杖
    const w0 = newWorld();
    const h0 = ultHero(w0, LYK, { x: 7000, y: 8000 });
    h0.mp = 1000;
    const a0 = enemyDummy(w0, { x: 7300, y: 8000 });
    const b0 = enemyDummy(w0, { x: 7500, y: 8000 });
    h0.issueOrder({ type: 'cast', abilityIndex: 3, targetId: a0.id });
    for (let i = 0; i < 20; i++) w0.step();
    const totalDmg0 = (5000 - a0.hp) + (5000 - b0.hp);

    // 有杖:更多弹跳,累计伤害更高
    const w1 = newWorld();
    const h1 = ultHero(w1, LYK, { x: 7000, y: 8000 }, true);
    h1.mp = 1000;
    const a1 = enemyDummy(w1, { x: 7300, y: 8000 });
    const b1 = enemyDummy(w1, { x: 7500, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3, targetId: a1.id });
    for (let i = 0; i < 20; i++) w1.step();
    const totalDmg1 = (5000 - a1.hp) + (5000 - b1.hp);

    expect(totalDmg1).toBeGreaterThan(totalDmg0); // 神杖更多弹跳,总伤更高
  });
});

// ============ DUM 末日 ============
describe('dum 末日:神杖升级', () => {
  it('神杖 CD 110→70', () => {
    const w = newWorld();
    const h = ultHero(w, DUM, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(110);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(70);
  });

  it('无杖:目标被沉默缴械并持续受到灼烧伤害', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, DUM, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7400, y: 8000 }); // 距 400 < 600
    h0.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t0.id });
    for (let i = 0; i < 50; i++) w0.step(); // 施法 + 约 1.5 秒等待 tick
    expect(t0.hp).toBeLessThan(5000); // 有灼烧伤害
    expect(stateOf(t0).stunned).toBeFalsy(); // 末日不眩晕
  });

  it('有杖:灼烧 DPS ×1.5,持续时间内总伤更高', () => {
    // 无杖:施法后等 2 秒(60步)
    const w0 = newWorld();
    const h0 = ultHero(w0, DUM, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7400, y: 8000 });
    h0.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t0.id });
    for (let i = 0; i < 75; i++) w0.step(); // castPoint 0.3s=9步 + 2s=60步 tick
    const dmg0 = 5000 - t0.hp;

    // 有杖:DPS ×1.5
    const w1 = newWorld();
    const h1 = ultHero(w1, DUM, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7400, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t1.id });
    for (let i = 0; i < 75; i++) w1.step();
    const dmg1 = 5000 - t1.hp;

    expect(dmg1).toBeGreaterThan(dmg0); // 神杖 DPS ×1.5 伤害更高
  });
});
