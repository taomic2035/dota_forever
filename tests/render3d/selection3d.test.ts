import { describe, expect, it } from 'vitest';
import { selection3DMarkerIds } from '../../src/render3d/selection3d';

describe('selection3DMarkerIds', () => {
  it('marks the primary selected unit and secondary commandable units', () => {
    expect(selection3DMarkerIds(1, {
      selectedUnitId: 1,
      selectedUnitIds: [1, 2, 3],
      commandableSelectedIds: [1, 2, 3],
      inspectUnitId: 0,
    })).toEqual({
      primaryId: 1,
      secondaryIds: [2, 3],
    });
  });

  it('does not render secondary markers for inspect-only selection', () => {
    expect(selection3DMarkerIds(1, {
      selectedUnitId: 9,
      selectedUnitIds: [9],
      commandableSelectedIds: [],
      inspectUnitId: 9,
    })).toEqual({
      primaryId: 9,
      secondaryIds: [],
    });
  });

  it('falls back to the legacy selected id when no snapshot is available', () => {
    expect(selection3DMarkerIds(7)).toEqual({
      primaryId: 7,
      secondaryIds: [],
    });
  });
});
