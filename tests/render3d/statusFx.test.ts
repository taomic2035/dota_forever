import { describe, expect, it } from 'vitest';
import { heroStatusFxState } from '../../src/render3d/statusFx';

describe('heroStatusFxState', () => {
  it('shows a stun ring only while stunned', () => {
    const on = heroStatusFxState({ castGlow: 0, channelPulse: 0, stunStars: 0.9, invisibilityAlpha: 1, t: 0.4 });
    const off = heroStatusFxState({ castGlow: 0, channelPulse: 0, stunStars: 0, invisibilityAlpha: 1, t: 0.4 });

    expect(on.stunRing.visible).toBe(true);
    expect(on.stunRing.opacity).toBeGreaterThan(0.55);
    expect(on.stunRing.rotation).not.toBe(0);
    expect(off.stunRing.visible).toBe(false);
  });

  it('turns cast/channel pose energy into a visible glow scale', () => {
    const cast = heroStatusFxState({ castGlow: 0.8, channelPulse: 0, stunStars: 0, invisibilityAlpha: 1, t: 0 });
    const channel = heroStatusFxState({ castGlow: 0.6, channelPulse: 0.9, stunStars: 0, invisibilityAlpha: 1, t: 0 });

    expect(cast.castGlow.visible).toBe(true);
    expect(channel.castGlow.scale).toBeGreaterThan(cast.castGlow.scale);
    expect(channel.castGlow.opacity).toBeGreaterThan(cast.castGlow.opacity);
  });

  it('caps V24 cast and channel glow so the effect does not cover the hero model', () => {
    const overloaded = heroStatusFxState({ castGlow: 1.2, channelPulse: 1.2, stunStars: 0, invisibilityAlpha: 1, t: 0.2 });

    expect(overloaded.readabilityBudget).toMatchObject({
      pass: 'v24-play-camera-fx-occlusion-budget',
      maxCastGlowOpacity: 0.48,
      maxCastGlowScale: 1.18,
    });
    expect(overloaded.castGlow.opacity).toBeLessThanOrEqual(overloaded.readabilityBudget.maxCastGlowOpacity);
    expect(overloaded.castGlow.scale).toBeLessThanOrEqual(overloaded.readabilityBudget.maxCastGlowScale);
    expect(overloaded.castGlow.visible).toBe(true);
  });

  it('shows a soft shell for invisible units', () => {
    const v = heroStatusFxState({ castGlow: 0, channelPulse: 0, stunStars: 0, invisibilityAlpha: 0.42, t: 1 });

    expect(v.invisShell.visible).toBe(true);
    expect(v.invisShell.opacity).toBeGreaterThan(0.16);
    expect(v.invisShell.opacity).toBeLessThan(0.5);
  });
});
