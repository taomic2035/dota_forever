import { describe, expect, it } from 'vitest';
import { stackedUnitVisualOffset } from '../../src/render3d/stackOffset';

describe('stackedUnitVisualOffset', () => {
  it('does not offset a single visible unit', () => {
    expect(stackedUnitVisualOffset(0, 1, 36)).toEqual({ x: 0, z: 0 });
  });

  it('spreads stacked units on a deterministic ring', () => {
    const a = stackedUnitVisualOffset(0, 5, 40);
    const b = stackedUnitVisualOffset(1, 5, 40);
    const c = stackedUnitVisualOffset(4, 5, 40);

    expect(Math.hypot(a.x, a.z)).toBeCloseTo(40, 5);
    expect(Math.hypot(b.x, b.z)).toBeCloseTo(40, 5);
    expect(Math.hypot(c.x, c.z)).toBeCloseTo(40, 5);
    expect(a).not.toEqual(b);
  });

  it('keeps the spread bounded for large stacks', () => {
    const o = stackedUnitVisualOffset(9, 10, 42);

    expect(Math.abs(o.x)).toBeLessThanOrEqual(42);
    expect(Math.abs(o.z)).toBeLessThanOrEqual(42);
  });
});
