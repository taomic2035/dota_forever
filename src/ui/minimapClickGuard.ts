export const MINIMAP_MISCLICK_GUARD_MS = 120;

export interface MinimapClickGuardInput {
  nowMs: number;
  hoverStartedAtMs: number | null;
  isPing: boolean;
  guardMs?: number;
}

export function shouldAllowMinimapAction(input: MinimapClickGuardInput): boolean {
  if (input.isPing) return true;
  if (input.hoverStartedAtMs === null) return false;
  const guardMs = input.guardMs ?? MINIMAP_MISCLICK_GUARD_MS;
  return input.nowMs - input.hoverStartedAtMs >= guardMs;
}
