import { describe, it, expect, beforeEach } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { learnAbility } from '../src/sim/abilities';
import { applyDamage } from '../src/sim/combat';
import { hasModifier } from '../src/sim/modifiers';
import { RIK, JUG, DPR, DSR, BEA, NYX, BATCH12 } from '../src/data/heroes/batch12';
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
beforeEach(() => { w = createWorld(map, { seed: 121, noBuildings: true, startTime: 0 }); });
function dummy(x = 7300, y = 8000, over: Partial<UnitStats> = {}): Unit {
  return w.spawnUnit({ kind: 'hero', team: Team.Night, pos: { x, y }, name: 'd', stats: dummyStats(over) });
}
function run(n: number) { for (let i = 0; i < n; i++) w.step(); }

describe('batch12 roster', () => {
  it('6 heroes with full kits', () => {
    expect(BATCH12.length).toBe(6);
    for (const h of BATCH12) {
      expect(h.abilities.length, h.key).toBe(4);
      expect(h.abilities[3].ultimate ?? false, `${h.key} R`).toBe(true);
    }
  });
});

describe('里卡', () => {
  it('烟幕:范围沉默+减速', () => {
    const h = spawnHero(w, RIK, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7300, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 7300, y: 8000 } });
    run(12);
    expect(hasModifier(t, 'rik_smoke_debuff')).toBe(true);
  });
  it('闪袭:瞬移到目标并造成伤害', () => {
    const h = spawnHero(w, RIK, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1); h.mp = 200;
    const t = dummy(7700, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 1, targetId: t.id });
    run(5);
    expect(V.dist(h.pos, t.pos)).toBeLessThan(220);
    expect(t.hp).toBeLessThan(3000);
  });
  it('潜行大师:隐身', () => {
    const h = spawnHero(w, RIK, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 200;
    learnAbility(w, h, 3);
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    run(3);
    expect(hasModifier(h, 'rik_cloak_buff')).toBe(true);
  });
});

describe('朱戈', () => {
  it('剑刃风暴:免疫魔法并持续伤害', () => {
    const h = spawnHero(w, JUG, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7200, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 0 });
    run(20);
    expect(hasModifier(h, 'jug_bladefury_buff')).toBe(true);
    expect(applyDamage(w, h, { source: 0, attackType: 'spell', amount: 300, flags: { spell: true } })).toBe(0); // 魔免
    expect(t.hp).toBeLessThan(3000); // 旋风伤害
  });
  it('无敌斩:连续斩击附近敌人', () => {
    const h = spawnHero(w, JUG, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 300;
    learnAbility(w, h, 3);
    const a = dummy(7200, 8000, { magicResist: 0, maxHp: 5000 });
    const b = dummy(7100, 8200, { magicResist: 0, maxHp: 5000 });
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: a.id });
    run(10);
    expect(a.hp).toBeLessThan(5000);
    expect(b.hp).toBeLessThan(5000);
  });
});

describe('克蕾', () => {
  it('蝗群:直线伤害', () => {
    const h = spawnHero(w, DPR, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7400, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 7650, y: 8000 } }); // 施法距离 700 内
    run(12);
    expect(t.hp).toBeLessThan(3000);
  });
  it('灵魂虹吸:吸血治疗自身', () => {
    const h = spawnHero(w, DPR, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 2); h.mp = 200; h.hp = 300;
    const t = dummy(7300, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 2, targetId: t.id });
    run(30);
    expect(t.hp).toBeLessThan(3000);
    expect(h.hp).toBeGreaterThan(300);
  });
  it('群魔乱舞:召唤恶灵', () => {
    const h = spawnHero(w, DPR, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 200;
    learnAbility(w, h, 3);
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    run(10);
    const spirits = [...w.units.values()].filter((u) => u.name === '恶灵' && u.alive && u.summonOwnerId === h.id);
    expect(spirits.length).toBe(4);
  });
});

describe('塞尔', () => {
  it('真空:聚拢敌人+伤害', () => {
    const h = spawnHero(w, DSR, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7600, 8000, { magicResist: 0, moveSpeed: 0, acquireRange: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 7400, y: 8000 } });
    run(12);
    expect(t.hp).toBeLessThan(3000);
    expect(V.dist(t.pos, { x: 7400, y: 8000 })).toBeLessThan(120); // 被吸到真空点
  });
  it('复制之墙:减速+召唤幻象', () => {
    const h = spawnHero(w, DSR, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 200;
    learnAbility(w, h, 3);
    const t = dummy(7300, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7300, y: 8000 } });
    run(12);
    expect(hasModifier(t, 'dsr_wall_slow')).toBe(true);
    const illu = [...w.units.values()].filter((u) => u.kind === 'illusion' && u.summonOwnerId === h.id && u.alive);
    expect(illu.length).toBe(2);
  });
});

describe('巴洛', () => {
  it('野性呼唤:召唤野猪与雄鹰', () => {
    const h = spawnHero(w, BEA, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1); h.mp = 200;
    h.issueOrder({ type: 'cast', abilityIndex: 1 });
    run(8);
    const boar = [...w.units.values()].filter((u) => u.name === '战野猪' && u.alive && u.summonOwnerId === h.id);
    const hawk = [...w.units.values()].filter((u) => u.name === '雄鹰' && u.alive && u.summonOwnerId === h.id);
    expect(boar.length).toBe(1);
    expect(hawk.length).toBe(1);
  });
  it('野兽之心:友军攻速光环', () => {
    const h = spawnHero(w, BEA, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 2);
    const ally = spawnHero(w, JUG, Team.Dawn, { x: 7200, y: 8000 });
    run(30);
    expect(hasModifier(ally, 'bea_inner_buff')).toBe(true);
  });
  it('原始咆哮:眩晕+伤害', () => {
    const h = spawnHero(w, BEA, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 300;
    learnAbility(w, h, 3);
    const t = dummy(7400, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t.id });
    run(12);
    expect(t.hp).toBeLessThan(3000);
    expect(hasModifier(t, 'bea_roar_stun')).toBe(true);
  });
});

describe('纳克斯', () => {
  it('穿刺:直线眩晕+伤害', () => {
    const h = spawnHero(w, NYX, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7400, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 7550, y: 8000 } }); // 施法距离 600 内
    run(12);
    expect(t.hp).toBeLessThan(3000);
    expect(hasModifier(t, 'nyx_impale_stun')).toBe(true);
  });
  it('法力燃烧:烧蓝并造成伤害', () => {
    const h = spawnHero(w, NYX, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1); h.mp = 200;
    const t = dummy(7300, 8000, { magicResist: 0 });
    t.mp = 200;
    const hp0 = t.hp;
    h.issueOrder({ type: 'cast', abilityIndex: 1, targetId: t.id });
    run(8);
    expect(t.mp).toBeLessThan(200);
    expect(t.hp).toBeLessThan(hp0);
  });
  it('尖刺甲壳:格挡一次伤害', () => {
    const h = spawnHero(w, NYX, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 2); h.mp = 200;
    h.issueOrder({ type: 'cast', abilityIndex: 2 });
    run(3);
    expect(hasModifier(h, 'nyx_carapace_buff')).toBe(true);
    expect(applyDamage(w, h, { source: 0, attackType: 'hero', amount: 300, flags: { pure: true } })).toBe(0); // 首次格挡
  });
  it('复仇:潜行后首次攻击爆发', () => {
    const h = spawnHero(w, NYX, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 200;
    learnAbility(w, h, 3);
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    run(3);
    expect(hasModifier(h, 'nyx_vendetta_buff')).toBe(true);
    const t = dummy(7110, 8000, { magicResist: 0, maxHp: 5000 });
    h.issueOrder({ type: 'attack', targetId: t.id });
    run(30);
    expect(hasModifier(h, 'nyx_vendetta_buff')).toBe(false); // 出手后消耗
    expect(t.hp).toBeLessThan(5000);
  });
});
