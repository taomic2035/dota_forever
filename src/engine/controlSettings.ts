export const CAST_INPUT_MODES = ['normal', 'quick', 'smart'] as const;
export type CastInputMode = (typeof CAST_INPUT_MODES)[number];
export type CastInputOverride = CastInputMode | undefined;
export const CAMERA_PAN_SPEEDS = ['slow', 'normal', 'fast'] as const;
export type CameraPanSpeed = (typeof CAMERA_PAN_SPEEDS)[number];
export const NUMBER_ROW_MODES = ['items', 'controlGroups'] as const;
export type NumberRowMode = (typeof NUMBER_ROW_MODES)[number];

export const ABILITY_CAST_SLOT_COUNT = 4;
export const ITEM_CAST_SLOT_COUNT = 6;

/** 可改键的动作(系统键 空格/Tab/P/Esc/方向/Alt/Shift 不可改,避免与修饰键/镜头冲突)。 */
export const REBINDABLE_ACTIONS = [
  'ability0', 'ability1', 'ability2', 'ability3',
  'item0', 'item1', 'item2', 'item3', 'item4', 'item5',
  'tp', 'attackMove', 'stop', 'hold', 'shop', 'glyph',
  'selectHero', 'selectCourier', 'selectAllControlled',
] as const;
export type RebindAction = (typeof REBINDABLE_ACTIONS)[number];

/** 默认键 = switch 的规范键(改键后由翻译层把物理键映射回规范键,switch 不动)。 */
export const DEFAULT_KEY_BINDS: Record<RebindAction, string> = {
  ability0: 'q', ability1: 'w', ability2: 'e', ability3: 'r',
  item0: '1', item1: '2', item2: '3', item3: '4', item4: '5', item5: '6',
  tp: 't', attackMove: 'a', stop: 's', hold: 'h', shop: 'f', glyph: 'g',
  selectHero: 'f1', selectCourier: 'f2', selectAllControlled: 'f3',
};

/** 改键友好名(UI 显示)。 */
export const ACTION_LABEL: Record<RebindAction, string> = {
  ability0: '技能 Q', ability1: '技能 W', ability2: '技能 E', ability3: '技能 R',
  item0: '物品 1', item1: '物品 2', item2: '物品 3', item3: '物品 4', item4: '物品 5', item5: '物品 6',
  tp: '回城', attackMove: '攻击移动', stop: '停止', hold: '守住', shop: '商店', glyph: '守护符',
  selectHero: '选择英雄', selectCourier: '选择信使', selectAllControlled: '全选可控',
};

export interface ControlSettings {
  abilityCast: CastInputMode;
  itemCast: CastInputMode;
  abilityCasts: CastInputOverride[];
  itemCasts: CastInputOverride[];
  cameraEdgePan: boolean;
  cameraPanSpeed: CameraPanSpeed;
  numberRowMode: NumberRowMode;
  /** 动作→物理键(默认 DEFAULT_KEY_BINDS)。 */
  keyBinds: Record<string, string>;
}

export const DEFAULT_CONTROL_SETTINGS: ControlSettings = {
  abilityCast: 'normal',
  itemCast: 'normal',
  abilityCasts: emptyOverrideList(ABILITY_CAST_SLOT_COUNT),
  itemCasts: emptyOverrideList(ITEM_CAST_SLOT_COUNT),
  cameraEdgePan: true,
  cameraPanSpeed: 'normal',
  numberRowMode: 'items',
  keyBinds: { ...DEFAULT_KEY_BINDS },
};

/** 物理键→规范键(switch 用):每个动作把其当前物理键映射回默认键。默认绑定下为恒等。 */
export function buildKeyTranslation(binds: Record<string, string>): Record<string, string> {
  const t: Record<string, string> = {};
  for (const action of REBINDABLE_ACTIONS) {
    const physical = (binds[action] ?? DEFAULT_KEY_BINDS[action]).toLowerCase();
    t[physical] = DEFAULT_KEY_BINDS[action];
  }
  return t;
}

/** 规范化改键表:仅取已知动作,值为单键小写;缺失/非法回落默认。 */
export function normalizeKeyBinds(input: unknown): Record<string, string> {
  const raw = typeof input === 'object' && input !== null ? input as Record<string, unknown> : {};
  const out: Record<string, string> = {};
  for (const action of REBINDABLE_ACTIONS) {
    const v = raw[action];
    out[action] = typeof v === 'string' && v.length >= 1 ? v.toLowerCase() : DEFAULT_KEY_BINDS[action];
  }
  return out;
}

export function parseCastInputMode(value: unknown): CastInputMode | undefined {
  if (typeof value !== 'string') return undefined;
  return CAST_INPUT_MODES.includes(value as CastInputMode) ? value as CastInputMode : undefined;
}

export function parseCameraPanSpeed(value: unknown): CameraPanSpeed | undefined {
  if (typeof value !== 'string') return undefined;
  return CAMERA_PAN_SPEEDS.includes(value as CameraPanSpeed) ? value as CameraPanSpeed : undefined;
}

export function parseNumberRowMode(value: unknown): NumberRowMode | undefined {
  if (typeof value !== 'string') return undefined;
  return NUMBER_ROW_MODES.includes(value as NumberRowMode) ? value as NumberRowMode : undefined;
}

export function normalizeControlSettings(input: unknown): ControlSettings {
  const raw = typeof input === 'object' && input !== null ? input as Record<string, unknown> : {};
  return {
    abilityCast: parseCastInputMode(raw.abilityCast) ?? DEFAULT_CONTROL_SETTINGS.abilityCast,
    itemCast: parseCastInputMode(raw.itemCast) ?? DEFAULT_CONTROL_SETTINGS.itemCast,
    abilityCasts: normalizeOverrideList(raw.abilityCasts, ABILITY_CAST_SLOT_COUNT),
    itemCasts: normalizeOverrideList(raw.itemCasts, ITEM_CAST_SLOT_COUNT),
    cameraEdgePan: typeof raw.cameraEdgePan === 'boolean'
      ? raw.cameraEdgePan
      : DEFAULT_CONTROL_SETTINGS.cameraEdgePan,
    cameraPanSpeed: parseCameraPanSpeed(raw.cameraPanSpeed) ?? DEFAULT_CONTROL_SETTINGS.cameraPanSpeed,
    numberRowMode: parseNumberRowMode(raw.numberRowMode) ?? DEFAULT_CONTROL_SETTINGS.numberRowMode,
    keyBinds: normalizeKeyBinds(raw.keyBinds),
  };
}

export function cycleCastInputMode(mode: CastInputMode): CastInputMode {
  const index = CAST_INPUT_MODES.indexOf(mode);
  return CAST_INPUT_MODES[(index + 1) % CAST_INPUT_MODES.length];
}

export function castInputModeLabel(mode: CastInputMode): string {
  if (mode === 'quick') return '快速';
  if (mode === 'smart') return '智能';
  return '普通';
}

export function cycleCameraPanSpeed(speed: CameraPanSpeed): CameraPanSpeed {
  const index = CAMERA_PAN_SPEEDS.indexOf(speed);
  return CAMERA_PAN_SPEEDS[(index + 1) % CAMERA_PAN_SPEEDS.length];
}

export function cycleNumberRowMode(mode: NumberRowMode): NumberRowMode {
  return mode === 'items' ? 'controlGroups' : 'items';
}

export function numberRowModeLabel(mode: NumberRowMode): string {
  return mode === 'controlGroups' ? '控制组' : '物品';
}

export function cameraPanSpeedLabel(speed: CameraPanSpeed): string {
  if (speed === 'slow') return '慢';
  if (speed === 'fast') return '快';
  return '中';
}

export function cameraPanSpeedMultiplier(speed: CameraPanSpeed): number {
  if (speed === 'slow') return 0.75;
  if (speed === 'fast') return 1.45;
  return 1.1;
}

export function cycleCastInputOverride(mode: CastInputOverride): CastInputOverride {
  if (!mode) return 'normal';
  return mode === 'smart' ? undefined : cycleCastInputMode(mode);
}

export function castInputModeOverrideLabel(mode: CastInputOverride, fallback: CastInputMode): string {
  return mode ? castInputModeLabel(mode) : `自动 ${castInputModeLabel(fallback)}`;
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
