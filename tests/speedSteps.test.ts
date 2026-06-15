import { describe, it, expect } from 'vitest';
import { steppedSpeed, SPEED_STEPS } from '../src/engine/loop';

describe('steppedSpeed (spectator/game speed control via =/-)', () => {
  it('steps up and down through the fixed steps', () => {
    expect(SPEED_STEPS).toEqual([0.5, 1, 2, 4, 8]);
    expect(steppedSpeed(1, 1)).toBe(2);
    expect(steppedSpeed(2, 1)).toBe(4);
    expect(steppedSpeed(4, 1)).toBe(8);
    expect(steppedSpeed(2, -1)).toBe(1);
    expect(steppedSpeed(1, -1)).toBe(0.5);
  });

  it('clamps at the ends', () => {
    expect(steppedSpeed(8, 1)).toBe(8);
    expect(steppedSpeed(0.5, -1)).toBe(0.5);
  });

  it('snaps a non-standard speed to the nearest step before stepping', () => {
    expect(steppedSpeed(3, -1)).toBe(2); // 3 → snaps to 4, down → 2
    expect(steppedSpeed(3, 1)).toBe(8);  // 3 → snaps to 4, up → 8
  });
});
