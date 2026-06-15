import { MAX_LEVEL, XP_TABLE } from '../data/balance';

export interface HeroXpHudInput {
  level: number;
  xp: number;
}

export interface HeroXpHudModel {
  level: number;
  xp: number;
  previousLevelXp: number;
  nextLevelXp: number | null;
  currentLevelXp: number;
  currentLevelRequiredXp: number;
  neededForNext: number;
  progress: number;
  percent: number;
  label: string;
  detail: string;
  maxed: boolean;
}

export function buildHeroXpHudModel(input: HeroXpHudInput): HeroXpHudModel {
  const level = clampInt(input.level, 1, MAX_LEVEL);
  const xp = Math.max(0, Math.floor(input.xp));
  const previousLevelXp = level <= 1 ? 0 : XP_TABLE[level - 2] ?? XP_TABLE[XP_TABLE.length - 1] ?? 0;
  const maxed = level >= MAX_LEVEL;
  if (maxed) {
    return {
      level,
      xp,
      previousLevelXp,
      nextLevelXp: null,
      currentLevelXp: 0,
      currentLevelRequiredXp: 0,
      neededForNext: 0,
      progress: 1,
      percent: 100,
      label: 'MAX',
      detail: 'Max level',
      maxed: true,
    };
  }

  const nextLevelXp = XP_TABLE[level - 1] ?? previousLevelXp;
  const currentLevelRequiredXp = Math.max(0, nextLevelXp - previousLevelXp);
  const currentLevelXp = Math.max(0, Math.min(currentLevelRequiredXp, xp - previousLevelXp));
  const neededForNext = Math.max(0, nextLevelXp - xp);
  const progress = currentLevelRequiredXp > 0 ? currentLevelXp / currentLevelRequiredXp : 1;
  const percent = Math.round(progress * 100);

  return {
    level,
    xp,
    previousLevelXp,
    nextLevelXp,
    currentLevelXp,
    currentLevelRequiredXp,
    neededForNext,
    progress,
    percent,
    label: `XP ${currentLevelXp}/${currentLevelRequiredXp}`,
    detail: `${neededForNext} XP to level ${level + 1}`,
    maxed: false,
  };
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.floor(value)));
}
