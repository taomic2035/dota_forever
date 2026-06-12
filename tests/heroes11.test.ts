import { describe, it, expect, beforeEach } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { learnAbility } from '../src/sim/abilities';
import { applyDamage } from '../src/sim/combat';
import { hasModifier } from '../src/sim/modifiers';
import { MOR, DIS, TIK, VIS, BRO, BAN, BATCH11 } from '../src/data/heroes/batch11';
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
beforeEach(() => { w = createWorld(map, { seed: 111, noBuildings: true, startTime: 0 }); });
function dummy(x = 7300, y = 8000, over: Partial<UnitStats> = {}): Unit {
  return w.spawnUnit({ kind: 'hero', team: Team.Night, pos: { x, y }, name: 'd', stats: dummyStats(over) });
}
function run(n: number) { for (let i = 0; i < n; i++) w.step(); }

describe('batch11 roster', () => {
  it('6 heroes with full kits', () => {
    expect(BATCH11.length).toBe(6);
    for (const h of BATCH11) {
      expect(h.abilities.length, h.key).toBe(4);
      expect(h.abilities[3].ultimate ?? false, `${h.key} R`).toBe(true);
    }
  });
});

describe('默罗', () => {
  it('星体禁锢:放逐目标(无敌且无法行动)', () => {
    const h = spawnHero(w, MOR, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1); h.mp = 200;
    const t = dummy(7400, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 1, targetId: t.id });
    run(12);
    expect(hasModifier(t, 'mor_astral_banish')).toBe(true);
    expect(t.invulnerable).toBe(true);
    expect(applyDamage(w, t, { source: 0, attackType: 'hero', amount: 500 })).toBe(0); // 无敌
  });
  it('精神虚妄:范围爆发', () => {
    const h = spawnHero(w, MOR, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 400;
    learnAbility(w, h, 3);
    const t = dummy(7300, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    run(12);
    expect(t.hp).toBeLessThan(3000);
  });
});

describe('迪斯', () => {
  it('雷击:持续范围伤害', () => {
    const h = spawnHero(w, DIS, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7300, 8000, { magicResist: 0 });
    const hp0 = t.hp;
    h.issueOrder({ type: 'cast', abilityIndex: 0, targetId: t.id });
    run(40);
    expect(t.hp).toBeLessThan(hp0);
  });
  it('闪回:拉回目标', () => {
    const h = spawnHero(w, DIS, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1); h.mp = 200;
    const t = dummy(8200, 8000, { moveSpeed: 0, acquireRange: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 1, targetId: t.id });
    run(10);
    expect(t.pos.x).toBeLessThan(8200); // 被拉向施法者
    expect(hasModifier(t, 'dis_glimpse_slow')).toBe(true);
  });
  it('静电风暴:范围沉默+伤害', () => {
    const h = spawnHero(w, DIS, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 400;
    learnAbility(w, h, 3);
    const t = dummy(7200, 8000, { magicResist: 0, moveSpeed: 0, acquireRange: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7200, y: 8000 } });
    run(30);
    expect(t.hp).toBeLessThan(3000);
    expect(hasModifier(t, 'dis_storm_silence')).toBe(true);
  });
});

describe('泰可', () => {
  it('激光:伤害+致盲(缴械)', () => {
    const h = spawnHero(w, TIK, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7300, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 0, targetId: t.id });
    run(10);
    expect(t.hp).toBeLessThan(3000);
    expect(hasModifier(t, 'tik_laser_blind')).toBe(true);
  });
  it('重新装填:刷新自身技能冷却', () => {
    const h = spawnHero(w, TIK, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 2; h.mp = 500;
    learnAbility(w, h, 0); learnAbility(w, h, 3);
    h.abilities[0].cooldownUntil = w.time + 100;
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    run(25); // 后摇 0.6s
    expect(h.abilities[0].cooldownUntil).toBeLessThan(w.time);
  });
});

describe('维萨', () => {
  it('冢中冷:偷取攻速(削敌强己)', () => {
    const h = spawnHero(w, VIS, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1); h.mp = 200;
    const t = dummy(7300, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 1, targetId: t.id });
    run(8);
    expect(hasModifier(t, 'vis_chill_debuff')).toBe(true);
    expect(hasModifier(h, 'vis_chill_buff')).toBe(true);
  });
  it('石像形态:免疫伤害', () => {
    const h = spawnHero(w, VIS, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 2); h.mp = 200;
    h.issueOrder({ type: 'cast', abilityIndex: 2 });
    run(3);
    expect(hasModifier(h, 'vis_gargoyle_buff')).toBe(true);
    expect(applyDamage(w, h, { source: 0, attackType: 'hero', amount: 400 })).toBe(0);
  });
  it('石像鬼:召唤两只', () => {
    const h = spawnHero(w, VIS, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 200;
    learnAbility(w, h, 3);
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    run(10);
    const fam = [...w.units.values()].filter((u) => u.name === '石像鬼' && u.alive && u.summonOwnerId === h.id);
    expect(fam.length).toBe(2);
  });
});

describe('布蕾', () => {
  it('麻痹啮咬:攻击附带额外伤害+减速', () => {
    const h = spawnHero(w, BRO, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1);
    const t = dummy(7110, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'attack', targetId: t.id });
    run(40);
    expect(hasModifier(t, 'bro_bite_slow')).toBe(true);
  });
  it('蛛群:召唤多个蛛子', () => {
    const h = spawnHero(w, BRO, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 200;
    learnAbility(w, h, 3);
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    run(10);
    const spiders = [...w.units.values()].filter((u) => u.name === '蛛子' && u.alive && u.summonOwnerId === h.id);
    expect(spiders.length).toBe(3);
  });
});

describe('班恩', () => {
  it('吸脑:伤害目标并自我治疗', () => {
    const h = spawnHero(w, BAN, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1); h.mp = 200; h.hp = 200;
    const t = dummy(7300, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 1, targetId: t.id });
    run(12);
    expect(t.hp).toBeLessThan(3000);
    expect(h.hp).toBeGreaterThan(200); // 自我治疗
  });
  it('噩梦:使目标沉睡', () => {
    const h = spawnHero(w, BAN, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 2); h.mp = 200;
    const t = dummy(7300, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 2, targetId: t.id });
    run(12);
    expect(hasModifier(t, 'ban_nightmare_sleep')).toBe(true);
  });
  it('噩梦:受到伤害立即唤醒(M6)', () => {
    const h = spawnHero(w, BAN, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 2); h.mp = 200;
    const t = dummy(7300, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 2, targetId: t.id });
    run(12);
    expect(hasModifier(t, 'ban_nightmare_sleep')).toBe(true);
    applyDamage(w, t, { source: h.id, attackType: 'hero', amount: 50, flags: { pure: true } });
    run(5); // 下一次 onTick 检测到受伤 → 唤醒
    expect(hasModifier(t, 'ban_nightmare_sleep')).toBe(false);
  });
  it('噩梦:受伤唤醒并传递给攻击者', () => {
    const h = spawnHero(w, BAN, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 2); h.mp = 200;
    const sleeper = dummy(7300, 8000);
    const attacker = dummy(7400, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 2, targetId: sleeper.id });
    run(12);
    expect(hasModifier(sleeper, 'ban_nightmare_sleep')).toBe(true);
    expect(hasModifier(attacker, 'ban_nightmare_sleep')).toBe(false);
    // 攻击者打沉睡者 → 沉睡者醒、噩梦跳到攻击者
    applyDamage(w, sleeper, { source: attacker.id, attackType: 'hero', amount: 50, flags: { pure: true } });
    run(5);
    expect(hasModifier(sleeper, 'ban_nightmare_sleep')).toBe(false); // 醒
    expect(hasModifier(attacker, 'ban_nightmare_sleep')).toBe(true);  // 被传递入睡
  });
  it('末日缠绕:引导束缚+持续伤害', () => {
    const h = spawnHero(w, BAN, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 400;
    learnAbility(w, h, 3);
    const t = dummy(7300, 8000, { magicResist: 0, moveSpeed: 0, acquireRange: 0 });
    const hp0 = t.hp;
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t.id });
    run(30);
    expect(t.hp).toBeLessThan(hp0);
    expect(hasModifier(t, 'ban_grip_disable')).toBe(true);
  });
});
