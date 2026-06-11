import { describe, it, expect, beforeEach } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { learnAbility } from '../src/sim/abilities';
import { applyDamage } from '../src/sim/combat';
import { hasModifier } from '../src/sim/modifiers';
import { SAYA, AURORA, BAL, KELON, TAI, NOX, BATCH5 } from '../src/data/heroes/batch5';
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
beforeEach(() => {
  w = createWorld(map, { seed: 51, noBuildings: true, startTime: 0 });
});
function dummy(x = 7300, y = 8000, over: Partial<UnitStats> = {}): Unit {
  return w.spawnUnit({ kind: 'hero', team: Team.Night, pos: { x, y }, name: 'd', stats: dummyStats(over) });
}
function run(n: number) { for (let i = 0; i < n; i++) w.step(); }

describe('batch5 roster', () => {
  it('6 heroes with full kits', () => {
    expect(BATCH5.length).toBe(6);
    for (const h of BATCH5) {
      expect(h.abilities.length, h.key).toBe(4);
      expect(h.abilities[3].ultimate ?? false, `${h.key} R`).toBe(true);
    }
  });
});

describe('萨娅(幻象系统)', () => {
  it('虚影分身:生成幻象,出伤打折、受伤翻倍', () => {
    const h = spawnHero(w, SAYA, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 5; h.heroMeta!.skillPoints = 3;
    learnAbility(w, h, 0); learnAbility(w, h, 0); learnAbility(w, h, 0); // Q lvl3 = 3 个
    w.step();
    h.issueOrder({ type: 'cast', abilityIndex: 0 });
    run(10);
    const illusions = [...w.units.values()].filter((u) => u.kind === 'illusion' && u.team === Team.Dawn && u.alive);
    expect(illusions.length).toBe(3);
    const illu = illusions[0];
    expect(illu.illuOutgoing).toBeLessThan(1); // 出伤打折
    expect(illu.illuIncoming).toBeGreaterThan(1); // 受伤翻倍
    expect(illu.heroDef?.key).toBe('saya'); // 外观仍是萨娅
  });

  it('幻象受到的伤害被放大(illuIncoming)', () => {
    const h = spawnHero(w, SAYA, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0);
    h.issueOrder({ type: 'cast', abilityIndex: 0 });
    run(10);
    const illu = [...w.units.values()].find((u) => u.kind === 'illusion')!;
    const hp0 = illu.hp;
    applyDamage(w, illu, { source: 0, attackType: 'hero', amount: 100 });
    // 受伤翻 3 倍(再经幻象自身护甲削减),应远超非幻象会承受的 ~76
    expect(hp0 - illu.hp).toBeGreaterThan(180);
  });

  it('幻象出伤被削减(illuOutgoing)', () => {
    const h = spawnHero(w, SAYA, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0);
    h.issueOrder({ type: 'cast', abilityIndex: 0 });
    run(10);
    const illu = [...w.units.values()].find((u) => u.kind === 'illusion')!;
    const target = dummy(illu.pos.x + 100, illu.pos.y, { maxHp: 100000, armor: 0 });
    illu.issueOrder({ type: 'attack', targetId: target.id });
    run(60);
    const dmg = 100000 - target.hp;
    // 幻象白字约 (26..32 + 敏) × 出伤系数,远小于英雄本体
    expect(dmg).toBeGreaterThan(0);
    expect(dmg).toBeLessThan(300);
  });

  it('幻象到期消失', () => {
    const h = spawnHero(w, SAYA, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0);
    h.issueOrder({ type: 'cast', abilityIndex: 0 });
    run(10);
    const illu = [...w.units.values()].find((u) => u.kind === 'illusion')!;
    illu.summonExpiresAt = w.time + 1;
    run(40);
    expect(illu.alive).toBe(false);
  });
});

describe('奥罗拉', () => {
  it('寒霜碎片:范围伤害+减速', () => {
    const h = spawnHero(w, AURORA, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0);
    const t = dummy(7400, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 7400, y: 8000 } });
    run(15);
    expect(t.hp).toBeLessThan(3000);
    expect(hasModifier(t, 'aurora_shard_slow')).toBe(true);
  });
  it('寒冰庇护:友军被冰封无敌后治疗', () => {
    const h = spawnHero(w, AURORA, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 5; h.heroMeta!.skillPoints = 3;
    learnAbility(w, h, 2);
    const ally = spawnHero(w, BAL, Team.Dawn, { x: 7200, y: 8000 });
    ally.hp = 500;
    h.issueOrder({ type: 'cast', abilityIndex: 2, targetId: ally.id });
    run(10);
    // 冰封期间无敌
    expect(applyDamage(w, ally, { source: 0, attackType: 'hero', amount: 200 })).toBe(0);
    run(60); // 冰封 2 秒后治疗
    expect(ally.hp).toBeGreaterThan(500);
  });
});

describe('巴尔', () => {
  it('烈焰冲击:范围伤害+眩晕', () => {
    const h = spawnHero(w, BAL, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0);
    const t = dummy(7400, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 7400, y: 8000 } });
    run(20);
    expect(t.hp).toBeLessThan(3000);
    expect(hasModifier(t, 'bal_blast_stun')).toBe(true);
  });
  it('烈焰之肤:被攻击反弹伤害', () => {
    const h = spawnHero(w, BAL, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 5; h.heroMeta!.skillPoints = 4;
    for (let i = 0; i < 4; i++) learnAbility(w, h, 2);
    const attacker = dummy(7140, 8000, { dmgMin: 100, dmgMax: 100, maxHp: 5000 });
    attacker.issueOrder({ type: 'attack', targetId: h.id });
    const aHp0 = attacker.hp;
    run(60);
    expect(attacker.hp).toBeLessThan(aHp0);
  });
});

describe('凯隆', () => {
  it('瞄准:提升攻击距离', () => {
    const h = spawnHero(w, KELON, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0);
    w.step();
    const range0 = h.calc.attackRange;
    h.issueOrder({ type: 'cast', abilityIndex: 0 });
    run(5);
    expect(h.calc.attackRange).toBeGreaterThan(range0);
  });
  it('狙杀:远程巨额伤害+眩晕', () => {
    const h = spawnHero(w, KELON, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 400;
    learnAbility(w, h, 3);
    const t = dummy(8200, 8000, { magicResist: 0 }); // 1200 远
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t.id });
    run(45); // 1 秒蓄力
    expect(3000 - t.hp).toBeGreaterThan(250);
    expect(hasModifier(t, 'kelon_snipe_stun')).toBe(true);
  });
});

describe('塔伊', () => {
  it('球状闪电:位移+沿途伤害', () => {
    const h = spawnHero(w, TAI, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0);
    const t = dummy(7400, 8000);
    const from = V.clone(h.pos);
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 7600, y: 8000 } }); // 600 < 施法距离 700
    run(10);
    expect(V.dist(h.pos, from)).toBeGreaterThan(300);
    expect(t.hp).toBeLessThan(3000);
  });
  it('超负荷:施法后下次攻击释放过载', () => {
    const h = spawnHero(w, TAI, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 5; h.heroMeta!.skillPoints = 3;
    learnAbility(w, h, 0); learnAbility(w, h, 2);
    const t = dummy(7300, 8000, { maxHp: 100000, magicResist: 0 });
    // 先施法蓄能
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 7100, y: 8000 } });
    run(8);
    expect(hasModifier(h, 'tai_overload_charged')).toBe(true);
    // 再攻击释放过载
    h.issueOrder({ type: 'attack', targetId: t.id });
    run(60);
    expect(hasModifier(h, 'tai_overload_charged')).toBe(false); // 已消耗
  });
  it('电磁漩涡:拉拽并禁锢', () => {
    const h = spawnHero(w, TAI, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 400;
    learnAbility(w, h, 3);
    const t = dummy(7350, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7300, y: 8000 } });
    run(10);
    expect(hasModifier(t, 'tai_vortex_root')).toBe(true);
    expect(V.dist(t.pos, { x: 7300, y: 8000 })).toBeLessThan(350); // 被拉向中心
  });
});

describe('诺克斯', () => {
  it('致残射击:减攻速减移速', () => {
    const h = spawnHero(w, NOX, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0);
    const t = dummy(7400, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 0, targetId: t.id });
    run(15);
    expect(hasModifier(t, 'nox_cripple_debuff')).toBe(true);
    expect(t.calc.moveSpeed).toBeLessThan(300);
  });
  it('黑暗降临:强制进入黑夜', () => {
    const h = spawnHero(w, NOX, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 3; h.heroMeta!.skillPoints = 2;
    learnAbility(w, h, 2);
    expect(w.isNight).toBe(false); // 0:00 白昼
    h.issueOrder({ type: 'cast', abilityIndex: 2 });
    run(10);
    expect(w.isNight).toBe(true); // 被强制黑夜
  });
});
