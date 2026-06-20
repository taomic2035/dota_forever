import { V, type Vec2 } from '../core/vec2';
import { castStatus, type CastStatus } from './castValidity';
import type { PreviewShape } from './abilityPreviewShape';
import { buildCastAvailability, type AvailabilityModel } from '../ui/availabilityModel';

export type TargetPreviewShape =
  | PreviewShape
  | { kind: 'cone'; angle: number; length: number }
  | { kind: 'vector'; width: number; length: number }
  | { kind: 'none' };

export type TargetPreviewTone = CastStatus;

export interface TargetPreviewInput {
  source: 'ability' | 'item';
  label: string;
  origin: Vec2;
  cursor: Vec2;
  range: number;
  shape: TargetPreviewShape;
  requiresTarget: boolean;
  hasTarget?: boolean;
  invalidReason?: string;
}

export interface TargetPreviewModel {
  visible: boolean;
  source: 'ability' | 'item';
  label: string;
  status: CastStatus;
  tone: TargetPreviewTone;
  shape: TargetPreviewShape;
  origin: Vec2;
  aim: Vec2;
  rangeRing: {
    visible: boolean;
    radius: number;
  };
  targetReticle: {
    visible: boolean;
    kind: TargetPreviewShape['kind'];
    radius: number;
  };
  line: {
    visible: boolean;
    width: number;
    length: number;
  };
  approachLine: {
    visible: boolean;
    from: Vec2;
    to: Vec2;
  };
  actionHint: string;
  rejectReason: string;
  availability: AvailabilityModel;
}

export function buildTargetPreviewModel(input: TargetPreviewInput): TargetPreviewModel {
  const status = castStatus({
    origin: input.origin,
    aim: input.cursor,
    range: input.range,
    requiresTarget: input.requiresTarget,
    hasTarget: input.hasTarget,
  });
  const visible = input.shape.kind !== 'none';
  const approachTo = status === 'walk' ? clampToRange(input.origin, input.cursor, input.range) : input.origin;
  const availability = buildCastAvailability({ status, invalidReason: input.invalidReason });

  return {
    visible,
    source: input.source,
    label: input.label,
    status,
    tone: status,
    shape: input.shape,
    origin: { ...input.origin },
    aim: { ...input.cursor },
    rangeRing: {
      visible: visible && input.range > 0,
      radius: input.range,
    },
    targetReticle: {
      visible: visible && (input.shape.kind === 'unit' || input.shape.kind === 'point' || input.shape.kind === 'area'),
      kind: input.shape.kind,
      radius: reticleRadius(input.shape),
    },
    line: {
      visible: visible && (input.shape.kind === 'line' || input.shape.kind === 'vector' || input.shape.kind === 'cone'),
      width: lineWidth(input.shape),
      length: lineLength(input.shape, input.range),
    },
    approachLine: {
      visible: status === 'walk',
      from: { ...input.origin },
      to: approachTo,
    },
    actionHint: actionHint(status),
    rejectReason: availability.reason === 'invalidTarget' ? availability.detail || '目标无效' : '',
    availability,
  };
}

function clampToRange(origin: Vec2, cursor: Vec2, range: number): Vec2 {
  if (range <= 0) return { ...cursor };
  const delta = V.sub(cursor, origin);
  const len = Math.hypot(delta.x, delta.y);
  if (len <= range || len <= 0.0001) return { ...cursor };
  const scale = range / len;
  return {
    x: origin.x + delta.x * scale,
    y: origin.y + delta.y * scale,
  };
}

function reticleRadius(shape: TargetPreviewShape): number {
  if (shape.kind === 'area') return shape.radius;
  if (shape.kind === 'unit') return 52;
  return 24;
}

function lineWidth(shape: TargetPreviewShape): number {
  if (shape.kind === 'line' || shape.kind === 'vector') return shape.width;
  if (shape.kind === 'cone') return shape.angle;
  return 0;
}

function lineLength(shape: TargetPreviewShape, range: number): number {
  if (shape.kind === 'line' || shape.kind === 'vector' || shape.kind === 'cone') return shape.length;
  return range;
}

function actionHint(status: CastStatus): string {
  if (status === 'invalid') return '无法施放';
  if (status === 'walk') return '走近后施放';
  return '点击施放';
}
