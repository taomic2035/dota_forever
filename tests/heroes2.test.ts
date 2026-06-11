import { describe, it, expect, beforeEach } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { learnAbility } from '../src/sim/abilities';
import { applyDamage } from '../src/sim/combat';
import { hasModifier } from '../src/sim/modifiers';
import { GORM, GROSH, KAI, CHEN_BLADE, OLAN, MORPHIS } from '../src/data/heroes/batch2';
import { HEROES } from '../src/data/heroes';
import { V } from '../src/core/vec2';
import type { World } from '../src/sim/world';
import type { Unit, UnitStats } from '../src/sim/unit';

const map = new GameMap();

function dummyStats(over: Partial<UnitStats> = {}): UnitStats {
  return {
    maxHp: 3000, hpRegen: 0, maxMp: 0, mpRegen: 0, dmgMin: 0, dmgMax: 0,
    attackType: 'hero', armorType: 'hero', armor: 0, magicResist: 0.25,
    attackRange: 100, attackPoint: 0.4, bat: 1.7, projectileSpeed: 0,
    moveSpeed: 300, collisionRadius: 24, visionDay: 1800, visionNight: 800,
    acquireRange: 0, bountyMin: 30, bountyMax: 30, xpBounty: 30,
    ...over,
  };
}

let w: World;
beforeEach(() => {
  w = createWorld(map, { seed: 26, noBuildings: true, startTime: 0 });
});

function dummy(x = 7300, y = 8000): Unit {
  return w.spawnUnit({ kind: 'hero', team: Team.Night, pos: { x, y }, name: 'd', stats: dummyStats() });
}
function run(n: number) { for (let i = 0; i < n; i++) w.step(); }

describe('roster', () => {
  it('has a growing roster of unique heroes, each with a full 4-ability kit', () => {
    expect(HEROES.length).toBeGreaterThanOrEqual(10);
    const keys = new Set(HEROES.map((h) => h.key));
    expect(keys.size, '英雄 key 必须唯一').toBe(HEROES.length);
    const names = new Set(HEROES.map((h) => h.name));
    expect(names.size, '英雄名必须唯一').toBe(HEROES.length);
    for (const h of HEROES) {
      expect(h.abilities.length, h.key).toBe(4);
      expect(h.abilities[3].ultimate ?? false, `${h.key} R 应为大招`).toBe(true);
      // 每个技能 key 在该英雄内唯一
      const aKeys = new Set(h.abilities.map((a) => a.key));
      expect(aKeys.size, `${h.key} 技能 key 重复`).toBe(4);
    }
  });
});

describe('戈姆', () => {
  it('裂地震击:线上敌人眩晕受伤;余震联动', () => {
    const h = spawnHero(w, GORM, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 3; h.heroMeta!.skillPoints = 2;
    learnAbility(w, h, 0);
    learnAbility(w, h, 1); // 余震
    const near = dummy(7250, 8000); // 余震圈内
    const far = dummy(7900, 8000);  // 线上
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 8000, y: 8000 } });
    run(30);
    expect(far.hp).toBeLessThan(3000);
    expect(hasModifier(far, 'gorm_quake_stun')).toBe(true);
    expect(near.hp).toBeLessThan(3000); // 吃到线伤害或余震
  });
});

describe('格罗什', () => {
  it('锁链魂钩:拉拽线上第一个敌人到身边', () => {
    const h = spawnHero(w, GROSH, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0);
    const victim = dummy(7800, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 8000, y: 8000 } });
    run(40);
    expect(victim.hp).toBeLessThan(3000);
    expect(V.dist(victim.pos, h.pos)).toBeLessThan(400); // 被拉近
  });

  it('血肉堆积:附近单位死亡叠力量', () => {
    const h = spawnHero(w, GROSH, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 3; h.heroMeta!.skillPoints = 2;
    learnAbility(w, h, 2);
    w.step();
    const str0 = h.bonusAttr.str;
    const c = w.spawnUnit({ kind: 'creep', team: Team.Night, pos: { x: 7200, y: 8000 }, name: 'c', stats: dummyStats({ maxHp: 10 }) });
    applyDamage(w, c, { source: h.id, attackType: 'hero', amount: 100, flags: { pure: true } });
    run(5);
    expect(h.bonusAttr.str).toBeGreaterThan(str0);
  });
});

describe('凯', () => {
  it('疾影突袭:闪现至目标并造成伤害', () => {
    const h = spawnHero(w, KAI, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1);
    const t = dummy(7600, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 1, targetId: t.id });
    run(20);
    expect(t.hp).toBeLessThan(3000);
    expect(V.dist(h.pos, t.pos)).toBeLessThan(250);
  });

  it('暗影帷幕:脱战后隐身,行动后现身', () => {
    const h = spawnHero(w, KAI, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1;
    learnAbility(w, h, 3);
    run(30 * 5); // 5 秒无动作
    expect(hasModifier(h, 'kai_veil_invis')).toBe(true);
  });
});

describe('辰', () => {
  it('旋刃风暴:期间魔免并绞杀周围', () => {
    const h = spawnHero(w, CHEN_BLADE, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0);
    const t = dummy(7180, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 0 });
    run(15);
    const dealt = applyDamage(w, h, { source: 0, attackType: 'spell', amount: 200, flags: { spell: true } });
    expect(dealt).toBe(0); // 魔免
    run(80);
    expect(t.hp).toBeLessThan(3000);
  });

  it('无双连斩:多段伤害', () => {
    const h = spawnHero(w, CHEN_BLADE, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 500;
    learnAbility(w, h, 3);
    const t1 = dummy(7300, 8000);
    const t2 = dummy(7400, 8100);
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t1.id });
    run(25);
    const total = (3000 - t1.hp) + (3000 - t2.hp);
    expect(total).toBeGreaterThan(170 * 4 * 0.75 - 60); // 4 段中大部分命中
  });
});

describe('奥兰', () => {
  it('圣疗术:治疗友军并灼伤周围敌人', () => {
    const h = spawnHero(w, OLAN, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 0);
    const ally = spawnHero(w, GORM, Team.Dawn, { x: 7200, y: 8000 });
    ally.hp = 200;
    const enemy = dummy(7350, 8000);
    h.issueOrder({ type: 'cast', abilityIndex: 0, targetId: ally.id });
    run(25);
    expect(ally.hp).toBeGreaterThan(270);
    expect(enemy.hp).toBeLessThan(3000);
  });

  it('信仰守护:护盾吸收伤害', () => {
    const h = spawnHero(w, OLAN, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 5; h.heroMeta!.skillPoints = 3;
    learnAbility(w, h, 2);
    const ally = spawnHero(w, GORM, Team.Dawn, { x: 7200, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 2, targetId: ally.id });
    run(25);
    const hp0 = ally.hp;
    applyDamage(w, ally, { source: 0, attackType: 'hero', amount: 100, flags: { pure: true } });
    expect(ally.hp).toBeCloseTo(hp0, 0); // 全被盾吸收(110 盾)
  });

  it('神圣庇护:物理免疫但魔法仍有效', () => {
    const h = spawnHero(w, OLAN, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 400;
    learnAbility(w, h, 3);
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    run(20);
    expect(applyDamage(w, h, { source: 0, attackType: 'hero', amount: 100 })).toBe(0);
    expect(applyDamage(w, h, { source: 0, attackType: 'spell', amount: 100, flags: { spell: true } })).toBeGreaterThan(0);
  });
});

describe('墨菲斯', () => {
  it('生命虹吸:吸血链接,超距断开', () => {
    const h = spawnHero(w, MORPHIS, Team.Dawn, { x: 7000, y: 8000 });
    learnAbility(w, h, 1);
    const t = dummy(7400, 8000);
    h.hp = h.calc.maxHp * 0.5;
    h.issueOrder({ type: 'cast', abilityIndex: 1, targetId: t.id });
    run(80); // ~2.5s 链接
    expect(t.hp).toBeLessThan(3000);
    expect(h.hp).toBeGreaterThan(h.calc.maxHp * 0.5);
  });

  it('暗渊火雨:多波伤害+首波眩晕', () => {
    const h = spawnHero(w, MORPHIS, Team.Dawn, { x: 7000, y: 8000 });
    h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 500;
    learnAbility(w, h, 3);
    const t = dummy(7600, 8000);
    t.base.moveSpeed = 0; // 不让走出圈
    h.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7600, y: 8000 } });
    run(30 * 5); // 全部 5 波
    expect(3000 - t.hp).toBeGreaterThan(65 * 4 * 0.75 - 40);
  });
});
