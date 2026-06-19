/**
 * 前哨(Outpost):地图上 2 个对称中立据点(取双方秘密商店位——对称、可走,
 * 且 DotA 中前哨正处侧路旧商店区,主题贴切)。
 *
 * 机制:英雄持续站在范围内 OUTPOST_CAPTURE_TIME 秒(无敌方争夺)即占领;
 * 占领方此后每 OUTPOST_XP_INTERVAL 秒获得一次团队经验(随游戏时长递增)。
 * 敌方可再占。无人时维持现归属。
 *
 * 实现为「数据态」(非单位):不进 3D 渲染(可见结构留待 GPT 视觉轨),
 * 当前仅小地图标记 + 占领反馈。对称设计 → 平衡中性(batchsim 门控)。
 */
import { V, type Vec2 } from '../core/vec2';
import { Team, type GameMap } from './map';
import type { World, WorldSystem } from './world';
import { addXp } from './economy';

export const OUTPOST_CAPTURE_RADIUS = 350;
export const OUTPOST_CAPTURE_TIME = 6;
export const OUTPOST_XP_INTERVAL = 420; // 7 分钟
export const OUTPOST_XP_BASE = 120;
export const OUTPOST_XP_PER_MIN = 6;
export const OUTPOST_VISION = 700; // 占领方在前哨周围获得的视野半径(DotA 前哨提供视野)

export interface Outpost {
  pos: Vec2;
  team: Team; // 当前归属(初始 Neutral)
  progress: number; // 占领进度(秒)
  capturingTeam: Team; // 当前进度归属队(Neutral=无人争)
  lastXpAt: number; // 上次发团队经验的时刻
}

/** 占领方每次发放的团队经验(随游戏时长递增,呼应 DotA 的分钟递增)。 */
export function outpostXp(time: number): number {
  return OUTPOST_XP_BASE + Math.max(0, Math.floor(time / 60)) * OUTPOST_XP_PER_MIN;
}

/** 2 个前哨初始位置 = 双方秘密商店点(对称且可走)。 */
export function outpostSpots(map: GameMap): Vec2[] {
  return map.shops.filter((s) => s.secret).map((s) => V.clone(s.pos));
}

export function makeOutposts(map: GameMap): Outpost[] {
  return outpostSpots(map).map((pos) => ({
    pos,
    team: Team.Neutral,
    progress: 0,
    capturingTeam: Team.Neutral,
    lastXpAt: -Infinity,
  }));
}

/** 单步推进一个前哨的占领状态。导出供测试。 */
export function stepOutpostCapture(w: World, op: Outpost): void {
  const r2 = OUTPOST_CAPTURE_RADIUS * OUTPOST_CAPTURE_RADIUS;
  let dawn = 0;
  let night = 0;
  for (const u of w.units.values()) {
    if (!u.alive || !u.isHero()) continue;
    if (V.distSq(u.pos, op.pos) > r2) continue;
    if (u.team === Team.Dawn) dawn++;
    else if (u.team === Team.Night) night++;
  }
  const contested = dawn > 0 && night > 0;
  const sole = contested ? Team.Neutral : dawn > 0 ? Team.Dawn : night > 0 ? Team.Night : Team.Neutral;
  if (sole !== Team.Neutral && sole !== op.team) {
    if (op.capturingTeam !== sole) {
      op.capturingTeam = sole;
      op.progress = 0;
    }
    op.progress += w.dt;
    if (op.progress >= OUTPOST_CAPTURE_TIME) {
      op.team = sole;
      op.progress = 0;
      op.capturingTeam = Team.Neutral;
      op.lastXpAt = w.time; // 占领后从此刻起算经验间隔
      w.emit({ kind: 'outpost_captured', team: sole, pos: V.clone(op.pos) });
    }
  } else {
    op.progress = Math.max(0, op.progress - w.dt);
    if (op.progress === 0) op.capturingTeam = Team.Neutral;
  }
}

/** 到发放间隔则给占领方全体英雄发团队经验;返回是否发放。导出供测试。 */
export function stepOutpostXp(w: World, op: Outpost): boolean {
  if (op.team === Team.Neutral) return false;
  if (w.time - op.lastXpAt < OUTPOST_XP_INTERVAL) return false;
  op.lastXpAt = w.time;
  const xp = outpostXp(w.time);
  for (const u of w.units.values()) {
    if (u.alive && u.isHero() && u.team === op.team) addXp(w, u, xp);
  }
  return true;
}

export function installOutposts(w: World): void {
  w.outposts = makeOutposts(w.map);
  const system: WorldSystem = (world) => {
    for (const op of world.outposts) stepOutpostCapture(world, op);
    for (const op of world.outposts) stepOutpostXp(world, op);
  };
  w.systems.push(system);
}
