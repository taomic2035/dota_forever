/** batch13 英雄大招阿哈利姆神杖升级测试 */
import { describe, it, expect } from 'vitest';
import { ultHero, enemyDummy, newWorld } from './scepterTestUtil';
import { EAR, SKY, JAK, WAK, CRY, MAR } from '../src/data/heroes/batch13';
import { abilityDefAt, abilityCooldown } from '../src/sim/abilities';
import { stateOf } from '../src/sim/combat';
import { makeItem } from '../src/sim/items';

// ============ EAR 回音击 ============
describe('ear 回音击:神杖升级', () => {
  it('ear 回音击:神杖 CD 120→85', () => {
    const w = newWorld();
    const h = ultHero(w, EAR, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(120);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(85);
  });

  it('ear 回音击:无杖不眩晕范围内敌人,有杖附加 1 秒眩晕', () => {
    // 无杖:敌人不被眩晕
    const w0 = newWorld();
    const h0 = ultHero(w0, EAR, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7400, y: 8000 });
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 15; i++) w0.step();
    expect(stateOf(t0).stunned).toBeFalsy();

    // 有杖:敌人被眩晕
    const w1 = newWorld();
    const h1 = ultHero(w1, EAR, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7400, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 15; i++) w1.step();
    expect(stateOf(t1).stunned).toBeTruthy();
  });

  it('ear 回音击:有杖范围 900(无杖 600)——远处敌人被命中', () => {
    // 无杖:距离 750 的敌人不受伤
    const w0 = newWorld();
    const h0 = ultHero(w0, EAR, { x: 7000, y: 8000 });
    const far0 = enemyDummy(w0, { x: 7750, y: 8000 });
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 15; i++) w0.step();
    expect(far0.hp).toBe(5000); // 未受伤

    // 有杖:距离 750 的敌人受伤
    const w1 = newWorld();
    const h1 = ultHero(w1, EAR, { x: 7000, y: 8000 }, true);
    const far1 = enemyDummy(w1, { x: 7750, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 15; i++) w1.step();
    expect(far1.hp).toBeLessThan(5000); // 被命中
  });
});

// ============ SKY 神秘之耀 ============
describe('sky 神秘之耀:神杖升级', () => {
  it('sky 神秘之耀:神杖 CD 40→28', () => {
    const w = newWorld();
    const h = ultHero(w, SKY, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(40);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(28);
  });

  it('sky 神秘之耀:有杖范围 350 比无杖 220 更大,中距离敌人受伤', () => {
    // 无杖:爆炸中心附近 280 距离的敌人不受伤
    const w0 = newWorld();
    const h0 = ultHero(w0, SKY, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7500, y: 8280 }); // 距落点 280
    h0.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7500, y: 8000 } });
    for (let i = 0; i < 15; i++) w0.step();
    expect(t0.hp).toBe(5000); // 无杖不命中

    // 有杖:同距离的敌人被伤到
    const w1 = newWorld();
    const h1 = ultHero(w1, SKY, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7500, y: 8280 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7500, y: 8000 } });
    for (let i = 0; i < 15; i++) w1.step();
    expect(t1.hp).toBeLessThan(5000); // 神杖命中
  });

  it('sky 神秘之耀:有杖附加法抗减益 modifier', () => {
    const w = newWorld();
    const h = ultHero(w, SKY, { x: 7000, y: 8000 }, true);
    const t = enemyDummy(w, { x: 7300, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7300, y: 8000 } });
    for (let i = 0; i < 15; i++) w.step();
    const debuff = t.modifiers.find((m) => m.key === 'sky_flare_sc_aura');
    expect(debuff).toBeDefined();
  });
});

// ============ JAK 岩浆狂暴 ============
describe('jak 岩浆狂暴:神杖升级', () => {
  it('jak 岩浆狂暴:神杖 CD 80→58', () => {
    const w = newWorld();
    const h = ultHero(w, JAK, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(80);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(58);
  });

  it('jak 岩浆狂暴:有杖比无杖对敌人造成更多总伤害(更大范围+更长持续)', () => {
    const steps = 50;
    // 无杖
    const w0 = newWorld();
    const h0 = ultHero(w0, JAK, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7300, y: 8000 });
    h0.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7300, y: 8000 } });
    for (let i = 0; i < steps; i++) w0.step();
    const dmg0 = 5000 - t0.hp;

    // 有杖
    const w1 = newWorld();
    const h1 = ultHero(w1, JAK, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7300, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7300, y: 8000 } });
    for (let i = 0; i < steps; i++) w1.step();
    const dmg1 = 5000 - t1.hp;

    // 无杖至少有一些伤害
    expect(dmg0).toBeGreaterThan(0);
    // 有杖伤害更高(持续 11 秒 vs 7 秒)
    expect(dmg1).toBeGreaterThan(dmg0);
  });

  it('jak 岩浆狂暴:有杖附加减速 modifier', () => {
    // castPoint=0.4s(12步) + tickInterval=0.5s(15步) = 首tick在第27步
    // slow duration=2s(60步),在第40步时仍有效
    const w = newWorld();
    const h = ultHero(w, JAK, { x: 7000, y: 8000 }, true);
    const t = enemyDummy(w, { x: 7300, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7300, y: 8000 } });
    for (let i = 0; i < 40; i++) w.step();
    const slow = t.modifiers.find((m) => m.key === 'jak_macropyre_sc_slow');
    expect(slow).toBeDefined();
  });
});

// ============ WAK 重生 ============
describe('wak 重生:神杖升级', () => {
  it('wak 重生:神杖 CD 160→110', () => {
    const w = newWorld();
    const h = ultHero(w, WAK, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(160);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(110);
  });

  it('wak 重生:有杖待命期间具有 25% 吸血加成', () => {
    // 无杖:无吸血
    const w0 = newWorld();
    const h0 = ultHero(w0, WAK, { x: 7000, y: 8000 });
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 5; i++) w0.step();
    const buff0 = h0.modifiers.find((m) => m.key === 'wak_reincarnation_buff');
    expect(buff0).toBeDefined();
    expect(buff0?.def.stats?.lifesteal).toBeUndefined();

    // 有杖:有吸血 0.25
    const w1 = newWorld();
    const h1 = ultHero(w1, WAK, { x: 7000, y: 8000 }, true);
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 5; i++) w1.step();
    const buff1 = h1.modifiers.find((m) => m.key === 'wak_reincarnation_buff');
    expect(buff1).toBeDefined();
    expect(buff1?.def.stats?.lifesteal).toBe(0.25);
  });
});

// ============ CRY 冰晶爆轰 ============
describe('cry 冰晶爆轰:神杖升级', () => {
  it('cry 冰晶爆轰:神杖 CD 110→80', () => {
    const w = newWorld();
    const h = ultHero(w, CRY, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(110);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(80);
  });

  it('cry 冰晶爆轰:有杖附加眩晕——无杖不眩晕,有杖眩晕', () => {
    // castPoint=0.2s → cast at step 8(~0.267s); tickInterval=0.4s → first tick step 21(~0.7s)
    // stun duration=0.4s → expires at step 33; 检查step 22(在tick触发之后,stun有效)
    const STEPS = 25;

    // 无杖:无 cry_freeze_sc_stun modifier
    const w0 = newWorld();
    const h0 = ultHero(w0, CRY, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7300, y: 8000 });
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < STEPS; i++) w0.step();
    const scStun0 = t0.modifiers.find((m) => m.key === 'cry_freeze_sc_stun');
    expect(scStun0).toBeUndefined();

    // 有杖:有神杖眩晕 modifier
    const w1 = newWorld();
    const h1 = ultHero(w1, CRY, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7300, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < STEPS; i++) w1.step();
    const scStun1 = t1.modifiers.find((m) => m.key === 'cry_freeze_sc_stun');
    expect(scStun1).toBeDefined();
  });
});

// ============ MAR 血之竞技场 ============
describe('mar 血之竞技场:神杖升级', () => {
  it('mar 血之竞技场:神杖 CD 90→64', () => {
    const w = newWorld();
    const h = ultHero(w, MAR, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(90);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(64);
  });

  it('mar 血之竞技场:有杖比无杖持续时间延长 2 秒(buff expiresAt 更晚)', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, MAR, { x: 7000, y: 8000 });
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 10; i++) w0.step();
    const buff0 = h0.modifiers.find((m) => m.key === 'mar_arena_buff');
    expect(buff0).toBeDefined();
    const expires0 = buff0?.expiresAt ?? 0;

    const w1 = newWorld();
    const h1 = ultHero(w1, MAR, { x: 7000, y: 8000 }, true);
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 10; i++) w1.step();
    const buff1 = h1.modifiers.find((m) => m.key === 'mar_arena_buff');
    expect(buff1).toBeDefined();
    const expires1 = buff1?.expiresAt ?? 0;

    // 有杖持续 2 秒更长
    expect(expires1 - expires0).toBeCloseTo(2, 0);
  });

  it('mar 血之竞技场:有杖对场内敌人额外造成 50 伤害', () => {
    // castPoint=0.3s → cast at step 10(~0.333s); tickInterval=0.4s → first tick step 22(~0.733s)
    // 需要至少 25 步确保 arena tick 已触发
    const STEPS = 30;

    // 无杖:只有减速,没有 spellDamage(hp 不变)
    const w0 = newWorld();
    const h0 = ultHero(w0, MAR, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7200, y: 8000 });
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < STEPS; i++) w0.step();
    const hp0 = t0.hp;

    // 有杖:额外 50 伤害/tick
    const w1 = newWorld();
    const h1 = ultHero(w1, MAR, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7200, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < STEPS; i++) w1.step();
    const hp1 = t1.hp;

    // 无杖敌人血量不变(只被减速,没有伤害)
    expect(hp0).toBe(5000);
    // 有杖敌人受到了伤害
    expect(hp1).toBeLessThan(5000);
  });
});
