import { describe, expect, it } from 'vitest';
import { selectionVisualState } from '../src/render/selectionVisual';
import { UxFeedback } from '../src/ui/uxFeedback';

describe('selectionVisualState', () => {
  it('marks the primary selected unit as selected and primary', () => {
    const ux = new UxFeedback();
    ux.setSelectionSnapshot({ primaryId: 1, selectedIds: [1, 2], commandableIds: [1, 2], inspectId: 0 });

    expect(selectionVisualState(1, 1, ux)).toEqual({ selected: true, primary: true });
  });

  it('marks additional selected commandable units without primary emphasis', () => {
    const ux = new UxFeedback();
    ux.setSelectionSnapshot({ primaryId: 1, selectedIds: [1, 2], commandableIds: [1, 2], inspectId: 0 });

    expect(selectionVisualState(2, 1, ux)).toEqual({ selected: true, primary: false });
  });

  it('marks inspect-only units as primary selected for information view', () => {
    const ux = new UxFeedback();
    ux.setSelectionSnapshot({ primaryId: 9, selectedIds: [9], commandableIds: [], inspectId: 9 });

    expect(selectionVisualState(9, 1, ux)).toEqual({ selected: true, primary: true });
  });

  it('falls back to the legacy selected id without ux state', () => {
    expect(selectionVisualState(3, 3)).toEqual({ selected: true, primary: true });
    expect(selectionVisualState(4, 3)).toEqual({ selected: false, primary: false });
  });
});
