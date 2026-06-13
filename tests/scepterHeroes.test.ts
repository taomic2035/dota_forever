import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { learnAbility, abilityDefAt, abilityCooldown } from '../src/sim/abilities';
import { stateOf } from '../src/sim/combat';
import { makeItem } from '../src/sim/items';
import { REIN, LIYA, ZOLA } from '../src/data/heroes';
import { GORM, GROSH, CHEN_BLADE, OLAN, MORPHIS } from '../src/data/heroes/batch2';
import type { HeroDef } from '../src/data/heroes/types';
import type { UnitStats } from '../src/sim/unit';

const map = new GameMap();
type W = ReturnType<typeof createWorld>;

function ultHero(w: W, def: HeroDef, pos: { x: number; y: number }, scepter = false) {
  const h = spawnHero(w, def, Team.Dawn, pos);
  h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 1000;
  learnAbility(w, h, 3); // 大招
  if (scepter) h.inventory[0] = makeItem('scepter');
  return h;
}

function enemyDummy(w: W, pos: { x: number; y: number }) {
  const stats: UnitStats = {
    maxHp: 10000, hpRegen: 0, maxMp: 0, mpRegen: 0, dmgMin: 0, dmgMax: 0,
    attackType: 'hero', armorType: 'hero', armor: 0, magicResist: 0,
    attackRange: 150, attackPoint: 0.3, bat: 1.7, projectileSpeed: 0, moveSpeed: 0,
    collisionRadius: 24, visionDay: 0, visionNight: 0, acquireRange: 0,
    bountyMin: 0, bountyMax: 0, xpBounty: 0,
  };
  const t = w.spawnUnit({ kind: 'hero', team: Team.Night, pos, name: 'd', stats });
  t.hp = 5000;
  return t;
}

const newWorld = () => createWorld(map, { seed: 141, noBuildings: true, startTime: 0 });

describe('英雄神杖升级(rein/liya/zola)', () => {
  it('rein 泰坦之力:神杖 CD 80→55 + 化身震荡波伤害周围', () => {
    const wc = newWorld();
    const hc = ultHero(wc, REIN, { x: 7000, y: 8000 });
    const def = abilityDefAt(hc, 3)!;
    expect(abilityCooldown(hc, def, 1)).toBe(80);
    hc.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(hc, def, 1)).toBe(55);

    // 无杖:化身不伤敌
    const w0 = newWorld();
    const h0 = ultHero(w0, REIN, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7200, y: 8000 }); // 距 200 < 350
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 14; i++) w0.step();
    expect(t0.hp).toBe(5000);

    // 有杖:震荡波伤害
    const w1 = newWorld();
    const h1 = ultHero(w1, REIN, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7200, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 14; i++) w1.step();
    expect(t1.hp).toBeLessThan(5000);
  });

  it('zola 雷神之怒:神杖 CD 120→80 + 雷击附带眩晕', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, ZOLA, { x: 7000, y: 8000 });
    const def = abilityDefAt(h0, 3)!;
    expect(abilityCooldown(h0, def, 1)).toBe(120);
    const t0 = enemyDummy(w0, { x: 7400, y: 8000 });
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 20; i++) w0.step();
    expect(t0.hp).toBeLessThan(5000);      // 全图雷击命中
    expect(stateOf(t0).stunned).toBeFalsy(); // 无杖不晕

    const w1 = newWorld();
    const h1 = ultHero(w1, ZOLA, { x: 7000, y: 8000 }, true);
    expect(abilityCooldown(h1, def, 1)).toBe(80);
    const t1 = enemyDummy(w1, { x: 7400, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 20; i++) w1.step();
    expect(stateOf(t1).stunned).toBe(true); // 神杖眩晕
  });

  it('liya 极寒领域:神杖 CD 110→80 + 范围扩大命中远端敌人', () => {
    const wc = newWorld();
    const hc = ultHero(wc, LIYA, { x: 7000, y: 8000 });
    const def = abilityDefAt(hc, 3)!;
    expect(abilityCooldown(hc, def, 1)).toBe(110);
    hc.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(hc, def, 1)).toBe(80);

    // 敌人距 700:无杖(范围 600)不中
    const w0 = newWorld();
    const h0 = ultHero(w0, LIYA, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7700, y: 8000 });
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 45; i++) w0.step();
    expect(t0.hp).toBe(5000);

    // 有杖(范围 800)命中
    const w1 = newWorld();
    const h1 = ultHero(w1, LIYA, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7700, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 45; i++) w1.step();
    expect(t1.hp).toBeLessThan(5000);
  });
});

describe('英雄神杖升级 batch2(gorm/grosh/chenblade/olan/morphis)', () => {
  // ---- GORM 大地回响 ----
  it('gorm 大地回响:神杖 CD 130→90 + 外圈(900)敌人受伤并眩晕', () => {
    // 数值轴
    const wc = newWorld();
    const hc = ultHero(wc, GORM, { x: 7000, y: 8000 });
    const def = abilityDefAt(hc, 3)!;
    expect(abilityCooldown(hc, def, 1)).toBe(130);
    hc.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(hc, def, 1)).toBe(90);

    // 行为轴:外圈(700 < d < 900)无杖不受影响
    const w0 = newWorld();
    const h0 = ultHero(w0, GORM, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7800, y: 8000 }); // 距 800,超出内圈 600 < 外圈 900
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 20; i++) w0.step();
    expect(t0.hp).toBe(5000); // 无杖不中外圈

    // 有杖:外圈受伤+眩晕
    const w1 = newWorld();
    const h1 = ultHero(w1, GORM, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7800, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 20; i++) w1.step();
    expect(t1.hp).toBeLessThan(5000); // 神杖命中外圈
    expect(stateOf(t1).stunned).toBe(true); // 外圈眩晕
  });

  // ---- GROSH 碎骨肢解 ----
  it('grosh 碎骨肢解:神杖 CD 30→22 + 引导期伤害提升', () => {
    // 数值轴
    const wc = newWorld();
    const hc = ultHero(wc, GROSH, { x: 7000, y: 8000 });
    const def = abilityDefAt(hc, 3)!;
    expect(abilityCooldown(hc, def, 1)).toBe(30);
    hc.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(hc, def, 1)).toBe(22);

    // 行为轴:有杖伤害 > 无杖伤害(引导期间 tick 伤害 ×1.5)
    // 无杖
    const w0 = newWorld();
    const h0 = ultHero(w0, GROSH, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7100, y: 8000 }); // 距 100 < castRange 200
    h0.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t0.id });
    for (let i = 0; i < 120; i++) w0.step(); // 4s = 完成引导
    const dmg0 = 5000 - t0.hp;

    // 有杖
    const w1 = newWorld();
    const h1 = ultHero(w1, GROSH, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7100, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t1.id });
    for (let i = 0; i < 120; i++) w1.step();
    const dmg1 = 5000 - t1.hp;

    expect(dmg1).toBeGreaterThan(dmg0); // 神杖伤害更高
  });

  // ---- KAI 暗影帷幕 — 纯被动大招,跳过 ----
  // KAI_R 是纯 passiveModifier,passiveModifier(lvl) 签名无 caster 参数,无法加 hasScepter,跳过。

  // ---- CHEN_BLADE 无双连斩 ----
  it('chenblade 无双连斩:神杖 CD 120→85 + 多 2 次斩击造成更高总伤', () => {
    // 数值轴
    const wc = newWorld();
    const hc = ultHero(wc, CHEN_BLADE, { x: 7000, y: 8000 });
    const def = abilityDefAt(hc, 3)!;
    expect(abilityCooldown(hc, def, 1)).toBe(120);
    hc.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(hc, def, 1)).toBe(85);

    // 行为轴:神杖 = 额外 2 斩 + 每斩 100 纯粹伤害 → 总伤更高
    // 无杖
    const w0 = newWorld();
    const h0 = ultHero(w0, CHEN_BLADE, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7200, y: 8000 }); // 距 200 < 450 castRange
    h0.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t0.id });
    for (let i = 0; i < 20; i++) w0.step();
    const dmg0 = 5000 - t0.hp;

    // 有杖
    const w1 = newWorld();
    const h1 = ultHero(w1, CHEN_BLADE, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7200, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t1.id });
    for (let i = 0; i < 20; i++) w1.step();
    const dmg1 = 5000 - t1.hp;

    expect(dmg1).toBeGreaterThan(dmg0); // 多斩 + 额外纯粹伤害
  });

  // ---- OLAN 神圣庇护 ----
  it('olan 神圣庇护:神杖 CD 150→110 + 对周围敌人造成 200 伤害', () => {
    // 数值轴
    const wc = newWorld();
    const hc = ultHero(wc, OLAN, { x: 7000, y: 8000 });
    const def = abilityDefAt(hc, 3)!;
    expect(abilityCooldown(hc, def, 1)).toBe(150);
    hc.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(hc, def, 1)).toBe(110);

    // 行为轴:无杖 → 敌人不受伤
    const w0 = newWorld();
    const h0 = ultHero(w0, OLAN, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7300, y: 8000 }); // 距 300 < 700
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 20; i++) w0.step();
    expect(t0.hp).toBe(5000); // 无杖不伤敌

    // 有杖:周围敌人受 200 伤害
    const w1 = newWorld();
    const h1 = ultHero(w1, OLAN, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7300, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 20; i++) w1.step();
    expect(t1.hp).toBeLessThan(5000); // 神杖伤敌
  });

  // ---- MORPHIS 暗渊火雨 ----
  it('morphis 暗渊火雨:神杖 CD 120→85 + 范围 600 命中更远敌人且每波眩晕', () => {
    // 数值轴
    const wc = newWorld();
    const hc = ultHero(wc, MORPHIS, { x: 7000, y: 8000 });
    const def = abilityDefAt(hc, 3)!;
    expect(abilityCooldown(hc, def, 1)).toBe(120);
    hc.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(hc, def, 1)).toBe(85);

    // 行为轴:敌人距落点 500(> 450 无杖范围,< 600 神杖范围)
    // 无杖:不中
    const w0 = newWorld();
    const h0 = ultHero(w0, MORPHIS, { x: 7000, y: 8000 });
    const target_pos = { x: 7600, y: 8000 }; // 落点
    const t0 = enemyDummy(w0, { x: 8100, y: 8000 }); // 距落点 500 > 450
    h0.issueOrder({ type: 'cast', abilityIndex: 3, pos: target_pos });
    for (let i = 0; i < 60; i++) w0.step(); // 等首波触发(castPoint 0.5s=15 + tick 0.8s=24)
    expect(t0.hp).toBe(5000); // 无杖不中

    // 有杖:命中 + 每波眩晕(在首波命中后立即检查眩晕状态)
    const w1 = newWorld();
    const h1 = ultHero(w1, MORPHIS, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 8100, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3, pos: target_pos });
    // castPoint 0.5s=15 steps,首波 tick 0.8s=24 steps;共 39 步后首波命中,眩晕 0.5s=15 steps 内有效
    for (let i = 0; i < 42; i++) w1.step(); // 首波刚触发后
    expect(t1.hp).toBeLessThan(5000); // 神杖范围 600 命中
    expect(stateOf(t1).stunned).toBe(true); // 每波眩晕(首波触发后 0.1s 内)
  });
});
