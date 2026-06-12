import { describe, it, expect, beforeEach } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { learnAbility } from '../src/sim/abilities';
import { applyDamage } from '../src/sim/combat';
import { hasModifier } from '../src/sim/modifiers';
import { EAR, SKY, JAK, WAK, CRY, MAR, BATCH13 } from '../src/data/heroes/batch13';
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
beforeEach(() => { w = createWorld(map, { seed: 131, noBuildings: true, startTime: 0 }); });
function dummy(x = 7300, y = 8000, over: Partial<UnitStats> = {}): Unit {
  return w.spawnUnit({ kind: 'hero', team: Team.Night, pos: { x, y }, name: 'd', stats: dummyStats(over) });
}
function run(n: number) { for (let i = 0; i < n; i++) w.step(); }

describe('batch13 roster', () => {
  it('6 heroes with full kits', () => {
    expect(BATCH13.length).toBe(6);
    for (const h of BATCH13) {
      expect(h.abilities.length, h.key).toBe(4);
      expect(h.abilities[3].ultimate ?? false, `${h.key} R`).toBe(true);
    }
  });
});

describe('葛朗', () => {
  it('沟壑:直线眩晕+伤害', () => {
    const h = spawnHero(w, EAR, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7400, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 7600, y: 8000 } });
    run(12);
    expect(t.hp).toBeLessThan(3000);
    expect(hasModifier(t, 'ear_fissure_stun')).toBe(true);
  });
  it('强化图腾:提升攻击力', () => {
    const h = spawnHero(w, EAR, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1); h.mp = 200;
    w.step();
    const dmg0 = h.calc.dmgMax;
    h.issueOrder({ type: 'cast', abilityIndex: 1 });
    run(8);
    expect(h.calc.dmgMax).toBeGreaterThan(dmg0 + 50);
  });
  it('回音击:范围伤害', () => {
    const h = spawnHero(w, EAR, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 300;
    learnAbility(w, h, 3);
    const t = dummy(7300, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    run(12);
    expect(t.hp).toBeLessThan(3000);
  });
});

describe('斯凯', () => {
  it('远古封印:沉默+提升受魔法伤害', () => {
    const h = spawnHero(w, SKY, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 2); h.mp = 200;
    const t = dummy(7300, 8000);
    w.step();
    const mr0 = t.calc.magicResist;
    h.issueOrder({ type: 'cast', abilityIndex: 2, targetId: t.id });
    run(14); // 前摇后施放,留余量让 recalc 折叠魔抗
    expect(hasModifier(t, 'sky_seal_debuff')).toBe(true);
    expect(t.calc.magicResist).toBeLessThan(mr0);
  });
  it('神秘之耀:范围爆发', () => {
    const h = spawnHero(w, SKY, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 400;
    learnAbility(w, h, 3);
    const t = dummy(7400, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7400, y: 8000 } });
    run(12);
    expect(t.hp).toBeLessThan(3000);
  });
});

describe('杰洛', () => {
  it('冰火吐息:锥形伤害+减速', () => {
    const h = spawnHero(w, JAK, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7400, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 7700, y: 8000 } });
    run(12);
    expect(t.hp).toBeLessThan(3000);
    expect(hasModifier(t, 'jak_breath_slow')).toBe(true);
  });
  it('冰封路径:延迟冻结直线敌人', () => {
    const h = spawnHero(w, JAK, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1); h.mp = 200;
    const t = dummy(7400, 8000, { moveSpeed: 0, acquireRange: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 1, pos: { x: 7700, y: 8000 } });
    run(30);
    expect(hasModifier(t, 'jak_icepath_stun')).toBe(true);
  });
  it('岩浆狂暴:持续灼烧', () => {
    const h = spawnHero(w, JAK, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 400;
    learnAbility(w, h, 3);
    const t = dummy(7300, 8000, { magicResist: 0, moveSpeed: 0, acquireRange: 0 });
    const hp0 = t.hp;
    h.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7300, y: 8000 } });
    run(40);
    expect(t.hp).toBeLessThan(hp0);
  });
});

describe('瓦克', () => {
  it('亡灵冲击:眩晕+伤害', () => {
    const h = spawnHero(w, WAK, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7300, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 0, targetId: t.id });
    run(12);
    expect(t.hp).toBeLessThan(3000);
    expect(hasModifier(t, 'wak_blast_stun')).toBe(true);
  });
  it('吸血光环:友军获得吸血', () => {
    const h = spawnHero(w, WAK, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1);
    const ally = spawnHero(w, EAR, Team.Dawn, { x: 7200, y: 8000 });
    run(30);
    expect(hasModifier(ally, 'wak_vampiric_buff')).toBe(true);
  });
  it('重生:致死触发 3s 重组后满血复活', () => {
    const h = spawnHero(w, WAK, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 300;
    learnAbility(w, h, 3);
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    run(4);
    expect(hasModifier(h, 'wak_reincarnation_buff')).toBe(true);
    applyDamage(w, h, { source: 0, attackType: 'hero', amount: 999999, flags: { pure: true } });
    // 进入重组:存活、无敌、眩晕(不算被击杀),尚未满血
    expect(h.alive).toBe(true);
    expect(h.invulnerable).toBe(true);
    expect(hasModifier(h, 'reincarnating')).toBe(true);
    run(95); // 3 秒重组窗口结束(>3s)
    expect(h.invulnerable).toBe(false);
    expect(h.hp).toBe(h.calc.maxHp); // 原地满血复活
  });
});

describe('冰漪', () => {
  it('冰封禁制:定身+持续伤害', () => {
    const h = spawnHero(w, CRY, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7300, 8000, { magicResist: 0 });
    const hp0 = t.hp;
    h.issueOrder({ type: 'cast', abilityIndex: 0, targetId: t.id });
    run(30); // 定身 + 首个 DoT 跳动
    expect(hasModifier(t, 'cry_frostbite_root')).toBe(true);
    expect(t.hp).toBeLessThan(hp0);
  });
  it('奥术光环:全队法力回复', () => {
    const h = spawnHero(w, CRY, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 2);
    const far = spawnHero(w, SKY, Team.Dawn, { x: 12000, y: 3000 });
    run(30);
    expect(hasModifier(far, 'cry_arcane_buff')).toBe(true);
  });
  it('冰晶爆轰:引导范围伤害', () => {
    const h = spawnHero(w, CRY, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 500;
    learnAbility(w, h, 3);
    const t = dummy(7300, 8000, { magicResist: 0, moveSpeed: 0, acquireRange: 0 });
    const hp0 = t.hp;
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    run(30);
    expect(t.hp).toBeLessThan(hp0);
    expect(hasModifier(t, 'cry_freeze_slow')).toBe(true);
  });
});

describe('马尔', () => {
  it('战神长矛:钉住并眩晕', () => {
    const h = spawnHero(w, MAR, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0); h.mp = 200;
    const t = dummy(7400, 8000, { magicResist: 0 });
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 7800, y: 8000 } });
    run(12);
    expect(t.hp).toBeLessThan(3000);
    expect(hasModifier(t, 'mar_spear_stun')).toBe(true);
  });
  it('壁垒:被动减伤', () => {
    const h = spawnHero(w, MAR, Team.Dawn, { x: 7000, y: 8000 });
    h.heroMeta!.skillPoints = 1; learnAbility(w, h, 2);
    w.step();
    expect(h.calc.incomingDamageReduction).toBeGreaterThan(0.1);
  });
  it('血之竞技场:强化自身+减速敌人', () => {
    const h = spawnHero(w, MAR, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 300;
    learnAbility(w, h, 3);
    const t = dummy(7300, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    run(24); // 自身增益 + 场地首次减速跳动
    expect(hasModifier(h, 'mar_arena_buff')).toBe(true);
    expect(hasModifier(t, 'mar_arena_slow')).toBe(true);
  });
});
