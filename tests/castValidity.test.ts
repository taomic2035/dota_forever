import { describe, it, expect } from 'vitest';
import { castStatus, resolveCastStatus, castStatusHex, CAST_STATUS_RGB } from '../src/engine/castValidity';

const O = { x: 0, y: 0 };

describe('castStatus', () => {
  it('就绪:点目标在射程内', () => {
    expect(castStatus({ origin: O, aim: { x: 300, y: 0 }, range: 600, requiresTarget: false })).toBe('ready');
  });

  it('走近:点目标超出射程(sim 会走近再施法)', () => {
    expect(castStatus({ origin: O, aim: { x: 900, y: 0 }, range: 600, requiresTarget: false })).toBe('walk');
  });

  it('边界:恰在射程上算就绪', () => {
    expect(castStatus({ origin: O, aim: { x: 600, y: 0 }, range: 600, requiresTarget: false })).toBe('ready');
  });

  it('单位目标:有合法目标且在射程内 → 就绪', () => {
    expect(castStatus({ origin: O, aim: { x: 200, y: 0 }, range: 600, requiresTarget: true, hasTarget: true })).toBe('ready');
  });

  it('单位目标:有合法目标但超距 → 走近', () => {
    expect(castStatus({ origin: O, aim: { x: 1000, y: 0 }, range: 600, requiresTarget: true, hasTarget: true })).toBe('walk');
  });

  it('单位目标:无合法目标 → 非法(优先于射程判断)', () => {
    expect(castStatus({ origin: O, aim: { x: 200, y: 0 }, range: 600, requiresTarget: true, hasTarget: false })).toBe('invalid');
    expect(castStatus({ origin: O, aim: { x: 1000, y: 0 }, range: 600, requiresTarget: true, hasTarget: false })).toBe('invalid');
  });

  it('range<=0(自身/无目标技能)恒就绪,不触发走近', () => {
    expect(castStatus({ origin: O, aim: { x: 9999, y: 0 }, range: 0, requiresTarget: false })).toBe('ready');
  });
});

describe('resolveCastStatus(渲染回落)', () => {
  it('有 status 时直接用', () => {
    expect(resolveCastStatus('walk', true)).toBe('walk');
    expect(resolveCastStatus('invalid', true)).toBe('invalid');
  });
  it('无 status:旧 valid=false→invalid,否则 ready', () => {
    expect(resolveCastStatus(undefined, false)).toBe('invalid');
    expect(resolveCastStatus(undefined, true)).toBe('ready');
    expect(resolveCastStatus(undefined, undefined)).toBe('ready');
  });
});

describe('三态颜色一致性', () => {
  it('每态有 RGB 且 hex 与 RGB 对应', () => {
    for (const s of ['ready', 'walk', 'invalid'] as const) {
      const [r, g, b] = CAST_STATUS_RGB[s];
      expect(castStatusHex(s)).toBe((r << 16) | (g << 8) | b);
    }
  });
  it('走近(琥珀)与就绪(蓝)/非法(红)三色互不相同', () => {
    const hexes = new Set([castStatusHex('ready'), castStatusHex('walk'), castStatusHex('invalid')]);
    expect(hexes.size).toBe(3);
  });
});
