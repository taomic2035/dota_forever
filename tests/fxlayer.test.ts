import { describe, it, expect } from 'vitest';
import { FxLayer } from '../src/render/fx';
import type { GameEvent } from '../src/sim/world';

// 极简 world 桩:consume 只读 events / getUnit;viewerTeam=null 时不触碰 vision/map
function fakeWorld(events: GameEvent[], units: Record<number, any> = {}): any {
  return { events, getUnit: (id: number) => units[id], time: 0 };
}

describe('FxLayer.consume 几何判定', () => {
  it('带 pos2 → 光束', () => {
    const fx = new FxLayer();
    fx.consume(fakeWorld([{ kind: 'fx', fx: 'lightning', pos: { x: 0, y: 0 }, pos2: { x: 100, y: 0 } }]), null);
    expect(fx.particles.some((p) => p.kind === 'beam')).toBe(true);
  });
  it('radius + duration → 持续区域,寿命≈duration', () => {
    const fx = new FxLayer();
    fx.consume(fakeWorld([{ kind: 'fx', fx: 'miasma', pos: { x: 0, y: 0 }, radius: 280, duration: 8 }]), null);
    const f = fx.particles.find((p) => p.kind === 'field');
    expect(f).toBeTruthy();
    expect(f!.life).toBeGreaterThanOrEqual(8);
  });
  it('仅 radius → 扩张环,终半径≈radius', () => {
    const fx = new FxLayer();
    fx.consume(fakeWorld([{ kind: 'fx', fx: 'frostnova', pos: { x: 0, y: 0 }, radius: 700 }]), null);
    const ring = fx.particles.find((p) => p.kind === 'ring');
    expect(ring).toBeTruthy();
    expect(ring!.r1).toBeGreaterThanOrEqual(700);
  });
  it('仅 pos → 点状,按运动原型着色', () => {
    const fx = new FxLayer();
    fx.consume(fakeWorld([{ kind: 'fx', fx: 'fireblast', pos: { x: 0, y: 0 } }]), null);
    const pt = fx.particles.find((p) => p.kind === 'point');
    expect(pt).toBeTruthy();
  });
  it('spell particles carry impact pattern metadata', () => {
    const fx = new FxLayer();
    fx.consume(fakeWorld([{ kind: 'fx', fx: 'frostnova', pos: { x: 0, y: 0 } }]), null);
    const pt = fx.particles.find((p) => p.kind === 'point');
    expect(pt).toBeTruthy();
    expect(pt!.pattern).toBe('shards');
  });
  it('spell rings carry impact pattern metadata', () => {
    const fx = new FxLayer();
    fx.consume(fakeWorld([{ kind: 'fx', fx: 'lightning', pos: { x: 0, y: 0 }, radius: 280 }]), null);
    const ring = fx.particles.find((p) => p.kind === 'ring');
    expect(ring).toBeTruthy();
    expect(ring!.pattern).toBe('jagged');
  });
  it('spell beams carry impact pattern metadata', () => {
    const fx = new FxLayer();
    fx.consume(fakeWorld([{ kind: 'fx', fx: 'lightning', pos: { x: 0, y: 0 }, pos2: { x: 200, y: 0 } }]), null);
    const beam = fx.particles.find((p) => p.kind === 'beam');
    expect(beam).toBeTruthy();
    expect(beam!.pattern).toBe('jagged');
  });
  it('spell fields carry impact pattern metadata', () => {
    const fx = new FxLayer();
    fx.consume(fakeWorld([{ kind: 'fx', fx: 'miasma', pos: { x: 0, y: 0 }, radius: 280, duration: 8 }]), null);
    const field = fx.particles.find((p) => p.kind === 'field');
    expect(field).toBeTruthy();
    expect(field!.pattern).toBe('cloud');
  });
});

describe('FxLayer.consume 其他事件', () => {
  it('英雄升级 → levelup 粒子', () => {
    const fx = new FxLayer();
    const hero = { pos: { x: 5, y: 5 }, isBuilding: () => false, team: 0 };
    fx.consume(fakeWorld([{ kind: 'hero_level', unitId: 1, level: 2 }], { 1: hero }), null);
    expect(fx.particles.some((p) => p.kind === 'levelup')).toBe(true);
  });
  it('英雄受伤(目标为英雄)→ 浮动伤害数字', () => {
    const fx = new FxLayer();
    const hero = { pos: { x: 5, y: 5 }, isBuilding: () => false, isHero: () => true, team: 0 };
    fx.consume(
      fakeWorld([{ kind: 'unit_damaged', unitId: 1, sourceId: 2, amount: 137, pos: { x: 5, y: 5 } }], { 1: hero }),
      null,
    );
    expect(fx.texts.some((t) => t.text.includes('137'))).toBe(true);
  });
  it('正补 → 金色 +金币 浮动文字', () => {
    const fx = new FxLayer();
    const killer = { team: 0 };
    fx.consume(fakeWorld([{ kind: 'last_hit', unitId: 1, gold: 42, pos: { x: 0, y: 0 } }], { 1: killer }), null);
    expect(fx.texts.some((t) => t.text === '+42')).toBe(true);
  });
  it('反补 → 拒绝 浮动文字', () => {
    const fx = new FxLayer();
    const killer = { team: 0 };
    fx.consume(fakeWorld([{ kind: 'last_hit', unitId: 1, gold: 0, pos: { x: 0, y: 0 }, deny: true }], { 1: killer }), null);
    expect(fx.texts.some((t) => t.text === '拒绝')).toBe(true);
  });
  it('敌方补刀对玩家不显示(team 过滤)', () => {
    const fx = new FxLayer();
    const enemy = { team: 1 };
    // viewerTeam = 0(晨曦),击杀者为永夜 → 不显示
    fx.consume(fakeWorld([{ kind: 'last_hit', unitId: 1, gold: 42, pos: { x: 0, y: 0 } }], { 1: enemy }), 0);
    expect(fx.texts.length).toBe(0);
  });
  it('塔被摧毁 → 爆炸粒子', () => {
    const fx = new FxLayer();
    const tower = { pos: { x: 9, y: 9 }, isBuilding: () => true, team: 1 };
    fx.consume(fakeWorld([{ kind: 'tower_fell', unitId: 3, team: 1, byTeam: 0 }], { 3: tower }), null);
    expect(fx.particles.some((p) => p.kind === 'impact' && p.r1 > 100)).toBe(true);
  });
});

describe('FxLayer.advance 老化与剔除', () => {
  it('超过寿命后剔除', () => {
    const fx = new FxLayer();
    fx.consume(fakeWorld([{ kind: 'fx', fx: 'fireblast', pos: { x: 0, y: 0 } }]), null);
    expect(fx.particles.length).toBeGreaterThan(0);
    fx.advance(99);
    expect(fx.particles.length).toBe(0);
  });
  it('短时推进保留', () => {
    const fx = new FxLayer();
    fx.consume(fakeWorld([{ kind: 'fx', fx: 'miasma', pos: { x: 0, y: 0 }, radius: 280, duration: 8 }]), null);
    fx.advance(0.1);
    expect(fx.particles.length).toBeGreaterThan(0);
  });
});
