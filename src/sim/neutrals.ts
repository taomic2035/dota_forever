/**
 * 野区系统:0:30 首刷,此后每整分钟检查——营地区域无任何单位则重新刷新。
 * 野怪驻留:远离营地 800 即放弃追击走回家,到家满血重置。
 */
import { V } from '../core/vec2';
import { NEUTRAL_LEASH } from '../data/balance';
import { CAMP_ROSTERS, neutralStats } from '../data/neutrals';
import { Team, type PlacedCamp } from './map';
import type { World, WorldSystem } from './world';
import type { Unit } from './unit';

const CAMP_RADIUS = 420;
const FIRST_SPAWN = 30;

export function installNeutrals(w: World): void {
  let nextCheck = FIRST_SPAWN;

  const system: WorldSystem = (world) => {
    if (world.time >= nextCheck) {
      nextCheck = Math.floor(world.time / 60) * 60 + 60; // 下一个整分钟
      for (const camp of world.map.camps) trySpawnCamp(world, camp);
    }
    // 驻留检查(错峰)
    if (world.tick % 15 === 0) leashNeutrals(world);
  };
  w.systems.push(system);
}

function trySpawnCamp(w: World, camp: PlacedCamp): void {
  // 区域内有任何存活单位(野怪残部/英雄/兵)则不刷
  const occupied = w.queryRadius(camp.pos, CAMP_RADIUS, (u) => u.kind !== 'ward').length > 0;
  if (occupied) return;
  const roster = CAMP_ROSTERS[camp.tier];
  roster.forEach((spec, i) => {
    const jitter = { x: (i % 2) * 110 - 55, y: Math.floor(i / 2) * 110 - 55 };
    const u = w.spawnUnit({
      kind: 'neutral',
      team: Team.Neutral,
      pos: w.map.nearestWalkable(V.add(camp.pos, jitter)),
      name: spec.name,
      stats: neutralStats(spec),
    });
    u.campId = camp.id;
    u.homePos = V.clone(camp.pos);
  });
}

function leashNeutrals(w: World): void {
  for (const u of w.units.values()) {
    if (!u.alive || u.kind !== 'neutral' || !u.homePos) continue;
    const distHome = V.dist(u.pos, u.homePos);
    if (distHome > NEUTRAL_LEASH) {
      // 超出驻留范围:放弃追击、回营。用显式 leashing 标记(order 到点会被清空,不能作判据)。
      u.attackTargetId = 0;
      u.windupTargetId = 0;
      u.leashing = true;
      u.issueOrder({ type: 'move', pos: V.clone(u.homePos) });
    } else if (u.leashing && distHome < 150) {
      // 回到营地:满血重置并解除回营态(无论回程 move 指令是否已自然结束)。
      u.order = null;
      u.leashing = false;
      u.hp = u.calc.maxHp;
    }
  }
}
