export type GameSpeedHudTone = 'normal' | 'slow' | 'fast' | 'paused';

export interface GameSpeedHudModel {
  visible: boolean;
  label: string;
  title: string;
  tone: GameSpeedHudTone;
}

export interface GameSpeedHudInput {
  speed: number;
  paused?: boolean;
}

export function buildGameSpeedHudModel(input: GameSpeedHudInput): GameSpeedHudModel {
  const speed = normalizeSpeed(input.speed);
  const label = formatSpeed(speed);
  if (input.paused) {
    return {
      visible: true,
      label: '暂停',
      title: `Game paused at ${label}`,
      tone: 'paused',
    };
  }
  return {
    visible: Math.abs(speed - 1) > 0.001,
    label,
    title: `Game speed: ${label}`,
    tone: speed < 1 ? 'slow' : speed > 1 ? 'fast' : 'normal',
  };
}

function normalizeSpeed(speed: number): number {
  return Number.isFinite(speed) && speed > 0 ? speed : 1;
}

function formatSpeed(speed: number): string {
  return `${Number.isInteger(speed) ? speed.toFixed(0) : speed.toFixed(1)}x`;
}

