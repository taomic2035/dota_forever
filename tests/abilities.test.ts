import { describe, it, expect, beforeEach } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { learnAbility, canLearn, learnStatBonus, abilityCastReason } from '../src/sim/abilities';
import { applyModifier } from '../src/sim/modifiers';
import { spellDamage } from '../src/sim/abilities';
import type { HeroDef, AbilityDef } from '../src/data/heroes/types';
import type { World } from '../src/sim/world';
import type { Unit } from '../src/sim/unit';

const map = new GameMap();

// 测试用迷你技能组
let castLog: Array<{ key: string; lvl: number }> = [];
const NUKE: AbilityDef = {
  key: 'test_nuke', name: '试验冲击', maxLevel: 4, targetMode: 'unit',
  castRange: [600, 600, 600, 600], manaCost: [90, 100, 110, 120], cooldown: [8, 7, 6, 5],
  castPoint: 0.4, tags: ['nuke'], description: '',
  onCast(w, caster, lvl, _pos, target) {
    castLog.push({ key: 'test_nuke', lvl });
    if (target) spellDamage(w, caster, target, 100 + lvl * 60);
  },
};
const PASSIVE: AbilityDef = {
  key: 'test_passive', name: '试验强击', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'], description: '',
  passiveModifier: (lvl) => ({ key: 'test_passive_mod', stats: { bonusDamage: lvl * 10 }, isBuff: true }),
};
const CHANNEL: AbilityDef = {
  key: 'test_channel', name: '试验引导', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [200, 300, 400], cooldown: [90, 80, 70], castPoint: 0.2,
  tags: ['channel', 'aoe'], description: '',
  channel: {
    duration: () => 4,
    tickInterval: 1,
    onChannelTick(w, caster, lvl) {
      castLog.push({ key: 'channel_tick', lvl });
    },
  },
};

const TEST_HERO: HeroDef = {
  key: 'testh', name: '试验体', title: '', primary: 'int',
  baseStr: 18, gainStr: 2, baseAgi: 14, gainAgi: 1.5, baseInt: 24, gainInt: 3,
  baseDamage: [25, 30], baseArmor: 1, baseMs: 300, attackRange: 500,
  projectileSpeed: 1000, bat: 1.7, attackPoint: 0.4, color: '#fff', glyph: '试',
  abilities: [NUKE, PASSIVE, CHANNEL], aiRole: 'support',
};

let w: World;
let h: Unit;
let dummy: Unit;
beforeEach(() => {
  castLog = [];
  w = createWorld(map, { seed: 14, noBuildings: true, startTime: 0 });
  h = spawnHero(w, TEST_HERO, Team.Dawn, { x: 7000, y: 8000 });
  dummy = w.spawnUnit({
    kind: 'hero', team: Team.Night, pos: { x: 7300, y: 8000 }, name: 'd',
    stats: {
      maxHp: 2000, hpRegen: 0, maxMp: 0, mpRegen: 0, dmgMin: 0, dmgMax: 0,
      attackType: 'hero', armorType: 'hero', armor: 0, magicResist: 0.25,
      attackRange: 100, attackPoint: 0.4, bat: 1.7, projectileSpeed: 0,
      moveSpeed: 300, collisionRadius: 24, visionDay: 1800, visionNight: 800,
      acquireRange: 0, bountyMin: 0, bountyMax: 0, xpBounty: 0,
    },
  });
});

describe('ability framework', () => {
  it('cast pays mana at cast point end, applies damage with magic resist', () => {
    learnAbility(w, h, 0);
    const mp0 = h.mp;
    h.issueOrder({ type: 'cast', abilityIndex: 0, targetId: dummy.id });
    for (let i = 0; i < 30; i++) w.step(); // 1 秒
    expect(castLog).toEqual([{ key: 'test_nuke', lvl: 1 }]);
    expect(mp0 - h.mp).toBeGreaterThan(88); // 扣 90,容回蓝
    expect(mp0 - h.mp).toBeLessThan(91);
    expect(dummy.hp).toBeCloseTo(2000 - 160 * 0.75, 1);
    expect(h.abilities[0].cooldownUntil).toBeGreaterThan(w.time);
  });

  it('stun during cast point cancels without paying', () => {
    learnAbility(w, h, 0);
    const mp0 = h.mp;
    h.issueOrder({ type: 'cast', abilityIndex: 0, targetId: dummy.id });
    w.step(); // 进入前摇
    expect(h.casting).not.toBeNull();
    applyModifier(w, h, { key: 'stun', duration: 1, states: { stunned: true } }, dummy.id);
    for (let i = 0; i < 30; i++) w.step();
    expect(castLog.length).toBe(0);
    expect(h.mp).toBeGreaterThanOrEqual(mp0 - 0.5); // 没扣蓝(允许回蓝误差)
    expect(h.abilities[0].cooldownUntil).toBe(-Infinity); // 没进 CD
  });

  it('walks into cast range when target too far', () => {
    learnAbility(w, h, 0);
    dummy.pos = { x: 8200, y: 8000 }; // 1200 距离 > 600 施法距离
    h.issueOrder({ type: 'cast', abilityIndex: 0, targetId: dummy.id });
    for (let i = 0; i < 200; i++) w.step();
    expect(castLog.length).toBe(1); // 走进射程后施放
  });

  it('channel ticks and is broken by stun', () => {
    h.level = 6;
    h.heroMeta!.skillPoints = 1;
    learnAbility(w, h, 2);
    h.mp = 500;
    h.issueOrder({ type: 'cast', abilityIndex: 2 });
    for (let i = 0; i < 75; i++) w.step(); // 2.5 秒:前摇 0.2 + 2.3s 引导 → 2 跳
    expect(castLog.filter((c) => c.key === 'channel_tick').length).toBe(2);
    applyModifier(w, h, { key: 'stun', duration: 0.5, states: { stunned: true } }, dummy.id);
    for (let i = 0; i < 75; i++) w.step();
    expect(castLog.filter((c) => c.key === 'channel_tick').length).toBe(2); // 被打断,不再跳
  });

  it('passive modifier applies and upgrades', () => {
    learnAbility(w, h, 1);
    w.step();
    const base = h.calc.dmgMin;
    h.heroMeta!.skillPoints = 1;
    h.level = 3; // 升到3级:智力 +6(主属性加攻也 +6)
    learnAbility(w, h, 1);
    w.step();
    expect(h.calc.dmgMin).toBe(base + 10 + 6); // 被动 +10、智力 +6
  });

  it('level gating: normal ability needs hero level 2n-1, ult needs 6/11/16', () => {
    // 英雄 1 级:普通技能可学 1 级,不可学 2 级;大招不可学
    expect(canLearn(h, 0)).toBe(true);
    learnAbility(w, h, 0);
    h.heroMeta!.skillPoints = 5;
    expect(canLearn(h, 0)).toBe(false); // 需要 3 级
    expect(canLearn(h, 2)).toBe(false); // 大招需要 6 级
    h.level = 3;
    expect(canLearn(h, 0)).toBe(true);
    h.level = 6;
    expect(canLearn(h, 2)).toBe(true);
  });

  it('stat bonus consumes points up to cap', () => {
    h.heroMeta!.skillPoints = 12;
    let learned = 0;
    while (learnStatBonus(h)) learned++;
    expect(learned).toBe(10);
    w.step();
    // 黄点 ×10 → +20 全属性 → 智力主属性 +20 攻击
    expect(h.heroMeta!.statBonusLearned).toBe(10);
  });
});

describe('cast target validation (sim authority)', () => {
  const zapLog: number[] = [];
  const ZAP: AbilityDef = {
    key: 'test_zap', name: '电击', maxLevel: 1, targetMode: 'unit', targetTeam: 'enemy',
    castRange: [800], manaCost: [0], cooldown: [0], castPoint: 0.1, tags: ['nuke'], description: '',
    onCast(_w, _caster, _lvl, _pos, target) { zapLog.push(target?.id ?? 0); },
  };
  const ZAPPER: HeroDef = {
    key: 'zapper', name: '电法', title: '', primary: 'int',
    baseStr: 18, gainStr: 2, baseAgi: 14, gainAgi: 1.5, baseInt: 24, gainInt: 3,
    baseDamage: [20, 26], baseArmor: 0, baseMs: 300, attackRange: 600, projectileSpeed: 900,
    bat: 1.7, attackPoint: 0.4, color: '#fff', glyph: '电', abilities: [ZAP], aiRole: 'ganker',
  };

  it('rejects an enemy-only ability cast on an ally, allows it on an enemy', () => {
    const w = createWorld(map, { seed: 9, noBuildings: true, startTime: 0 });
    const caster = spawnHero(w, ZAPPER, Team.Dawn, { x: 7000, y: 8000 });
    const ally = spawnHero(w, ZAPPER, Team.Dawn, { x: 7200, y: 8000 });
    const enemy = spawnHero(w, ZAPPER, Team.Night, { x: 7300, y: 8000 });
    learnAbility(w, caster, 0);

    zapLog.length = 0;
    caster.issueOrder({ type: 'cast', abilityIndex: 0, targetId: ally.id });
    for (let i = 0; i < 20; i++) w.step();
    expect(zapLog).toEqual([]); // 敌方技能打友军 → sim 拒绝,onCast 从未触发

    zapLog.length = 0;
    caster.issueOrder({ type: 'cast', abilityIndex: 0, targetId: enemy.id });
    for (let i = 0; i < 20; i++) w.step();
    expect(zapLog).toEqual([enemy.id]); // 打敌方 → 放行
  });

  it('abilityCastReason reports not-learned, ready, then cooldown', () => {
    const w = createWorld(map, { seed: 9, noBuildings: true, startTime: 0 });
    const caster = spawnHero(w, ZAPPER, Team.Dawn, { x: 7000, y: 8000 });
    const enemy = spawnHero(w, ZAPPER, Team.Night, { x: 7300, y: 8000 });
    // ZAP cooldown=0,改造一个有冷却的实例不便;此处直接验证 not-learned → ready → cooldown(借冷却字段)
    expect(abilityCastReason(w, caster, 0)).toBe('not-learned');
    learnAbility(w, caster, 0);
    expect(abilityCastReason(w, caster, 0)).toBeNull();
    caster.abilities[0].cooldownUntil = w.time + 5;
    expect(abilityCastReason(w, caster, 0)).toBe('cooldown');
    caster.abilities[0].cooldownUntil = -Infinity;
    expect(abilityCastReason(w, caster, 0)).toBeNull();
    void enemy;
  });
});
