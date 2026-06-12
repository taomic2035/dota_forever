import { describe, expect, it } from 'vitest';
import { Team } from '../src/sim/map';
import { projectileVisualFor } from '../src/render/projectileReadability';

describe('projectile readability visuals', () => {
  it('classifies tower attacks as heavy tower lances', () => {
    const visual = projectileVisualFor({ kind: 'attack', sourceTeam: Team.Dawn, sourceKind: 'tower' });

    expect(visual.family).toBe('tower');
    expect(visual.length).toBeGreaterThan(60);
    expect(visual.thickness).toBeGreaterThan(6);
  });

  it('keeps normal ranged attacks as slim physical bolts', () => {
    const visual = projectileVisualFor({ kind: 'attack', sourceTeam: Team.Night, sourceKind: 'hero' });

    expect(visual.family).toBe('physical');
    expect(visual.color).toBe('#ff9e80');
    expect(visual.thickness).toBeLessThan(7);
  });

  it('classifies ability projectiles as magic orbs with style color', () => {
    const visual = projectileVisualFor({ kind: 'ability', sourceTeam: Team.Dawn, sourceKind: 'hero', style: 'hammer' });

    expect(visual.family).toBe('ability');
    expect(visual.color).toBe('#ffd54f');
    expect(visual.glow).toBeGreaterThan(0);
  });
});
