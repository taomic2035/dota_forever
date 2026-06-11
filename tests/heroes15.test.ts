import { describe, it, expect, beforeEach } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { learnAbility } from '../src/sim/abilities';
import { hasModifier } from '../src/sim/modifiers';
import { RUB, PHX, PAN, TUS, KPR, TRN, BATCH15 } from '../src/data/heroes/batch15';
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
beforeEach(() => { w = createWorld(map, { seed: 151, noBuildings: true, startTime: 0 }); });
function dummy(x = 7300, y = 8000, over: Partial<UnitStats> = {}): Unit {
  return w.spawnUnit({ kind: 'hero', team: Team.Night, pos: { x, y }, name: 'd', stats: dummyStats(over) });
}
function run(n: number) { for (let i = 0; i < n; i++) w.step(); }

describe('batch15 roster', () => {
  it('6 heroes with full kits', () => {
    expect(BATCH15.length).toBe(6);
    for (const h of BATCH15) {
      expect(h.abilities.length, h.key).toBe(4);
      expect(h.abilities[3].ultimate ?? false, `${h.key} R`).toBe(true);
    }
  });
});

describe('鲁比', () => {
  it('心灵之握:托举(无敌)后重摔眩晕', () => {
    const h = spawnHero(w, RUB, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7400, 8000, { magicResist: 0, moveSpeed: 0, acquireRange: 0 });
    const t2 = dummy(7460, 8000, { moveSpeed: 0, acquireRange: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 0, targetId: t.id });
    run(10);
    expect(hasModifier(t, 'rub_telekinesis_lift')).toBe(true);
    expect(t.invulnerable).toBe(true);
    run(50); // 托举结束 → 重摔
    expect(t.invulnerable).toBe(false);
    expect(hasModifier(t2, 'rub_tele_landstun')).toBe(true);
  });
  it('奥术汲取:引导吸取生命', () => {
    const h = spawnHero(w, RUB, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 300; h.hp = 300;
    learnAbility(w, h, 3);
    const t = dummy(7300, 8000, { magicResist: 0, moveSpeed: 0, acquireRange: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t.id });
    run(30);
    expect(t.hp).toBeLessThan(3000);
    expect(h.hp).toBeGreaterThan(300);
  });
});

describe('菲尼', () => {
  it('烈焰精魂:范围伤害+降攻速', () => {
    const h = spawnHero(w, PHX, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7400, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 7400, y: 8000 } });
    run(12);
    expect(t.hp).toBeLessThan(3000);
    expect(hasModifier(t, 'phx_spirits_slow')).toBe(true);
  });
  it('超新星:化蛋无敌', () => {
    const h = spawnHero(w, PHX, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 200; h.hp = 500;
    learnAbility(w, h, 3);
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    run(8);
    expect(hasModifier(h, 'phx_supernova_egg')).toBe(true);
    expect(h.invulnerable).toBe(true);
    expect(h.hp).toBeGreaterThan(500); // 化蛋回血
  });
});

describe('潘戈', () => {
  it('剑突击:位移+连斩', () => {
    const h = spawnHero(w, PAN, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7300, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 7500, y: 8000 } });
    run(8);
    expect(t.hp).toBeLessThan(3000);
    expect(h.pos.x).toBeGreaterThan(7200);
  });
  it('滚滚妙妙:滚动撞晕周围敌人', () => {
    const h = spawnHero(w, PAN, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 200;
    learnAbility(w, h, 3);
    const t = dummy(7150, 8000, { magicResist: 0, moveSpeed: 0, acquireRange: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    run(18);
    expect(hasModifier(h, 'pan_roll_buff')).toBe(true);
    expect(hasModifier(t, 'pan_roll_stun')).toBe(true);
  });
});

describe('图斯', () => {
  it('雪球:冲撞+眩晕', () => {
    const h = spawnHero(w, TUS, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1); h.mp = 200;
    const t = dummy(7800, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 1, targetId: t.id });
    run(6);
    expect(V.dist(h.pos, t.pos)).toBeLessThan(220);
    expect(hasModifier(t, 'tus_snowball_stun')).toBe(true);
  });
  it('寒霜印记:减速光环', () => {
    const h = spawnHero(w, TUS, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 2);
    const t = dummy(7250, 8000, { moveSpeed: 0, acquireRange: 0 });
    run(20);
    expect(hasModifier(t, 'tus_sigil_slow')).toBe(true);
  });
  it('海象神拳:重创+长眩', () => {
    const h = spawnHero(w, TUS, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 200;
    learnAbility(w, h, 3);
    const t = dummy(7150, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t.id });
    run(12);
    expect(t.hp).toBeLessThan(3000);
    expect(hasModifier(t, 'tus_punch_stun')).toBe(true);
  });
});

describe('基普', () => {
  it('集中照明:直线伤害', () => {
    const h = spawnHero(w, KPR, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7400, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 7800, y: 8000 } });
    run(12);
    expect(t.hp).toBeLessThan(3000);
  });
  it('查克拉魔法:恢复友军法力', () => {
    const h = spawnHero(w, KPR, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1); h.mp = 200;
    const ally = spawnHero(w, TUS, Team.Dawn, { x: 7200, y: 8000 });
    ally.mp = 0;
    h.issueOrder({ type: 'cast', abilityIndex: 1, targetId: ally.id });
    run(6);
    expect(ally.mp).toBeGreaterThan(50);
  });
  it('跃迁:将远方友军传送到身边', () => {
    const h = spawnHero(w, KPR, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 200;
    learnAbility(w, h, 3);
    const ally = spawnHero(w, TUS, Team.Dawn, { x: 12000, y: 3000 });
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: ally.id });
    run(20);
    expect(V.dist(ally.pos, h.pos)).toBeLessThan(250);
  });
});

describe('崔恩', () => {
  it('缠绕之种:定身+吸血', () => {
    const h = spawnHero(w, TRN, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200; h.hp = 400;
    const t = dummy(7300, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 0, targetId: t.id });
    run(30);
    expect(hasModifier(t, 'trn_seed_root')).toBe(true);
    expect(t.hp).toBeLessThan(3000);
    expect(h.hp).toBeGreaterThan(400);
  });
  it('树皮坚甲:被动减伤', () => {
    const h = spawnHero(w, TRN, Team.Dawn, { x: 7000, y: 8000 });
    h.heroMeta!.skillPoints = 1; learnAbility(w, h, 2);
    w.step();
    expect(h.calc.incomingDamageReduction).toBeGreaterThan(0.05);
  });
  it('过载生长:全场定身+持续伤害', () => {
    const h = spawnHero(w, TRN, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 300;
    learnAbility(w, h, 3);
    const a = dummy(7200, 8000, { magicResist: 0 });
    const b = dummy(7000, 8300, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    run(45);
    expect(hasModifier(a, 'trn_overgrowth_root')).toBe(true);
    expect(hasModifier(b, 'trn_overgrowth_root')).toBe(true);
    expect(a.hp).toBeLessThan(3000);
  });
});
