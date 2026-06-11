import { describe, it, expect, beforeEach } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { learnAbility } from '../src/sim/abilities';
import { hasModifier } from '../src/sim/modifiers';
import { TIN, NEC, SBR, SLA, LYC, GEM, BATCH14 } from '../src/data/heroes/batch14';
import { V } from '../src/core/vec2';
import type { World } from '../src/sim/world';
import type { Unit, UnitStats } from '../src/sim/unit';

const map = new GameMap();
function dummyStats(over: Partial<UnitStats> = {}): UnitStats {
  return {
    maxHp: 3000, hpRegen: 0, maxMp: 300, mpRegen: 0, dmgMin: 40, dmgMax: 40,
    attackType: 'hero', armorType: 'hero', armor: 0, magicResist: 0,
    attackRange: 150, attackPoint: 0.3, bat: 1.7, projectileSpeed: 0,
    moveSpeed: 300, collisionRadius: 24, visionDay: 1800, visionNight: 800,
    acquireRange: 600, bountyMin: 30, bountyMax: 30, xpBounty: 30,
    ...over,
  };
}
let w: World;
beforeEach(() => { w = createWorld(map, { seed: 141, noBuildings: true, startTime: 0 }); });
function dummy(x = 7300, y = 8000, over: Partial<UnitStats> = {}): Unit {
  return w.spawnUnit({ kind: 'hero', team: Team.Night, pos: { x, y }, name: 'd', stats: dummyStats(over) });
}
function run(n: number) { for (let i = 0; i < n; i++) w.step(); }

describe('batch14 roster', () => {
  it('6 heroes with full kits', () => {
    expect(BATCH14.length).toBe(6);
    for (const h of BATCH14) {
      expect(h.abilities.length, h.key).toBe(4);
      expect(h.abilities[3].ultimate ?? false, `${h.key} R`).toBe(true);
    }
  });
});

describe('提尼', () => {
  it('山崩:范围眩晕+伤害', () => {
    const h = spawnHero(w, TIN, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7300, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 7300, y: 8000 } });
    run(12);
    expect(t.hp).toBeLessThan(3000);
    expect(hasModifier(t, 'tin_avalanche_stun')).toBe(true);
  });
  it('投掷:落点造成伤害与眩晕', () => {
    const h = spawnHero(w, TIN, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1); h.mp = 200;
    w.spawnUnit({ kind: 'creep', team: Team.Dawn, pos: { x: 7100, y: 8000 }, name: 'c', stats: dummyStats({ maxHp: 500 }) });
    const t = dummy(7600, 8000, { magicResist: 0, moveSpeed: 0, acquireRange: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 1, pos: { x: 7600, y: 8000 } });
    run(10);
    expect(t.hp).toBeLessThan(3000);
    expect(hasModifier(t, 'tin_toss_stun')).toBe(true);
  });
});

describe('涅洛', () => {
  it('死亡脉冲:治疗友军+伤害敌军', () => {
    const h = spawnHero(w, NEC, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const ally = spawnHero(w, TIN, Team.Dawn, { x: 7200, y: 8000 });
    ally.hp = 300;
    const enemy = dummy(7300, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 0 });
    run(10);
    expect(ally.hp).toBeGreaterThan(300);
    expect(enemy.hp).toBeLessThan(3000);
  });
  it('心脏停搏:光环持续灼烧周围敌人', () => {
    const h = spawnHero(w, NEC, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1);
    const t = dummy(7300, 8000, { magicResist: 0 });
    const hp0 = t.hp;
    run(50);
    expect(t.hp).toBeLessThan(hp0);
  });
  it('死神镰刀:残血目标巨额伤害', () => {
    const h = spawnHero(w, NEC, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 500;
    learnAbility(w, h, 3);
    const t = dummy(7300, 8000, { magicResist: 0, maxHp: 6000 });
    t.hp = 2200; // 残血但不致死,缺失血量越多镰刀伤害越高
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t.id });
    run(12);
    expect(2200 - t.hp).toBeGreaterThan(800); // 巨额缺血伤害
    expect(hasModifier(t, 'nec_scythe_stun')).toBe(true);
  });
});

describe('史宾', () => {
  it('星体冲撞:远程冲锋+眩晕', () => {
    const h = spawnHero(w, SBR, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(9000, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 0, targetId: t.id });
    run(5);
    expect(V.dist(h.pos, t.pos)).toBeLessThan(250); // 冲到目标身边
    expect(hasModifier(t, 'sbr_charge_stun')).toBe(true);
  });
  it('星空裂击:瞬移+重创+眩晕', () => {
    const h = spawnHero(w, SBR, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 300;
    learnAbility(w, h, 3);
    const t = dummy(7500, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t.id });
    run(10);
    expect(t.hp).toBeLessThan(3000);
    expect(hasModifier(t, 'sbr_nether_stun')).toBe(true);
  });
});

describe('萨克', () => {
  it('猛扑:位移+缠绕', () => {
    const h = spawnHero(w, SLA, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1); h.mp = 200;
    const t = dummy(7500, 8000, { magicResist: 0, moveSpeed: 0, acquireRange: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 1, pos: { x: 7500, y: 8000 } });
    run(6);
    expect(h.pos.x).toBeGreaterThan(7300);
    expect(hasModifier(t, 'sla_pounce_leash')).toBe(true);
  });
  it('精华吸取:攻击削敌强己', () => {
    const h = spawnHero(w, SLA, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 2);
    const t = dummy(7110, 8000);
    h.issueOrder({ type: 'attack', targetId: t.id });
    run(40);
    expect(hasModifier(t, 'sla_essence_drain')).toBe(true);
    expect(hasModifier(h, 'sla_essence_gain')).toBe(true);
  });
  it('暗影之舞:隐身+回血', () => {
    const h = spawnHero(w, SLA, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 200; h.hp = 400;
    learnAbility(w, h, 3);
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    run(20);
    expect(hasModifier(h, 'sla_dance_buff')).toBe(true);
    expect(h.hp).toBeGreaterThan(400);
  });
});

describe('卢恩', () => {
  it('召唤狼群:召唤两头战狼', () => {
    const h = spawnHero(w, LYC, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    h.issueOrder({ type: 'cast', abilityIndex: 0 });
    run(8);
    const wolves = [...w.units.values()].filter((u) => u.name === '战狼' && u.alive && u.summonOwnerId === h.id);
    expect(wolves.length).toBe(2);
  });
  it('变形:暴击+极速', () => {
    const h = spawnHero(w, LYC, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 200;
    learnAbility(w, h, 3);
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    run(4);
    expect(hasModifier(h, 'lyc_shift_buff')).toBe(true);
    expect(h.calc.critChance).toBeGreaterThan(0);
  });
});

describe('吉姆', () => {
  it('巨石翻滚:直线伤害+位移', () => {
    const h = spawnHero(w, GEM, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7400, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 7600, y: 8000 } });
    run(8);
    expect(t.hp).toBeLessThan(3000);
    expect(h.pos.x).toBeGreaterThan(7200);
  });
  it('磁化吸引:拉近+伤害', () => {
    const h = spawnHero(w, GEM, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1); h.mp = 200;
    const t = dummy(7800, 8000, { magicResist: 0, moveSpeed: 0, acquireRange: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 1, targetId: t.id });
    run(8);
    expect(V.dist(t.pos, h.pos)).toBeLessThan(220);
    expect(t.hp).toBeLessThan(3000);
  });
  it('怒石迸发:持续范围伤害', () => {
    const h = spawnHero(w, GEM, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 400;
    learnAbility(w, h, 3);
    const t = dummy(7300, 8000, { magicResist: 0, moveSpeed: 0, acquireRange: 0 });
    const hp0 = t.hp;
    h.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7300, y: 8000 } });
    run(40);
    expect(t.hp).toBeLessThan(hp0);
    expect(hasModifier(t, 'gem_magnetize_slow')).toBe(true);
  });
});
