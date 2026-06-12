import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { learnAbility, abilityDefAt, hasScepter, abilityCooldown, abilityManaCost } from '../src/sim/abilities';
import { makeItem } from '../src/sim/items';
import { NEC } from '../src/data/heroes/batch14';
import type { UnitStats } from '../src/sim/unit';

const map = new GameMap();

function nec(w: ReturnType<typeof createWorld>) {
  const h = spawnHero(w, NEC, Team.Dawn, { x: 7000, y: 8000 });
  h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 600;
  learnAbility(w, h, 3); // 死神镰刀(大招)
  return h;
}
function bigDummy(w: ReturnType<typeof createWorld>) {
  const stats: UnitStats = {
    maxHp: 10000, hpRegen: 0, maxMp: 0, mpRegen: 0, dmgMin: 0, dmgMax: 0,
    attackType: 'hero', armorType: 'hero', armor: 0, magicResist: 0,
    attackRange: 150, attackPoint: 0.3, bat: 1.7, projectileSpeed: 0, moveSpeed: 0,
    collisionRadius: 24, visionDay: 0, visionNight: 0, acquireRange: 0,
    bountyMin: 0, bountyMax: 0, xpBounty: 0,
  };
  const t = w.spawnUnit({ kind: 'hero', team: Team.Night, pos: { x: 7300, y: 8000 }, name: 'd', stats });
  t.hp = 5000; // 残血但两种情况都不致死,缺血 5000
  return t;
}

describe('阿哈利姆神杖框架(M8)', () => {
  it('hasScepter 据背包检测', () => {
    const w = createWorld(map, { seed: 141, noBuildings: true, startTime: 0 });
    const h = nec(w);
    expect(hasScepter(h)).toBe(false);
    h.inventory[0] = makeItem('scepter');
    expect(hasScepter(h)).toBe(true);
  });

  it('神杖感知冷却:死神镰刀 100→60(无声明的 mana 仍走基础)', () => {
    const w = createWorld(map, { seed: 141, noBuildings: true, startTime: 0 });
    const h = nec(w);
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(100); // 基础
    expect(abilityManaCost(h, def, 1)).toBe(200);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(60);  // 神杖覆盖
    expect(abilityManaCost(h, def, 1)).toBe(200); // 未声明 scepter.manaCost → 仍基础
  });

  it('神杖行为增强:处决伤害 +40%', () => {
    // 无杖
    const w0 = createWorld(map, { seed: 141, noBuildings: true, startTime: 0 });
    const h0 = nec(w0); const t0 = bigDummy(w0);
    h0.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t0.id });
    for (let i = 0; i < 12; i++) w0.step();
    const baseDmg = 5000 - t0.hp;

    // 有杖(同种子同设置)
    const w1 = createWorld(map, { seed: 141, noBuildings: true, startTime: 0 });
    const h1 = nec(w1); const t1 = bigDummy(w1);
    h1.inventory[0] = makeItem('scepter');
    h1.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t1.id });
    for (let i = 0; i < 12; i++) w1.step();
    const scepterDmg = 5000 - t1.hp;

    expect(baseDmg).toBeGreaterThan(0);
    expect(t1.alive).toBe(true); // 未致死,伤害可比
    expect(scepterDmg / baseDmg).toBeCloseTo(1.4, 2);
  });
});
