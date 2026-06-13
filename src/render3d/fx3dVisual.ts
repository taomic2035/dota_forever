import type { FxStyle } from '../render/fxStyle';

export type Fx3DGeometry = 'burst' | 'beam' | 'aoe' | 'projectile';
export type Fx3DShape = 'sphere' | 'ring' | 'beam' | 'shard' | 'spark' | 'rune' | 'cloud' | 'crack' | 'halo' | 'jagged';
export type Fx3DRole = 'core' | 'glow' | 'accent' | 'particle' | 'trail';

export interface Fx3DLayer {
  role: Fx3DRole;
  shape: Fx3DShape;
  count: number;
  color: string;
  opacity: number;
  scale: number;
  spin: number;
}

export interface Fx3DVisualState {
  layers: Fx3DLayer[];
  durationScale: number;
  verticalLift: number;
}

function layer(role: Fx3DRole, shape: Fx3DShape, count: number, color: string, opacity: number, scale: number, spin = 0): Fx3DLayer {
  return { role, shape, count, color, opacity, scale, spin };
}

function baseLayers(style: FxStyle, geometry: Fx3DGeometry): Fx3DLayer[] {
  switch (geometry) {
    case 'beam':
      return [
        layer('core', 'beam', 1, style.color, 0.9, 1),
        layer('glow', 'beam', 1, style.color, 0.32, 1.9, 0.8),
        layer('trail', 'spark', 7, style.color, 0.72, 0.62, 1.4),
      ];
    case 'aoe':
      return [
        layer('core', 'ring', 1, style.color, 0.5, 1),
        layer('glow', 'ring', 1, style.color, 0.24, 1.12, 0.35),
      ];
    case 'projectile':
      return [
        layer('core', 'sphere', 1, style.color, 0.95, 0.82),
        layer('glow', 'sphere', 1, style.color, 0.34, 1.55, 0.5),
        layer('trail', 'spark', 4, style.color, 0.62, 0.48, 1.2),
      ];
    case 'burst':
    default:
      return [
        layer('core', 'sphere', 1, style.color, 0.9, 1),
        layer('glow', 'sphere', 1, style.color, 0.28, 1.85, 0.5),
      ];
  }
}

function patternLayers(style: FxStyle, geometry: Fx3DGeometry): Fx3DLayer[] {
  const aoe = geometry === 'aoe';
  const beam = geometry === 'beam';
  const projectile = geometry === 'projectile';
  switch (style.pattern) {
    case 'embers':
      return [
        layer('particle', 'spark', projectile ? 6 : 12, style.color, 0.78, projectile ? 0.42 : 0.62, 1.9),
      ];
    case 'shards':
      return [
        layer('particle', 'shard', projectile ? 5 : 10, style.color, 0.82, projectile ? 0.45 : 0.72, 1.6),
      ];
    case 'jagged':
      return [
        layer(beam ? 'accent' : 'particle', 'jagged', beam ? 7 : 9, style.color, 0.85, beam ? 0.82 : 0.68, 2.6),
        layer('trail', 'spark', beam ? 9 : 7, style.color, 0.74, 0.42, 2.2),
      ];
    case 'cloud':
      return [
        layer('particle', 'cloud', aoe ? 9 : 7, style.color, aoe ? 0.32 : 0.45, aoe ? 0.95 : 0.72, 0.45),
      ];
    case 'cracks':
      return [
        layer('accent', 'crack', aoe ? 9 : 6, style.color, 0.72, aoe ? 1 : 0.7, 0.15),
      ];
    case 'halo':
      return [
        layer('accent', 'halo', aoe ? 3 : 2, style.color, 0.55, aoe ? 0.95 : 0.62, 0.7),
      ];
    case 'runes':
      return [
        layer('accent', 'rune', projectile ? 4 : 7, style.color, 0.66, projectile ? 0.52 : 0.75, 1.1),
      ];
    case 'splatter':
      return [
        layer('particle', 'spark', projectile ? 5 : 9, style.color, 0.7, projectile ? 0.42 : 0.68, 1.5),
        layer('accent', 'cloud', aoe ? 5 : 3, style.color, 0.24, 0.7, 0.35),
      ];
    case 'spark':
    default:
      return [
        layer('particle', 'spark', projectile ? 5 : 8, style.color, 0.72, projectile ? 0.38 : 0.58, 1.4),
      ];
  }
}

function durationScale(style: FxStyle, geometry: Fx3DGeometry): number {
  const pattern = style.pattern === 'cloud' ? 0.35
    : style.pattern === 'halo' || style.pattern === 'runes' ? 0.16
      : style.pattern === 'cracks' ? 0.12
        : 0;
  const geometryBoost = geometry === 'aoe' ? 0.2 : geometry === 'projectile' ? -0.15 : 0;
  return Math.max(0.65, 1 + pattern + geometryBoost);
}

function verticalLift(style: FxStyle, geometry: Fx3DGeometry): number {
  const base = geometry === 'aoe' ? 10 : geometry === 'beam' ? 18 : geometry === 'projectile' ? 24 : 28;
  if (style.motion === 'rise') return base + 22;
  if (style.motion === 'fall') return Math.max(2, base - 20);
  if (style.motion === 'flash') return base + 10;
  if (style.motion === 'crack') return Math.max(0, base - 16);
  return base;
}

export function fx3DVisualState(style: FxStyle, geometry: Fx3DGeometry): Fx3DVisualState {
  return {
    layers: [...baseLayers(style, geometry), ...patternLayers(style, geometry)],
    durationScale: durationScale(style, geometry),
    verticalLift: verticalLift(style, geometry),
  };
}
