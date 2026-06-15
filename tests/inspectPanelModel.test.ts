import { describe, expect, it } from 'vitest';
import { inspectPanelAuthority } from '../src/ui/inspectPanelModel';

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
