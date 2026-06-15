/**
 * 战争迷雾的 RGBA 写入:2D 位图(FogRenderer)与 3D 地面纱罩(Fog3D)共用同一三档逻辑,
 * 杜绝两个渲染器的迷雾语义漂移。
 *
 * 三档透明度(暗色 RGB + alpha):可见=透明、已探索=半暗、未探索=近不透明。
 */
import type { World } from '../sim/world';
import type { Team } from '../sim/map';

export const FOG_RGB: readonly [number, number, number] = [4, 6, 3];
export const FOG_ALPHA_VISIBLE = 0;
export const FOG_ALPHA_EXPLORED = 150;
export const FOG_ALPHA_UNSEEN = 235;

/**
 * 按观察者队伍把 vision 网格写入 out(RGBA,长度需 = grid.length*4)。
 * 无 vision 数据返回 false(out 不变)。
 */
export function writeFogRGBA(
  world: Pick<World, 'vision'>,
  team: Team,
  out: Uint8ClampedArray | Uint8Array,
): boolean {
  const vision = world.vision;
  if (!vision) return false;
  const grid = vision.grids[team as 0 | 1];
  const explored = vision.explored[team as 0 | 1];
  for (let i = 0; i < grid.length; i++) {
    const o = i * 4;
    out[o] = FOG_RGB[0];
    out[o + 1] = FOG_RGB[1];
    out[o + 2] = FOG_RGB[2];
    out[o + 3] = grid[i] ? FOG_ALPHA_VISIBLE : explored[i] ? FOG_ALPHA_EXPLORED : FOG_ALPHA_UNSEEN;
  }
  return true;
}
