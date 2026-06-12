import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { REIN } from '../src/data/heroes';
import type { World } from '../src/sim/world';
import type { Unit, UnitStats } from '../src/sim/unit';

function creepStats(over: Partial<UnitStats> = {}): UnitStats {
  return {
    maxHp: 2000, hpRegen: 0, maxMp: 0, mpRegen: 0, dmgMin: 10, dmgMax: 10,
    attackType: 'normal', armorType: 'medium', armor: 0, magicResist: 0,
    attackRange: 100, attackPoint: 0.3, bat: 1.0, projectileSpeed: 0, moveSpeed: 325,
    collisionRadius: 22, visionDay: 800, visionNight: 800, acquireRange: 500,
    bountyMin: 0, bountyMax: 0, xpBounty: 0, ...over,
  };
}
function creep(w: World, team: Team, x: number, y: number, over: Partial<UnitStats> = {}): Unit {
  return w.spawnUnit({ kind: 'creep', team, pos: { x, y }, name: 'c', stats: creepStats(over) });
}

// 三轮审计 Wave2:小兵仇恨(B2)——英雄攻击小兵,周围 CREEP_AGGRO_RANGE 内同队小兵切火到英雄。
describe('小兵仇恨切换(B2)', () => {
  it('英雄攻击小兵 → 圈内友军小兵转火到英雄', () => {
    const w = createWorld(new GameMap(), { seed: 1, noBuildings: true, creeps: true, startTime: 0 });
    const hero = spawnHero(w, REIN, Team.Dawn, { x: 7000, y: 8000 });
    const victim = creep(w, Team.Night, 7100, 8000);
    // nearby:距 victim 480(<500 aggro 圈),距 hero 490 但自身 acquireRange 450(不会自行索敌到英雄)
    const nearby = creep(w, Team.Night, 7100, 8480, { acquireRange: 450 });

    // 未被攻击时:nearby 不会自行锁定英雄(英雄在其索敌范围外)
    for (let i = 0; i < 10; i++) w.step();
    expect(nearby.attackTargetId).not.toBe(hero.id);

    // 英雄攻击 victim → aggro 触发,nearby 切火到英雄
    hero.issueOrder({ type: 'attack', targetId: victim.id });
    let aggroed = false;
    for (let i = 0; i < 90 && !aggroed; i++) { w.step(); aggroed = nearby.attackTargetId === hero.id; }
    expect(nearby.attackTargetId).toBe(hero.id);
  });

  it('圈外友军小兵不被牵连', () => {
    const w = createWorld(new GameMap(), { seed: 1, noBuildings: true, creeps: true, startTime: 0 });
    const hero = spawnHero(w, REIN, Team.Dawn, { x: 7000, y: 8000 });
    const victim = creep(w, Team.Night, 7100, 8000);
    const far = creep(w, Team.Night, 7100, 8900, { acquireRange: 300 }); // 距 victim 900 > 500
    hero.issueOrder({ type: 'attack', targetId: victim.id });
    for (let i = 0; i < 60; i++) w.step();
    expect(far.attackTargetId).not.toBe(hero.id);
  });
});
