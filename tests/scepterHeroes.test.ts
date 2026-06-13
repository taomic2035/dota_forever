import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { learnAbility, abilityDefAt, abilityCooldown } from '../src/sim/abilities';
import { stateOf } from '../src/sim/combat';
import { makeItem } from '../src/sim/items';
import { REIN, LIYA, ZOLA } from '../src/data/heroes';
import type { HeroDef } from '../src/data/heroes/types';
import type { UnitStats } from '../src/sim/unit';

const map = new GameMap();
type W = ReturnType<typeof createWorld>;

function ultHero(w: W, def: HeroDef, pos: { x: number; y: number }, scepter = false) {
  const h = spawnHero(w, def, Team.Dawn, pos);
  h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 1000;
  learnAbility(w, h, 3); // 大招
  if (scepter) h.inventory[0] = makeItem('scepter');
  return h;
}

function enemyDummy(w: W, pos: { x: number; y: number }) {
  const stats: UnitStats = {
    maxHp: 10000, hpRegen: 0, maxMp: 0, mpRegen: 0, dmgMin: 0, dmgMax: 0,
    attackType: 'hero', armorType: 'hero', armor: 0, magicResist: 0,
    attackRange: 150, attackPoint: 0.3, bat: 1.7, projectileSpeed: 0, moveSpeed: 0,
    collisionRadius: 24, visionDay: 0, visionNight: 0, acquireRange: 0,
    bountyMin: 0, bountyMax: 0, xpBounty: 0,
  };
  const t = w.spawnUnit({ kind: 'hero', team: Team.Night, pos, name: 'd', stats });
  t.hp = 5000;
  return t;
}

const newWorld = () => createWorld(map, { seed: 141, noBuildings: true, startTime: 0 });

describe('英雄神杖升级(rein/liya/zola)', () => {
  it('rein 泰坦之力:神杖 CD 80→55 + 化身震荡波伤害周围', () => {
    const wc = newWorld();
    const hc = ultHero(wc, REIN, { x: 7000, y: 8000 });
    const def = abilityDefAt(hc, 3)!;
    expect(abilityCooldown(hc, def, 1)).toBe(80);
    hc.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(hc, def, 1)).toBe(55);

    // 无杖:化身不伤敌
    const w0 = newWorld();
    const h0 = ultHero(w0, REIN, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7200, y: 8000 }); // 距 200 < 350
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 14; i++) w0.step();
    expect(t0.hp).toBe(5000);

    // 有杖:震荡波伤害
    const w1 = newWorld();
    const h1 = ultHero(w1, REIN, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7200, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 14; i++) w1.step();
    expect(t1.hp).toBeLessThan(5000);
  });

  it('zola 雷神之怒:神杖 CD 120→80 + 雷击附带眩晕', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, ZOLA, { x: 7000, y: 8000 });
    const def = abilityDefAt(h0, 3)!;
    expect(abilityCooldown(h0, def, 1)).toBe(120);
    const t0 = enemyDummy(w0, { x: 7400, y: 8000 });
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 20; i++) w0.step();
    expect(t0.hp).toBeLessThan(5000);      // 全图雷击命中
    expect(stateOf(t0).stunned).toBeFalsy(); // 无杖不晕

    const w1 = newWorld();
    const h1 = ultHero(w1, ZOLA, { x: 7000, y: 8000 }, true);
    expect(abilityCooldown(h1, def, 1)).toBe(80);
    const t1 = enemyDummy(w1, { x: 7400, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 20; i++) w1.step();
    expect(stateOf(t1).stunned).toBe(true); // 神杖眩晕
  });

  it('liya 极寒领域:神杖 CD 110→80 + 范围扩大命中远端敌人', () => {
    const wc = newWorld();
    const hc = ultHero(wc, LIYA, { x: 7000, y: 8000 });
    const def = abilityDefAt(hc, 3)!;
    expect(abilityCooldown(hc, def, 1)).toBe(110);
    hc.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(hc, def, 1)).toBe(80);

    // 敌人距 700:无杖(范围 600)不中
    const w0 = newWorld();
    const h0 = ultHero(w0, LIYA, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7700, y: 8000 });
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 45; i++) w0.step();
    expect(t0.hp).toBe(5000);

    // 有杖(范围 800)命中
    const w1 = newWorld();
    const h1 = ultHero(w1, LIYA, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7700, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 45; i++) w1.step();
    expect(t1.hp).toBeLessThan(5000);
  });
});
