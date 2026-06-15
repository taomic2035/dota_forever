import type { AbilityDef } from '../data/heroes/types';
import type { ItemDef } from '../data/items';

export type PreviewShape =
  | { kind: 'unit' }
  | { kind: 'point' }
  | { kind: 'area'; radius: number }
  | { kind: 'line'; width: number; length: number };

export type PreviewTargetingGeometry = {
  mode: 'point' | 'unit' | 'line' | 'area';
  range: number;
  radius?: number;
  width?: number;
};

function atLevel(arr: number[] | undefined, lvl: number): number | undefined {
  if (!arr || arr.length === 0) return undefined;
  return arr[Math.min(arr.length - 1, Math.max(0, lvl - 1))];
}

export function abilityPreviewShape(def: AbilityDef, lvl: number): PreviewShape {
  if (def.targetMode === 'unit') return { kind: 'unit' };
  if (def.targetMode === 'point' || def.targetMode === 'line') {
    if (def.lineWidth) {
      return { kind: 'line', width: def.lineWidth, length: atLevel(def.castRange, lvl) ?? 700 };
    }
    const radius = atLevel(def.aoeRadius, lvl);
    return radius ? { kind: 'area', radius } : { kind: 'point' };
  }
  return { kind: 'point' };
}

export function itemPreviewShape(active: NonNullable<ItemDef['active']>): PreviewShape {
  if (active.targetMode === 'unit') return { kind: 'unit' };
  if (active.targetMode === 'point' || active.targetMode === 'line') {
    return active.activeAoeRadius ? { kind: 'area', radius: active.activeAoeRadius } : { kind: 'point' };
  }
  return { kind: 'point' };
}

export function previewTargetingGeometry(shape: PreviewShape, fallbackRange: number): PreviewTargetingGeometry {
  if (shape.kind === 'area') return { mode: 'area', range: fallbackRange, radius: shape.radius };
  if (shape.kind === 'line') return { mode: 'line', range: shape.length, width: shape.width };
  if (shape.kind === 'unit') return { mode: 'unit', range: fallbackRange };
  return { mode: 'point', range: fallbackRange };
}
