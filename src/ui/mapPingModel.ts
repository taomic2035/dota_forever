import type { WorldPulseKind } from './uxFeedback';

export type MapPingKind = Extract<WorldPulseKind, 'ping' | 'dangerPing' | 'retreatPing'>;

export interface MapPingModifiers {
  altKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
}

export interface MapPingVisual {
  worldColor: string;
  minimapRgb: string;
  minimapRadius: number;
}

export function mapPingKindFromModifiers(modifiers: MapPingModifiers): MapPingKind | null {
  if (!modifiers.altKey) return null;
  if (modifiers.ctrlKey) return 'dangerPing';
  if (modifiers.shiftKey) return 'retreatPing';
  return 'ping';
}

export function isMapPingKind(kind: WorldPulseKind): kind is MapPingKind {
  return kind === 'ping' || kind === 'dangerPing' || kind === 'retreatPing';
}

export function mapPingVisual(kind: MapPingKind): MapPingVisual {
  if (kind === 'dangerPing') {
    return { worldColor: '#ff4c42', minimapRgb: '255,76,66', minimapRadius: 22 };
  }
  if (kind === 'retreatPing') {
    return { worldColor: '#8dff7a', minimapRgb: '141,255,122', minimapRadius: 20 };
  }
  return { worldColor: '#48d8ff', minimapRgb: '72,216,255', minimapRadius: 18 };
}
