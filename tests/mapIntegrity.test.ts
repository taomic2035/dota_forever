/**
 * 地图内容完整性(商用级守卫):校验地图生成的结构与双方对称性——
 * 建筑/营地双方数量对称、主基地/泉水/塔齐备、三路有航点、神符/商店存在、坐标在界内、
 * 可走图既有可走也有阻挡。捕捉地图布局回归。
 */
import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';

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
