import { describe, expect, it } from 'vitest';
import { buildCooldownOverlayModel } from '../src/ui/cooldownOverlayModel';

describe('buildCooldownOverlayModel', () => {
  it('stays inactive when the slot is ready', () => {
    expect(buildCooldownOverlayModel({ now: 12, cooldownUntil: 10, totalCooldown: 8 })).toEqual({
      active: false,
      label: '',
      remainingSeconds: 0,
      progress: 0,
      sweepDegrees: 0,
      tone: 'ready',
    });
  });

  it('returns a clamped radial sweep for active cooldowns', () => {
    expect(buildCooldownOverlayModel({ now: 10, cooldownUntil: 16, totalCooldown: 12 })).toEqual({
      active: true,
      label: '6',
      remainingSeconds: 6,
      progress: 0.5,
      sweepDegrees: 180,
      tone: 'cooldown',
    });
  });

  it('marks the final seconds as a readying state for HUD polish', () => {
    expect(buildCooldownOverlayModel({ now: 14.7, cooldownUntil: 16, totalCooldown: 12 })).toMatchObject({
      active: true,
      label: '2',
      remainingSeconds: 1.3,
      tone: 'readying',
    });
  });

  it('falls back to a full sweep when the total cooldown is unavailable', () => {
    expect(buildCooldownOverlayModel({ now: 10, cooldownUntil: 14, totalCooldown: 0 })).toMatchObject({
      active: true,
      progress: 1,
      sweepDegrees: 360,
      label: '4',
    });
  });
});
