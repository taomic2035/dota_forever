import { describe, it, expect, beforeEach } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { learnAbility } from '../src/sim/abilities';
import { applyDamage } from '../src/sim/combat';
import { hasModifier } from '../src/sim/modifiers';
import { LAIN, MORFIN, BROG, WIF, ZUKA, CEDRIC, BATCH6 } from '../src/data/heroes/batch6';
import { V } from '../src/core/vec2';
import type { World } from '../src/sim/world';
import type { Unit, UnitStats } from '../src/sim/unit';

const map = new GameMap();

function dummyStats(over: Partial<UnitStats> = {}): UnitStats {
  return {
    maxHp: 3000, hpRegen: 0, maxMp: 300, mpRegen: 0, dmgMin: 40, dmgMax: 40,
    attackType: 'hero', armorType: 'hero', armor: 0, magicResist: 0.25,
    attackRange: 150, attackPoint: 0.3, bat: 1.7, projectileSpeed: 0,
    moveSpeed: 300, collisionRadius: 24, visionDay: 1800, visionNight: 800,
    acquireRange: 600, bountyMin: 30, bountyMax: 30, xpBounty: 30,
    ...over,
  };
}

let w: World;
beforeEach(() => {
  w = createWorld(map, { seed: 61, noBuildings: true, startTime: 0 });
});
function dummy(x = 7300, y = 8000, over: Partial<UnitStats> = {}): Unit {
  return w.spawnUnit({ kind: 'hero', team: Team.Night, pos: { x, y }, name: 'd', stats: dummyStats(over) });
}
function run(n: number) { for (let i = 0; i < n; i++) w.step(); }

describe('batch6 roster', () => {
  it('6 heroes with full kits', () => {
    expect(BATCH6.length).toBe(6);
    for (const h of BATCH6) {
      expect(h.abilities.length, h.key).toBe(4);
      expect(h.abilities[3].ultimate ?? false, `${h.key} R`).toBe(true);
    }
  });
});

describe('莱恩', () => {
  it('贯穿之刺:线性伤害+眩晕', () => {
    const h = spawnHero(w, LAIN, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0);
    const t = dummy(7400, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 7700, y: 8000 } }); // 700 < 施法距离 800
    run(15);
    expect(t.hp).toBeLessThan(3000);
    expect(hasModifier(t, 'lain_skewer_stun')).toBe(true);
  });
  it('死亡之雷:巨额单体伤害', () => {
    const h = spawnHero(w, LAIN, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 600;
    learnAbility(w, h, 3);
    const t = dummy(7400, 8000, { magicResist: 0, maxHp: 5000 });
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t.id });
    run(20);
    expect(5000 - t.hp).toBeGreaterThan(350);
  });
});

describe('莫芬', () => {
  it('波形冲击:位移+沿途伤害', () => {
    const h = spawnHero(w, MORFIN, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0);
    const t = dummy(7400, 8000);
    const from = V.clone(h.pos);
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 7700, y: 8000 } });
    run(10);
    expect(V.dist(h.pos, from)).toBeGreaterThan(300);
    expect(t.hp).toBeLessThan(3000);
  });
  it('自适打击:力量主导强眩晕,敏捷主导高伤害', () => {
    // 力量型(临时改属性)
    const hs = spawnHero(w, MORFIN, Team.Dawn, { x: 7000, y: 8000 });
    hs.heroDef = { ...MORFIN, baseStr: 100, baseAgi: 10 };
    learnAbility(w, hs, 1);
    const t1 = dummy(7300, 8000);
    hs.issueOrder({ type: 'cast', abilityIndex: 1, targetId: t1.id });
    run(12);
    expect(hasModifier(t1, 'morfin_adapt_stun')).toBe(true);
    // 验证眩晕时长:力量型应 ≥ 1s
    const stun = t1.modifiers.find((m) => m.key === 'morfin_adapt_stun')!;
    expect(stun.expiresAt - w.time).toBeGreaterThan(0.8);
  });
});

describe('布罗格', () => {
  it('棘甲护身:减免受到的伤害', () => {
    const h = spawnHero(w, BROG, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 7; h.heroMeta!.skillPoints = 4;
    for (let i = 0; i < 4; i++) learnAbility(w, h, 1); // 棘甲满级 28%
    w.step();
    expect(h.calc.incomingDamageReduction).toBeCloseTo(0.28, 5);
    const hp0 = h.hp;
    applyDamage(w, h, { source: 0, attackType: 'hero', amount: 100, flags: { pure: true } });
    // 纯粹 100 经 28% 减免 → 72
    expect(hp0 - h.hp).toBeCloseTo(72, 0);
  });
  it('棘刺喷射:连续命中递增', () => {
    const h = spawnHero(w, BROG, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0);
    const t = dummy(7300, 8000, { magicResist: 0, maxHp: 100000 });
    h.issueOrder({ type: 'cast', abilityIndex: 0 });
    run(5);
    const dmg1 = 100000 - t.hp;
    h.abilities[0].cooldownUntil = -Infinity; h.mp = 300;
    h.issueOrder({ type: 'cast', abilityIndex: 0 });
    run(5);
    const dmg2 = (100000 - t.hp) - dmg1;
    expect(dmg2).toBeGreaterThan(dmg1); // 第二次因叠层更高
  });
});

describe('薇芙', () => {
  it('缩地:隐身+加速', () => {
    const h = spawnHero(w, WIF, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1);
    h.issueOrder({ type: 'cast', abilityIndex: 1 });
    run(5);
    expect(hasModifier(h, 'wif_shukuchi_buff')).toBe(true);
    expect(h.calc.moveSpeed).toBeGreaterThan(300);
  });
  it('时光倒流:大幅回血', () => {
    const h = spawnHero(w, WIF, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 200;
    learnAbility(w, h, 3);
    h.hp = h.calc.maxHp * 0.2;
    const hp0 = h.hp;
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    run(5);
    expect(h.hp).toBeGreaterThan(hp0 + h.calc.maxHp * 0.3);
  });
});

describe('祖卡', () => {
  it('妖术:缴械+沉默+减速', () => {
    const h = spawnHero(w, ZUKA, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0);
    const t = dummy(7400, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 0, targetId: t.id });
    run(15);
    expect(hasModifier(t, 'zuka_hex_debuff')).toBe(true);
    expect(t.calc.moveSpeed).toBeLessThan(160);
  });
  it('毒蛇守卫:召唤固定攻击单位', () => {
    const h = spawnHero(w, ZUKA, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 3; h.heroMeta!.skillPoints = 2; h.mp = 300;
    learnAbility(w, h, 2);
    h.issueOrder({ type: 'cast', abilityIndex: 2, pos: { x: 7100, y: 8000 } });
    run(15);
    const wards = [...w.units.values()].filter((u) => u.name === '毒蛇守卫' && u.alive);
    expect(wards.length).toBe(2); // lvl1 = 2 个
    expect(wards[0].calc.moveSpeed).toBe(0); // 固定不动
  });
});

describe('塞德里克', () => {
  it('寄生之种:对敌伤害对友治疗', () => {
    const h = spawnHero(w, CEDRIC, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0);
    const enemy = dummy(7400, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 0, targetId: enemy.id });
    run(60);
    expect(enemy.hp).toBeLessThan(3000);

    const ally = spawnHero(w, BROG, Team.Dawn, { x: 6600, y: 8000 });
    ally.hp = 500;
    h.abilities[0].cooldownUntil = -Infinity; h.mp = 300;
    h.issueOrder({ type: 'cast', abilityIndex: 0, targetId: ally.id });
    run(60);
    expect(ally.hp).toBeGreaterThan(500);
  });
  it('生命护甲:护盾吸收伤害', () => {
    const h = spawnHero(w, CEDRIC, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1);
    const ally = spawnHero(w, BROG, Team.Dawn, { x: 7200, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 1, targetId: ally.id });
    run(10);
    const hp0 = ally.hp;
    applyDamage(w, ally, { source: 0, attackType: 'hero', amount: 50, flags: { pure: true } });
    expect(ally.hp).toBe(hp0); // 被护盾吸收
  });
  it('藤蔓缠绕:范围缠绕', () => {
    const h = spawnHero(w, CEDRIC, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 300;
    learnAbility(w, h, 3);
    const t = dummy(7300, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    run(15);
    expect(hasModifier(t, 'cedric_overgrowth_root')).toBe(true);
  });
});
