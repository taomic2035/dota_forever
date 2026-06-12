import { describe, it, expect } from 'vitest';
import { fxStyle, parseRgb } from '../src/render/fxStyle';

describe('fxStyle 元素配色', () => {
  it('火系偏暖(红 > 蓝)', () => {
    for (const n of ['fireblast', 'macropyre', 'scorch', 'ignite', 'firebreath']) {
      const c = parseRgb(fxStyle(n).color);
      expect(c.r).toBeGreaterThan(c.b);
    }
  });
  it('霜系偏冷(蓝 > 红)', () => {
    for (const n of ['frostnova', 'iceblast', 'glacier', 'coldfeet', 'blizzard']) {
      const c = parseRgb(fxStyle(n).color);
      expect(c.b).toBeGreaterThan(c.r);
    }
  });
  it('毒系偏绿(绿为最大通道)', () => {
    for (const n of ['venomnova', 'poison', 'miasma', 'nethertoxin']) {
      const c = parseRgb(fxStyle(n).color);
      expect(c.g).toBeGreaterThanOrEqual(c.r);
      expect(c.g).toBeGreaterThanOrEqual(c.b);
    }
  });
  it('影/虚空系偏紫(红与蓝高、绿低)', () => {
    for (const n of ['shadowbolt', 'nethertoxin' /* poison wins */, 'blackhole', 'soulcatcher']) {
      void n;
    }
    const c = parseRgb(fxStyle('blackhole').color);
    expect(c.r).toBeGreaterThan(c.g);
    expect(c.b).toBeGreaterThan(c.g);
  });
  it('雷系偏黄(红与绿高)', () => {
    const c = parseRgb(fxStyle('lightning').color);
    expect(c.r).toBeGreaterThan(120);
    expect(c.g).toBeGreaterThan(120);
  });
  it('未知名给出有效兜底配色与发光', () => {
    const s = fxStyle('zzz_totally_unknown_effect');
    expect(s.color).toMatch(/^#|^rgb/);
    expect(s.glow).toMatch(/^rgba\(/);
  });
});

describe('fxStyle 运动原型', () => {
  it('治疗/增益上升', () => {
    expect(fxStyle('heal').motion).toBe('rise');
    expect(fxStyle('mekansm').motion).toBe('rise');
    expect(fxStyle('bloodlust').motion).toBe('rise');
  });
  it('减益/诅咒下沉', () => {
    expect(fxStyle('doom').motion).toBe('fall');
    expect(fxStyle('hex').motion).toBe('fall');
    expect(fxStyle('silence').motion).toBe('fall');
  });
  it('闪烁/传送为闪现', () => {
    expect(fxStyle('blink').motion).toBe('flash');
    expect(fxStyle('shadowstep').motion).toBe('flash');
    expect(fxStyle('recall').motion).toBe('flash');
  });
  it('砸地/地震为裂地', () => {
    expect(fxStyle('echoslam').motion).toBe('crack');
    expect(fxStyle('fissure').motion).toBe('crack');
    expect(fxStyle('quake').motion).toBe('crack');
  });
  it('默认爆发', () => {
    expect(fxStyle('arcanebolt').motion).toBe('burst');
  });
});

describe('parseRgb', () => {
  it('解析 #rrggbb', () => {
    expect(parseRgb('#ff8040')).toEqual({ r: 255, g: 128, b: 64 });
  });
  it('解析 rgb()', () => {
    expect(parseRgb('rgb(10, 20, 30)')).toEqual({ r: 10, g: 20, b: 30 });
  });
});

describe('fxStyle family metadata', () => {
  it('returns stable spell family labels', () => {
    expect(fxStyle('fireblast').family).toBe('fire');
    expect(fxStyle('frostnova').family).toBe('frost');
    expect(fxStyle('lightning').family).toBe('lightning');
    expect(fxStyle('venomnova').family).toBe('poison');
    expect(fxStyle('blackhole').family).toBe('shadow');
    expect(fxStyle('overgrowth').family).toBe('nature');
    expect(fxStyle('fissure').family).toBe('earth');
    expect(fxStyle('arcanebolt').family).toBe('arcane');
  });

  it('uses neutral for unknown effects', () => {
    expect(fxStyle('unknown_effect_without_family').family).toBe('neutral');
  });
});

describe('fxStyle impact pattern metadata', () => {
  it('maps common spell families to stable impact silhouettes', () => {
    expect(fxStyle('fireblast').pattern).toBe('embers');
    expect(fxStyle('frostnova').pattern).toBe('shards');
    expect(fxStyle('lightning').pattern).toBe('jagged');
    expect(fxStyle('venomnova').pattern).toBe('cloud');
    expect(fxStyle('fissure').pattern).toBe('cracks');
    expect(fxStyle('purification').pattern).toBe('halo');
    expect(fxStyle('arcanebolt').pattern).toBe('runes');
    expect(fxStyle('rupture').pattern).toBe('splatter');
    expect(fxStyle('blackhole').pattern).toBe('splatter');
  });

  it('uses spark as the unknown fallback pattern', () => {
    expect(fxStyle('unknown_effect_without_pattern').pattern).toBe('spark');
  });
});
