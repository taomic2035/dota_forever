import { describe, it, expect, beforeEach } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { learnAbility } from '../src/sim/abilities';
import { applyDamage } from '../src/sim/combat';
import { hasModifier } from '../src/sim/modifiers';
import { DRU, PUG, LES, DWL, DWN, PBST, BATCH17 } from '../src/data/heroes/batch17';
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
beforeEach(() => { w = createWorld(map, { seed: 171, noBuildings: true, startTime: 0 }); });
function dummy(x = 7300, y = 8000, over: Partial<UnitStats> = {}): Unit {
  return w.spawnUnit({ kind: 'hero', team: Team.Night, pos: { x, y }, name: 'd', stats: dummyStats(over) });
}
function run(n: number) { for (let i = 0; i < n; i++) w.step(); }

describe('batch17 roster', () => {
  it('6 heroes with full kits', () => {
    expect(BATCH17.length).toBe(6);
    for (const h of BATCH17) {
      expect(h.abilities.length, h.key).toBe(4);
      expect(h.abilities[3].ultimate ?? false, `${h.key} R`).toBe(true);
    }
  });
});

describe('德如', () => {
  it('召唤灵熊:召出一头灵熊', () => {
    const h = spawnHero(w, DRU, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    h.issueOrder({ type: 'cast', abilityIndex: 0 });
    run(12);
    const bears = [...w.units.values()].filter((u) => u.name === '灵熊' && u.alive && u.summonOwnerId === h.id);
    expect(bears.length).toBe(1);
  });
  it('真身形态:强化生命/护甲/攻击', () => {
    const h = spawnHero(w, DRU, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 200;
    learnAbility(w, h, 3);
    w.step();
    const hp0 = h.calc.maxHp;
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    run(10);
    expect(hasModifier(h, 'dru_trueform_buff')).toBe(true);
    expect(h.calc.maxHp).toBeGreaterThan(hp0);
  });
});

describe('帕格', () => {
  it('衰老:虚无化目标(免疫物理)', () => {
    const h = spawnHero(w, PUG, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1); h.mp = 200;
    const t = dummy(7300, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 1, targetId: t.id });
    run(8);
    expect(hasModifier(t, 'pug_decrepify_ghost')).toBe(true);
    expect(applyDamage(w, t, { source: 0, attackType: 'hero', amount: 300 })).toBe(0);
  });
  it('生命汲取:引导吸血', () => {
    const h = spawnHero(w, PUG, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 300; h.hp = 300;
    learnAbility(w, h, 3);
    const t = dummy(7300, 8000, { magicResist: 0, moveSpeed: 0, acquireRange: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t.id });
    run(30);
    expect(t.hp).toBeLessThan(3000);
    expect(h.hp).toBeGreaterThan(300);
  });
});

describe('勒沙', () => {
  it('裂地:延迟眩晕+伤害', () => {
    const h = spawnHero(w, LES, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7300, 8000, { magicResist: 0, moveSpeed: 0, acquireRange: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 7300, y: 8000 } });
    run(10);
    expect(t.hp).toBe(3000); // 尚未触发
    run(30);
    expect(t.hp).toBeLessThan(3000);
    expect(hasModifier(t, 'les_split_stun')).toBe(true);
  });
  it('脉冲新星:持续范围伤害', () => {
    const h = spawnHero(w, LES, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 300;
    learnAbility(w, h, 3);
    const t = dummy(7300, 8000, { magicResist: 0 });
    const hp0 = t.hp;
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    run(30);
    expect(t.hp).toBeLessThan(hp0);
  });
});

describe('薇洛', () => {
  it('荆棘迷宫:定身+伤害', () => {
    const h = spawnHero(w, DWL, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7300, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 7300, y: 8000 } });
    run(12);
    expect(hasModifier(t, 'dwl_maze_root')).toBe(true);
  });
  it('恐惧:吓退周围敌人', () => {
    const h = spawnHero(w, DWL, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 200;
    learnAbility(w, h, 3);
    const t = dummy(7300, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    run(12);
    expect(hasModifier(t, 'dwl_terror_fear')).toBe(true);
  });
});

describe('晨曦', () => {
  it('圣锤:直线伤害+冲身', () => {
    const h = spawnHero(w, DWN, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7400, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 7700, y: 8000 } });
    run(10);
    expect(t.hp).toBeLessThan(3000);
    expect(h.pos.x).toBeGreaterThan(7300);
  });
  it('旭日守护:降临友军身边并治疗', () => {
    const h = spawnHero(w, DWN, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 200;
    learnAbility(w, h, 3);
    const ally = spawnHero(w, DRU, Team.Dawn, { x: 12000, y: 3000 });
    ally.hp = 300;
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: ally.id });
    run(12);
    expect(V.dist(h.pos, ally.pos)).toBeLessThan(400); // 降临到友军身边
    expect(ally.hp).toBeGreaterThan(300);
  });
});

describe('比斯', () => {
  it('践踏冲锋:撞击+眩晕', () => {
    const h = spawnHero(w, PBST, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7400, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 7800, y: 8000 } });
    run(10);
    expect(t.hp).toBeLessThan(3000);
    expect(hasModifier(t, 'pbst_onslaught_stun')).toBe(true);
    expect(h.pos.x).toBeGreaterThan(7300);
  });
  it('痛击:引导连续击晕', () => {
    const h = spawnHero(w, PBST, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 300;
    learnAbility(w, h, 3);
    const t = dummy(7200, 8000, { magicResist: 0, moveSpeed: 0, acquireRange: 0 });
    const hp0 = t.hp;
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t.id });
    run(25);
    expect(t.hp).toBeLessThan(hp0);
    expect(hasModifier(t, 'pbst_pulverize_stun')).toBe(true);
  });
});
