/**
 * 地图构建与空间查询。构建完全确定(固定种子),河道高度 0、平地 1、基地高台 2。
 * 高台边缘除坡道外不可走;树木为阻挡格。
 */
import { V, type Vec2 } from '../core/vec2';
import { Rng } from '../core/rng';
import {
  WORLD, CELL, GRID, mirror,
  DAWN_BUILDINGS, LANE_WAYPOINTS, DAWN_CAMPS, DAWN_SECRET_SHOP,
  RUNE_SPOTS, PIT_POS, PIT_MOUTH, BASE_L1, DAWN_RAMPS, RIVER_HALF_WIDTH,
  DAWN_JUNGLE_PATHS,
  type BuildingSpawn, type CampSpawn, type Lane, type RampZone,
} from '../data/mapLayout';

export enum Team { Dawn = 0, Night = 1, Neutral = 2 }

export interface PlacedBuilding extends BuildingSpawn { team: Team }
export interface PlacedCamp extends CampSpawn { side: Team; id: number }
export interface ShopZone { team: Team; secret: boolean; pos: Vec2; range: number }

const MAP_SEED = 0xd07a;

export class GameMap {
  readonly W = WORLD;
  readonly CELL = CELL;
  readonly GW = GRID;
  readonly GH = GRID;
  /** 1 可走 0 阻挡 */
  walkable: Uint8Array;
  /** 0 河道 1 平地 2 高台 */
  height: Uint8Array;
  /** 树格(渲染用) */
  trees: Set<number>;
  buildings: PlacedBuilding[] = [];
  camps: PlacedCamp[] = [];
  lanes: Record<Lane, Vec2[]>;
  runeSpots: Vec2[] = RUNE_SPOTS.map(V.clone);
  pitPos: Vec2 = V.clone(PIT_POS);
  shops: ShopZone[] = [];

  constructor() {
    const n = this.GW * this.GH;
    this.walkable = new Uint8Array(n).fill(1);
    this.height = new Uint8Array(n).fill(1);
    this.trees = new Set();

    const botLane = LANE_WAYPOINTS.top.map(mirror).reverse();
    this.lanes = {
      top: LANE_WAYPOINTS.top.map(V.clone),
      mid: LANE_WAYPOINTS.mid.map(V.clone),
      bot: botLane,
    };

    this.build();
  }

  // ---------- 坐标 ----------
  cellIndex(cx: number, cy: number): number {
    return cy * this.GW + cx;
  }
  cellOf(p: Vec2): { cx: number; cy: number } {
    return {
      cx: Math.min(this.GW - 1, Math.max(0, Math.floor(p.x / CELL))),
      cy: Math.min(this.GH - 1, Math.max(0, Math.floor(p.y / CELL))),
    };
  }
  cellCenter(cx: number, cy: number): Vec2 {
    return { x: (cx + 0.5) * CELL, y: (cy + 0.5) * CELL };
  }
  inBounds(cx: number, cy: number): boolean {
    return cx >= 0 && cy >= 0 && cx < this.GW && cy < this.GH;
  }
  isWalkable(p: Vec2): boolean {
    const { cx, cy } = this.cellOf(p);
    return this.walkable[this.cellIndex(cx, cy)] === 1;
  }
  isWalkableCell(cx: number, cy: number): boolean {
    return this.inBounds(cx, cy) && this.walkable[this.cellIndex(cx, cy)] === 1;
  }
  heightAt(p: Vec2): number {
    const { cx, cy } = this.cellOf(p);
    return this.height[this.cellIndex(cx, cy)];
  }

  /** 找最近可走点(螺旋搜索)。 */
  nearestWalkable(p: Vec2): Vec2 {
    if (this.isWalkable(p)) return p;
    const { cx, cy } = this.cellOf(p);
    for (let r = 1; r < 30; r++) {
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          if (this.isWalkableCell(cx + dx, cy + dy)) return this.cellCenter(cx + dx, cy + dy);
        }
    }
    return p;
  }

  // ---------- 构建 ----------
  private build() {
    this.carveTerrain();
    this.placeTreesAndPaths();
    this.applyCliffs();
    this.placeStructures();
  }

  /** L1 距离:到晨曦角 (0,W) 或永夜角 (W,0)。 */
  private baseDist(p: Vec2, team: Team): number {
    return team === Team.Dawn ? p.x + (WORLD - p.y) : WORLD - p.x + p.y;
  }

  private carveTerrain() {
    for (let cy = 0; cy < this.GH; cy++) {
      for (let cx = 0; cx < this.GW; cx++) {
        const i = this.cellIndex(cx, cy);
        const p = this.cellCenter(cx, cy);
        // 边界悬崖
        if (cx < 2 || cy < 2 || cx >= this.GW - 2 || cy >= this.GH - 2) {
          this.walkable[i] = 0;
          continue;
        }
        // 河道(主对角线带)
        if (Math.abs(p.y - p.x) < RIVER_HALF_WIDTH) this.height[i] = 0;
        // 基地高台
        if (this.baseDist(p, Team.Dawn) <= BASE_L1 || this.baseDist(p, Team.Night) <= BASE_L1) {
          this.height[i] = 2;
        }
      }
    }
  }

  private ramps(): RampZone[] {
    return [...DAWN_RAMPS, ...DAWN_RAMPS.map((r) => ({ pos: mirror(r.pos), r: r.r }))];
  }

  private inRamp(p: Vec2): boolean {
    return this.ramps().some((rz) => V.dist(p, rz.pos) <= rz.r);
  }

  private placeTreesAndPaths() {
    const rng = new Rng(MAP_SEED);
    const laneClear = 480; // 兵线走廊半宽
    const allLanes = [...this.lanes.top, ...this.lanes.mid, ...this.lanes.bot];

    const nearPolyline = (p: Vec2, pts: Vec2[], dist: number): boolean => {
      for (let k = 0; k < pts.length - 1; k++) {
        if (segDist(p, pts[k], pts[k + 1]) < dist) return true;
      }
      return false;
    };

    for (let cy = 2; cy < this.GH - 2; cy++) {
      for (let cx = 2; cx < this.GW - 2; cx++) {
        const i = this.cellIndex(cx, cy);
        if (this.height[i] !== 1) continue; // 只在平地种树
        const p = this.cellCenter(cx, cy);
        // 河道边留岸
        if (Math.abs(p.y - p.x) < RIVER_HALF_WIDTH + 360) continue;
        // 基地与坡道边留空
        if (this.baseDist(p, Team.Dawn) <= BASE_L1 + 700 || this.baseDist(p, Team.Night) <= BASE_L1 + 700) continue;
        // 兵线走廊
        if (
          nearPolyline(p, this.lanes.top, laneClear) ||
          nearPolyline(p, this.lanes.mid, laneClear) ||
          nearPolyline(p, this.lanes.bot, laneClear)
        ) continue;
        // 顺手留出 waypoint 周边
        if (allLanes.some((w) => V.dist(p, w) < laneClear)) continue;
        // 密林带随机孔隙
        if (rng.next() < 0.82) {
          this.trees.add(i);
          this.walkable[i] = 0;
        }
      }
    }

    // 雕刻野区走廊与功能区
    const carve = (center: Vec2, r: number) => {
      const { cx, cy } = this.cellOf(center);
      const cells = Math.ceil(r / CELL);
      for (let dy = -cells; dy <= cells; dy++)
        for (let dx = -cells; dx <= cells; dx++) {
          const x = cx + dx, y = cy + dy;
          if (!this.inBounds(x, y)) continue;
          if (V.dist(this.cellCenter(x, y), center) > r) continue;
          const i = this.cellIndex(x, y);
          if (this.height[i] === 1 || this.height[i] === 0) {
            this.trees.delete(i);
            if (x >= 2 && y >= 2 && x < this.GW - 2 && y < this.GH - 2) this.walkable[i] = 1;
          }
        }
    };
    const carvePath = (pts: Vec2[], halfWidth: number) => {
      for (let k = 0; k < pts.length - 1; k++) {
        const a = pts[k], b = pts[k + 1];
        const steps = Math.ceil(V.dist(a, b) / (CELL / 2));
        for (let s = 0; s <= steps; s++) carve(V.lerp(a, b, s / steps), halfWidth);
      }
    };

    const paths = [...DAWN_JUNGLE_PATHS, ...DAWN_JUNGLE_PATHS.map((pl) => pl.map(mirror))];
    for (const pl of paths) carvePath(pl, 170);

    // 营地空地
    for (const c of DAWN_CAMPS) {
      carve(c.pos, 400);
      carve(mirror(c.pos), 400);
    }
    // 秘密商店空地
    carve(DAWN_SECRET_SHOP, 320);
    carve(mirror(DAWN_SECRET_SHOP), 320);
    // Boss 巢穴:洞窟空地 + 洞口
    carve(PIT_POS, 430);
    carvePath([PIT_POS, PIT_MOUTH], 180);
    // 符文点周边
    for (const r of RUNE_SPOTS) carve(r, 250);
  }

  /** 高台(2)与低处交界为悬崖:高台边缘格不可走,坡道豁免。 */
  private applyCliffs() {
    const toBlock: number[] = [];
    for (let cy = 1; cy < this.GH - 1; cy++) {
      for (let cx = 1; cx < this.GW - 1; cx++) {
        const i = this.cellIndex(cx, cy);
        if (this.height[i] !== 2) continue;
        const p = this.cellCenter(cx, cy);
        if (this.inRamp(p)) continue;
        let edge = false;
        for (let dy = -1; dy <= 1 && !edge; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (this.height[this.cellIndex(cx + dx, cy + dy)] < 2) { edge = true; break; }
          }
        if (edge) toBlock.push(i);
      }
    }
    for (const i of toBlock) this.walkable[i] = 0;
  }

  private placeStructures() {
    for (const b of DAWN_BUILDINGS) {
      this.buildings.push({ ...b, pos: V.clone(b.pos), team: Team.Dawn });
      const flipLane: Record<string, Lane> = { top: 'bot', mid: 'mid', bot: 'top' };
      this.buildings.push({
        kind: b.kind,
        lane: b.lane ? flipLane[b.lane] : undefined,
        pos: mirror(b.pos),
        team: Team.Night,
      });
    }
    let campId = 1;
    for (const c of DAWN_CAMPS) {
      this.camps.push({ ...c, pos: V.clone(c.pos), side: Team.Dawn, id: campId++ });
      this.camps.push({ ...c, pos: mirror(c.pos), side: Team.Night, id: campId++ });
    }
    const dawnFountain = DAWN_BUILDINGS.find((b) => b.kind === 'fountain')!.pos;
    this.shops = [
      { team: Team.Dawn, secret: false, pos: V.clone(dawnFountain), range: 900 },
      { team: Team.Night, secret: false, pos: mirror(dawnFountain), range: 900 },
      { team: Team.Dawn, secret: true, pos: V.clone(DAWN_SECRET_SHOP), range: 450 },
      { team: Team.Night, secret: true, pos: mirror(DAWN_SECRET_SHOP), range: 450 },
    ];
    // 建筑脚下不可走(以建筑半径占格)
    for (const b of this.buildings) {
      const r = b.kind === 'ancient' ? 150 : b.kind === 'fountain' ? 120 : b.kind.startsWith('rax') ? 110 : 80;
      const { cx, cy } = this.cellOf(b.pos);
      const cells = Math.ceil(r / CELL);
      for (let dy = -cells; dy <= cells; dy++)
        for (let dx = -cells; dx <= cells; dx++) {
          if (!this.inBounds(cx + dx, cy + dy)) continue;
          if (V.dist(this.cellCenter(cx + dx, cy + dy), b.pos) <= r) {
            this.walkable[this.cellIndex(cx + dx, cy + dy)] = 0;
          }
        }
    }
  }
}

/** 点到线段距离。 */
export function segDist(p: Vec2, a: Vec2, b: Vec2): number {
  const abx = b.x - a.x, aby = b.y - a.y;
  const l2 = abx * abx + aby * aby;
  if (l2 === 0) return V.dist(p, a);
  let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / l2;
  t = Math.max(0, Math.min(1, t));
  return V.dist(p, { x: a.x + abx * t, y: a.y + aby * t });
}
