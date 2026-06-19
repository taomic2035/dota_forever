import { describe, expect, it } from 'vitest';
import {
  inspectCastProgress,
  inspectInventorySummary,
  inspectPanelAuthority,
} from '../src/ui/inspectPanelModel';
import { CAST_COLOR, CHANNEL_COLOR, type CastTrackEntry } from '../src/render/castBar';

describe('inspectPanelAuthority', () => {
  it('labels commandable non-hero selections as commandable', () => {
    expect(inspectPanelAuthority({
      unitId: 42,
      commandableSelectedIds: [7, 42],
      inspectUnitId: 0,
    })).toEqual({
      kind: 'commandable',
      label: 'COMMANDABLE',
      detail: 'Orders affect this selected unit.',
      color: '#9cff74',
      background: '#183315',
    });
  });

  it('labels inspect-only selections as view-only', () => {
    expect(inspectPanelAuthority({
      unitId: 99,
      commandableSelectedIds: [],
      inspectUnitId: 99,
    })).toEqual({
      kind: 'inspect',
      label: 'VIEW ONLY',
      detail: 'Orders fall back to your hero.',
      color: '#ffd76a',
      background: '#332715',
    });
  });

  it('treats selected units without command authority as view-only even if inspectId is stale', () => {
    expect(inspectPanelAuthority({
      unitId: 13,
      commandableSelectedIds: [1, 2],
      inspectUnitId: 0,
    })?.kind).toBe('inspect');
  });
});

describe('inspectInventorySummary', () => {
  it('summarizes visible hero inventory and TP slot for inspect panels', () => {
    expect(inspectInventorySummary({
      inventory: [
        { itemKey: 'blink' },
        null,
        { itemKey: 'broadsword' },
        null,
        null,
        { itemKey: 'branch', charges: 2 },
      ],
      tpSlot: { itemKey: 'tp', charges: 3 },
    })).toEqual({
      visible: true,
      items: [
        { key: 'blink', label: '闪烁', tooltip: '闪烁短刃', charges: 0 },
        { key: 'broadsword', label: '铁阔', tooltip: '铁阔剑', charges: 0 },
        { key: 'branch', label: '铁树', tooltip: '铁树枝', charges: 2 },
        { key: 'tp', label: 'TP', tooltip: '回城卷轴', charges: 3 },
      ],
    });
  });

  it('stays hidden when the inspected unit has no visible items', () => {
    expect(inspectInventorySummary({
      inventory: [null, null, null, null, null, null],
      tpSlot: null,
    })).toEqual({ visible: false, items: [] });
  });
});

describe('inspectCastProgress', () => {
  it('summarizes cast point progress with the ability name', () => {
    const track = new Map<number, CastTrackEntry>();
    const unit = {
      id: 5,
      casting: { abilityIndex: 1, pointUntil: 8 },
      channeling: null,
      heroDef: { abilities: [{ name: 'Q' }, { name: '寒冰路径' }] },
    };

    expect(inspectCastProgress(track, unit, 6)).toEqual({
      kind: 'cast',
      label: '施法中',
      abilityName: '寒冰路径',
      frac: 0,
      percent: 0,
      remaining: 2,
      color: CAST_COLOR,
    });
    expect(inspectCastProgress(track, unit, 7)?.percent).toBe(50);
  });

  it('summarizes channel progress in gold and clears stale track entries', () => {
    const track = new Map<number, CastTrackEntry>([[9, { start: 0, end: 1 }]]);
    const channeling = {
      id: 9,
      casting: null,
      channeling: { abilityIndex: 0, until: 14, nextTickAt: 11 },
      heroDef: { abilities: [{ name: '生命汲取' }] },
    };

    expect(inspectCastProgress(track, channeling, 10)).toMatchObject({
      kind: 'channel',
      label: '引导中',
      abilityName: '生命汲取',
      percent: 0,
      remaining: 4,
      color: CHANNEL_COLOR,
    });
    expect(inspectCastProgress(track, { ...channeling, channeling: null }, 10.5)).toBeNull();
    expect(track.has(9)).toBe(false);
  });
});
