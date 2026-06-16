import { describe, it, expect } from 'vitest';
import { prdConstant, prdChance } from '../src/sim/prd';
import { Rng } from '../src/core/rng';

describe('PRD 伪随机分布', () => {
  it('25% 暴击的 PRD 常数 ≈ 经典值 0.08475', () => {
    expect(prdConstant(0.25)).toBeCloseTo(0.08475, 3);
  });

  it('PRD 常数恒小于目标概率(C < P)', () => {
    for (const p of [0.1, 0.2, 0.25, 0.3, 0.4, 0.5]) {
      expect(prdConstant(p)).toBeLessThan(p);
      expect(prdConstant(p)).toBeGreaterThan(0);
    }
  });

  it('prdChance 随连续未触发递增并封顶 1', () => {
    const p = 0.25;
    expect(prdChance(p, 0)).toBeCloseTo(prdConstant(p), 9); // 首次 = C
    expect(prdChance(p, 5)).toBeGreaterThan(prdChance(p, 0));
    expect(prdChance(p, 100)).toBe(1); // 远超后必触发
  });

  it('边界:p≤0 → 0,p≥1 → 1', () => {
    expect(prdChance(0, 5)).toBe(0);
    expect(prdChance(1, 0)).toBe(1);
  });

  it('长期触发率保持均值 = P(平衡不变),且无超长不触发连串', () => {
    const rng = new Rng(12345);
    const p = 0.25;
    let streak = 0;
    let procs = 0;
    let maxStreak = 0;
    const N = 200000;
    for (let i = 0; i < N; i++) {
      if (rng.chance(prdChance(p, streak))) {
        procs++;
        streak = 0;
      } else {
        streak++;
        maxStreak = Math.max(maxStreak, streak);
      }
    }
    expect(procs / N).toBeCloseTo(p, 2); // 均值守恒(±~1%)
    expect(maxStreak).toBeLessThan(13); // 1/C≈11.8,不触发连串有界(纯随机会 >40)
  });
});
