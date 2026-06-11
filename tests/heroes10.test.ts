import { describe, it, expect, beforeEach } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { learnAbility } from '../src/sim/abilities';
import { applyDamage } from '../src/sim/combat';
import { hasModifier } from '../src/sim/modifiers';
import { WIRA, SLAR, KUN, DAZ, PUK, SVE, BATCH10 } from '../src/data/heroes/batch10';
import { V } from '../src/core/vec2';
import type { World } from '../src/sim/world';
import type { Unit, UnitStats } from '../src/sim/unit';

const map = new GameMap();
function dummyStats(over: Partial<UnitStats> = {}): UnitStats {
  return {
    maxHp: 3000, hpRegen: 0, maxMp: 300, mpRegen: 0, dmgMin: 40, dmgMax: 40,
    attackType: 'hero', armorType: 'hero', armor: 5, magicResist: 0,
    attackRange: 150, attackPoint: 0.3, bat: 1.7, projectileSpeed: 0,
    moveSpeed: 300, collisionRadius: 24, visionDay: 1800, visionNight: 800,
    acquireRange: 600, bountyMin: 30, bountyMax: 30, xpBounty: 30,
    ...over,
  };
}
let w: World;
beforeEach(() => { w = createWorld(map, { seed: 101, noBuildings: true, startTime: 0 }); });
function dummy(x = 7300, y = 8000, over: Partial<UnitStats> = {}): Unit {
  return w.spawnUnit({ kind: 'hero', team: Team.Night, pos: { x, y }, name: 'd', stats: dummyStats(over) });
}
function run(n: number) { for (let i = 0; i < n; i++) w.step(); }
function attackUntilProc(h: Unit, target: Unit, key: string, ticks: number): boolean {
  h.issueOrder({ type: 'attack', targetId: target.id });
  for (let i = 0; i < ticks; i++) { w.step(); if (target.modifiers.some((m) => m.key === key)) return true; }
  return false;
}

describe('batch10 roster', () => {
  it('6 heroes with full kits', () => {
    expect(BATCH10.length).toBe(6);
    for (const h of BATCH10) {
      expect(h.abilities.length, h.key).toBe(4);
      expect(h.abilities[3].ultimate ?? false, `${h.key} R`).toBe(true);
    }
  });
});

describe('薇尔', () => {
  it('缚击:缠绕直线上的敌人', () => {
    const h = spawnHero(w, WIRA, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7400, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 8000, y: 8000 } });
    run(12);
    expect(t.hp).toBeLessThan(3000);
    expect(hasModifier(t, 'wira_shackle_root')).toBe(true);
  });
  it('集中火力:大幅提升攻速', () => {
    const h = spawnHero(w, WIRA, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 200;
    learnAbility(w, h, 3);
    const t = dummy(7300, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t.id });
    run(14); // 前摇后施放,留余量让 recalc 折叠攻速
    expect(hasModifier(h, 'wira_focus_buff')).toBe(true);
    expect(h.calc.ias).toBeGreaterThan(1.5);
  });
});

describe('斯拉', () => {
  it('深渊重压:范围眩晕+伤害', () => {
    const h = spawnHero(w, SLAR, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1); h.mp = 200;
    const t = dummy(7250, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 1 });
    run(12);
    expect(t.hp).toBeLessThan(3000);
    expect(hasModifier(t, 'slar_crush_stun')).toBe(true);
  });
  it('深海重击:攻击概率眩晕', () => {
    const h = spawnHero(w, SLAR, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 2);
    const t = dummy(7110, 8000, { maxHp: 100000 });
    expect(attackUntilProc(h, t, 'slar_bash_stun', 30 * 12)).toBe(true);
  });
  it('裂目:削减目标护甲', () => {
    const h = spawnHero(w, SLAR, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 200;
    learnAbility(w, h, 3);
    const t = dummy(7300, 8000);
    w.step();
    const armor0 = t.calc.armor;
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t.id });
    run(10);
    expect(t.calc.armor).toBeLessThan(armor0);
  });
});

describe('昆恩(怒涛)', () => {
  it('激流:延迟喷发眩晕+伤害', () => {
    const h = spawnHero(w, KUN, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7300, 8000, { magicResist: 0, moveSpeed: 0, acquireRange: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 7300, y: 8000 } });
    run(10);
    expect(t.hp).toBe(3000); // 尚未喷发
    run(50); // 越过 1.5s 延迟
    expect(t.hp).toBeLessThan(3000);
    expect(hasModifier(t, 'kun_torrent_stun')).toBe(true);
  });
  it('潮汐之刃:攻击劈砍身边敌人', () => {
    const h = spawnHero(w, KUN, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1);
    const main = dummy(7110, 8000, { moveSpeed: 0, acquireRange: 0 });
    const splash = dummy(7250, 8000, { moveSpeed: 0, acquireRange: 0 });
    h.issueOrder({ type: 'attack', targetId: main.id });
    run(60);
    expect(splash.hp).toBeLessThan(3000);
  });
  it('潮位标记:数秒后拉回标记点', () => {
    const h = spawnHero(w, KUN, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 2); h.mp = 200;
    const t = dummy(7300, 8000, { moveSpeed: 0, acquireRange: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 2, targetId: t.id });
    run(8);
    t.pos = { x: 9500, y: 8000 }; t.prevPos = { x: 9500, y: 8000 }; // 移到远处
    run(80); // 越过标记延迟 → 拉回
    expect(V.dist(t.pos, { x: 7300, y: 8000 })).toBeLessThan(200);
  });
});

describe('戴泽', () => {
  it('剧毒之触:持续伤害+减速', () => {
    const h = spawnHero(w, DAZ, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7300, 8000, { magicResist: 0 });
    const hp0 = t.hp;
    h.issueOrder({ type: 'cast', abilityIndex: 0, targetId: t.id });
    run(40);
    expect(hasModifier(t, 'daz_poison_dot')).toBe(true);
    expect(t.hp).toBeLessThan(hp0);
  });
  it('薄葬:致死伤害下保留 1 血', () => {
    const h = spawnHero(w, DAZ, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1); h.mp = 200;
    const ally = spawnHero(w, SVE, Team.Dawn, { x: 7150, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 1, targetId: ally.id });
    run(8);
    expect(hasModifier(ally, 'daz_grave_buff')).toBe(true);
    applyDamage(w, ally, { source: 0, attackType: 'hero', amount: 999999, flags: { pure: true } });
    expect(ally.alive).toBe(true);
    expect(ally.hp).toBe(1);
  });
  it('编织:持续削减敌人护甲', () => {
    const h = spawnHero(w, DAZ, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 200;
    learnAbility(w, h, 3);
    const t = dummy(7300, 8000);
    w.step();
    const armor0 = t.calc.armor;
    h.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7300, y: 8000 } });
    run(40);
    expect(t.calc.armor).toBeLessThan(armor0);
  });
});

describe('帕克', () => {
  it('幻惑法球:直线伤害+减速', () => {
    const h = spawnHero(w, PUK, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7400, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 7800, y: 8000 } });
    run(12);
    expect(t.hp).toBeLessThan(3000);
    expect(hasModifier(t, 'puk_orb_slow')).toBe(true);
  });
  it('微光裂隙:位移并沉默', () => {
    const h = spawnHero(w, PUK, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1); h.mp = 200;
    const t = dummy(7650, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 1, pos: { x: 7600, y: 8000 } });
    run(8);
    expect(h.pos.x).toBeGreaterThan(7400); // 闪现过去
    expect(hasModifier(t, 'puk_rift_silence')).toBe(true);
  });
  it('相位转移:免疫一切伤害', () => {
    const h = spawnHero(w, PUK, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 2); h.mp = 200;
    h.issueOrder({ type: 'cast', abilityIndex: 2 });
    run(2);
    expect(hasModifier(h, 'puk_phase_buff')).toBe(true);
    expect(applyDamage(w, h, { source: 0, attackType: 'hero', amount: 300 })).toBe(0);
    expect(applyDamage(w, h, { source: 0, attackType: 'spell', amount: 300, flags: { spell: true } })).toBe(0);
  });
});

describe('斯文', () => {
  it('风暴之锤:范围眩晕+伤害', () => {
    const h = spawnHero(w, SVE, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7300, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 7300, y: 8000 } });
    run(12);
    expect(t.hp).toBeLessThan(3000);
    expect(hasModifier(t, 'sve_bolt_stun')).toBe(true);
  });
  it('战吼:全队护甲+移速', () => {
    const h = spawnHero(w, SVE, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1); h.mp = 200;
    const ally = spawnHero(w, KUN, Team.Dawn, { x: 7200, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 1 });
    run(6);
    expect(hasModifier(ally, 'sve_warcry_buff')).toBe(true);
  });
  it('神之力量:大幅提升攻击力', () => {
    const h = spawnHero(w, SVE, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 200;
    learnAbility(w, h, 3);
    w.step();
    const dmg0 = h.calc.dmgMax;
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    run(4);
    expect(h.calc.dmgMax).toBeGreaterThan(dmg0 + 80);
  });
});
