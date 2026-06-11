import { describe, it, expect } from 'vitest';
import { unitArt, type ArtInput } from '../src/render/unitArt';

function hero(primary: 'str' | 'agi' | 'int', attackRange: number, extra: Partial<ArtInput> = {}): ArtInput {
  return {
    kind: 'hero', team: 0, name: '测试', attackRange, collisionRadius: 24,
    heroDef: { primary, color: '#c84bd2', glyph: '✦', aiRole: 'carry' },
    ...extra,
  };
}

describe('unitArt 英雄轮廓', () => {
  it('力量英雄 → 魁梧轮廓', () => {
    expect(unitArt(hero('str', 128)).shape).toBe('bulk');
  });
  it('智力英雄 → 法袍 + 法杖', () => {
    const a = unitArt(hero('int', 600));
    expect(a.shape).toBe('robe');
    expect(a.weapon).toBe('staff');
  });
  it('敏捷远程 → 弓;敏捷近战 → 利刃', () => {
    expect(unitArt(hero('agi', 600)).weapon).toBe('bow');
    expect(unitArt(hero('agi', 128)).shape).toBe('blade');
  });
  it('英雄使用 heroDef.color 作为主体色(此前被忽略)', () => {
    expect(unitArt(hero('int', 600)).primary).toBe('#c84bd2');
  });
  it('坦克定位 → 魁梧', () => {
    const a = unitArt(hero('agi', 128, { heroDef: { primary: 'agi', color: '#888', glyph: 'T', aiRole: 'tank' } }));
    expect(a.shape).toBe('bulk');
  });
  it('携带 glyph 供纹章渲染', () => {
    expect(unitArt(hero('int', 600)).glyph).toBe('✦');
  });
});

describe('unitArt 非英雄单位', () => {
  it('近战小兵 → grunt', () => {
    expect(unitArt({ kind: 'creep', team: 0, name: '晨曦中路近战兵', attackRange: 100, collisionRadius: 16 }).shape).toBe('grunt');
  });
  it('远程小兵 → archer(弓)', () => {
    const a = unitArt({ kind: 'creep', team: 1, name: '永夜上路远程兵', attackRange: 500, collisionRadius: 16 });
    expect(a.shape).toBe('archer');
    expect(a.weapon).toBe('bow');
  });
  it('攻城车 → siege(更大)', () => {
    const a = unitArt({ kind: 'creep', team: 0, name: '晨曦中路投石车', attackRange: 700, collisionRadius: 24 });
    expect(a.shape).toBe('siege');
    expect(a.radius).toBeGreaterThan(20);
  });
  it('Boss → 巨型 beast', () => {
    const a = unitArt({ kind: 'boss', team: 2, name: '深渊领主', attackRange: 150, collisionRadius: 80 });
    expect(a.shape).toBe('beast');
    expect(a.radius).toBeGreaterThanOrEqual(40);
  });
  it('守卫 → wisp(小)', () => {
    const a = unitArt({ kind: 'ward', team: 0, name: '侦察守卫', attackRange: 0, collisionRadius: 8 });
    expect(a.shape).toBe('wisp');
    expect(a.radius).toBeLessThan(16);
  });
  it('中立野怪 → beast', () => {
    expect(unitArt({ kind: 'neutral', team: 2, name: '山岭巨魔', attackRange: 100, collisionRadius: 20 }).shape).toBe('beast');
  });
});

describe('unitArt 半径下限', () => {
  it('始终给出可见的最小绘制半径', () => {
    const a = unitArt({ kind: 'creep', team: 0, name: '近战兵', attackRange: 100, collisionRadius: 2 });
    expect(a.radius).toBeGreaterThanOrEqual(12);
  });
});
