import { describe, expect, it } from 'vitest';
import { fxStyle } from '../../src/render/fxStyle';
import { fx3DVisualState } from '../../src/render3d/fx3dVisual';

describe('fx3DVisualState', () => {
  it('builds layered fire bursts with embers', () => {
    const state = fx3DVisualState(fxStyle('fireblast'), 'burst');
    expect(state.layers.some((l) => l.role === 'core' && l.shape === 'sphere')).toBe(true);
    expect(state.layers.some((l) => l.role === 'glow')).toBe(true);
    const embers = state.layers.find((l) => l.shape === 'spark' && l.role === 'particle');
    expect(embers?.count).toBeGreaterThanOrEqual(10);
  });

  it('uses shards for frost bursts', () => {
    const state = fx3DVisualState(fxStyle('frostnova'), 'burst');
    const shardLayer = state.layers.find((l) => l.shape === 'shard');
    expect(shardLayer).toBeTruthy();
    expect(shardLayer!.count).toBeGreaterThanOrEqual(8);
    expect(state.verticalLift).toBeGreaterThan(0);
  });

  it('keeps lightning beams jagged and spark-heavy', () => {
    const state = fx3DVisualState(fxStyle('lightning'), 'beam');
    expect(state.layers.some((l) => l.role === 'core' && l.shape === 'beam')).toBe(true);
    expect(state.layers.some((l) => l.shape === 'jagged')).toBe(true);
    expect(state.layers.some((l) => l.role === 'trail' && l.shape === 'spark')).toBe(true);
  });

  it('turns poison areas into cloud fields over a readable ring', () => {
    const state = fx3DVisualState(fxStyle('miasma'), 'aoe');
    expect(state.layers.some((l) => l.role === 'core' && l.shape === 'ring')).toBe(true);
    const cloud = state.layers.find((l) => l.shape === 'cloud');
    expect(cloud?.count).toBeGreaterThanOrEqual(6);
    expect(state.durationScale).toBeGreaterThan(1);
  });

  it('uses halo language for holy areas', () => {
    const state = fx3DVisualState(fxStyle('purification'), 'aoe');
    expect(state.layers.some((l) => l.shape === 'halo')).toBe(true);
    expect(state.layers.some((l) => l.role === 'accent')).toBe(true);
  });

  it('uses runes for arcane projectiles', () => {
    const state = fx3DVisualState(fxStyle('arcanebolt'), 'projectile');
    expect(state.layers.some((l) => l.shape === 'rune')).toBe(true);
    expect(state.layers.every((l) => l.count > 0)).toBe(true);
  });

  it('returns a stable fallback with no empty layers', () => {
    const state = fx3DVisualState(fxStyle('unknown_effect_without_pattern'), 'burst');
    expect(state.layers.some((l) => l.role === 'core')).toBe(true);
    expect(state.layers.some((l) => l.role === 'glow')).toBe(true);
    expect(state.layers.every((l) => l.count > 0 && l.opacity > 0 && l.scale > 0)).toBe(true);
  });
});
