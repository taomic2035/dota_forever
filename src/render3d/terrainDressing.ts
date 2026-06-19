import type { GameMap } from '../sim/map';
import { DAWN_RAMPS, mirror } from '../data/mapLayout';

export type TerrainDressingKind =
  | 'grass_tuft'
  | 'ground_path_dirt'
  | 'ground_grass_mottle'
  | 'ground_stone_slab'
  | 'flower_patch'
  | 'river_reed'
  | 'river_stone'
  | 'river_bank_mud'
  | 'river_foam_glint'
  | 'cliff_face'
  | 'cliff_radiant_moss'
  | 'cliff_dire_scorch'
  | 'cliff_rubble'
  | 'cliff_crack'
  | 'cliff_fence'
  | 'highground_edge'
  | 'ramp_stair'
  | 'landmark_ring'
  | 'sky_dome'
  | 'cloud_shadow'
  | 'sky_horizon_haze'
  | 'sky_sun_shaft';

export interface TerrainDressingSample {
  kind: TerrainDressingKind;
  x: number;
  y: number;
  z: number;
  scale: number;
  rotation: number;
  color: string;
  variant: number;
}

export type TerrainDressingSummary = Record<TerrainDressingKind, number>;

const ZERO_SUMMARY: TerrainDressingSummary = {
  grass_tuft: 0,
  ground_path_dirt: 0,
  ground_grass_mottle: 0,
  ground_stone_slab: 0,
  flower_patch: 0,
  river_reed: 0,
  river_stone: 0,
  river_bank_mud: 0,
  river_foam_glint: 0,
  cliff_face: 0,
  cliff_radiant_moss: 0,
  cliff_dire_scorch: 0,
  cliff_rubble: 0,
  cliff_crack: 0,
  cliff_fence: 0,
  highground_edge: 0,
  ramp_stair: 0,
  landmark_ring: 0,
  sky_dome: 0,
  cloud_shadow: 0,
  sky_horizon_haze: 0,
  sky_sun_shaft: 0,
};

function hash(cx: number, cy: number, salt: number): number {
  let v = (cx + 1) * 374761393 + (cy + 7) * 668265263 + salt * 1442695041;
  v = (v ^ (v >>> 13)) * 1274126177;
  return ((v ^ (v >>> 16)) >>> 0) / 0xffffffff;
}

function cellY(map: GameMap, cx: number, cy: number): number {
  const h = map.height[map.cellIndex(cx, cy)];
  if (h === 2) return 130;
  if (h === 0) return -38;
  return 0;
}

function sample(
  map: GameMap,
  kind: TerrainDressingKind,
  cx: number,
  cy: number,
  salt: number,
  color: string,
  rotation?: number,
): TerrainDressingSample {
  const c = map.cellCenter(cx, cy);
  const jx = (hash(cx, cy, salt) - 0.5) * map.CELL * 0.55;
  const jz = (hash(cx, cy, salt + 1) - 0.5) * map.CELL * 0.55;
  return {
    kind,
    x: c.x + jx,
    y: cellY(map, cx, cy),
    z: c.y + jz,
    scale: 0.72 + hash(cx, cy, salt + 2) * 0.55,
    rotation: rotation ?? hash(cx, cy, salt + 3) * Math.PI * 2,
    color,
    variant: Math.floor(hash(cx, cy, salt + 4) * 4),
  };
}

function hasNeighborHeight(map: GameMap, cx: number, cy: number, wanted: number, radius = 1): boolean {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx === 0 && dy === 0) continue;
      const x = cx + dx, y = cy + dy;
      if (!map.inBounds(x, y)) continue;
      if (map.height[map.cellIndex(x, y)] === wanted) return true;
    }
  }
  return false;
}

function pointSegDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const abLen2 = abx * abx + aby * aby || 1;
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLen2));
  const x = ax + abx * t;
  const y = ay + aby * t;
  return Math.hypot(px - x, py - y);
}

function nearestLaneDirection(map: GameMap, cx: number, cy: number, maxDistance: number): number | undefined {
  const p = map.cellCenter(cx, cy);
  let best = maxDistance;
  let bestDir: number | undefined;
  for (const lane of Object.values(map.lanes)) {
    for (let i = 0; i < lane.length - 1; i++) {
      const a = lane[i];
      const b = lane[i + 1];
      const dist = pointSegDist(p.x, p.y, a.x, a.y, b.x, b.y);
      if (dist >= best) continue;
      best = dist;
      bestDir = Math.atan2(b.y - a.y, b.x - a.x);
    }
  }
  return bestDir;
}

function neighborDirectionToHeight(map: GameMap, cx: number, cy: number, wanted: number, radius = 2): number | undefined {
  let vx = 0;
  let vy = 0;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx === 0 && dy === 0) continue;
      const x = cx + dx, y = cy + dy;
      if (!map.inBounds(x, y)) continue;
      if (map.height[map.cellIndex(x, y)] !== wanted) continue;
      const weight = 1 / Math.max(1, Math.hypot(dx, dy));
      vx += dx * weight;
      vy += dy * weight;
    }
  }
  if (Math.abs(vx) + Math.abs(vy) < 0.001) return undefined;
  return Math.atan2(vy, vx);
}

function hasNeighborBelow(map: GameMap, cx: number, cy: number, below: number, radius = 1): boolean {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx === 0 && dy === 0) continue;
      const x = cx + dx, y = cy + dy;
      if (!map.inBounds(x, y)) continue;
      if (map.height[map.cellIndex(x, y)] < below) return true;
    }
  }
  return false;
}

function cliffEdgeRotation(map: GameMap, cx: number, cy: number): number {
  let vx = 0;
  let vy = 0;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      if (dx === 0 && dy === 0) continue;
      const x = cx + dx, y = cy + dy;
      if (!map.inBounds(x, y)) continue;
      if (map.height[map.cellIndex(x, y)] >= 2) continue;
      const weight = 1 / Math.max(1, Math.hypot(dx, dy));
      vx += dx * weight;
      vy += dy * weight;
    }
  }
  if (Math.abs(vx) + Math.abs(vy) < 0.001) return 0;
  return Math.atan2(vy, vx) + Math.PI / 2;
}

function addLandmarks(map: GameMap, out: TerrainDressingSample[]): void {
  const points = [
    ...map.runeSpots.map((pos) => ({ pos, color: '#b8d4ff' })),
    ...map.shops.map((shop) => ({
      pos: shop.pos,
      color: shop.kind === 'secret' ? '#9ed3ff' : shop.kind === 'side' ? '#ffc65f' : '#ffd782',
    })),
    ...map.camps.map((camp) => ({ pos: camp.pos, color: camp.tier === 'ancient' ? '#ff8a5a' : '#caffdc' })),
    { pos: map.pitPos, color: '#ff8a5a' },
  ];
  for (const [i, p] of points.entries()) {
    const cell = map.cellOf(p.pos);
    out.push({
      kind: 'landmark_ring',
      x: p.pos.x,
      y: cellY(map, cell.cx, cell.cy) + 3,
      z: p.pos.y,
      scale: i % 5 === 0 ? 1.25 : 0.9,
      rotation: (i * Math.PI) / 7,
      color: p.color,
      variant: i % 4,
    });
  }
}

function addRamps(map: GameMap, out: TerrainDressingSample[]): void {
  const ramps = [...DAWN_RAMPS, ...DAWN_RAMPS.map((ramp) => ({ pos: mirror(ramp.pos), r: ramp.r }))];
  for (const [i, ramp] of ramps.entries()) {
    const towardCenter = Math.atan2(map.W / 2 - ramp.pos.y, map.W / 2 - ramp.pos.x);
    for (let step = -1; step <= 1; step++) {
      out.push({
        kind: 'ramp_stair',
        x: ramp.pos.x + Math.cos(towardCenter + Math.PI / 2) * step * 145,
        y: 38 + step * 3,
        z: ramp.pos.y + Math.sin(towardCenter + Math.PI / 2) * step * 145,
        scale: 1.15 - Math.abs(step) * 0.12,
        rotation: towardCenter,
        color: '#caa76b',
        variant: (i + step + 4) % 4,
      });
    }
  }
}

function addSky(map: GameMap, out: TerrainDressingSample[]): void {
  out.push({
    kind: 'sky_dome',
    x: map.W / 2,
    y: 0,
    z: map.W / 2,
    scale: 1,
    rotation: 0,
    color: '#6aa7d8',
    variant: 0,
  });
  for (let i = 0; i < 5; i++) {
    out.push({
      kind: 'cloud_shadow',
      x: map.W * (0.18 + i * 0.16),
      y: 180 + i * 8,
      z: map.W * (0.22 + ((i * 2) % 5) * 0.12),
      scale: 1.15 + i * 0.16,
      rotation: -0.45 + i * 0.28,
      color: '#d8ecf2',
      variant: i % 4,
    });
  }
  const hazeAnchors = [
    { x: map.W * 0.5, z: map.W * 0.04, rotation: 0 },
    { x: map.W * 0.5, z: map.W * 0.96, rotation: Math.PI },
    { x: map.W * 0.04, z: map.W * 0.5, rotation: Math.PI / 2 },
    { x: map.W * 0.96, z: map.W * 0.5, rotation: -Math.PI / 2 },
  ];
  hazeAnchors.forEach((anchor, i) => {
    out.push({
      kind: 'sky_horizon_haze',
      x: anchor.x,
      y: 82 + i * 7,
      z: anchor.z,
      scale: 1.25 + i * 0.08,
      rotation: anchor.rotation,
      color: i < 2 ? '#b9d8dc' : '#d7e7c8',
      variant: i,
    });
  });
  const shafts = [
    { x: 0.21, z: 0.78, r: -0.42 },
    { x: 0.31, z: 0.66, r: -0.35 },
    { x: 0.43, z: 0.58, r: -0.26 },
    { x: 0.55, z: 0.47, r: -0.18 },
    { x: 0.67, z: 0.37, r: -0.11 },
    { x: 0.79, z: 0.25, r: -0.03 },
  ];
  shafts.forEach((shaft, i) => {
    out.push({
      kind: 'sky_sun_shaft',
      x: map.W * shaft.x,
      y: 220 + i * 9,
      z: map.W * shaft.z,
      scale: 0.95 + hash(i, 3, 61) * 0.34,
      rotation: shaft.r,
      color: '#ffe7a8',
      variant: i % 4,
    });
  });
}

export function terrainDressingSamples(map: GameMap): TerrainDressingSample[] {
  const out: TerrainDressingSample[] = [];

  for (let cy = 3; cy < map.GH - 3; cy += 2) {
    for (let cx = 3; cx < map.GW - 3; cx += 2) {
      const i = map.cellIndex(cx, cy);
      const h = map.height[i];
      const walkable = map.walkable[i] === 1;
      const tree = map.trees.has(i);

      if (walkable && h === 1 && !tree) {
        const laneDirection = nearestLaneDirection(map, cx, cy, 520);
        if (laneDirection !== undefined && hash(cx, cy, 7) > 0.56) {
          out.push(sample(map, 'ground_path_dirt', cx, cy, 7, '#8a6a3f', laneDirection));
        } else if (hash(cx, cy, 13) > 0.88) {
          out.push(sample(map, 'ground_grass_mottle', cx, cy, 13, '#526f38'));
        }
        if ((laneDirection !== undefined || hasNeighborHeight(map, cx, cy, 2, 2)) && hash(cx, cy, 17) > 0.86) {
          out.push(sample(map, 'ground_stone_slab', cx, cy, 17, '#8b8068', laneDirection));
        }
        if (hash(cx, cy, 11) > 0.35) out.push(sample(map, 'grass_tuft', cx, cy, 11, '#8ecf6a'));
        if (hash(cx, cy, 19) > 0.88) out.push(sample(map, 'flower_patch', cx, cy, 19, hash(cx, cy, 23) > 0.5 ? '#ffb0a0' : '#9ed3ff'));
        const riverDirection = neighborDirectionToHeight(map, cx, cy, 0, 2);
        if (riverDirection !== undefined && hash(cx, cy, 29) > 0.42) out.push(sample(map, 'river_bank_mud', cx, cy, 29, '#6f5a3a', riverDirection + Math.PI / 2));
      }

      if (h === 0) {
        const bankDirection = neighborDirectionToHeight(map, cx, cy, 1, 2);
        if (bankDirection !== undefined && hash(cx, cy, 33) > 0.55) out.push(sample(map, 'river_foam_glint', cx, cy, 33, '#bcefff', bankDirection + Math.PI / 2));
        if (hasNeighborHeight(map, cx, cy, 1, 2) && hash(cx, cy, 31) > 0.42) out.push(sample(map, 'river_reed', cx, cy, 31, '#b8d990'));
        if (hash(cx, cy, 37) > 0.62) out.push(sample(map, 'river_stone', cx, cy, 37, '#a5c7d4'));
      }

      if (h === 2 && hasNeighborBelow(map, cx, cy, 2, 2)) {
        const rotation = cliffEdgeRotation(map, cx, cy);
        out.push(sample(map, 'cliff_face', cx, cy, 41, '#20261f', rotation));
        if (cx - cy < -map.GW * 0.08) out.push(sample(map, 'cliff_radiant_moss', cx, cy, 42, '#6f8755', rotation));
        if (cx - cy > map.GW * 0.08) out.push(sample(map, 'cliff_dire_scorch', cx, cy, 44, '#4b352d', rotation));
        if (hash(cx, cy, 45) > 0.18) out.push(sample(map, 'cliff_rubble', cx, cy, 45, '#7f7760', rotation));
        if (hash(cx, cy, 46) > 0.24) out.push(sample(map, 'cliff_crack', cx, cy, 46, '#11160f', rotation));
        out.push(sample(map, 'highground_edge', cx, cy, 43, '#2c342e', rotation));
        if (hash(cx, cy, 47) > 0.18) out.push(sample(map, 'cliff_fence', cx, cy, 47, '#c99861', rotation));
      }
    }
  }

  addLandmarks(map, out);
  addRamps(map, out);
  addSky(map, out);
  return out;
}

export function terrainDressingSummary(samples: TerrainDressingSample[]): TerrainDressingSummary {
  const summary = { ...ZERO_SUMMARY };
  for (const sample of samples) summary[sample.kind]++;
  return summary;
}
