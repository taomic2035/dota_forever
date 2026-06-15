import { describe, it, expect } from 'vitest';
import { healthBarTicks } from '../src/render/healthBar';

describe('healthBarTicks', () => {
  it('no internal ticks at or below 250 HP', () => {
    expect(healthBarTicks(250)).toEqual([]);
    expect(healthBarTicks(200)).toEqual([]);
  });

  it('250 minor + 1000 major ticks for a normal hero', () => {
    const ticks = healthBarTicks(2000);
    expect(ticks.map((t) => t.at)).toEqual([0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875]);
    expect(ticks.filter((t) => t.major).map((t) => t.at)).toEqual([0.5]); // only 1000 is major
  });

  it('high-HP units keep only the thousand-line ticks (no minor clutter)', () => {
    const ticks = healthBarTicks(12000);
    expect(ticks.every((t) => t.major)).toBe(true);
    expect(ticks.length).toBe(11); // 1000..11000
  });

  it('respects a custom minor threshold', () => {
    expect(healthBarTicks(3000, 2000).every((t) => t.major)).toBe(true);
    expect(healthBarTicks(3000, 4000).some((t) => !t.major)).toBe(true);
  });
});
