import { describe, it, expect, beforeEach } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { learnAbility } from '../src/sim/abilities';
import { hasModifier } from '../src/sim/modifiers';
import { SNK, BAT, SHM, GRM, ENCH, ORA, BATCH19 } from '../src/data/heroes/batch19';
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
beforeEach(() => { w = createWorld(map, { seed: 191, noBuildings: true, startTime: 0 }); });
function dummy(x = 7300, y = 8000, over: Partial<UnitStats> = {}): Unit {
  return w.spawnUnit({ kind: 'hero', team: Team.Night, pos: { x, y }, name: 'd', stats: dummyStats(over) });
}
function run(n: number) { for (let i = 0; i < n; i++) w.step(); }

describe('batch19 roster', () => {
  it('6 heroes with full kits', () => {
    expect(BATCH19.length).toBe(6);
    for (const h of BATCH19) {
      expect(h.abilities.length, h.key).toBe(4);
      expect(h.abilities[3].ultimate ?? false, `${h.key} R`).toBe(true);
    }
  });
});

describe('沙立', () => {
  it('穿刺:直线眩晕+伤害', () => {
    const h = spawnHero(w, SNK, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7400, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 7550, y: 8000 } });
    run(12);
    expect(t.hp).toBeLessThan(3000);
    expect(hasModifier(t, 'snk_burrow_stun')).toBe(true);
  });
  it('地震:引导范围持续伤害', () => {
    const h = spawnHero(w, SNK, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 300;
    learnAbility(w, h, 3);
    const t = dummy(7300, 8000, { magicResist: 0, moveSpeed: 0, acquireRange: 0 });
    const hp0 = t.hp;
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    run(25);
    expect(t.hp).toBeLessThan(hp0);
    expect(hasModifier(t, 'snk_epi_slow')).toBe(true);
  });
});

describe('巴特', () => {
  it('黏性烈焰:叠加减速+削魔抗', () => {
    const h = spawnHero(w, BAT, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7300, 8000, { magicResist: 0.25 });
    w.step();
    const mr0 = t.calc.magicResist;
    h.issueOrder({ type: 'cast', abilityIndex: 0, targetId: t.id });
    run(8);
    expect(hasModifier(t, 'bat_napalm_stack')).toBe(true);
    expect(t.calc.magicResist).toBeLessThan(mr0);
  });
  it('烈焰套索:拖拽+持续灼烧', () => {
    const h = spawnHero(w, BAT, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 200;
    learnAbility(w, h, 3);
    const t = dummy(7300, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t.id });
    run(12);
    expect(hasModifier(t, 'bat_lasso_drag')).toBe(true);
  });
});

describe('蛊巫', () => {
  it('妖术:变形硬控', () => {
    const h = spawnHero(w, SHM, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1); h.mp = 200;
    const t = dummy(7300, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 1, targetId: t.id });
    run(12);
    expect(hasModifier(t, 'shm_hex_debuff')).toBe(true);
  });
  it('群蛇守卫:召出多个守卫', () => {
    const h = spawnHero(w, SHM, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 300;
    learnAbility(w, h, 3);
    h.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7200, y: 8000 } });
    run(12);
    const wards = [...w.units.values()].filter((u) => u.name === '群蛇守卫' && u.alive && u.summonOwnerId === h.id);
    expect(wards.length).toBe(4);
  });
});

describe('墨翰', () => {
  it('命运一击:多目标增伤直线', () => {
    const h = spawnHero(w, GRM, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const a = dummy(7400, 8000, { magicResist: 0 });
    const b = dummy(7600, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 7800, y: 8000 } });
    run(12);
    expect(a.hp).toBeLessThan(3000);
    expect(b.hp).toBeLessThan(3000);
  });
  it('墨涌:护盾到期炸开眩晕', () => {
    const h = spawnHero(w, GRM, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 2); h.mp = 200;
    const t = dummy(7150, 8000, { magicResist: 0, moveSpeed: 0, acquireRange: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 2, targetId: h.id });
    run(8);
    expect(hasModifier(h, 'grm_swell_buff')).toBe(true);
    run(120); // 等待护盾到期炸开
    expect(hasModifier(t, 'grm_swell_stun')).toBe(true);
  });
});

describe('林莺', () => {
  it('魅惑:大幅削减攻速移速', () => {
    const h = spawnHero(w, ENCH, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1); h.mp = 200;
    const t = dummy(7300, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 1, targetId: t.id });
    run(8);
    expect(hasModifier(t, 'ench_enchant_debuff')).toBe(true);
  });
  it('不可侵犯:攻击者被减速', () => {
    const h = spawnHero(w, ENCH, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1;
    learnAbility(w, h, 3);
    w.step();
    const atk = spawnHero(w, SNK, Team.Night, { x: 7120, y: 8000 });
    atk.issueOrder({ type: 'attack', targetId: h.id });
    run(40);
    expect(hasModifier(atk, 'passive_ench_untouchable_retaliate')).toBe(true);
  });
});

describe('奥锐', () => {
  it('净化之焰:治疗友军', () => {
    const h = spawnHero(w, ORA, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 2); h.mp = 200;
    const ally = spawnHero(w, SNK, Team.Dawn, { x: 7200, y: 8000 });
    ally.hp = 300;
    h.issueOrder({ type: 'cast', abilityIndex: 2, targetId: ally.id });
    run(6);
    expect(ally.hp).toBeGreaterThan(300);
  });
  it('虚妄之诺:大幅减伤+回血', () => {
    const h = spawnHero(w, ORA, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 200;
    learnAbility(w, h, 3);
    const ally = spawnHero(w, SNK, Team.Dawn, { x: 7200, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: ally.id });
    run(14); // 留余量让 recalc 折叠减伤
    expect(hasModifier(ally, 'ora_promise_buff')).toBe(true);
    expect(ally.calc.incomingDamageReduction).toBeGreaterThan(0.4);
  });
});
