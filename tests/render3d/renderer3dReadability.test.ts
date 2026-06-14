import { describe, expect, it } from 'vitest';
import { gameplay3DUnitReadabilityProfile } from '../../src/render3d/renderer3d';

describe('3D gameplay unit readability profile', () => {
  it('gives classic hero models more screen presence without letting rings and bars cover them', () => {
    const hero = gameplay3DUnitReadabilityProfile({ isHero: true, isBuilding: false, collisionRadius: 24 });

    expect(hero.modelScale).toBeGreaterThanOrEqual(1.64);
    expect(hero.teamRingOpacity).toBeLessThanOrEqual(0.58);
    expect(hero.teamDiscOpacity).toBeLessThanOrEqual(0.1);
    expect(hero.selectedRingOpacityMin).toBeLessThanOrEqual(0.56);
    expect(hero.selectedRingOpacityMax).toBeLessThanOrEqual(0.72);
    expect(hero.healthAnchorY).toBeGreaterThanOrEqual(146);
    expect(hero.healthBarWidth).toBeGreaterThanOrEqual(48);
    expect(hero.teamRingOuterRadius).toBeLessThan(hero.selectedRingBaseRadius);
  });

  it('keeps non-hero units compact so lane and neutral readability does not bloat', () => {
    const creep = gameplay3DUnitReadabilityProfile({ isHero: false, isBuilding: false, collisionRadius: 18 });

    expect(creep.modelScale).toBe(1);
    expect(creep.teamRingOpacity).toBeCloseTo(0.45);
    expect(creep.teamDiscOpacity).toBe(0);
    expect(creep.healthAnchorY).toBe(112);
    expect(creep.healthBarWidth).toBe(28);
  });

  it('keeps building bars on the high structure anchor', () => {
    const building = gameplay3DUnitReadabilityProfile({ isHero: false, isBuilding: true, collisionRadius: 96 });

    expect(building.modelScale).toBe(1);
    expect(building.healthAnchorY).toBe(320);
    expect(building.healthBarWidth).toBe(40);
    expect(building.teamRingOuterRadius).toBeGreaterThan(100);
  });
});
