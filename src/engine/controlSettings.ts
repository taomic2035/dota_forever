export const CAST_INPUT_MODES = ['normal', 'quick', 'smart'] as const;
export type CastInputMode = (typeof CAST_INPUT_MODES)[number];
export type CastInputOverride = CastInputMode | undefined;

export const ABILITY_CAST_SLOT_COUNT = 4;
export const ITEM_CAST_SLOT_COUNT = 6;

export interface ControlSettings {
  abilityCast: CastInputMode;
  itemCast: CastInputMode;
  abilityCasts: CastInputOverride[];
  itemCasts: CastInputOverride[];
}

export const DEFAULT_CONTROL_SETTINGS: ControlSettings = {
  abilityCast: 'normal',
  itemCast: 'normal',
  abilityCasts: emptyOverrideList(ABILITY_CAST_SLOT_COUNT),
  itemCasts: emptyOverrideList(ITEM_CAST_SLOT_COUNT),
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
    abilityCasts: normalizeOverrideList(raw.abilityCasts, ABILITY_CAST_SLOT_COUNT),
    itemCasts: normalizeOverrideList(raw.itemCasts, ITEM_CAST_SLOT_COUNT),
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

export function cycleCastInputOverride(mode: CastInputOverride): CastInputOverride {
  if (!mode) return 'normal';
  return mode === 'smart' ? undefined : cycleCastInputMode(mode);
}

export function castInputModeOverrideLabel(mode: CastInputOverride, fallback: CastInputMode): string {
  return mode ? castInputModeLabel(mode) : `Auto ${castInputModeLabel(fallback)}`;
}

export function resolveAbilityCastMode(settings: ControlSettings, index: number): CastInputMode {
  return settings.abilityCasts[index] ?? settings.abilityCast;
}

export function resolveItemCastMode(settings: ControlSettings, index: number): CastInputMode {
  return settings.itemCasts[index] ?? settings.itemCast;
}

function normalizeOverrideList(input: unknown, length: number): CastInputOverride[] {
  const raw = Array.isArray(input) ? input : [];
  return Array.from({ length }, (_, index) => parseCastInputMode(raw[index]));
}

function emptyOverrideList(length: number): CastInputOverride[] {
  return Array.from({ length }, () => undefined);
}
