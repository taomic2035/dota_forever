import { describe, it, expect, beforeEach } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { learnAbility } from '../src/sim/abilities';
import { applyDamage } from '../src/sim/combat';
import { hasModifier } from '../src/sim/modifiers';
import { URS, LIF, ARC, SNP, HSK, IO, BATCH18 } from '../src/data/heroes/batch18';
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
beforeEach(() => { w = createWorld(map, { seed: 181, noBuildings: true, startTime: 0 }); });
function dummy(x = 7300, y = 8000, over: Partial<UnitStats> = {}): Unit {
  return w.spawnUnit({ kind: 'hero', team: Team.Night, pos: { x, y }, name: 'd', stats: dummyStats(over) });
}
function run(n: number) { for (let i = 0; i < n; i++) w.step(); }

describe('batch18 roster', () => {
  it('6 heroes with full kits', () => {
    expect(BATCH18.length).toBe(6);
    for (const h of BATCH18) {
      expect(h.abilities.length, h.key).toBe(4);
      expect(h.abilities[3].ultimate ?? false, `${h.key} R`).toBe(true);
    }
  });
});

describe('厄萨', () => {
  it('地震:范围伤害+减速', () => {
    const h = spawnHero(w, URS, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7300, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 0 });
    run(10);
    expect(t.hp).toBeLessThan(3000);
    expect(hasModifier(t, 'urs_shock_slow')).toBe(true);
  });
  it('怒抓:连续攻击叠加伤害', () => {
    const h = spawnHero(w, URS, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 2);
    const t = dummy(7110, 8000, { magicResist: 0, maxHp: 100000 });
    h.issueOrder({ type: 'attack', targetId: t.id });
    run(120);
    const stack = t.modifiers.find((m) => m.key === 'urs_swipes_stack');
    expect(stack && (stack.data!.n as number) >= 2).toBe(true);
  });
});

describe('纳吉', () => {
  it('狂暴:免疫魔法', () => {
    const h = spawnHero(w, LIF, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    h.issueOrder({ type: 'cast', abilityIndex: 0 });
    run(3);
    expect(hasModifier(h, 'lif_rage_buff')).toBe(true);
    expect(applyDamage(w, h, { source: 0, attackType: 'spell', amount: 300, flags: { spell: true } })).toBe(0);
  });
  it('猛扑寄生:瞬移重创+眩晕', () => {
    const h = spawnHero(w, LIF, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 200;
    learnAbility(w, h, 3);
    const t = dummy(7500, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t.id });
    run(8);
    expect(t.hp).toBeLessThan(3000);
    expect(hasModifier(t, 'lif_infest_stun')).toBe(true);
  });
});

describe('阿克', () => {
  it('磁场:范围内友军获得闪避/攻速', () => {
    const h = spawnHero(w, ARC, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const ally = spawnHero(w, URS, Team.Dawn, { x: 7100, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 7100, y: 8000 } });
    run(24); // 场地首次 tick(0.5s)后友军获得增益
    expect(hasModifier(ally, 'arc_field_buff')).toBe(true);
  });
  it('火花亡魂:延迟扑击最近敌人', () => {
    const h = spawnHero(w, ARC, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1); h.mp = 200;
    const t = dummy(7300, 8000, { magicResist: 0, moveSpeed: 0, acquireRange: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 1, pos: { x: 7350, y: 8000 } });
    run(10);
    expect(t.hp).toBe(3000); // 尚未扑击
    run(40);
    expect(t.hp).toBeLessThan(3000);
  });
});

describe('斯娜', () => {
  it('散射:锥形伤害+减速', () => {
    const h = spawnHero(w, SNP, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7400, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 7500, y: 8000 } });
    run(12);
    expect(t.hp).toBeLessThan(3000);
    expect(hasModifier(t, 'snp_scatter_slow')).toBe(true);
  });
  it('烤饼:弹跳+落地眩晕', () => {
    const h = spawnHero(w, SNP, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1); h.mp = 200;
    const t = dummy(7500, 8000, { magicResist: 0, moveSpeed: 0, acquireRange: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 1, pos: { x: 7500, y: 8000 } });
    run(8);
    expect(h.pos.x).toBeGreaterThan(7300);
    expect(hasModifier(t, 'snp_cookie_stun')).toBe(true);
  });
});

describe('哈斯', () => {
  it('燃烧之矛:攻击点燃目标', () => {
    const h = spawnHero(w, HSK, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0);
    const t = dummy(7350, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'attack', targetId: t.id });
    run(40);
    expect(t.modifiers.some((m) => m.key === 'hsk_spears_burn')).toBe(true);
  });
  it('狂热:残血时获得攻速', () => {
    const h = spawnHero(w, HSK, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1);
    h.hp = h.calc.maxHp * 0.2; // 残血
    run(20);
    expect(hasModifier(h, 'hsk_berserk_as')).toBe(true);
  });
  it('生命燃烧:按目标生命百分比重创', () => {
    const h = spawnHero(w, HSK, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 200;
    learnAbility(w, h, 3);
    const t = dummy(7400, 8000, { magicResist: 0, maxHp: 4000 });
    t.hp = 4000;
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t.id });
    run(8);
    expect(4000 - t.hp).toBeGreaterThan(500);
  });
});

describe('艾欧', () => {
  it('系连:为友军回血加速', () => {
    const h = spawnHero(w, IO, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const ally = spawnHero(w, URS, Team.Dawn, { x: 7200, y: 8000 });
    ally.hp = 400;
    h.issueOrder({ type: 'cast', abilityIndex: 0, targetId: ally.id });
    run(20);
    expect(hasModifier(ally, 'io_tether_buff')).toBe(true);
    expect(ally.hp).toBeGreaterThan(400);
  });
  it('转移:与系连友军一同传送', () => {
    const h = spawnHero(w, IO, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 2; h.mp = 300;
    learnAbility(w, h, 0); learnAbility(w, h, 3);
    const ally = spawnHero(w, URS, Team.Dawn, { x: 7200, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 0, targetId: ally.id });
    run(8);
    h.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 11000, y: 6000 } });
    run(20);
    expect(V.dist(h.pos, { x: 11000, y: 6000 })).toBeLessThan(400);
    expect(V.dist(ally.pos, h.pos)).toBeLessThan(400); // 友军一同转移
  });
});
