import { describe, expect, it } from 'vitest';
import { buildTargetPreviewModel } from '../src/engine/targetPreviewModel';

describe('buildTargetPreviewModel', () => {
  it('shows out-of-range point casts as walk previews with an approach line', () => {
    const model = buildTargetPreviewModel({
      source: 'ability',
      label: '裂地震击',
      origin: { x: 0, y: 0 },
      cursor: { x: 900, y: 0 },
      range: 700,
      shape: { kind: 'area', radius: 320 },
      requiresTarget: false,
    });

    expect(model).toMatchObject({
      visible: true,
      status: 'walk',
      tone: 'walk',
      shape: { kind: 'area', radius: 320 },
      rangeRing: { visible: true, radius: 700 },
      aim: { x: 900, y: 0 },
      approachLine: {
        visible: true,
        from: { x: 0, y: 0 },
        to: { x: 700, y: 0 },
      },
      actionHint: '走近后施放',
      rejectReason: '',
    });
  });

  it('marks unit casts without a legal target as invalid with a shared reject reason', () => {
    const model = buildTargetPreviewModel({
      source: 'ability',
      label: '魔法箭',
      origin: { x: 50, y: 50 },
      cursor: { x: 120, y: 80 },
      range: 600,
      shape: { kind: 'unit' },
      requiresTarget: true,
      hasTarget: false,
      invalidReason: '需要敌方单位',
    });

    expect(model.status).toBe('invalid');
    expect(model.tone).toBe('invalid');
    expect(model.availability).toMatchObject({
      ready: false,
      reason: 'invalidTarget',
      detail: '需要敌方单位',
    });
    expect(model.rejectReason).toBe('需要敌方单位');
    expect(model.actionHint).toBe('无法施放');
    expect(model.approachLine.visible).toBe(false);
    expect(model.targetReticle).toMatchObject({ visible: true, kind: 'unit', radius: 52 });
  });

  it('preserves line geometry for renderer parity and treats no-target casts as hidden previews', () => {
    expect(buildTargetPreviewModel({
      source: 'item',
      label: '冲击波',
      origin: { x: 100, y: 100 },
      cursor: { x: 500, y: 300 },
      range: 1000,
      shape: { kind: 'line', width: 140, length: 1000 },
      requiresTarget: false,
    })).toMatchObject({
      status: 'ready',
      tone: 'ready',
      availability: { ready: true, reason: 'ready' },
      shape: { kind: 'line', width: 140, length: 1000 },
      line: {
        visible: true,
        width: 140,
        length: 1000,
      },
      actionHint: '点击施放',
    });

    expect(buildTargetPreviewModel({
      source: 'ability',
      label: '战吼',
      origin: { x: 0, y: 0 },
      cursor: { x: 0, y: 0 },
      range: 0,
      shape: { kind: 'none' },
      requiresTarget: false,
    })).toMatchObject({
      visible: false,
      shape: { kind: 'none' },
      rangeRing: { visible: false },
    });
  });

  it('shares walk-to-range preview availability copy with cursor hints', () => {
    const model = buildTargetPreviewModel({
      source: 'item',
      label: '闪烁匕首',
      origin: { x: 0, y: 0 },
      cursor: { x: 1400, y: 0 },
      range: 1200,
      shape: { kind: 'point' },
      requiresTarget: false,
    });

    expect(model.status).toBe('walk');
    expect(model.availability).toMatchObject({
      ready: true,
      reason: 'outOfRange',
    });
    expect(model.actionHint).toBe('走近后施放');
  });
});
