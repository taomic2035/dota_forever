/**
 * 地图布局坐标表(晨曦方 = 左下;永夜方 = 绕中心 180° 旋转镜像)。
 * 世界坐标:x 向右,y 向下。晨曦基地角 (0, W),永夜基地角 (W, 0)。
 * 河道沿主对角线 y=x;中路沿反对角线 x+y=W。
 */
import type { Vec2 } from '../core/vec2';

export const WORLD = 15040;
export const CELL = 64;
export const GRID = WORLD / CELL; // 235

export function mirror(p: Vec2): Vec2 {
  return { x: WORLD - p.x, y: WORLD - p.y };
}

export type Lane = 'top' | 'mid' | 'bot';
export type BuildingKind =
  | 'tower1' | 'tower2' | 'tower3' | 'tower4'
  | 'rax_melee' | 'rax_ranged'
  | 'ancient' | 'fountain';

export interface BuildingSpawn { kind: BuildingKind; lane?: Lane; pos: Vec2 }
export interface CampSpawn { tier: 'small' | 'medium' | 'large' | 'ancient'; pos: Vec2 }

/** 晨曦方建筑(永夜方自动镜像,top↔bot 互换)。 */
export const DAWN_BUILDINGS: BuildingSpawn[] = [
  { kind: 'fountain', pos: { x: 1150, y: 13890 } },
  { kind: 'ancient', pos: { x: 1900, y: 13140 } },
  { kind: 'tower4', pos: { x: 2350, y: 12930 } },
  { kind: 'tower4', pos: { x: 2110, y: 12690 } },
  // 中路
  { kind: 'tower1', lane: 'mid', pos: { x: 5650, y: 9390 } },
  { kind: 'tower2', lane: 'mid', pos: { x: 4200, y: 10840 } },
  { kind: 'tower3', lane: 'mid', pos: { x: 2750, y: 12290 } },
  { kind: 'rax_melee', lane: 'mid', pos: { x: 2480, y: 12320 } },
  { kind: 'rax_ranged', lane: 'mid', pos: { x: 2220, y: 12580 } },
  // 上路(沿左边缘)
  { kind: 'tower1', lane: 'top', pos: { x: 1150, y: 5800 } },
  { kind: 'tower2', lane: 'top', pos: { x: 1150, y: 8600 } },
  { kind: 'tower3', lane: 'top', pos: { x: 1280, y: 10800 } },
  { kind: 'rax_melee', lane: 'top', pos: { x: 1180, y: 11400 } },
  { kind: 'rax_ranged', lane: 'top', pos: { x: 1560, y: 11480 } },
  // 下路(沿下边缘)
  { kind: 'tower1', lane: 'bot', pos: { x: 9240, y: 13890 } },
  { kind: 'tower2', lane: 'bot', pos: { x: 6440, y: 13890 } },
  { kind: 'tower3', lane: 'bot', pos: { x: 4240, y: 13760 } },
  { kind: 'rax_melee', lane: 'bot', pos: { x: 3640, y: 13860 } },
  { kind: 'rax_ranged', lane: 'bot', pos: { x: 3560, y: 13480 } },
];

/** 三路 waypoint,方向统一为 晨曦→永夜。 */
/** 注意:waypoint 刻意偏离塔的占地格(塔在路侧,兵线从旁经过)。 */
export const LANE_WAYPOINTS: Record<Lane, Vec2[]> = {
  mid: [
    { x: 2600, y: 12440 }, { x: 4340, y: 10980 }, { x: 5790, y: 9530 },
    { x: 7520, y: 7520 },
    { x: 9250, y: 5510 }, { x: 10700, y: 4060 }, { x: 12440, y: 2600 },
  ],
  top: [
    { x: 1900, y: 12200 }, { x: 1150, y: 10590 }, { x: 1330, y: 8600 },
    { x: 1330, y: 5800 }, { x: 1150, y: 3200 }, { x: 1700, y: 1700 },
    { x: 3200, y: 1150 }, { x: 5800, y: 1330 }, { x: 8600, y: 1330 },
    { x: 10800, y: 1460 }, { x: 12200, y: 1900 },
  ],
  bot: [], // 构造时 = top 镜像后反转,保证严格对称
};

/** 晨曦方野区营地(中路与下路之间的三角林区)+ 远古营地。 */
export const DAWN_CAMPS: CampSpawn[] = [
  { tier: 'small', pos: { x: 7800, y: 12200 } },
  { tier: 'medium', pos: { x: 9200, y: 11000 } },
  { tier: 'medium', pos: { x: 10400, y: 12800 } },
  { tier: 'large', pos: { x: 11600, y: 10400 } },
  { tier: 'ancient', pos: { x: 12600, y: 12000 } },
];

export const DAWN_SECRET_SHOP: Vec2 = { x: 10800, y: 8900 };
/** 晨曦边路商店:靠近安全路外侧,永夜方自动镜像。 */
export const DAWN_SIDE_SHOP: Vec2 = { x: 7000, y: 13680 };

/** 符文点(河道线上,全图共享)。 */
export const RUNE_SPOTS: Vec2[] = [
  { x: 3600, y: 3600 },   // 上符
  { x: 11440, y: 11440 }, // 下符
];

/** 深渊领主巢穴(上河道永夜侧河岸,洞口朝河道)。 */
export const PIT_POS: Vec2 = { x: 3950, y: 2950 };
export const PIT_MOUTH: Vec2 = { x: 3500, y: 3400 };

/** 基地高台:到本方角的 L1 距离 ≤ BASE_L1;坡道圆。 */
export const BASE_L1 = 5600;
export interface RampZone { pos: Vec2; r: number }
export const DAWN_RAMPS: RampZone[] = [
  { pos: { x: 2800, y: 12240 }, r: 520 }, // 中路坡
  { pos: { x: 1150, y: 10590 }, r: 520 }, // 上路坡
  { pos: { x: 4450, y: 13890 }, r: 520 }, // 下路坡
];

/** 河道半宽(世界单位)。 */
export const RIVER_HALF_WIDTH = 420;

/** 野区树林通道(雕刻走廊,宽 3 格);晨曦侧,永夜侧镜像。 */
export const DAWN_JUNGLE_PATHS: Vec2[][] = [
  // 主野区动线:中路 → 各营地 → 下路
  [
    { x: 6200, y: 9800 }, { x: 7800, y: 12200 }, { x: 9200, y: 11000 },
    { x: 11600, y: 10400 }, { x: 12600, y: 12000 }, { x: 12800, y: 13340 },
  ],
  // 河道 → 秘密商店 → 大点
  [{ x: 8800, y: 8200 }, { x: 10800, y: 8900 }, { x: 11600, y: 10400 }],
  // 下路 → 中型营地(拉野/逃生口)
  [{ x: 10400, y: 12800 }, { x: 10400, y: 13600 }],
  [{ x: 7800, y: 12200 }, { x: 7000, y: 13500 }],
  // 上半野(上路与中路之间)穿行路径
  [{ x: 1800, y: 7400 }, { x: 3600, y: 6600 }, { x: 5200, y: 5800 }],
  [{ x: 3600, y: 6600 }, { x: 4600, y: 8200 }, { x: 6400, y: 8700 }],
];
