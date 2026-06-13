import { describe, expect, it } from 'vitest';
import { visualStateFor3D } from '../../src/render3d/visualState';

describe('visualStateFor3D', () => {
  it('turns hit feedback into a bright short emissive flash', () => {
    const v = visualStateFor3D({ now: 10, lastDamagedAt: 9.94, stunned: false, invisible: false, t: 1 });

    expect(v.emissive[0]).toBeGreaterThan(0.75);
    expect(v.emissive[1]).toBeGreaterThan(0.75);
    expect(v.opacity).toBe(1);
    expect(v.hitFlash).toBeGreaterThan(0.5);
  });

  it('adds pulsing amber stun energy and a visible star ring', () => {
    const a = visualStateFor3D({ now: 10, lastDamagedAt: 0, stunned: true, invisible: false, t: 0 });
    const b = visualStateFor3D({ now: 10, lastDamagedAt: 0, stunned: true, invisible: false, t: 0.25 });

    expect(a.emissive[0]).toBeGreaterThan(a.emissive[2]);
    expect(a.stunStars).toBeGreaterThan(0.7);
    expect(a.emissive[0]).not.toBeCloseTo(b.emissive[0], 4);
  });

  it('keeps invisible units translucent with a faint violet shimmer', () => {
    const v = visualStateFor3D({ now: 10, lastDamagedAt: 0, stunned: false, invisible: true, t: 1 });

    expect(v.opacity).toBeLessThan(0.55);
    expect(v.emissive[2]).toBeGreaterThan(0.12);
    expect(v.invisibilityShimmer).toBeGreaterThan(0);
  });
});
