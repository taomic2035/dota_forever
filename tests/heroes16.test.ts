import { describe, it, expect, beforeEach } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { learnAbility } from '../src/sim/abilities';
import { hasModifier } from '../src/sim/modifiers';
import { EMB, VIP, AA, MPH, SDM, MKY, BATCH16 } from '../src/data/heroes/batch16';
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
beforeEach(() => { w = createWorld(map, { seed: 161, noBuildings: true, startTime: 0 }); });
function dummy(x = 7300, y = 8000, over: Partial<UnitStats> = {}): Unit {
  return w.spawnUnit({ kind: 'hero', team: Team.Night, pos: { x, y }, name: 'd', stats: dummyStats(over) });
}
function run(n: number) { for (let i = 0; i < n; i++) w.step(); }

describe('batch16 roster', () => {
  it('6 heroes with full kits', () => {
    expect(BATCH16.length).toBe(6);
    for (const h of BATCH16) {
      expect(h.abilities.length, h.key).toBe(4);
      expect(h.abilities[3].ultimate ?? false, `${h.key} R`).toBe(true);
    }
  });
});

describe('安博', () => {
  it('拳拳到肉:打击目标区域后归位', () => {
    const h = spawnHero(w, EMB, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7400, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 7400, y: 8000 } });
    run(8);
    expect(t.hp).toBeLessThan(3000);
    expect(V.dist(h.pos, { x: 7000, y: 8000 })).toBeLessThan(120); // 归位
  });
  it('灼热之链:缠绕周围敌人', () => {
    const h = spawnHero(w, EMB, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 2); h.mp = 200;
    const t = dummy(7300, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 2 });
    run(12);
    expect(hasModifier(t, 'emb_chains_root')).toBe(true);
  });
});

describe('维普', () => {
  it('腐蚀皮肤:反弹伤害并冻缓攻击者', () => {
    const h = spawnHero(w, VIP, Team.Dawn, { x: 7000, y: 8000 });
    h.heroMeta!.skillPoints = 1; learnAbility(w, h, 0);
    w.step();
    const atk = spawnHero(w, MPH, Team.Night, { x: 7120, y: 8000 });
    const atkHp0 = atk.hp;
    atk.issueOrder({ type: 'attack', targetId: h.id });
    run(40);
    expect(atk.hp).toBeLessThan(atkHp0); // 受到反弹伤害
    expect(hasModifier(atk, 'passive_vip_corrosive_retaliate')).toBe(true); // 被冻缓

  });
  it('致命剧毒:残血目标更高伤害', () => {
    const h = spawnHero(w, VIP, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1); h.mp = 200;
    const t = dummy(7300, 8000, { magicResist: 0 });
    t.hp = 600;
    h.issueOrder({ type: 'cast', abilityIndex: 1, targetId: t.id });
    run(12);
    expect(t.hp).toBeLessThan(600);
    expect(hasModifier(t, 'vip_nether_slow')).toBe(true);
  });
});

describe('艾莎', () => {
  it('寒霜冻足:延迟眩晕未离开者', () => {
    const h = spawnHero(w, AA, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7300, 8000, { moveSpeed: 0, acquireRange: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 0, targetId: t.id });
    run(90); // 越过 2.5s 延迟
    expect(hasModifier(t, 'aa_coldfeet_stun')).toBe(true);
  });
  it('急冻领域:减速+放大魔法伤害', () => {
    const h = spawnHero(w, AA, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1); h.mp = 200;
    const t = dummy(7300, 8000, { magicResist: 0.25 });
    w.step();
    const mr0 = t.calc.magicResist;
    h.issueOrder({ type: 'cast', abilityIndex: 1, pos: { x: 7300, y: 8000 } });
    run(12);
    expect(hasModifier(t, 'aa_vortex_debuff')).toBe(true);
    expect(t.calc.magicResist).toBeLessThan(mr0);
  });
  it('极寒之触:远程范围重创+冰封', () => {
    const h = spawnHero(w, AA, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 300;
    learnAbility(w, h, 3);
    const t = dummy(8500, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 8500, y: 8000 } });
    run(12);
    expect(t.hp).toBeLessThan(3000);
    expect(hasModifier(t, 'aa_iceblast_debuff')).toBe(true);
  });
});

describe('墨菲', () => {
  it('波形:直线伤害+位移', () => {
    const h = spawnHero(w, MPH, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7400, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 7700, y: 8000 } });
    run(8);
    expect(t.hp).toBeLessThan(3000);
    expect(h.pos.x).toBeGreaterThan(7300);
  });
  it('形态转换:在敏捷/力量形态间切换', () => {
    const h = spawnHero(w, MPH, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 2); h.mp = 200;
    h.issueOrder({ type: 'cast', abilityIndex: 2 });
    run(3);
    expect(hasModifier(h, 'mph_str_form')).toBe(true);
    h.abilities[2].cooldownUntil = -Infinity;
    h.issueOrder({ type: 'cast', abilityIndex: 2 });
    run(3);
    expect(hasModifier(h, 'mph_agi_form')).toBe(true);
    expect(hasModifier(h, 'mph_str_form')).toBe(false);
  });
  it('复制:召唤水之复制体', () => {
    const h = spawnHero(w, MPH, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 200;
    learnAbility(w, h, 3);
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    run(10);
    const illu = [...w.units.values()].filter((u) => u.kind === 'illusion' && u.summonOwnerId === h.id && u.alive);
    expect(illu.length).toBe(1);
  });
});

describe('萨德', () => {
  it('崩裂禁锢:放逐目标(无敌)', () => {
    const h = spawnHero(w, SDM, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7400, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 0, targetId: t.id });
    run(12);
    expect(hasModifier(t, 'sdm_disrupt_banish')).toBe(true);
    expect(t.invulnerable).toBe(true);
  });
  it('灵魂逮捕:放大目标所受魔法伤害', () => {
    const h = spawnHero(w, SDM, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 2); h.mp = 200;
    const t = dummy(7300, 8000, { magicResist: 0.25 });
    w.step();
    const mr0 = t.calc.magicResist;
    h.issueOrder({ type: 'cast', abilityIndex: 2, targetId: t.id });
    run(8);
    expect(t.calc.magicResist).toBeLessThan(mr0);
  });
});

describe('灵狲', () => {
  it('棒击大地:直线眩晕+伤害', () => {
    const h = spawnHero(w, MKY, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7400, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 7550, y: 8000 } });
    run(12);
    expect(t.hp).toBeLessThan(3000);
    expect(hasModifier(t, 'mky_staff_stun')).toBe(true);
  });
  it('金箍戏法:连续命中后获得强化', () => {
    const h = spawnHero(w, MKY, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1);
    const t = dummy(7250, 8000, { maxHp: 100000 });
    h.issueOrder({ type: 'attack', targetId: t.id });
    let charged = false;
    for (let i = 0; i < 30 * 8; i++) { w.step(); if (hasModifier(h, 'mky_jingu_charged')) { charged = true; break; } }
    expect(charged).toBe(true);
  });
  it('大圣天兵:范围持续伤害', () => {
    const h = spawnHero(w, MKY, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 300;
    learnAbility(w, h, 3);
    const t = dummy(7300, 8000, { magicResist: 0, moveSpeed: 0, acquireRange: 0 });
    const hp0 = t.hp;
    h.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7300, y: 8000 } });
    run(30);
    expect(t.hp).toBeLessThan(hp0);
    expect(hasModifier(t, 'mky_command_slow')).toBe(true);
  });
});
