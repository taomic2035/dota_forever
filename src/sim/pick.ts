/**
 * 左键选取:返回点击点附近最近的可见单位(英雄优先,与 DotA 选取优先级一致)。
 * 纯查询,无副作用;受战争迷雾约束——viewerTeam 看不见的单位不可选。
 * viewerTeam=null 表示全图可见(观战/测试)。
 */
import type { Vec2 } from '../core/vec2';
import type { World } from './world';
import type { Unit } from './unit';
import { Team } from './map';
import { isVisibleTo } from './vision';

/** 统一的世界选取容差(右键攻击/左键选中/悬停高亮共用,使悬停红圈准确预测右键目标)。3D 俯视点击模型→地面投影有偏移,取较宽松值。 */
export const PICK_RADIUS = 110;

export function pickUnitAt(
  world: World,
  viewerTeam: Team | null,
  point: Vec2,
  radius = PICK_RADIUS,
): Unit | null {
  const cands = world.queryRadius(
    point,
    radius,
    (u) => u.alive && (viewerTeam === null || isVisibleTo(world, viewerTeam, u)),
  );
  if (cands.length === 0) return null;
  // 英雄优先:有英雄落在容差内时只在英雄中取最近,避免重叠的小兵抢点。
  const heroes = cands.filter((u) => u.kind === 'hero');
  const pool = heroes.length > 0 ? heroes : cands;
  let best = pool[0];
  let bestD = (best.pos.x - point.x) ** 2 + (best.pos.y - point.y) ** 2;
  for (let i = 1; i < pool.length; i++) {
    const d = (pool[i].pos.x - point.x) ** 2 + (pool[i].pos.y - point.y) ** 2;
    if (d < bestD) {
      best = pool[i];
      bestD = d;
    }
  }
  return best;
}
