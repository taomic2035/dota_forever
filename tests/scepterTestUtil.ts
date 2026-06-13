/** 神杖测试共享辅助(供各 batch 神杖测试复用,避免重复)。非 .test.ts,不被当作测试运行。 */
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { learnAbility } from '../src/sim/abilities';
import { makeItem } from '../src/sim/items';
import type { HeroDef } from '../src/data/heroes/types';
import type { UnitStats } from '../src/sim/unit';

export const map = new GameMap();
export type W = ReturnType<typeof createWorld>;
export const newWorld = () => createWorld(map, { seed: 141, noBuildings: true, startTime: 0 });

/** 生成已学大招(index 3)的英雄,可选携带神杖。 */
export function ultHero(w: W, def: HeroDef, pos: { x: number; y: number }, scepter = false) {
  const h = spawnHero(w, def, Team.Dawn, pos);
  h.level = 6; h.heroMeta!.skillPoints = 1; h.mp = 1000;
  learnAbility(w, h, 3);
  if (scepter) h.inventory[0] = makeItem('scepter');
  return h;
}

/** 高血量假人敌方英雄(承伤可比,默认 5000 当前血)。 */
export function enemyDummy(w: W, pos: { x: number; y: number }) {
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
