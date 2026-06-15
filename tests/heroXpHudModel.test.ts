import { describe, expect, it } from 'vitest';
import { buildHeroXpHudModel } from '../src/ui/heroXpHudModel';

describe('hero XP HUD model', () => {
  it('shows level 1 progress toward level 2', () => {
    expect(buildHeroXpHudModel({ level: 1, xp: 50 })).toEqual({
      level: 1,
      xp: 50,
      previousLevelXp: 0,
      nextLevelXp: 200,
      currentLevelXp: 50,
      currentLevelRequiredXp: 200,
      neededForNext: 150,
      progress: 0.25,
      percent: 25,
      label: 'XP 50/200',
      detail: '150 XP to level 2',
      maxed: false,
    });
  });

  it('uses cumulative XP thresholds for higher levels', () => {
    expect(buildHeroXpHudModel({ level: 3, xp: 650 })).toMatchObject({
      previousLevelXp: 500,
      nextLevelXp: 900,
      currentLevelXp: 150,
      currentLevelRequiredXp: 400,
      neededForNext: 250,
      progress: 0.375,
      percent: 38,
      label: 'XP 150/400',
      detail: '250 XP to level 4',
      maxed: false,
    });
  });

  it('reports max level as complete without a next threshold', () => {
    expect(buildHeroXpHudModel({ level: 25, xp: 99999 })).toEqual({
      level: 25,
      xp: 99999,
      previousLevelXp: 32400,
      nextLevelXp: null,
      currentLevelXp: 0,
      currentLevelRequiredXp: 0,
      neededForNext: 0,
      progress: 1,
      percent: 100,
      label: 'MAX',
      detail: 'Max level',
      maxed: true,
    });
  });
});
