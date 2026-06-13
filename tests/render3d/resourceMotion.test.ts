import { describe, expect, it } from 'vitest';
import { resourceMotionState, resourcePartMotionState } from '../../src/render3d/resourceMotion';

describe('resourceMotionState', () => {
  it('keeps idle subtle while pulse resources breathe visibly', () => {
    const idle = resourceMotionState({ motion: 'idle', state: 'idle', t: 0.25, phase: 0, progress: 0 });
    const pulse = resourceMotionState({ motion: 'pulse', state: 'idle', t: 0.25, phase: 0, progress: 0 });

    expect(Math.abs(idle.scalePulse - 1)).toBeLessThan(0.035);
    expect(Math.abs(pulse.scalePulse - 1)).toBeGreaterThan(0.045);
    expect(pulse.emissivePulse).toBeGreaterThan(idle.emissivePulse);
  });

  it('adds spin and float motion without changing sim position', () => {
    const spin = resourceMotionState({ motion: 'spin', state: 'idle', t: 0.5, phase: 0, progress: 0 });
    const float = resourceMotionState({ motion: 'float', state: 'idle', t: 0.3, phase: 0, progress: 0 });

    expect(spin.rotationY).toBeGreaterThan(0.6);
    expect(Math.abs(float.bobY)).toBeGreaterThan(0.08);
    expect(float.rotationY).toBe(0);
  });

  it('turns attack progress into a stronger impact kick for impact assets', () => {
    const impact = resourceMotionState({ motion: 'impact', state: 'attack', t: 0, phase: 0, progress: 0.5 });
    const ambient = resourceMotionState({ motion: 'ambient', state: 'attack', t: 0, phase: 0, progress: 0.5 });

    expect(impact.forwardZ).toBeGreaterThan(ambient.forwardZ);
    expect(impact.squashY).toBeLessThan(ambient.squashY);
  });

  it('animates resource parts by detail role instead of moving the whole model only', () => {
    const banner = resourcePartMotionState({
      kind: 'banner',
      detail: 'bannerGlyph',
      material: 'cloth',
      index: 1,
      t: 0.35,
      state: 'idle',
      progress: 0,
    });
    const ring = resourcePartMotionState({
      kind: 'ring',
      detail: 'rune',
      material: 'metal',
      index: 2,
      t: 0.35,
      state: 'idle',
      progress: 0,
    });
    const beam = resourcePartMotionState({
      kind: 'beam',
      detail: 'circuit',
      material: 'energy',
      index: 3,
      t: 0.35,
      state: 'channel',
      progress: 0,
    });

    expect(Math.abs(banner.rotationZ)).toBeGreaterThan(0.035);
    expect(ring.rotationY).toBeGreaterThan(0.5);
    expect(beam.scaleY).toBeGreaterThan(1.08);
    expect(beam.emissiveBoost).toBeGreaterThan(ring.emissiveBoost);
  });

  it('adds an attack kick to weapon-like resource parts', () => {
    const weapon = resourcePartMotionState({
      kind: 'weapon',
      detail: 'edgeWear',
      material: 'metal',
      index: 0,
      t: 0,
      state: 'attack',
      progress: 0.5,
    });
    const body = resourcePartMotionState({
      kind: 'body',
      detail: 'scalePattern',
      material: 'leather',
      index: 0,
      t: 0,
      state: 'attack',
      progress: 0.5,
    });

    expect(weapon.forwardZ).toBeGreaterThan(body.forwardZ);
    expect(Math.abs(weapon.rotationX)).toBeGreaterThan(Math.abs(body.rotationX));
  });
});
