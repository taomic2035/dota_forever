/**
 * 地图内容完整性(商用级守卫):校验地图生成的结构与双方对称性——
 * 建筑/营地双方数量对称、主基地/泉水/塔齐备、三路有航点、神符/商店存在、坐标在界内、
 * 可走图既有可走也有阻挡。捕捉地图布局回归。
 */
import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { DAWN_BUILDINGS, LANE_WAYPOINTS, mirror } from '../src/data/mapLayout';

describe('地图内容完整性', () => {
  const map = new GameMap();
  const dawn = map.buildings.filter((b) => b.team === Team.Dawn);
  const night = map.buildings.filter((b) => b.team === Team.Night);

  it('双方建筑对称且齐备(主基地/泉水/塔)', () => {
    expect(dawn.length).toBeGreaterThan(0);
    expect(dawn.length).toBe(night.length);
    for (const side of [dawn, night]) {
      expect(side.some((b) => b.kind === 'ancient')).toBe(true);
      expect(side.some((b) => b.kind === 'fountain')).toBe(true);
      expect(side.filter((b) => b.kind.startsWith('tower')).length).toBeGreaterThanOrEqual(6);
    }
  });

  it('双方野怪营地数量对称', () => {
    const dCamps = map.camps.filter((c) => c.side === Team.Dawn).length;
    const nCamps = map.camps.filter((c) => c.side === Team.Night).length;
    expect(dCamps).toBeGreaterThan(0);
    expect(dCamps).toBe(nCamps);
  });

  it('三路均有航点,神符/商店存在', () => {
    expect(map.lanes.top.length).toBeGreaterThanOrEqual(2);
    expect(map.lanes.mid.length).toBeGreaterThanOrEqual(2);
    expect(map.lanes.bot.length).toBeGreaterThanOrEqual(2);
    expect(map.runeSpots.length).toBeGreaterThanOrEqual(2);
    expect(map.shops.length).toBeGreaterThanOrEqual(2);
  });

  it('树林口袋保留为视觉/雷达锚点,不能额外雕空整片树林拓扑', () => {
    expect(map.forestPockets.length).toBeGreaterThanOrEqual(8);
    for (const pocket of map.forestPockets) {
      const { cx, cy } = map.cellOf(pocket.pos);
      let nearTree = false;
      let sampled = 0;
      let walkable = 0;
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const x = cx + dx;
          const y = cy + dy;
          if (!map.inBounds(x, y)) continue;
          const center = map.cellCenter(x, y);
          if (dist(center, pocket.pos) > pocket.r) continue;
          sampled++;
          if (map.isWalkableCell(x, y)) walkable++;
          if (map.trees.has(map.cellIndex(x, y))) nearTree = true;
        }
      }
      expect(nearTree, `${pocket.id} near tree shadow`).toBe(true);
      expect(walkable / Math.max(1, sampled), `${pocket.id} carved walkable ratio`).toBeLessThan(0.78);
    }
  });

  it('野区高地点位保留为视觉/雷达锚点,但不写入真实高地高度以免拖垮 bot 推进', () => {
    expect(map.highgroundPlateaus.length).toBeGreaterThanOrEqual(4);
    for (const plateau of map.highgroundPlateaus) {
      expect(map.heightAt(plateau.pos), `${plateau.id} sim height`).toBe(1);
      expect(map.isWalkable(map.nearestWalkable(plateau.pos)), `${plateau.id} reachable surface`).toBe(true);
    }
  });

  it('基地外高地不会覆盖关键推进轴线,避免高地防守变成 bot 攻不下的堡垒', () => {
    const attackAxis = [
      ...LANE_WAYPOINTS.top,
      ...LANE_WAYPOINTS.mid,
      ...LANE_WAYPOINTS.bot,
      ...LANE_WAYPOINTS.top.map(mirror).reverse(),
    ];
    const targetBuildings = DAWN_BUILDINGS
      .filter((b) => b.kind !== 'fountain' && b.kind !== 'ancient')
      .flatMap((b) => [b.pos, mirror(b.pos)]);

    for (const plateau of map.highgroundPlateaus) {
      expect(plateau.r, `${plateau.id} radius`).toBeLessThanOrEqual(360);
      for (const pos of targetBuildings) {
        expect(dist(plateau.pos, pos), `${plateau.id} near building`).toBeGreaterThan(plateau.r + 900);
      }
      for (const pos of attackAxis) {
        expect(dist(plateau.pos, pos), `${plateau.id} near lane axis`).toBeGreaterThan(plateau.r + 520);
      }
    }
  });

  it('建筑坐标在界内', () => {
    for (const b of map.buildings) {
      expect(b.pos.x).toBeGreaterThanOrEqual(0);
      expect(b.pos.x).toBeLessThanOrEqual(map.W);
      expect(b.pos.y).toBeGreaterThanOrEqual(0);
      expect(b.pos.y).toBeLessThanOrEqual(map.W);
    }
  });

  it('可走图既有可走也有阻挡(非全通/全堵)', () => {
    let walk = 0, block = 0;
    for (let i = 0; i < map.walkable.length; i++) (map.walkable[i] ? walk++ : block++);
    expect(walk).toBeGreaterThan(0);
    expect(block).toBeGreaterThan(0);
  });
});

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
