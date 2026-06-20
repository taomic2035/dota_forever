import { describe, expect, it } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { DAWN_RAMPS, DAWN_SIDE_SHOP, PIT_POS, RUNE_SPOTS, mirror } from '../src/data/mapLayout';
import { landmarkVisuals, terrainVisualAt } from '../src/render/mapReadability';

const map = new GameMap();

function visualAtWorld(x: number, y: number) {
  const { cx, cy } = map.cellOf({ x, y });
  return terrainVisualAt(map, cx, cy);
}

describe('map readability terrain classification', () => {
  it('classifies the river center as river terrain', () => {
    const visual = visualAtWorld(7520, 7520);

    expect(visual.kind).toBe('river');
    expect(visual.height).toBe(0);
    expect(visual.palette.base).toMatch(/^#/);
  });

  it('classifies base high ground separately from normal ground', () => {
    const visual = visualAtWorld(1150, 13890);

    expect(visual.kind).toBe('base');
    expect(visual.height).toBe(2);
  });

  it('classifies ramp mouths as ramp terrain', () => {
    const ramp = map.nearestWalkable(DAWN_RAMPS[0].pos);
    const visual = visualAtWorld(ramp.x, ramp.y);

    expect(visual.kind).toBe('ramp');
    expect(visual.walkable).toBe(true);
  });

  it('classifies tree cells as blocking tree walls', () => {
    const treeIndex = [...map.trees][0];
    const cx = treeIndex % map.GW;
    const cy = Math.floor(treeIndex / map.GW);
    const visual = terrainVisualAt(map, cx, cy);

    expect(visual.kind).toBe('treeWall');
    expect(visual.blocksPath).toBe(true);
  });

  it('marks walkable cells beside tree walls as forest shadow zones', () => {
    const treeIndex = [...map.trees][0];
    const tx = treeIndex % map.GW;
    const ty = Math.floor(treeIndex / map.GW);
    let found: ReturnType<typeof terrainVisualAt> | undefined;
    for (let dy = -2; dy <= 2 && !found; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const cx = tx + dx;
        const cy = ty + dy;
        if (!map.inBounds(cx, cy) || !map.isWalkableCell(cx, cy)) continue;
        const visual = terrainVisualAt(map, cx, cy);
        if (visual.tags.includes('treeShadow')) {
          found = visual;
          break;
        }
      }
    }

    expect(found?.walkable).toBe(true);
    expect(found?.blocksPath).toBe(false);
    expect(found?.tags).toContain('forestVisionPocket');
  });

  it('keeps lane cells readable as lane ground', () => {
    const lanePoint = map.lanes.mid[2];
    const visual = visualAtWorld(lanePoint.x, lanePoint.y);

    expect(visual.kind).toBe('lane');
    expect(visual.tags).toContain('lane');
  });

  it('marks low/high terrain edges as vision break cliffs', () => {
    let found: ReturnType<typeof terrainVisualAt> | undefined;
    for (let cy = 1; cy < map.GH - 1 && !found; cy++) {
      for (let cx = 1; cx < map.GW - 1; cx++) {
        const visual = terrainVisualAt(map, cx, cy);
        if (visual.tags.includes('lowHighVisionBreak')) {
          found = visual;
          break;
        }
      }
    }

    expect(found?.edge).toBe(true);
    expect(found?.tags).toContain('highGroundMiss');
  });
});

describe('map readability landmark classification', () => {
  it('includes mirrored secret shops, pit, runes, and neutral camps', () => {
    const landmarks = landmarkVisuals(map);

    expect(landmarks.filter((l) => l.kind === 'secretShop')).toHaveLength(2);
    expect(landmarks.filter((l) => l.kind === 'sideShop')).toHaveLength(2);
    expect(landmarks.filter((l) => l.kind === 'pit')).toHaveLength(1);
    expect(landmarks.filter((l) => l.kind === 'rune')).toHaveLength(RUNE_SPOTS.length);
    expect(landmarks.filter((l) => l.kind === 'camp')).toHaveLength(map.camps.length);
    expect(landmarks.filter((l) => l.kind === 'forestPocket')).toHaveLength(map.forestPockets.length);
    expect(landmarks.filter((l) => l.kind === 'highgroundPlateau')).toHaveLength(map.highgroundPlateaus.length);
    expect(landmarks.some((l) => l.kind === 'pit' && l.pos.x === PIT_POS.x && l.pos.y === PIT_POS.y)).toBe(true);
  });

  it('preserves team ownership for side landmarks', () => {
    const landmarks = landmarkVisuals(map);

    expect(landmarks).toContainEqual({ kind: 'sideShop', pos: DAWN_SIDE_SHOP, team: Team.Dawn });
    expect(landmarks).toContainEqual({ kind: 'sideShop', pos: mirror(DAWN_SIDE_SHOP), team: Team.Night });
    expect(landmarks.some((l) => l.kind === 'secretShop' && l.team === Team.Dawn)).toBe(true);
    expect(landmarks.some((l) => l.kind === 'secretShop' && l.team === Team.Night)).toBe(true);
    expect(landmarks.every((l) => l.kind !== 'camp' || l.team === Team.Dawn || l.team === Team.Night)).toBe(true);
  });
});
