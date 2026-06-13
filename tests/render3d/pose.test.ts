import { describe, it, expect } from 'vitest';
import { poseFor } from '../../src/render3d/pose';

describe('poseFor(sim 字段→部件变换)', () => {
  it('idle:腿不摆,躯干随时间起伏', () => {
    const a = poseFor({ state: 'idle', t: 0, phase: 0, progress: 0 });
    const b = poseFor({ state: 'idle', t: 1, phase: 0, progress: 0 });
    expect(a.legL).toBeCloseTo(0, 5);
    expect(a.torsoBob).not.toBeCloseTo(b.torsoBob, 5);
  });
  it('walk:双腿反相摆动(符号相反)', () => {
    const p = poseFor({ state: 'walk', t: 0, phase: Math.PI / 2, progress: 0 });
    expect(Math.sign(p.legL)).toBe(-Math.sign(p.legR));
    expect(Math.abs(p.legL)).toBeGreaterThan(0.1);
  });
  it('walk:臂与同侧腿反相', () => {
    const p = poseFor({ state: 'walk', t: 0, phase: Math.PI / 2, progress: 0 });
    expect(Math.sign(p.armL)).toBe(-Math.sign(p.legL));
  });
  it('death:progress→1 时 rootSink 趋近 1', () => {
    expect(poseFor({ state: 'death', t: 0, phase: 0, progress: 1 }).rootSink).toBeCloseTo(1, 2);
  });
  it('attack:progress 中段武器挥砍角显著', () => {
    expect(Math.abs(poseFor({ state: 'attack', t: 0, phase: 0, progress: 0.5 }).weaponSwing)).toBeGreaterThan(0.3);
  });
});
