/**
 * 视野系统:每队视野格(0.25s 重算)。
 * 规则:圆形视野 + 高度遮断(看不见比自己高的格)+ 昼夜半径 + 真视。
 */
import { V, type Vec2 } from '../core/vec2';
import type { World, WorldSystem } from './world';
import type { Unit } from './unit';
import { Team } from './map';
import { stateOf, setVisibilityCheck } from './combat';

export interface VisionData {
  /** [Dawn, Night] 每格 0/1 */
  grids: [Uint8Array, Uint8Array];
  /** 已探索(灰雾) */
  explored: [Uint8Array, Uint8Array];
  /** 真视源:[team][{pos, r}] */
  trueSight: [Array<{ pos: Vec2; r: number }>, Array<{ pos: Vec2; r: number }>];
}

const RECALC_TICKS = 8;

export function installVision(w: World): void {
  const n = w.map.GW * w.map.GH;
  w.vision = {
    grids: [new Uint8Array(n), new Uint8Array(n)],
    explored: [new Uint8Array(n), new Uint8Array(n)],
    trueSight: [[], []],
  };
  const system: WorldSystem = (world) => {
    if (world.tick % RECALC_TICKS !== 0) return;
    recomputeVision(world);
  };
  w.systems.push(system);
  recomputeVision(w);
}

function recomputeVision(w: World): void {
  const vis = w.vision!;
  const map = w.map;
  vis.grids[0].fill(0);
  vis.grids[1].fill(0);
  vis.trueSight[0].length = 0;
  vis.trueSight[1].length = 0;

  for (const u of w.units.values()) {
    if (!u.alive || u.team === Team.Neutral) continue;
    const team = u.team as 0 | 1;
    const radius = w.isNight ? u.calc.visionNight : u.calc.visionDay;
    const grid = vis.grids[team];
    const explored = vis.explored[team];
    const uh = map.heightAt(u.pos);
    const { cx, cy } = map.cellOf(u.pos);
    const cellR = Math.ceil(radius / map.CELL);
    const r2 = radius * radius;
    for (let dy = -cellR; dy <= cellR; dy++) {
      const y = cy + dy;
      if (y < 0 || y >= map.GH) continue;
      for (let dx = -cellR; dx <= cellR; dx++) {
        const x = cx + dx;
        if (x < 0 || x >= map.GW) continue;
        const cc = map.cellCenter(x, y);
        if (V.distSq(u.pos, cc) > r2) continue;
        const i = y * map.GW + x;
        // 高度遮断:看不见比自己高的格
        if (map.height[i] > uh) continue;
        grid[i] = 1;
        explored[i] = 1;
      }
    }
    if (u.calc.trueSight > 0) {
      vis.trueSight[team].push({ pos: V.clone(u.pos), r: u.calc.trueSight });
    }
  }
}

export function cellVisible(w: World, team: Team, pos: Vec2): boolean {
  if (team === Team.Neutral || !w.vision) return true;
  const { cx, cy } = w.map.cellOf(pos);
  return w.vision.grids[team as 0 | 1][cy * w.map.GW + cx] === 1;
}

setVisibilityCheck((w, viewerTeam, unit) => isVisibleTo(w, viewerTeam as Team, unit));

/** unit 对 viewerTeam 是否可见(含隐身/真视)。 */
export function isVisibleTo(w: World, viewerTeam: Team, unit: Unit): boolean {
  if (unit.team === viewerTeam) return true;
  if (!w.vision) return true;
  if (!cellVisible(w, viewerTeam, unit.pos)) return false;
  if (stateOf(unit).invisible) {
    // 显影之尘标记直接可见
    if (unit.modifiers.some((m) => m.key === 'item_dusted')) return true;
    for (const ts of w.vision.trueSight[viewerTeam as 0 | 1]) {
      if (V.dist(ts.pos, unit.pos) <= ts.r) return true;
    }
    return false;
  }
  return true;
}
