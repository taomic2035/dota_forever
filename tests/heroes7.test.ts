import { describe, it, expect, beforeEach } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { learnAbility } from '../src/sim/abilities';
import { applyDamage } from '../src/sim/combat';
import { hasModifier, applyModifier } from '../src/sim/modifiers';
import { GRAF, SELENE, DRAK, VENONA, GROM, OLIVE, BATCH7 } from '../src/data/heroes/batch7';
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
beforeEach(() => { w = createWorld(map, { seed: 71, noBuildings: true, startTime: 0 }); });
function dummy(x = 7300, y = 8000, over: Partial<UnitStats> = {}): Unit {
  return w.spawnUnit({ kind: 'hero', team: Team.Night, pos: { x, y }, name: 'd', stats: dummyStats(over) });
}
function run(n: number) { for (let i = 0; i < n; i++) w.step(); }

describe('batch7 roster', () => {
  it('6 heroes with full kits', () => {
    expect(BATCH7.length).toBe(6);
    for (const h of BATCH7) {
      expect(h.abilities.length, h.key).toBe(4);
      expect(h.abilities[3].ultimate ?? false, `${h.key} R`).toBe(true);
    }
  });
});

describe('格雷夫', () => {
  it('埋雷 + 引爆:范围伤害', () => {
    const h = spawnHero(w, GRAF, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 3;
    learnAbility(w, h, 0); learnAbility(w, h, 3);
    h.mp = 400;
    const t = dummy(7400, 8000, { magicResist: 0 });
    // 在目标附近埋两颗雷
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 7400, y: 8000 } });
    run(20);
    h.abilities[0].cooldownUntil = -Infinity;
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 7420, y: 8000 } });
    run(20);
    const mines = [...w.units.values()].filter((u) => u.name === '遥控地雷' && u.alive);
    expect(mines.length).toBe(2);
    // 引爆
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    run(10);
    expect(t.hp).toBeLessThan(3000);
    expect([...w.units.values()].filter((u) => u.name === '遥控地雷' && u.alive).length).toBe(0);
  });
});

describe('塞勒涅', () => {
  it('月华倾泻:治疗友军伤害敌军(全图)', () => {
    const h = spawnHero(w, SELENE, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 500;
    learnAbility(w, h, 3);
    const ally = spawnHero(w, DRAK, Team.Dawn, { x: 12000, y: 2000 });
    ally.hp = 500;
    const enemy = dummy(13000, 1500, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    run(20);
    expect(ally.hp).toBeGreaterThan(500);
    expect(enemy.hp).toBeLessThan(3000);
  });
  it('月之恩泽:全图友方英雄回复光环', () => {
    const h = spawnHero(w, SELENE, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 2);
    const far = spawnHero(w, DRAK, Team.Dawn, { x: 13000, y: 2000 });
    run(30);
    expect(hasModifier(far, 'selene_grace_buff')).toBe(true);
  });
});

describe('德拉克', () => {
  it('龙尾摆击:伤害+眩晕', () => {
    const h = spawnHero(w, DRAK, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0);
    const t = dummy(7150, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 0, targetId: t.id });
    run(15);
    expect(t.hp).toBeLessThan(3000);
    expect(hasModifier(t, 'drak_tail_stun')).toBe(true);
  });
  it('远古巨龙:获得攻击距离(变远程)', () => {
    const h = spawnHero(w, DRAK, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 200;
    learnAbility(w, h, 3);
    w.step();
    const range0 = h.calc.attackRange;
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    run(8);
    expect(h.calc.attackRange).toBeGreaterThan(range0 + 300);
  });
});

describe('薇诺娜', () => {
  it('剧毒之触:攻击叠加毒层', () => {
    const h = spawnHero(w, VENONA, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 2);
    const t = dummy(7350, 8000, { magicResist: 0, maxHp: 100000 });
    h.issueOrder({ type: 'attack', targetId: t.id });
    run(120);
    const stacks = t.modifiers.filter((m) => m.key === 'venona_venom').length;
    expect(stacks).toBeGreaterThanOrEqual(2);
  });
  it('剧毒新星:毒层越多爆发越高', () => {
    const h = spawnHero(w, VENONA, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 2; h.mp = 400;
    learnAbility(w, h, 2); learnAbility(w, h, 3);
    const clean = dummy(7300, 8000, { magicResist: 0 });
    const poisoned = dummy(7300, 7700, { magicResist: 0 });
    // 给 poisoned 叠 3 层毒
    for (let i = 0; i < 3; i++) applyModifier(w, poisoned, { key: 'venona_venom', duration: 5, stackable: true }, h.id);
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    run(15);
    expect(3000 - poisoned.hp).toBeGreaterThan(3000 - clean.hp);
  });
});

describe('格罗姆', () => {
  it('战斗姿态:在远程/近战间切换', () => {
    const h = spawnHero(w, GROM, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0);
    w.step();
    const range0 = h.calc.attackRange;
    h.issueOrder({ type: 'cast', abilityIndex: 0 });
    run(3);
    expect(h.calc.attackRange).toBeGreaterThan(range0); // 切到远程
    h.abilities[0].cooldownUntil = -Infinity;
    h.issueOrder({ type: 'cast', abilityIndex: 0 });
    run(3);
    expect(h.calc.attackRange).toBe(range0); // 切回近战
  });
  it('战斗专注·爆发:全队攻速提升', () => {
    const h = spawnHero(w, GROM, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 100;
    learnAbility(w, h, 3);
    const ally = spawnHero(w, DRAK, Team.Dawn, { x: 7200, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    run(10);
    expect(hasModifier(ally, 'grom_trance_buff')).toBe(true);
    expect(ally.calc.ias).toBeGreaterThan(0.5);
  });
});

describe('奥莉薇', () => {
  it('折光:格挡数次物理实例,法术/纯粹穿透(A4)', () => {
    const h = spawnHero(w, OLIVE, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); // 折光 lvl1 = 格挡 3 次物理
    h.issueOrder({ type: 'cast', abilityIndex: 0 });
    run(3);
    // 折光只挡物理:法术/纯粹穿透,且不消耗格挡层
    expect(applyDamage(w, h, { source: 0, attackType: 'hero', amount: 100, flags: { spell: true } })).toBeGreaterThan(0);
    expect(applyDamage(w, h, { source: 0, attackType: 'hero', amount: 100, flags: { pure: true } })).toBeGreaterThan(0);
    // 前 3 次物理被完全格挡
    expect(applyDamage(w, h, { source: 0, attackType: 'hero', amount: 200 })).toBe(0);
    expect(applyDamage(w, h, { source: 0, attackType: 'hero', amount: 200 })).toBe(0);
    expect(applyDamage(w, h, { source: 0, attackType: 'hero', amount: 200 })).toBe(0);
    // 第 4 次物理穿透
    expect(applyDamage(w, h, { source: 0, attackType: 'hero', amount: 200 })).toBeGreaterThan(0);
  });
  it('灵能之刃:攻击溅射目标身后的敌人', () => {
    const h = spawnHero(w, OLIVE, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 2);
    // 固定假人(不追击),保证"身后"几何稳定
    const main = dummy(7300, 8000, { magicResist: 0, moveSpeed: 0, acquireRange: 0 });
    const behind = dummy(7500, 8000, { magicResist: 0, moveSpeed: 0, acquireRange: 0 });
    h.issueOrder({ type: 'attack', targetId: main.id });
    run(60);
    expect(main.hp).toBeLessThan(3000);
    expect(behind.hp).toBeLessThan(3000); // 灵能穿透命中
  });
});
