export interface VisualStateInput {
  now: number;
  lastDamagedAt: number;
  stunned: boolean;
  invisible: boolean;
  t: number;
}

export interface VisualState3D {
  emissive: [number, number, number];
  opacity: number;
  hitFlash: number;
  stunStars: number;
  invisibilityShimmer: number;
}

export function visualStateFor3D(i: VisualStateInput): VisualState3D {
  const hitAge = i.now - i.lastDamagedAt;
  const hitFlash = hitAge >= 0 && hitAge < 0.16 ? 1 - hitAge / 0.16 : 0;
  const stunPulse = i.stunned ? 0.72 + 0.28 * (0.5 + 0.5 * Math.sin(i.t * 12)) : 0;
  const invisibilityShimmer = i.invisible ? 0.18 + 0.12 * (0.5 + 0.5 * Math.sin(i.t * 5.5)) : 0;

  if (hitFlash > 0) {
    const hot = 0.78 + hitFlash * 0.22;
    return {
      emissive: [hot, hot, hot],
      opacity: i.invisible ? 0.5 : 1,
      hitFlash,
      stunStars: stunPulse,
      invisibilityShimmer,
    };
  }

  if (i.stunned) {
    return {
      emissive: [stunPulse, stunPulse * 0.58, 0.08],
      opacity: i.invisible ? 0.5 : 1,
      hitFlash,
      stunStars: stunPulse,
      invisibilityShimmer,
    };
  }

  if (i.invisible) {
    return {
      emissive: [0.08, 0.04, 0.16 + invisibilityShimmer],
      opacity: 0.42,
      hitFlash,
      stunStars: 0,
      invisibilityShimmer,
    };
  }

  return {
    emissive: [0, 0, 0],
    opacity: 1,
    hitFlash: 0,
    stunStars: 0,
    invisibilityShimmer: 0,
  };
}
