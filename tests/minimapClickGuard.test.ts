import { describe, expect, it } from 'vitest';
import { MINIMAP_MISCLICK_GUARD_MS, shouldAllowMinimapAction } from '../src/ui/minimapClickGuard';

describe('minimapClickGuard', () => {
  it('blocks non-ping minimap actions before the hover guard expires', () => {
    expect(shouldAllowMinimapAction({
      nowMs: 1_000,
      hoverStartedAtMs: 940,
      isPing: false,
    })).toBe(false);
  });

  it('allows camera and move actions after the hover guard expires', () => {
    expect(shouldAllowMinimapAction({
      nowMs: 1_000,
      hoverStartedAtMs: 1_000 - MINIMAP_MISCLICK_GUARD_MS,
      isPing: false,
    })).toBe(true);
  });

  it('lets explicit Alt ping bypass the guard immediately', () => {
    expect(shouldAllowMinimapAction({
      nowMs: 1_000,
      hoverStartedAtMs: null,
      isPing: true,
    })).toBe(true);
  });
});
