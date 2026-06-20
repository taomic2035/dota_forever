import type { Vec2 } from '../core/vec2';
import { DAWN_RAMPS, mirror } from '../data/mapLayout';
import { GameMap, segDist, Team } from '../sim/map';

export type TerrainVisualKind = 'river' | 'base' | 'ramp' | 'treeWall' | 'lane' | 'jungle' | 'ground';

export interface TerrainPalette {
  base: string;
  accent: string;
  shadow: string;
  highlight: string;
}

export interface TerrainVisual {
  kind: TerrainVisualKind;
  height: number;
  walkable: boolean;
  blocksPath: boolean;
  edge: boolean;
  tags: string[];
  palette: TerrainPalette;
}

export type LandmarkVisualKind =
  | 'shop'
  | 'sideShop'
  | 'secretShop'
  | 'pit'
  | 'rune'
  | 'camp'
  | 'forestPocket'
  | 'highgroundPlateau'
  | 'tower'
  | 'barracks'
  | 'ancient'
  | 'fountain';

export interface LandmarkVisual {
  kind: LandmarkVisualKind;
  pos: Vec2;
  team: Team | null;
  tier?: string;
  lane?: string;
}

const PALETTES: Record<TerrainVisualKind, TerrainPalette> = {
  river: { base: '#294a55', accent: '#77c8db', shadow: '#102c35', highlight: '#b8eef4' },
  base: { base: '#46513a', accent: '#b89a55', shadow: '#1b2017', highlight: '#d9c681' },
  ramp: { base: '#4f5540', accent: '#c2aa69', shadow: '#1a1f17', highlight: '#e7d28a' },
  treeWall: { base: '#172613', accent: '#3f6f2a', shadow: '#050805', highlight: '#6b9b42' },
  lane: { base: '#3a3525', accent: '#9d8050', shadow: '#17140e', highlight: '#c1a06a' },
  jungle: { base: '#25341e', accent: '#496b33', shadow: '#0e160d', highlight: '#6f8e47' },
  ground: { base: '#2c3a22', accent: '#52693a', shadow: '#11170d', highlight: '#789056' },
};

const RAMPS = [...DAWN_RAMPS, ...DAWN_RAMPS.map((r) => ({ pos: mirror(r.pos), r: r.r }))];

export function terrainVisualAt(map: GameMap, cx: number, cy: number): TerrainVisual {
  const i = map.cellIndex(cx, cy);
  const height = map.height[i] ?? 1;
  const walkable = map.isWalkableCell(cx, cy);
  const p = map.cellCenter(cx, cy);
  const tags: string[] = [];
  const blocksPath = !walkable;
  const edge = isHeightEdge(map, cx, cy);

  let kind: TerrainVisualKind = 'ground';
  if (map.trees.has(i)) {
    kind = 'treeWall';
    tags.push('tree', 'wall');
  } else if (isRampCell(p)) {
    kind = 'ramp';
    tags.push('ramp', 'highGroundAccess');
  } else if (height === 0) {
    kind = 'river';
    tags.push('river');
  } else if (height === 2) {
    kind = 'base';
    tags.push('base', 'highGround');
  } else if (isLaneCell(map, p)) {
    kind = 'lane';
    tags.push('lane');
  } else if (isJungleCell(map, p)) {
    kind = 'jungle';
    tags.push('jungle');
  }
  if (walkable && nearTreeWall(map, cx, cy)) {
    tags.push('treeShadow', 'forestVisionPocket');
  }
  if (edge) {
    tags.push('edge');
    if (nearHeight(map, cx, cy, 2) && nearLowerHeight(map, cx, cy, height)) {
      tags.push('lowHighVisionBreak', 'highGroundMiss');
    }
  }

  return { kind, height, walkable, blocksPath, edge, tags, palette: PALETTES[kind] };
}

export function landmarkVisuals(map: GameMap): LandmarkVisual[] {
  const out: LandmarkVisual[] = [];
  for (const shop of map.shops) {
    const kind: LandmarkVisualKind = shop.kind === 'secret' ? 'secretShop' : shop.kind === 'side' ? 'sideShop' : 'shop';
    out.push({ kind, pos: { ...shop.pos }, team: shop.team });
  }
  out.push({ kind: 'pit', pos: { ...map.pitPos }, team: Team.Neutral });
  for (const pos of map.runeSpots) out.push({ kind: 'rune', pos: { ...pos }, team: Team.Neutral });
  for (const camp of map.camps) out.push({ kind: 'camp', pos: { ...camp.pos }, team: camp.side, tier: camp.tier });
  for (const pocket of map.forestPockets) {
    out.push({ kind: 'forestPocket', pos: { ...pocket.pos }, team: pocket.side, tier: pocket.id });
  }
  for (const plateau of map.highgroundPlateaus) {
    out.push({ kind: 'highgroundPlateau', pos: { ...plateau.pos }, team: plateau.side, tier: plateau.id });
  }
  for (const building of map.buildings) {
    out.push({
      kind: buildingVisualKind(building.kind),
      pos: { ...building.pos },
      team: building.team,
      lane: building.lane,
      tier: building.kind,
    });
  }
  return out;
}

function isRampCell(p: Vec2): boolean {
  return RAMPS.some((r) => distance(p, r.pos) <= r.r);
}

function isLaneCell(map: GameMap, p: Vec2): boolean {
  return Object.values(map.lanes).some((lane) => {
    for (let i = 0; i < lane.length - 1; i++) {
      if (segDist(p, lane[i], lane[i + 1]) <= 430) return true;
    }
    return false;
  });
}

function isJungleCell(map: GameMap, p: Vec2): boolean {
  return map.camps.some((camp) => distance(p, camp.pos) <= 780) || map.shops.some((shop) => shop.secret && distance(p, shop.pos) <= 700);
}

function isHeightEdge(map: GameMap, cx: number, cy: number): boolean {
  if (!map.inBounds(cx, cy)) return false;
  const h = map.height[map.cellIndex(cx, cy)];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = cx + dx;
      const ny = cy + dy;
      if (!map.inBounds(nx, ny)) continue;
      if (map.height[map.cellIndex(nx, ny)] !== h) return true;
    }
  }
  return false;
}

function nearTreeWall(map: GameMap, cx: number, cy: number): boolean {
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = cx + dx;
      const ny = cy + dy;
      if (!map.inBounds(nx, ny)) continue;
      if (map.trees.has(map.cellIndex(nx, ny))) return true;
    }
  }
  return false;
}

function nearHeight(map: GameMap, cx: number, cy: number, targetHeight: number): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = cx + dx;
      const ny = cy + dy;
      if (!map.inBounds(nx, ny)) continue;
      if (map.height[map.cellIndex(nx, ny)] === targetHeight) return true;
    }
  }
  return false;
}

function nearLowerHeight(map: GameMap, cx: number, cy: number, height: number): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = cx + dx;
      const ny = cy + dy;
      if (!map.inBounds(nx, ny)) continue;
      if (map.height[map.cellIndex(nx, ny)] < height || height < map.height[map.cellIndex(nx, ny)]) return true;
    }
  }
  return false;
}

function buildingVisualKind(kind: string): LandmarkVisualKind {
  if (kind === 'ancient') return 'ancient';
  if (kind === 'fountain') return 'fountain';
  if (kind.startsWith('rax')) return 'barracks';
  return 'tower';
}

function distance(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}
