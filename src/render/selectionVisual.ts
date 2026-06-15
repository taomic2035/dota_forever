import type { UxFeedback } from '../ui/uxFeedback';

export interface SelectionVisualState {
  selected: boolean;
  primary: boolean;
}

export function selectionVisualState(unitId: number, legacySelectedId: number, ux?: UxFeedback): SelectionVisualState {
  if (!ux) return { selected: unitId === legacySelectedId, primary: unitId === legacySelectedId };
  const selected = ux.selectedUnitIds.includes(unitId);
  const primary = ux.selectedUnitId === unitId;
  return { selected, primary };
}
