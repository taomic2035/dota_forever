/**
 * 兵线系统:定时出兵、沿路 attackmove、兵营状态决定超级/精英兵、远离兵线自动归队。
 */
import { V, type Vec2 } from '../core/vec2';
import {
  FIRST_WAVE_TIME, WAVE_INTERVAL, MELEE_PER_WAVE, RANGED_PER_WAVE,
  SIEGE_EVERY_N_WAVES, CREEP_UPGRADE_INTERVAL, CREEP_AGGRO_RANGE,
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
  // 世界若在某波次边界之后起盘(测试常 mid-start),跳过已过边界:不一次性爆发补刷,
  // 同时推进波号使攻城/超级兵/升级的「每 N 波」相位 = f(绝对时间),与真实对局(起 -75)一致。
  while (nextWaveTime < w.time) {
    nextWaveTime += WAVE_INTERVAL;
    waveNumber++;
  }

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
  // aggro 必须在 ordersSystem 之后运行,才能读到本帧 emit 的 attack_launched
  w.systems.push(creepAggro);
}

function laneWaypointsFor(w: World, team: Team, lane: Lane): Vec2[] {
  const wps = w.map.lanes[lane];
  return team === Team.Dawn ? wps : [...wps].reverse();
}

/** 兵营状态 → 本队该路兵种的超级等级。 */
export function superTierFor(w: World, team: Team, lane: Lane, role: CreepRole): SuperTier {
  const enemy = team === Team.Dawn ? Team.Night : Team.Dawn;
  let meleeRaxDead = false, rangedRaxDead = false;
  for (const u of w.units.values()) {
    if (u.team !== enemy || u.lane !== lane || !u.buildingKind?.startsWith('rax')) continue;
    if (u.buildingKind === 'rax_melee' && !u.alive) meleeRaxDead = true;
    if (u.buildingKind === 'rax_ranged' && !u.alive) rangedRaxDead = true;
  }
  // 该路两座兵营(近战+远程)皆破 → 精英兵(mega);仅对应兵种营破 → 超级兵(经典 DotA1 按路升级)
  if (meleeRaxDead && rangedRaxDead) return 2;
  const matchDead = role === 'melee' ? meleeRaxDead : rangedRaxDead;
  return matchDead ? 1 : 0;
}

function spawnWave(w: World, team: Team, lane: Lane, waveNumber: number): void {
  const wps = laneWaypointsFor(w, team, lane);
  const spawnBase = wps[0];
  const upgrades = Math.floor(Math.max(0, w.time) / CREEP_UPGRADE_INTERVAL);

  const meleeTier = superTierFor(w, team, lane, 'melee');
  const rangedTier = superTierFor(w, team, lane, 'ranged');

  const roster: CreepRole[] = [];
  for (let i = 0; i < MELEE_PER_WAVE; i++) roster.push('melee');
  for (let i = 0; i < RANGED_PER_WAVE; i++) roster.push('ranged');
  // 攻城车:每 SIEGE_EVERY_N_WAVES 波;该路一旦有兵营被破(超级/精英兵)则每波必出(经典 DotA1)
  if (waveNumber % SIEGE_EVERY_N_WAVES === 0 || meleeTier >= 1 || rangedTier >= 1) roster.push('siege');

  roster.forEach((role, idx) => {
    const tier = role === 'melee' ? meleeTier : rangedTier; // siege 随远程兵种等级
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

/**
 * 小兵仇恨(creep aggro):敌方英雄攻击小兵时,以被攻击小兵为中心 CREEP_AGGRO_RANGE
 * 内的同队小兵立即切火到该英雄(经典兵线机制)。combat 的 attackmove 逻辑会让它们
 * 追打至英雄脱离 acquireRange×1.7 后自然恢复兵线推进。读上一帧的 attack_launched 事件。
 */
function creepAggro(w: World): void {
  const r2 = CREEP_AGGRO_RANGE * CREEP_AGGRO_RANGE;
  for (const e of w.events) {
    if (e.kind !== 'attack_launched') continue;
    const attacker = w.getUnit(e.unitId);
    if (!attacker || !attacker.isHero()) continue;
    const victim = w.getUnit(e.targetId);
    if (!victim || victim.kind !== 'creep' || victim.team === attacker.team) continue;
    for (const c of w.units.values()) {
      if (c.kind !== 'creep' || !c.alive || c.team !== victim.team) continue;
      if (V.distSq(c.pos, victim.pos) > r2) continue;
      c.attackTargetId = attacker.id;
    }
  }
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
