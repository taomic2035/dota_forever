import { describe, it, expect, beforeEach } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { learnAbility } from '../src/sim/abilities';
import { applyDamage } from '../src/sim/combat';
import { hasModifier, applyModifier } from '../src/sim/modifiers';
import { VYN, LEON, KAOS, KOG, ENI, THEO, BATCH9 } from '../src/data/heroes/batch9';
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
beforeEach(() => { w = createWorld(map, { seed: 91, noBuildings: true, startTime: 0 }); });
function dummy(x = 7300, y = 8000, over: Partial<UnitStats> = {}): Unit {
  return w.spawnUnit({ kind: 'hero', team: Team.Night, pos: { x, y }, name: 'd', stats: dummyStats(over) });
}
function run(n: number) { for (let i = 0; i < n; i++) w.step(); }

describe('batch9 roster', () => {
  it('6 heroes with full kits', () => {
    expect(BATCH9.length).toBe(6);
    for (const h of BATCH9) {
      expect(h.abilities.length, h.key).toBe(4);
      expect(h.abilities[3].ultimate ?? false, `${h.key} R`).toBe(true);
    }
  });
});

describe('维恩', () => {
  it('法力击碎:攻击燃烧法力', () => {
    const h = spawnHero(w, VYN, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1);
    const t = dummy(7110, 8000);
    t.mp = 150;
    h.issueOrder({ type: 'attack', targetId: t.id });
    run(40);
    expect(t.mp).toBeLessThan(150);
  });
  it('法力虚空:依据已损失法力造成爆发', () => {
    const h = spawnHero(w, VYN, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 400;
    learnAbility(w, h, 3);
    const t = dummy(7300, 8000, { maxHp: 5000 });
    t.mp = 0; // 已损失满法力
    const near = dummy(7350, 8000, { maxHp: 5000 });
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t.id });
    run(12);
    expect(5000 - t.hp).toBeGreaterThan(150);
    expect(near.hp).toBeLessThan(5000); // 波及
  });
});

describe('里昂', () => {
  it('强压:范围伤害', () => {
    const h = spawnHero(w, LEON, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7300, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 7300, y: 8000 } });
    run(12);
    expect(t.hp).toBeLessThan(3000);
  });
  it('鼓舞冲锋:驱散+治疗+攻速', () => {
    const h = spawnHero(w, LEON, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1); h.mp = 200;
    const ally = spawnHero(w, KOG, Team.Dawn, { x: 7150, y: 8000 });
    applyModifier(w, ally, { key: 'test_debuff', duration: 10, stats: { bonusMoveSpeedPct: -0.5 } }, ally.id);
    ally.hp = 400;
    h.issueOrder({ type: 'cast', abilityIndex: 1, targetId: ally.id });
    run(8);
    expect(hasModifier(ally, 'test_debuff')).toBe(false); // 被驱散
    expect(hasModifier(ally, 'leon_pta_buff')).toBe(true);
    expect(ally.hp).toBeGreaterThan(400);
  });
  it('决斗:双方被缚,击杀获永久攻击', () => {
    const h = spawnHero(w, LEON, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 200;
    learnAbility(w, h, 3);
    const t = dummy(7120, 8000, { maxHp: 20, armor: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t.id });
    run(12); // 前摇 0.3s 后施放
    expect(hasModifier(h, 'leon_duel')).toBe(true);
    expect(hasModifier(t, 'leon_duel')).toBe(true);
    run(40); // 里昂打死残血目标 → 决斗胜利
    expect(t.alive).toBe(false);
    expect(hasModifier(h, 'leon_duel_victory')).toBe(true);
  });
});

describe('卡奥斯', () => {
  it('混沌之箭:伤害+眩晕', () => {
    const h = spawnHero(w, KAOS, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7300, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 0, targetId: t.id });
    run(12);
    expect(t.hp).toBeLessThan(3000);
    expect(hasModifier(t, 'kaos_bolt_stun')).toBe(true);
  });
  it('实相裂隙:拉近+破甲', () => {
    const h = spawnHero(w, KAOS, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1); h.mp = 200;
    const t = dummy(7400, 8000, { moveSpeed: 0, acquireRange: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 1, targetId: t.id });
    run(8);
    expect(h.pos.x).toBeGreaterThan(7100); // 移向中点
    expect(hasModifier(t, 'kaos_rift_armor')).toBe(true);
  });
  it('混沌幻象:召唤幻象', () => {
    const h = spawnHero(w, KAOS, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 200;
    learnAbility(w, h, 3);
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    run(10);
    const illu = [...w.units.values()].filter((u) => u.kind === 'illusion' && u.summonOwnerId === h.id && u.alive);
    expect(illu.length).toBe(2);
  });
});

describe('科格', () => {
  it('齿轮钩索:冲向目标并击晕', () => {
    const h = spawnHero(w, KOG, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7800, 8000, { moveSpeed: 0, acquireRange: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 0, targetId: t.id });
    run(12);
    expect(h.pos.x).toBeGreaterThan(7400); // 钩向目标
    expect(hasModifier(t, 'kog_hook_stun')).toBe(true);
  });
  it('弹幕冲击:持续弹射伤害', () => {
    const h = spawnHero(w, KOG, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1); h.mp = 200;
    const t = dummy(7300, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 1 });
    run(30);
    expect(t.hp).toBeLessThan(3000);
  });
  it('能量牢笼:禁锢+伤害', () => {
    const h = spawnHero(w, KOG, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 200;
    learnAbility(w, h, 3);
    const t = dummy(7250, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    run(8);
    expect(hasModifier(t, 'kog_cage_root')).toBe(true);
    expect(t.hp).toBeLessThan(3000);
  });
});

describe('恩尼', () => {
  it('噩咒:持续伤害+反复眩晕', () => {
    const h = spawnHero(w, ENI, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7300, 8000);
    const hp0 = t.hp;
    h.issueOrder({ type: 'cast', abilityIndex: 0, targetId: t.id });
    run(40);
    expect(hasModifier(t, 'eni_malefice')).toBe(true);
    expect(t.hp).toBeLessThan(hp0);
  });
  it('亡魂召唤:召唤三个随从', () => {
    const h = spawnHero(w, ENI, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1); h.mp = 200;
    h.issueOrder({ type: 'cast', abilityIndex: 1 });
    run(8);
    const minions = [...w.units.values()].filter((u) => u.name === '亡魂' && u.alive && u.summonOwnerId === h.id);
    expect(minions.length).toBe(3);
  });
  it('黑洞:吸入并眩晕范围敌人', () => {
    const h = spawnHero(w, ENI, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 400;
    learnAbility(w, h, 3);
    const t = dummy(7250, 8000, { moveSpeed: 0, acquireRange: 0 });
    const hp0 = t.hp;
    h.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7150, y: 8000 } });
    run(30);
    expect(t.hp).toBeLessThan(hp0);
    expect(hasModifier(t, 'eni_blackhole_stun')).toBe(true);
    expect(t.pos.x).toBeLessThan(7250); // 被吸向中心(7150)
  });
});

describe('西奥', () => {
  it('净化:治疗友军并灼伤其周围敌人', () => {
    const h = spawnHero(w, THEO, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const ally = spawnHero(w, KOG, Team.Dawn, { x: 7200, y: 8000 });
    ally.hp = 300;
    const enemy = dummy(7300, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 0, targetId: ally.id });
    run(12);
    expect(ally.hp).toBeGreaterThan(300);
    expect(enemy.hp).toBeLessThan(3000);
  });
  it('守护结界:赋予友军魔法免疫', () => {
    const h = spawnHero(w, THEO, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1); h.mp = 200;
    const ally = spawnHero(w, KOG, Team.Dawn, { x: 7150, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 1, targetId: ally.id });
    run(8);
    expect(hasModifier(ally, 'theo_repel_buff')).toBe(true);
    const dealt = applyDamage(w, ally, { source: 0, attackType: 'spell', amount: 300, flags: { spell: true } });
    expect(dealt).toBe(0); // 魔法免疫
  });
  it('退化光环:削弱附近敌人', () => {
    const h = spawnHero(w, THEO, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 2);
    const t = dummy(7200, 8000, { moveSpeed: 0, acquireRange: 0 });
    run(20);
    expect(hasModifier(t, 'theo_degen')).toBe(true);
  });
  it('守护天使:友军免疫物理伤害', () => {
    const h = spawnHero(w, THEO, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 400;
    learnAbility(w, h, 3);
    const ally = spawnHero(w, KOG, Team.Dawn, { x: 7200, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    run(12);
    expect(hasModifier(ally, 'theo_guardian_buff')).toBe(true);
    const dealt = applyDamage(w, ally, { source: 0, attackType: 'hero', amount: 300 });
    expect(dealt).toBe(0); // 物理免疫
  });
});
