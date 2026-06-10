import { describe, it, expect } from 'vitest';
import { V } from '../src/core/vec2';
import { Rng } from '../src/core/rng';
import { clamp, angleDiff, turnTowards } from '../src/core/mathx';

describe('rng', () => {
  it('same seed → identical sequence', () => {
    const a = new Rng(12345);
    const b = new Rng(12345);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });
  it('different seeds diverge', () => {
    const a = new Rng(1);
    const b = new Rng(2);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });
  it('int within bounds inclusive', () => {
    const r = new Rng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r.int(2, 5);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(5);
    }
  });
});

describe('vec2', () => {
  it('norm of zero vector is zero', () => {
    expect(V.norm({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });
  it('dist', () => {
    expect(V.dist({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
  it('moveTowards does not overshoot', () => {
    const p = V.moveTowards({ x: 0, y: 0 }, { x: 10, y: 0 }, 15);
    expect(p).toEqual({ x: 10, y: 0 });
    const q = V.moveTowards({ x: 0, y: 0 }, { x: 10, y: 0 }, 4);
    expect(q.x).toBeCloseTo(4);
  });
});

describe('mathx', () => {
  it('clamp', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
  });
  it('angleDiff wraps', () => {
    expect(angleDiff(Math.PI * 0.9, -Math.PI * 0.9)).toBeCloseTo(Math.PI * 0.2);
  });
  it('turnTowards converges', () => {
    let f = 0;
    for (let i = 0; i < 100; i++) f = turnTowards(f, Math.PI, 0.1);
    expect(f).toBeCloseTo(Math.PI);
  });
});
