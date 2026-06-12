import type { TargetTeamFilter } from '../engine/targetFilters';
import type { CursorTargetHint } from './uxFeedback';

export type CursorTargetMode = 'none' | 'passive' | 'point' | 'unit' | 'line' | 'area';

export function cursorTargetHintFor(
  mode: CursorTargetMode | undefined,
  targetTeam?: TargetTeamFilter,
): CursorTargetHint | undefined {
  if (mode === 'point' || mode === 'area' || mode === 'line') return 'ground';
  if (mode === 'unit') return targetTeam ?? 'any';
  return undefined;
}
