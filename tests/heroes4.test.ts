import { describe, it, expect, beforeEach } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { learnAbility } from '../src/sim/abilities';
import { applyDamage } from '../src/sim/combat';
import { hasModifier } from '../src/sim/modifiers';
import { DUNCAN, ZENO, TORGA, SELIA, MIRA, GRIM, BATCH4 } from '../src/data/heroes/batch4';
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
  w = createWorld(map, { seed: 41, noBuildings: true, startTime: 0 });
});

function dummy(x = 7300, y = 8000, over: Partial<UnitStats> = {}): Unit {
  return w.spawnUnit({ kind: 'hero', team: Team.Night, pos: { x, y }, name: 'd', stats: dummyStats(over) });
}
function run(n: number) { for (let i = 0; i < n; i++) w.step(); }

describe('batch4 roster', () => {
  it('6 heroes with full kits', () => {
    expect(BATCH4.length).toBe(6);
    for (const h of BATCH4) {
      expect(h.abilities.length, h.key).toBe(4);
      expect(h.abilities[3].ultimate ?? false, `${h.key} R`).toBe(true);
    }
  });
});

describe('邓肯', () => {
  it('战吼嘲讽:强制敌人攻击自己', () => {
    const h = spawnHero(w, DUNCAN, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0);
    const enemy = dummy(7150, 8000, { dmgMin: 60, dmgMax: 60, attackRange: 150 });
    const ally = spawnHero(w, ZENO, Team.Dawn, { x: 6600, y: 8000 });
    // 敌人本想打 ally,嘲讽后必须打 duncan
    enemy.issueOrder({ type: 'attack', targetId: ally.id });
    const allyHp0 = ally.hp;
    const hp0 = h.hp;
    h.issueOrder({ type: 'cast', abilityIndex: 0 });
    run(35); // 嘲讽 1.4s 窗口内
    expect(enemy.tauntSourceId).toBe(h.id);
    expect(h.hp).toBeLessThan(hp0);   // duncan 在挨打
    expect(ally.hp).toBe(allyHp0);    // 友军没挨打
  });
  it('盾击:伤害+眩晕+自身护盾', () => {
    const h = spawnHero(w, DUNCAN, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 3; h.heroMeta!.skillPoints = 2;
    learnAbility(w, h, 2);
    const t = dummy(7150, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 2, targetId: t.id });
    run(15);
    expect(t.hp).toBeLessThan(3000);
    expect(hasModifier(t, 'duncan_bash_stun')).toBe(true);
  });
});

describe('泽诺', () => {
  it('奥术激光:纯粹伤害无视高甲', () => {
    const h = spawnHero(w, ZENO, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0);
    const t = dummy(7400, 8000, { armor: 100, magicResist: 0.9 }); // 极高防御
    h.issueOrder({ type: 'cast', abilityIndex: 0, targetId: t.id });
    run(15);
    expect(3000 - t.hp).toBeCloseTo(100, 0); // 纯粹伤害 100 不被削减
    expect(hasModifier(t, 'zeno_laser_blind')).toBe(true);
  });
  it('追踪导弹:多枚命中附近英雄', () => {
    const h = spawnHero(w, ZENO, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 3; h.heroMeta!.skillPoints = 2;
    learnAbility(w, h, 1);
    const t = dummy(7400, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 1 });
    run(40);
    expect(t.hp).toBeLessThan(3000);
  });
  it('过载重置:清空 Q/W 冷却', () => {
    const h = spawnHero(w, ZENO, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 3;
    learnAbility(w, h, 0); learnAbility(w, h, 3);
    const t = dummy(7400, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 0, targetId: t.id });
    run(15);
    expect(w.time).toBeLessThan(h.abilities[0].cooldownUntil); // Q 在冷却
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    run(10);
    expect(h.abilities[0].cooldownUntil).toBeLessThanOrEqual(w.time + 0.01); // 被重置
  });
});

describe('托尔加', () => {
  it('践踏:范围眩晕+伤害', () => {
    const h = spawnHero(w, TORGA, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 3; h.heroMeta!.skillPoints = 2;
    learnAbility(w, h, 1);
    const t = dummy(7200, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 1 });
    run(10);
    expect(t.hp).toBeLessThan(3000);
    expect(hasModifier(t, 'torga_stomp_stun')).toBe(true);
  });
  it('反击:被攻击时反弹伤害给攻击者', () => {
    const h = spawnHero(w, TORGA, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 5; h.heroMeta!.skillPoints = 4;
    for (let i = 0; i < 4; i++) learnAbility(w, h, 2); // 反击满级 1.5
    const attacker = dummy(7140, 8000, { dmgMin: 100, dmgMax: 100, maxHp: 5000 });
    attacker.issueOrder({ type: 'attack', targetId: h.id });
    const aHp0 = attacker.hp;
    run(60);
    expect(attacker.hp).toBeLessThan(aHp0); // 攻击者被反伤
  });
});

describe('赛丽娅', () => {
  it('恐怖波动:线性伤害+减甲', () => {
    const h = spawnHero(w, SELIA, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0);
    const t = dummy(7400, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 7700, y: 8000 } }); // 700 < 施法距离 800
    run(15);
    expect(t.hp).toBeLessThan(3000);
    expect(hasModifier(t, 'selia_wave_armor')).toBe(true);
  });
  it('灵魂换位:交换双方位置', () => {
    const h = spawnHero(w, SELIA, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1;
    learnAbility(w, h, 3);
    const t = dummy(7600, 8000);
    const hPos = V.clone(h.pos);
    const tPos = V.clone(t.pos);
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t.id });
    run(8);
    expect(V.dist(h.pos, tPos)).toBeLessThan(120);
    expect(V.dist(t.pos, hPos)).toBeLessThan(120);
  });
});

describe('米拉', () => {
  it('月刃:攻击在敌人间弹射', () => {
    const h = spawnHero(w, MIRA, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0);
    const main = dummy(7500, 8000);
    const near = dummy(7600, 8100);
    h.issueOrder({ type: 'attack', targetId: main.id });
    run(60);
    expect(main.hp).toBeLessThan(3000);
    expect(near.hp).toBeLessThan(3000); // 弹射命中
  });
  it('月华披风:夜晚闪避更高', () => {
    const day = createWorld(map, { seed: 41, noBuildings: true, startTime: 30 });
    const hd = spawnHero(day, MIRA, Team.Dawn, { x: 7000, y: 8000 });
    hd.level = 6; hd.heroMeta!.skillPoints = 1; hd.mp = 400;
    learnAbility(day, hd, 3);
    hd.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 10; i++) day.step();
    const dayEva = hd.calc.evasion;

    const night = createWorld(map, { seed: 41, noBuildings: true, startTime: 310 });
    const hn = spawnHero(night, MIRA, Team.Dawn, { x: 7000, y: 8000 });
    hn.level = 6; hn.heroMeta!.skillPoints = 1; hn.mp = 400;
    learnAbility(night, hn, 3);
    hn.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 10; i++) night.step();
    expect(night.isNight).toBe(true);
    expect(hn.calc.evasion).toBeGreaterThan(dayEva);
  });
});

describe('格里姆', () => {
  it('收割之镰:残血伤害更高', () => {
    const h = spawnHero(w, GRIM, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0);
    const full = dummy(7300, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 0, targetId: full.id });
    run(15);
    const dmgFull = 3000 - full.hp;

    const hurt = dummy(7300, 7600, { magicResist: 0 });
    hurt.hp = 300; // 残血
    h.abilities[0].cooldownUntil = -Infinity;
    h.mp = 300;
    h.issueOrder({ type: 'cast', abilityIndex: 0, targetId: hurt.id });
    run(15);
    const dmgHurt = 300 - hurt.hp;
    expect(dmgHurt).toBeGreaterThan(dmgFull); // 缺血越多伤害越高
  });
  it('死神收割:残血处决', () => {
    const h = spawnHero(w, GRIM, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 400;
    learnAbility(w, h, 3);
    const t = dummy(7400, 8000, { maxHp: 2000 });
    t.hp = 200; // 低于 12% 阈值(2000×0.12=240)
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t.id });
    run(15);
    expect(t.alive).toBe(false);
  });
});
