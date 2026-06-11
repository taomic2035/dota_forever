import { describe, it, expect, beforeEach } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { learnAbility } from '../src/sim/abilities';
import { applyDamage } from '../src/sim/combat';
import { hasModifier, applyModifier } from '../src/sim/modifiers';
import { OGRE, QUEN, TED, MAG, LYK, DUM, BATCH8 } from '../src/data/heroes/batch8';
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
beforeEach(() => { w = createWorld(map, { seed: 81, noBuildings: true, startTime: 0 }); });
function dummy(x = 7300, y = 8000, over: Partial<UnitStats> = {}): Unit {
  return w.spawnUnit({ kind: 'hero', team: Team.Night, pos: { x, y }, name: 'd', stats: dummyStats(over) });
}
function run(n: number) { for (let i = 0; i < n; i++) w.step(); }

describe('batch8 roster', () => {
  it('6 heroes with full kits', () => {
    expect(BATCH8.length).toBe(6);
    for (const h of BATCH8) {
      expect(h.abilities.length, h.key).toBe(4);
      expect(h.abilities[3].ultimate ?? false, `${h.key} R`).toBe(true);
    }
  });
});

describe('欧格', () => {
  it('火焰冲击:伤害+眩晕', () => {
    const h = spawnHero(w, OGRE, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 400;
    const t = dummy(7400, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 0, targetId: t.id });
    run(12);
    expect(t.hp).toBeLessThan(3000);
    expect(hasModifier(t, 'ogre_fireblast_stun')).toBe(true);
  });
  it('多重施法:满级时多次施法总伤害超过单发基准', () => {
    // 控制组:E 未学,单发伤害 = base
    const ctl = spawnHero(w, OGRE, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, ctl, 0); ctl.mp = 9999;
    const a = dummy(7300, 8000, { maxHp: 1_000_000 });
    const before = a.hp;
    ctl.issueOrder({ type: 'cast', abilityIndex: 0, targetId: a.id });
    run(12);
    const base = before - a.hp;
    expect(base).toBeGreaterThan(0);
    // 实验组:E 满级,25 次施法
    const h = spawnHero(w, OGRE, Team.Dawn, { x: 9000, y: 8000 });
    h.level = 7; h.heroMeta!.skillPoints = 5;
    learnAbility(w, h, 0);
    for (let i = 0; i < 4; i++) learnAbility(w, h, 2); // 多重施法 lvl4
    const b = dummy(9300, 8000, { maxHp: 5_000_000 });
    const start = b.hp;
    for (let i = 0; i < 25; i++) {
      h.abilities[0].cooldownUntil = -Infinity; h.mp = 9999;
      h.issueOrder({ type: 'cast', abilityIndex: 0, targetId: b.id });
      run(12);
    }
    const total = start - b.hp;
    expect(total).toBeGreaterThan(25 * base); // 至少触发过一次连发
  });
  it('嗜血渴望:给友军攻速/移速增益', () => {
    const h = spawnHero(w, OGRE, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1); h.mp = 200;
    const ally = spawnHero(w, TED, Team.Dawn, { x: 7200, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 1, targetId: ally.id });
    run(14); // 前摇 0.2s 后施放,再多跑几 tick 让 recalc 折叠攻速
    expect(hasModifier(ally, 'ogre_bloodlust')).toBe(true);
    expect(ally.calc.ias).toBeGreaterThan(0.25);
  });
});

describe('昆恩', () => {
  it('闪现:瞬移到目标点', () => {
    const h = spawnHero(w, QUEN, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 7800, y: 8000 } });
    run(3);
    expect(V.dist(h.pos, { x: 7800, y: 8000 })).toBeLessThan(120);
  });
  it('尖啸:范围伤害', () => {
    const h = spawnHero(w, QUEN, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1); h.mp = 200;
    const t = dummy(7300, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 1 });
    run(12);
    expect(t.hp).toBeLessThan(3000);
  });
  it('音波冲击:直线伤害+击退', () => {
    const h = spawnHero(w, QUEN, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 400;
    learnAbility(w, h, 3);
    const t = dummy(7400, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7850, y: 8000 } }); // 在施法距离 900 内
    run(15);
    expect(t.hp).toBeLessThan(3000);
    expect(t.pos.x).toBeGreaterThan(7500); // 被向前击退
  });
});

describe('泰德', () => {
  it('涌泉:伤害+破甲', () => {
    const h = spawnHero(w, TED, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7400, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 0, targetId: t.id });
    run(12);
    expect(t.hp).toBeLessThan(3000);
    expect(hasModifier(t, 'ted_gush_debuff')).toBe(true);
  });
  it('海妖外壳:减免所受伤害', () => {
    const h = spawnHero(w, TED, Team.Dawn, { x: 7000, y: 8000 });
    h.heroMeta!.skillPoints = 1; learnAbility(w, h, 2); // 减免 10%
    w.step();
    const dealt = applyDamage(w, h, { source: 0, attackType: 'hero', amount: 1000, flags: { pure: true } });
    expect(dealt).toBeLessThan(950);
    expect(dealt).toBeGreaterThan(850);
  });
  it('巨浪:大范围眩晕+伤害', () => {
    const h = spawnHero(w, TED, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 300;
    learnAbility(w, h, 3);
    const t = dummy(7600, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    run(15);
    expect(t.hp).toBeLessThan(3000);
    expect(hasModifier(t, 'ted_ravage_stun')).toBe(true);
  });
});

describe('玛格', () => {
  it('穿刺冲撞:位移+击晕沿途敌人', () => {
    const h = spawnHero(w, MAG, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7400, 8000, { moveSpeed: 0, acquireRange: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 7800, y: 8000 } });
    run(10);
    expect(h.pos.x).toBeGreaterThan(7400); // 冲到终点附近(终点 ≈7600)
    expect(hasModifier(t, 'mag_skewer_stun')).toBe(true);
  });
  it('强化:被强化者攻击产生劈砍溅射', () => {
    const h = spawnHero(w, MAG, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 7; h.heroMeta!.skillPoints = 4;
    for (let i = 0; i < 4; i++) learnAbility(w, h, 2); // 强化 lvl4
    h.mp = 200;
    // 强化自己
    h.issueOrder({ type: 'cast', abilityIndex: 2, targetId: h.id });
    run(6);
    expect(hasModifier(h, 'mag_empower')).toBe(true);
    const main = dummy(7110, 8000, { moveSpeed: 0, acquireRange: 0 });
    const splash = dummy(7250, 8000, { moveSpeed: 0, acquireRange: 0 });
    h.issueOrder({ type: 'attack', targetId: main.id });
    run(50);
    expect(main.hp).toBeLessThan(3000);
    expect(splash.hp).toBeLessThan(3000); // 劈砍命中近旁敌人
  });
  it('两极反转:拉拽+击晕周围敌人', () => {
    const h = spawnHero(w, MAG, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 300;
    learnAbility(w, h, 3);
    const t = dummy(7250, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    run(15);
    expect(hasModifier(t, 'mag_polarity_stun')).toBe(true);
    expect(V.dist(t.pos, h.pos)).toBeLessThan(200); // 被拉到身前
  });
});

describe('莱赫', () => {
  it('霜爆:目标伤害+溅射减速', () => {
    const h = spawnHero(w, LYK, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7400, 8000);
    const near = dummy(7450, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 0, targetId: t.id });
    run(12);
    expect(t.hp).toBeLessThan(3000);
    expect(near.hp).toBeLessThan(3000); // 溅射
    expect(hasModifier(t, 'lyk_frost_slow')).toBe(true);
  });
  it('寒霜护甲:攻击被护甲者的敌人会被冻缓', () => {
    const h = spawnHero(w, LYK, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1); h.mp = 200;
    const ally = spawnHero(w, TED, Team.Dawn, { x: 7100, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 1, targetId: ally.id });
    run(8); // 前摇 0.2s ≈ 7 tick,留余量确保 buff 已挂上
    expect(hasModifier(ally, 'lyk_frost_armor')).toBe(true);
    const atk = spawnHero(w, DUM, Team.Night, { x: 7180, y: 8000 }); // 敌方近战,紧贴 ally
    atk.issueOrder({ type: 'attack', targetId: ally.id });
    run(40);
    expect(hasModifier(atk, 'lyk_frost_armor_retaliate')).toBe(true);
  });
  it('黑暗献祭:献祭小兵回复法力', () => {
    const h = spawnHero(w, LYK, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 2); h.mp = 0;
    const creep = w.spawnUnit({ kind: 'creep', team: Team.Dawn, pos: { x: 7150, y: 8000 }, name: 'c', stats: dummyStats({ maxHp: 550 }) });
    h.issueOrder({ type: 'cast', abilityIndex: 2, targetId: creep.id });
    run(8);
    expect(creep.alive).toBe(false);
    expect(h.mp).toBeGreaterThan(100);
  });
  it('寒霜连锁:在多个敌人间弹跳', () => {
    const h = spawnHero(w, LYK, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 400;
    learnAbility(w, h, 3);
    const a = dummy(7300, 8000);
    const b = dummy(7450, 8000);
    const c = dummy(7600, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: a.id });
    run(12);
    const hitCount = [a, b, c].filter((u) => u.hp < 3000).length;
    expect(a.hp).toBeLessThan(3000); // 首要目标必中
    expect(hitCount).toBeGreaterThanOrEqual(2); // 至少弹跳一次,波及多人
  });
});

describe('杜姆', () => {
  it('吞噬:吃掉小兵获得金钱与成长', () => {
    const h = spawnHero(w, DUM, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const goldBefore = h.heroMeta!.gold;
    const creep = w.spawnUnit({ kind: 'creep', team: Team.Night, pos: { x: 7120, y: 8000 }, name: 'c', stats: dummyStats({ maxHp: 200, magicResist: 0 }) });
    h.issueOrder({ type: 'cast', abilityIndex: 0, targetId: creep.id });
    run(12);
    expect(creep.alive).toBe(false);
    expect(h.heroMeta!.gold).toBeGreaterThan(goldBefore);
    expect(hasModifier(h, 'dum_devour_stacks')).toBe(true);
  });
  it('焦土:增益自身并灼烧周围敌人', () => {
    const h = spawnHero(w, DUM, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1); h.mp = 200;
    const t = dummy(7200, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 1 });
    run(40); // 跨越多个 tick
    expect(hasModifier(h, 'dum_scorch_buff')).toBe(true);
    expect(t.hp).toBeLessThan(3000);
  });
  it('末日:沉默+缴械+持续伤害', () => {
    const h = spawnHero(w, DUM, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 300;
    learnAbility(w, h, 3);
    const t = dummy(7400, 8000);
    const hp0 = t.hp;
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t.id });
    run(40);
    expect(hasModifier(t, 'dum_doom_debuff')).toBe(true);
    expect(t.hp).toBeLessThan(hp0); // 持续灼烧
  });
});
