export const CAST_INPUT_MODES = ['normal', 'quick', 'smart'] as const;
export type CastInputMode = (typeof CAST_INPUT_MODES)[number];

export interface ControlSettings {
  abilityCast: CastInputMode;
  itemCast: CastInputMode;
}

export const DEFAULT_CONTROL_SETTINGS: ControlSettings = {
  abilityCast: 'normal',
  itemCast: 'normal',
};

export function parseCastInputMode(value: unknown): CastInputMode | undefined {
  if (typeof value !== 'string') return undefined;
  return CAST_INPUT_MODES.includes(value as CastInputMode) ? value as CastInputMode : undefined;
}

export function normalizeControlSettings(input: unknown): ControlSettings {
  const raw = typeof input === 'object' && input !== null ? input as Record<string, unknown> : {};
  return {
    abilityCast: parseCastInputMode(raw.abilityCast) ?? DEFAULT_CONTROL_SETTINGS.abilityCast,
    itemCast: parseCastInputMode(raw.itemCast) ?? DEFAULT_CONTROL_SETTINGS.itemCast,
  };
}

export function cycleCastInputMode(mode: CastInputMode): CastInputMode {
  const index = CAST_INPUT_MODES.indexOf(mode);
  return CAST_INPUT_MODES[(index + 1) % CAST_INPUT_MODES.length];
}

export function castInputModeLabel(mode: CastInputMode): string {
  if (mode === 'quick') return 'Quick';
  if (mode === 'smart') return 'Smart';
  return 'Normal';
}
