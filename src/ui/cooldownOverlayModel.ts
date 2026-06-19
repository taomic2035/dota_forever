export interface CooldownOverlayInput {
  now: number;
  cooldownUntil: number;
  totalCooldown: number;
}

export interface CooldownOverlayModel {
  active: boolean;
  label: string;
  remainingSeconds: number;
  progress: number;
  sweepDegrees: number;
  tone: 'ready' | 'cooldown' | 'readying';
}

export function buildCooldownOverlayModel(input: CooldownOverlayInput): CooldownOverlayModel {
  const remainingSeconds = Math.max(0, input.cooldownUntil - input.now);
  if (!(remainingSeconds > 0)) {
    return {
      active: false,
      label: '',
      remainingSeconds: 0,
      progress: 0,
      sweepDegrees: 0,
      tone: 'ready',
    };
  }
  const denom = input.totalCooldown > 0 ? input.totalCooldown : remainingSeconds;
  const progress = clamp01(remainingSeconds / denom);
  return {
    active: true,
    label: String(Math.ceil(remainingSeconds)),
    remainingSeconds: round1(remainingSeconds),
    progress,
    sweepDegrees: Math.round(progress * 360),
    tone: remainingSeconds <= 2 ? 'readying' : 'cooldown',
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
