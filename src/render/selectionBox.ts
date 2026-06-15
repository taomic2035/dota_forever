import type { Vec2 } from '../core/vec2';

export interface ScreenRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function selectionBoxRect(start: Vec2, end: Vec2): ScreenRect {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  return {
    x,
    y,
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}
