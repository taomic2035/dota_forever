import { describe, it, expect } from 'vitest';
import { ultHero, enemyDummy, newWorld } from './scepterTestUtil';
import { DUNCAN, ZENO, TORGA, SELIA, MIRA, GRIM } from '../src/data/heroes/batch4';
import { abilityDefAt, abilityCooldown } from '../src/sim/abilities';
import { stateOf } from '../src/sim/combat';
import { makeItem } from '../src/sim/items';

describe('batch4 神杖升级', () => {
  // ---- DUNCAN 壁垒领域 ----
  it('duncan 壁垒领域:神杖 CD 70→50 + 激活时伤害周围敌人', () => {
    // 数值轴
    const wc = newWorld();
    const hc = ultHero(wc, DUNCAN, { x: 7000, y: 8000 });
    const def = abilityDefAt(hc, 3)!;
    expect(abilityCooldown(hc, def, 1)).toBe(70);
    hc.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(hc, def, 1)).toBe(50);

    // 无杖:周围敌人不受伤
    const w0 = newWorld();
    const h0 = ultHero(w0, DUNCAN, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7300, y: 8000 }); // 距 300 < 500
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 20; i++) w0.step();
    expect(t0.hp).toBe(5000); // 无杖不伤敌

    // 有杖:周围敌人受伤 150
    const w1 = newWorld();
    const h1 = ultHero(w1, DUNCAN, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7300, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 20; i++) w1.step();
    expect(t1.hp).toBeLessThan(5000); // 神杖伤敌 150
  });

  // ---- ZENO 过载重置 ----
  it('zeno 过载重置:神杖 CD 40→28 + 重置 Q/W 冷却(核心功能)', () => {
    // 数值轴
    const wc = newWorld();
    const hc = ultHero(wc, ZENO, { x: 7000, y: 8000 });
    const def = abilityDefAt(hc, 3)!;
    expect(abilityCooldown(hc, def, 1)).toBe(40);
    hc.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(hc, def, 1)).toBe(28);

    // 行为轴:有杖时 Q/W 正常重置(核心功能不变)
    const w1 = newWorld();
    const h1 = ultHero(w1, ZENO, { x: 7000, y: 8000 }, true);
    // 先使 Q/W 进入冷却
    h1.abilities[0].cooldownUntil = w1.time + 999;
    h1.abilities[1].cooldownUntil = w1.time + 999;
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 10; i++) w1.step();
    // 有杖:Q/W 冷却被重置
    expect(h1.abilities[0].cooldownUntil).toBeLessThanOrEqual(w1.time);
    expect(h1.abilities[1].cooldownUntil).toBeLessThanOrEqual(w1.time);
  });

  // ---- TORGA 马蹄飞踏 ----
  it('torga 马蹄飞踏:神杖 CD 70→50 + 发动时眩晕周围敌人并造成伤害', () => {
    // 数值轴
    const wc = newWorld();
    const hc = ultHero(wc, TORGA, { x: 7000, y: 8000 });
    const def = abilityDefAt(hc, 3)!;
    expect(abilityCooldown(hc, def, 1)).toBe(70);
    hc.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(hc, def, 1)).toBe(50);

    // 无杖:周围敌人不晕不受伤
    const w0 = newWorld();
    const h0 = ultHero(w0, TORGA, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7200, y: 8000 }); // 距 200 < 400
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 15; i++) w0.step();
    expect(t0.hp).toBe(5000); // 无杖不伤敌
    expect(stateOf(t0).stunned).toBeFalsy(); // 无杖不晕

    // 有杖:发动时造成 200 伤害并眩晕 1 秒
    const w1 = newWorld();
    const h1 = ultHero(w1, TORGA, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7200, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 10; i++) w1.step();
    expect(t1.hp).toBeLessThan(5000); // 受到 200 伤害
    expect(stateOf(t1).stunned).toBe(true); // 神杖眩晕
  });

  // ---- SELIA 灵魂换位 ----
  it('selia 灵魂换位:神杖 CD 60→45 + 换位对敌造成 200 魔法伤害', () => {
    // 数值轴
    const wc = newWorld();
    const hc = ultHero(wc, SELIA, { x: 7000, y: 8000 });
    const def = abilityDefAt(hc, 3)!;
    expect(abilityCooldown(hc, def, 1)).toBe(60);
    hc.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(hc, def, 1)).toBe(45);

    // 无杖:换位敌人不额外受伤
    const w0 = newWorld();
    const h0 = ultHero(w0, SELIA, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7400, y: 8000 }); // 距 400 < castRange 700
    h0.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t0.id });
    for (let i = 0; i < 10; i++) w0.step();
    expect(t0.hp).toBe(5000); // 无杖不额外伤害

    // 有杖:换位造成 200 魔法伤害
    const w1 = newWorld();
    const h1 = ultHero(w1, SELIA, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7400, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t1.id });
    for (let i = 0; i < 10; i++) w1.step();
    expect(t1.hp).toBeLessThan(5000); // 神杖造成 200 伤害
  });

  // ---- MIRA 月华披风 ----
  it('mira 月华披风:神杖 CD 60→45 + 激活时月光束伤害周围敌人', () => {
    // 数值轴
    const wc = newWorld();
    const hc = ultHero(wc, MIRA, { x: 7000, y: 8000 });
    const def = abilityDefAt(hc, 3)!;
    expect(abilityCooldown(hc, def, 1)).toBe(60);
    hc.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(hc, def, 1)).toBe(45);

    // 无杖:周围敌人不受伤
    const w0 = newWorld();
    const h0 = ultHero(w0, MIRA, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7400, y: 8000 }); // 距 400 < 600
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 15; i++) w0.step();
    expect(t0.hp).toBe(5000); // 无杖不伤敌

    // 有杖:月光束伤害敌人 150
    const w1 = newWorld();
    const h1 = ultHero(w1, MIRA, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7400, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 15; i++) w1.step();
    expect(t1.hp).toBeLessThan(5000); // 神杖月光束伤害
  });

  // ---- GRIM 死神收割 ----
  it('grim 死神收割:神杖 CD 55→40 + 处决阈值提升至 20%', () => {
    // 数值轴
    const wc = newWorld();
    const hc = ultHero(wc, GRIM, { x: 7000, y: 8000 });
    const def = abilityDefAt(hc, 3)!;
    expect(abilityCooldown(hc, def, 1)).toBe(55);
    hc.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(hc, def, 1)).toBe(40);

    // 行为轴:目标血量 15% maxHp (= 1500):
    //   无杖阈值 12% = 1200 → 不处决(hp 1500 > 1200)
    //   有杖阈值 20% = 2000 → 处决(hp 1500 <= 2000)
    // 无杖:不处决
    const w0 = newWorld();
    const h0 = ultHero(w0, GRIM, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7300, y: 8000 }); // castRange 550+
    t0.hp = 1500; // 15% of 10000
    h0.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t0.id });
    for (let i = 0; i < 20; i++) w0.step();
    expect(t0.alive).toBe(true); // 无杖不处决 15% 血量

    // 有杖:处决
    const w1 = newWorld();
    const h1 = ultHero(w1, GRIM, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7300, y: 8000 });
    t1.hp = 1500; // 15% of 10000
    h1.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t1.id });
    for (let i = 0; i < 20; i++) w1.step();
    expect(t1.alive).toBe(false); // 神杖阈值 20%,处决
  });
});
