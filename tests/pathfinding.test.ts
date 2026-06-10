import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { findPath, lineWalkable } from '../src/sim/pathfinding';
import { V } from '../src/core/vec2';

const map = new GameMap();
const dawnFountain = map.buildings.find((b) => b.team === Team.Dawn && b.kind === 'fountain')!.pos;
const nightFountain = map.buildings.find((b) => b.team === Team.Night && b.kind === 'fountain')!.pos;

describe('findPath', () => {
  it('open field path is nearly straight (few points)', () => {
    const p = findPath(map, { x: 7000, y: 8000 }, { x: 8000, y: 7000 });
    expect(p.length).toBeLessThanOrEqual(3);
    expect(V.dist(p[p.length - 1], { x: 8000, y: 7000 })).toBeLessThan(96);
  });
  it('base to base path exists and ends near goal', () => {
    const p = findPath(map, dawnFountain, nightFountain);
    expect(p.length).toBeGreaterThan(2);
    expect(V.dist(p[p.length - 1], map.nearestWalkable(nightFountain))).toBeLessThan(96);
    // 每段都可走
    for (let i = 0; i < p.length - 1; i++) {
      expect(lineWalkable(map, p[i], p[i + 1]), `segment ${i}`).toBe(true);
    }
  });
  it('routes around forest (path bends)', () => {
    // 晨曦野区两点间隔着树林
    const from = { x: 7800, y: 12200 };
    const to = { x: 11600, y: 10400 };
    const p = findPath(map, from, to);
    expect(p.length).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < p.length - 1; i++) {
      expect(lineWalkable(map, p[i], p[i + 1])).toBe(true);
    }
  });
  it('deterministic', () => {
    const a = findPath(map, dawnFountain, { x: 7520, y: 7520 });
    const b = findPath(map, dawnFountain, { x: 7520, y: 7520 });
    expect(a).toEqual(b);
  });
  it('unreachable target degrades to nearest approach (no crash)', () => {
    // 地图边界外
    const p = findPath(map, dawnFountain, { x: 14990, y: 14990 });
    expect(p.length).toBeGreaterThan(0);
  });
});
