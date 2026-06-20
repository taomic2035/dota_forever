import { describe, expect, it } from 'vitest';
import { buildAttackCommandWorldHint } from '../src/render/attackCommandWorldHint';

describe('buildAttackCommandWorldHint', () => {
  it('builds a hard attack target cue with a line from selected unit to target', () => {
    expect(buildAttackCommandWorldHint({
      selected: { id: 1, pos: { x: 100, y: 200 }, order: { type: 'attack', targetId: 9 }, attackTargetId: 9 },
      target: { id: 9, pos: { x: 300, y: 240 }, radius: 28, name: '敌方英雄' },
    })).toEqual({
      visible: true,
      kind: 'attackTarget',
      tone: 'danger',
      label: '攻击目标',
      from: { x: 100, y: 200 },
      to: { x: 300, y: 240 },
      radius: 40,
    });
  });

  it('builds an attack-move destination cue without requiring a target', () => {
    expect(buildAttackCommandWorldHint({
      selected: { id: 1, pos: { x: 100, y: 200 }, order: { type: 'attackmove', pos: { x: 700, y: 900 } }, attackTargetId: 0 },
    })).toEqual({
      visible: true,
      kind: 'attackMove',
      tone: 'busy',
      label: 'A-Move',
      from: { x: 100, y: 200 },
      to: { x: 700, y: 900 },
      radius: 34,
    });
  });

  it('shows auto-acquired targets as softer than explicit attacks', () => {
    expect(buildAttackCommandWorldHint({
      selected: { id: 1, pos: { x: 100, y: 200 }, order: null, attackTargetId: 9 },
      target: { id: 9, pos: { x: 130, y: 240 }, radius: 20, name: '小兵' },
    })).toMatchObject({
      visible: true,
      kind: 'autoTarget',
      tone: 'ready',
      label: '自动攻击',
      radius: 30,
    });
  });

  it('stays hidden without an attack order or target', () => {
    expect(buildAttackCommandWorldHint({
      selected: { id: 1, pos: { x: 100, y: 200 }, order: { type: 'move', pos: { x: 200, y: 200 } }, attackTargetId: 0 },
    })).toEqual({
      visible: false,
      kind: 'none',
      tone: 'muted',
      label: '',
      from: null,
      to: null,
      radius: 0,
    });
  });
});
