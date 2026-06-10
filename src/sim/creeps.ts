/**
 * 兵线系统:定时出兵、沿路 attackmove、兵营状态决定超级/精英兵、远离兵线自动归队。
 */
import { V, type Vec2 } from '../core/vec2';
import {
  FIRST_WAVE_TIME, WAVE_INTERVAL, MELEE_PER_WAVE, RANGED_PER_WAVE,
  SIEGE_EVERY_N_WAVES, CREEP_UPGRADE_INTERVAL,
} from '../data/balance';
import { creepStats, CREEP_NAME, SUPER_PREFIX, type CreepRole, type SuperTier } from '../data/creeps';
import type { Lane } from '../data/mapLayout';
import { Team } from './map';
import type { World, WorldSystem } from './world';
import type { Unit } from './unit';

const LANES: Lane[] = ['top', 'mid', 'bot'];

export function installCreeps(w: World): void {
  let nextWaveTime = FIRST_WAVE_TIME;
  let waveNumber = 0;

  const system: WorldSystem = (world) => {
    if (world.time >= nextWaveTime) {
      waveNumber++;
      nextWaveTime += WAVE_INTERVAL;
      for (const team of [Team.Dawn, Team.Night]) {
        for (const lane of LANES) {
          spawnWave(world, team, lane, waveNumber);
        }
      }
    }
    // 归队检查(防止被风筝出走廊太远),错峰执行
    if (world.tick % 30 === 0) leashCheck(world);
  };
  // 在 ordersSystem 之前插入(setup 已保证 recalc 在最前)
  w.systems.splice(1, 0, system);
}

function laneWaypointsFor(w: World, team: Team, lane: Lane): Vec2[] {
  const wps = w.map.lanes[lane];
  return team === Team.Dawn ? wps : [...wps].reverse();
}

/** 兵营状态 → 本队该路兵种的超级等级。 */
export function superTierFor(w: World, team: Team, lane: Lane, role: CreepRole): SuperTier {
  const enemy = team === Team.Dawn ? Team.Night : Team.Dawn;
  let enemyRaxAlive = 0;
  let laneRaxDead = false;
  for (const u of w.units.values()) {
    if (u.team !== enemy || !u.buildingKind?.startsWith('rax')) continue;
    if (u.alive) enemyRaxAlive++;
    const matchKind = role === 'melee' ? 'rax_melee' : 'rax_ranged';
    if (u.lane === lane && u.buildingKind === matchKind && !u.alive) laneRaxDead = true;
  }
  if (enemyRaxAlive === 0) return 2; // 六营全破 → 精英
  return laneRaxDead ? 1 : 0;
}

function spawnWave(w: World, team: Team, lane: Lane, waveNumber: number): void {
  const wps = laneWaypointsFor(w, team, lane);
  const spawnBase = wps[0];
  const upgrades = Math.floor(Math.max(0, w.time) / CREEP_UPGRADE_INTERVAL);

  const roster: CreepRole[] = [];
  for (let i = 0; i < MELEE_PER_WAVE; i++) roster.push('melee');
  for (let i = 0; i < RANGED_PER_WAVE; i++) roster.push('ranged');
  if (waveNumber % SIEGE_EVERY_N_WAVES === 0) roster.push('siege');

  roster.forEach((role, idx) => {
    const tier = role === 'siege' ? superTierFor(w, team, lane, 'ranged') : superTierFor(w, team, lane, role);
    const jitter = { x: (idx % 3) * 70 - 70, y: Math.floor(idx / 3) * 70 - 35 };
    const pos = w.map.nearestWalkable(V.add(spawnBase, jitter));
    const u = w.spawnUnit({
      kind: 'creep',
      team,
      pos,
      name: `${SUPER_PREFIX[tier]}${CREEP_NAME[role][team === Team.Dawn ? 0 : 1]}`,
      stats: creepStats(role, upgrades, tier),
    });
    u.lane = lane;
    sendAlongLane(w, u, wps, 1);
  });
}

/** 下发沿路 attackmove 指令链。 */
function sendAlongLane(w: World, u: Unit, wps: Vec2[], fromIndex: number): void {
  const enemyAncient = [...w.units.values()].find(
    (b) => b.buildingKind === 'ancient' && b.team !== u.team,
  );
  u.order = { type: 'attackmove', pos: V.clone(wps[Math.min(fromIndex, wps.length - 1)]) };
  u.orderQueue = wps.slice(fromIndex + 1).map((p) => ({ type: 'attackmove' as const, pos: V.clone(p) }));
  if (enemyAncient) u.orderQueue.push({ type: 'attackmove', pos: V.clone(enemyAncient.pos) });
}

/** 离自己兵线走廊过远的兵,放弃当前目标重新归队。 */
function leashCheck(w: World): void {
  for (const u of w.units.values()) {
    if (!u.alive || u.kind !== 'creep' || !u.lane) continue;
    const wps = w.map.lanes[u.lane];
    let minD = Infinity;
    let nearestIdx = 0;
    for (let i = 0; i < wps.length - 1; i++) {
      const d = segDistPoint(u.pos, wps[i], wps[i + 1]);
      if (d < minD) {
        minD = d;
        nearestIdx = i;
      }
    }
    if (minD > 1200) {
      const laneWps = laneWaypointsFor(w, u.team, u.lane);
      // 找到行进方向上最近的 waypoint 继续走
      let bestIdx = laneWps.length - 1;
      let bestD = Infinity;
      for (let i = 0; i < laneWps.length; i++) {
        const d = V.dist(u.pos, laneWps[i]);
        if (d < bestD) {
          bestD = d;
          bestIdx = i;
        }
      }
      u.attackTargetId = 0;
      sendAlongLane(w, u, laneWps, Math.min(bestIdx + (u.team === Team.Dawn ? 1 : 1), laneWps.length - 1));
    }
  }
}

function segDistPoint(p: Vec2, a: Vec2, b: Vec2): number {
  const abx = b.x - a.x, aby = b.y - a.y;
  const l2 = abx * abx + aby * aby;
  if (l2 === 0) return V.dist(p, a);
  let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / l2;
  t = Math.max(0, Math.min(1, t));
  return V.dist(p, { x: a.x + abx * t, y: a.y + aby * t });
}
