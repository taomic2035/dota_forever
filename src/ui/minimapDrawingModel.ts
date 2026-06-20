import { mapPingVisual, type MapPingKind } from './mapPingModel';

export const MINIMAP_DRAW_DISTANCE_PX = 8;
export const MINIMAP_DRAW_TTL_MS = 4_000;
export const MINIMAP_DRAW_MIN_POINT_DISTANCE_WORLD = 18;

export type MinimapCommunicationGesture = 'none' | 'ping' | 'draw';

export interface MinimapGestureInput {
  altKey: boolean;
  button: number;
  dragDistancePx: number;
  drawDistancePx?: number;
}

export interface MinimapDrawPoint {
  x: number;
  y: number;
  timeMs: number;
}

export interface MinimapDrawStroke {
  id: number;
  kind: MapPingKind;
  colorRgb: string;
  points: MinimapDrawPoint[];
  startedAtMs: number;
  updatedAtMs: number;
}

export interface CreateMinimapDrawStrokeInput {
  id: number;
  kind: MapPingKind;
  point: MinimapDrawPoint;
}

export interface AppendMinimapDrawPointInput {
  point: MinimapDrawPoint;
  minPointDistanceWorld?: number;
}

export interface ActiveMinimapDrawStroke {
  stroke: MinimapDrawStroke;
  alpha: number;
}

export interface ActiveMinimapDrawStrokesInput {
  nowMs: number;
  ttlMs?: number;
}

export function minimapCommunicationGesture(input: MinimapGestureInput): MinimapCommunicationGesture {
  if (!input.altKey) return 'none';
  const drawDistancePx = input.drawDistancePx ?? MINIMAP_DRAW_DISTANCE_PX;
  if (input.button === 0 && input.dragDistancePx >= drawDistancePx) return 'draw';
  return 'ping';
}

export function createMinimapDrawStroke(input: CreateMinimapDrawStrokeInput): MinimapDrawStroke {
  return {
    id: input.id,
    kind: input.kind,
    colorRgb: mapPingVisual(input.kind).minimapRgb,
    points: [input.point],
    startedAtMs: input.point.timeMs,
    updatedAtMs: input.point.timeMs,
  };
}

export function appendMinimapDrawPoint(
  stroke: MinimapDrawStroke,
  input: AppendMinimapDrawPointInput,
): MinimapDrawStroke {
  const minPointDistanceWorld = input.minPointDistanceWorld ?? MINIMAP_DRAW_MIN_POINT_DISTANCE_WORLD;
  const last = stroke.points[stroke.points.length - 1];
  if (last) {
    const dx = input.point.x - last.x;
    const dy = input.point.y - last.y;
    if (Math.hypot(dx, dy) < minPointDistanceWorld) return stroke;
  }
  return {
    ...stroke,
    points: [...stroke.points, input.point],
    updatedAtMs: input.point.timeMs,
  };
}

export function activeMinimapDrawStrokes(
  strokes: MinimapDrawStroke[],
  input: ActiveMinimapDrawStrokesInput,
): ActiveMinimapDrawStroke[] {
  const ttlMs = input.ttlMs ?? MINIMAP_DRAW_TTL_MS;
  return strokes.flatMap((stroke) => {
    const ageMs = input.nowMs - stroke.updatedAtMs;
    if (ageMs < 0 || ageMs > ttlMs) return [];
    return [{ stroke, alpha: Math.max(0, Math.min(1, 1 - ageMs / ttlMs)) }];
  });
}
