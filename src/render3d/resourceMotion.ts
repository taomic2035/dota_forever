import type {
  Resource3DDetailKind,
  Resource3DMaterialKind,
  Resource3DMotion,
  Resource3DPartKind,
} from '../render/resource3dAssets';
import type { AnimState } from './pose';

export interface ResourceMotionInput {
  motion: Resource3DMotion;
  state: AnimState;
  t: number;
  phase: number;
  progress: number;
}

export interface ResourceMotionState {
  bobY: number;
  rotationY: number;
  tiltZ: number;
  forwardZ: number;
  scalePulse: number;
  squashY: number;
  emissivePulse: number;
}

export interface ResourcePartMotionInput {
  kind: Resource3DPartKind;
  detail: Resource3DDetailKind;
  material: Resource3DMaterialKind;
  index: number;
  t: number;
  state: AnimState;
  progress: number;
}

export interface ResourcePartMotionState {
  bobY: number;
  forwardZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  emissiveBoost: number;
}

export function resourceMotionState(input: ResourceMotionInput): ResourceMotionState {
  const wave = Math.sin(input.t * Math.PI * 2);
  const slowWave = Math.sin(input.t * Math.PI * 1.35 + 0.4);
  const walkStep = Math.abs(Math.sin(input.phase));
  const attackKick = Math.sin(Math.max(0, Math.min(1, input.progress)) * Math.PI);
  const isAttack = input.state === 'attack';
  const isCast = input.state === 'cast' || input.state === 'channel';

  const base: ResourceMotionState = {
    bobY: input.state === 'walk' ? walkStep * 0.14 : slowWave * 0.025,
    rotationY: 0,
    tiltZ: input.state === 'walk' ? Math.sin(input.phase) * 0.055 : 0,
    forwardZ: isAttack ? attackKick * 0.26 : 0,
    scalePulse: 1 + (isCast ? 0.035 : 0.018) * wave,
    squashY: isAttack ? 1 - attackKick * 0.04 : 1,
    emissivePulse: isCast ? 0.22 + Math.abs(wave) * 0.2 : 0.06,
  };

  switch (input.motion) {
    case 'pulse':
      return {
        ...base,
        scalePulse: 1 + wave * 0.065 + (isCast ? 0.045 : 0),
        emissivePulse: base.emissivePulse + 0.24 + Math.abs(wave) * 0.16,
      };
    case 'spin':
      return {
        ...base,
        rotationY: input.t * 1.8,
        emissivePulse: base.emissivePulse + 0.1,
      };
    case 'float':
      return {
        ...base,
        bobY: slowWave * 0.13 + (input.state === 'walk' ? walkStep * 0.05 : 0),
        tiltZ: Math.sin(input.t * 2.4) * 0.035,
      };
    case 'impact':
      return {
        ...base,
        forwardZ: isAttack ? attackKick * 0.46 : base.forwardZ,
        squashY: isAttack ? 1 - attackKick * 0.12 : base.squashY,
        scalePulse: base.scalePulse + (isAttack ? attackKick * 0.08 : 0),
        emissivePulse: base.emissivePulse + (isAttack ? attackKick * 0.18 : 0),
      };
    case 'ambient':
      return {
        ...base,
        bobY: base.bobY + slowWave * 0.045,
        rotationY: Math.sin(input.t * 0.8) * 0.06,
        emissivePulse: base.emissivePulse + 0.14 + Math.abs(slowWave) * 0.1,
      };
    default:
      return base;
  }
}

export function resourcePartMotionState(input: ResourcePartMotionInput): ResourcePartMotionState {
  const offset = input.index * 0.73;
  const wave = Math.sin(input.t * Math.PI * 2 + offset);
  const slowWave = Math.sin(input.t * Math.PI * 1.15 + offset);
  const attackKick = input.state === 'attack'
    ? Math.sin(Math.max(0, Math.min(1, input.progress)) * Math.PI)
    : 0;
  const channelEnergy = input.state === 'channel' || input.state === 'cast' ? 1 : 0;
  const energyMaterial = input.material === 'energy' || input.material === 'crystal' || input.material === 'water';

  const base: ResourcePartMotionState = {
    bobY: 0,
    forwardZ: 0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
    emissiveBoost: energyMaterial ? 0.08 + Math.abs(wave) * 0.06 : 0,
  };

  if (input.kind === 'banner' || input.detail === 'bannerGlyph') {
    base.rotationZ += slowWave * 0.07;
    base.rotationX += wave * 0.025;
  }
  if (input.kind === 'ring' || input.detail === 'rune') {
    base.rotationY += input.t * (1.45 + input.index * 0.08);
    base.scaleX += Math.abs(wave) * 0.035;
    base.scaleZ += Math.abs(wave) * 0.035;
    base.emissiveBoost += 0.06;
  }
  if (input.kind === 'beam' || input.detail === 'circuit') {
    const lift = Math.abs(wave);
    base.scaleY += 0.08 + lift * 0.1 + channelEnergy * 0.08;
    base.rotationY += slowWave * 0.08;
    base.emissiveBoost += 0.16 + channelEnergy * 0.16;
  }
  if (input.kind === 'orb' || input.detail === 'sparkCore') {
    base.bobY += slowWave * 0.045;
    const pulse = Math.abs(wave) * 0.06 + channelEnergy * 0.04;
    base.scaleX += pulse;
    base.scaleY += pulse;
    base.scaleZ += pulse;
    base.emissiveBoost += 0.12 + pulse;
  }
  if (input.kind === 'weapon') {
    base.forwardZ += attackKick * 0.18;
    base.rotationX -= attackKick * 0.18;
    base.rotationZ += slowWave * 0.025;
  }
  if (input.detail === 'leafVein' || input.material === 'foliage') {
    base.rotationZ += slowWave * 0.045;
    base.bobY += wave * 0.018;
  }
  if (input.detail === 'liquidRipple' || input.material === 'water') {
    base.scaleX += Math.abs(wave) * 0.05;
    base.scaleZ += Math.abs(slowWave) * 0.05;
    base.emissiveBoost += 0.08;
  }

  return base;
}
