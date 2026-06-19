import { describe, it, expect, beforeEach } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { learnAbility } from '../src/sim/abilities';
import { hasModifier } from '../src/sim/modifiers';
import { REIN, LIYA, ZOLA, AILI } from '../src/data/heroes';
import type { World } from '../src/sim/world';
import type { Unit, UnitStats } from '../src/sim/unit';

const map = new GameMap();

function dummyStats(over: Partial<UnitStats> = {}): UnitStats {
  return {
    maxHp: 3000, hpRegen: 0, maxMp: 0, mpRegen: 0, dmgMin: 0, dmgMax: 0,
    attackType: 'hero', armorType: 'hero', armor: 0, magicResist: 0.25,
    attackRange: 100, attackPoint: 0.4, bat: 1.7, projectileSpeed: 0,
    moveSpeed: 300, collisionRadius: 24, visionDay: 1800, visionNight: 800,
    acquireRange: 0, bountyMin: 0, bountyMax: 0, xpBounty: 0,
    ...over,
  };
}

let w: World;
beforeEach(() => {
  w = createWorld(map, { seed: 15, noBuildings: true, startTime: 0 });
});

function dummy(x = 7300, y = 8000): Unit {
  return w.spawnUnit({ kind: 'hero', team: Team.Night, pos: { x, y }, name: 'd', stats: dummyStats() });
}

function run(n: number) { for (let i = 0; i < n; i++) w.step(); }

describe('雷恩', () => {
  it('雷霆战锤:弹道命中后伤害+眩晕', () => {
    const h = spawnHero(w, REIN, Team.Dawn, { x: 7000, y: 8000 });
    const d = dummy();
    learnAbility(w, h, 0);
    h.issueOrder({ type: 'cast', abilityIndex: 0, targetId: d.id });
    run(45); // 前摇 + 弹道
    expect(d.hp).toBeCloseTo(3000 - 100 * 0.75, 0);
    expect(hasModifier(d, 'rein_hammer_stun')).toBe(true);
    run(60);
    expect(hasModifier(d, 'rein_hammer_stun')).toBe(false); // 1.4s 后解除
  });

  it('裂石战吼:友军获得护甲与移速', () => {
    const h = spawnHero(w, REIN, Team.Dawn, { x: 7000, y: 8000 });
    const ally = spawnHero(w, AILI, Team.Dawn, { x: 7100, y: 8000 });
    h.heroMeta!.skillPoints = 2;
    learnAbility(w, h, 1);
    w.step();
    const armor0 = ally.calc.armor;
    h.issueOrder({ type: 'cast', abilityIndex: 1 });
    run(20);
    expect(ally.calc.armor).toBeCloseTo(armor0 + 5, 1);
  });

  it('巨刃顺劈:攻击溅射周围敌人', () => {
    const h = spawnHero(w, REIN, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 5; h.heroMeta!.skillPoints = 3;
    learnAbility(w, h, 2);
    const main = dummy(7100, 8000);
    const side = dummy(7150, 8100);
    h.issueOrder({ type: 'attack', targetId: main.id });
    run(60);
    expect(main.hp).toBeLessThan(3000);
    expect(side.hp).toBeLessThan(3000); // 吃到溅射
    expect(side.hp).toBeGreaterThan(main.hp); // 溅射伤害低于主目标
  });

  it('泰坦之力:攻击力百分比提升', () => {
    const h = spawnHero(w, REIN, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1;
    learnAbility(w, h, 3);
    w.step();
    const dmg0 = h.calc.dmgMin;
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    run(15);
    // +30% 总攻 + 10 力量
    expect(h.calc.dmgMin).toBeGreaterThan(dmg0 * 1.25);
  });
});

describe('莉雅', () => {
  it('冰霜新星:范围伤害+减速', () => {
    const h = spawnHero(w, LIYA, Team.Dawn, { x: 7000, y: 8000 });
    const d1 = dummy(7400, 8000);
    const d2 = dummy(7500, 8100);
    learnAbility(w, h, 0);
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 7450, y: 8050 } });
    run(30);
    expect(d1.hp).toBeCloseTo(3000 - 110 * 0.75, 0);
    expect(d2.hp).toBeCloseTo(3000 - 110 * 0.75, 0);
    expect(d1.calc.moveSpeed).toBeCloseTo(300 * 0.7, 0);
  });

  it('冰封禁制:缠绕+持续伤害', () => {
    const h = spawnHero(w, LIYA, Team.Dawn, { x: 7000, y: 8000 });
    const d = dummy(7400, 8000);
    learnAbility(w, h, 1);
    h.issueOrder({ type: 'cast', abilityIndex: 1, targetId: d.id });
    run(30); // 前摇 0.4 + 0.6s:禁制生效中(1.5s)
    expect(d.hp).toBeLessThan(3000); // DoT 生效
    // 被缠绕的目标无法移动
    d.issueOrder({ type: 'move', pos: { x: 8000, y: 8000 } });
    const x0 = d.pos.x;
    run(10); // 仍在禁制窗口内
    expect(d.pos.x).toBe(x0);
    run(60); // 禁制结束后可以移动
    expect(d.pos.x).toBeGreaterThan(x0);
  });

  it('秘法之泉:全图友方英雄回蓝光环', () => {
    const h = spawnHero(w, LIYA, Team.Dawn, { x: 7000, y: 8000 });
    const far = spawnHero(w, ZOLA, Team.Dawn, { x: 13000, y: 2000 });
    learnAbility(w, h, 2);
    run(30);
    expect(hasModifier(far, 'liya_spring_regen')).toBe(true);
    expect(far.calc.mpRegen).toBeGreaterThan(1.0); // 基础+0.75
  });

  it('极寒领域:引导期间周期伤害', () => {
    const h = spawnHero(w, LIYA, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 999;
    learnAbility(w, h, 3);
    const d = dummy(7300, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    run(30 * 3);
    const dmg = 3000 - d.hp;
    expect(dmg).toBeGreaterThan(100); // 若干跳 40×0.75
    expect(h.channeling === null || w.time < 7).toBe(true);
  });
});

describe('佐拉', () => {
  it('连环闪电:弹射多个目标', () => {
    const h = spawnHero(w, ZOLA, Team.Dawn, { x: 7000, y: 8000 });
    const d1 = dummy(7500, 8000);
    const d2 = dummy(7700, 8100);
    const d3 = dummy(7900, 8200);
    learnAbility(w, h, 0);
    h.issueOrder({ type: 'cast', abilityIndex: 0, targetId: d1.id });
    run(30);
    expect(d1.hp).toBeLessThan(3000);
    expect(d2.hp).toBeLessThan(3000);
    expect(d3.hp).toBeLessThan(3000);
  });

  it('静电场:施法时按当前生命电击周围英雄', () => {
    const h = spawnHero(w, ZOLA, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 3; h.heroMeta!.skillPoints = 2;
    learnAbility(w, h, 0); // Q
    learnAbility(w, h, 2); // 静电场 lvl1 = 4%
    const d = dummy(7500, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 0, targetId: d.id });
    run(30);
    // Q 75×0.75 = 56.25 + 静电场 4%×3000×0.75=90(顺序:先Q后静电,静电按扣除后的当前血)
    expect(3000 - d.hp).toBeGreaterThan(56 + 80);
  });

  it('雷神之怒:全图打击所有敌方英雄', () => {
    const h = spawnHero(w, ZOLA, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 999;
    learnAbility(w, h, 3);
    const near = dummy(7300, 8000);
    const far = dummy(13500, 1500);
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    run(30);
    expect(near.hp).toBeCloseTo(3000 - 210 * 0.75, 0);
    expect(far.hp).toBeCloseTo(3000 - 210 * 0.75, 0);
  });
});

describe('艾莉', () => {
  it('霜寒之箭:自动施法关闭时攻击不附带减速', () => {
    const h = spawnHero(w, AILI, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0);
    h.abilities[0].autocastOn = false; // 显式关闭(默认开启已是 Opus 策略,玩家可 toggle 关)
    const d = dummy(7400, 8000);
    h.issueOrder({ type: 'attack', targetId: d.id });
    run(70);
    expect(hasModifier(d, 'aili_frost_slow')).toBe(false);
    expect(d.calc.moveSpeed).toBeCloseTo(300, 0);
  });

  it('霜寒之箭:自动施法开启时攻击附带减速', () => {
    const h = spawnHero(w, AILI, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0);
    h.abilities[0].autocastOn = true;
    const d = dummy(7400, 8000);
    h.issueOrder({ type: 'attack', targetId: d.id });
    run(70);
    expect(hasModifier(d, 'aili_frost_slow')).toBe(true);
    expect(d.calc.moveSpeed).toBeCloseTo(270, 0); // -10%
  });

  it('疾风步:闪避全部普攻', () => {
    const h = spawnHero(w, AILI, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1);
    const d = w.spawnUnit({ kind: 'hero', team: Team.Night, pos: { x: 7100, y: 8000 }, name: 'd', stats: dummyStats({ dmgMin: 100, dmgMax: 100, attackRange: 300 }) });
    h.issueOrder({ type: 'cast', abilityIndex: 1 });
    run(3);
    d.issueOrder({ type: 'attack', targetId: h.id });
    const hp0 = h.hp;
    run(45); // 风行 2.5s 内
    expect(h.hp).toBeCloseTo(hp0, 0); // 全闪避(只有回血误差)
  });

  it('百步穿杨:被动加敏捷', () => {
    const h = spawnHero(w, AILI, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1;
    w.step();
    const dmg0 = h.calc.dmgMin;
    learnAbility(w, h, 3);
    w.step();
    expect(h.calc.dmgMin).toBe(dmg0 + 12); // 敏捷主属性 +12
  });
});
