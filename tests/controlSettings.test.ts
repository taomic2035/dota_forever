import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONTROL_SETTINGS,
  ACTION_LABEL,
  DEFAULT_KEY_BINDS,
  REBINDABLE_ACTIONS,
  applyControlPreset,
  cameraPanSpeedLabel,
  cameraPanSpeedMultiplier,
  castInputModeOverrideLabel,
  cycleCastInputOverride,
  cycleCameraPanSpeed,
  cycleNumberRowMode,
  castInputModeLabel,
  cycleCastInputMode,
  numberRowModeLabel,
  normalizeControlSettings,
  parseCameraPanSpeed,
  parseHudScale,
  cycleHudScale,
  hudScaleLabel,
  hudScaleValue,
  cycleAccessibilityMode,
  accessibilityModeLabel,
  parseAccessibilityMode,
  parseCastInputMode,
  cycleMinimapBackgroundMode,
  cycleMinimapHeroDisplayMode,
  cycleMinimapSide,
  cycleChatWheelPreset,
  chatWheelPresetLabel,
  minimapBackgroundModeLabel,
  minimapHeroDisplayModeLabel,
  minimapSideLabel,
  parseChatWheelPreset,
  normalizeChatWheelCustomLabels,
  parseMinimapBackgroundMode,
  parseMinimapHeroDisplayMode,
  parseMinimapSide,
  resolveAbilityCastMode,
  resolveItemCastMode,
} from '../src/engine/controlSettings';

describe('control settings', () => {
  it('cycles cast modes in normal quick smart order', () => {
    expect(cycleCastInputMode('normal')).toBe('quick');
    expect(cycleCastInputMode('quick')).toBe('smart');
    expect(cycleCastInputMode('smart')).toBe('normal');
  });

  it('parses cast mode query values', () => {
    expect(parseCastInputMode('quick')).toBe('quick');
    expect(parseCastInputMode('smart')).toBe('smart');
    expect(parseCastInputMode('normal')).toBe('normal');
    expect(parseCastInputMode('bad')).toBeUndefined();
    expect(parseCastInputMode(null)).toBeUndefined();
  });

  it('parses camera speed query values', () => {
    expect(parseCameraPanSpeed('slow')).toBe('slow');
    expect(parseCameraPanSpeed('normal')).toBe('normal');
    expect(parseCameraPanSpeed('fast')).toBe('fast');
    expect(parseCameraPanSpeed('bad')).toBeUndefined();
    expect(parseCameraPanSpeed(null)).toBeUndefined();
  });

  it('HUD 缩放:cycle/parse/label/value + 默认', () => {
    expect(cycleHudScale('small')).toBe('normal');
    expect(cycleHudScale('normal')).toBe('large');
    expect(cycleHudScale('large')).toBe('small');
    expect(parseHudScale('small')).toBe('small');
    expect(parseHudScale('bad')).toBeUndefined();
    expect(parseHudScale(null)).toBeUndefined();
    expect(hudScaleLabel('small')).toBe('小');
    expect(hudScaleLabel('normal')).toBe('标准');
    expect(hudScaleLabel('large')).toBe('大');
    expect(hudScaleValue('small')).toBeCloseTo(0.9);
    expect(hudScaleValue('normal')).toBe(1.0);
    expect(hudScaleValue('large')).toBeCloseTo(1.1);
    expect(DEFAULT_CONTROL_SETTINGS.hudScale).toBe('normal');
    expect(normalizeControlSettings({ hudScale: 'large' }).hudScale).toBe('large');
    expect(normalizeControlSettings({ hudScale: 'bad' }).hudScale).toBe('normal');
  });

  it('可访问性模式:cycle/parse/label + 默认', () => {
    expect(cycleAccessibilityMode('standard')).toBe('colorblind');
    expect(cycleAccessibilityMode('colorblind')).toBe('standard');
    expect(parseAccessibilityMode('standard')).toBe('standard');
    expect(parseAccessibilityMode('colorblind')).toBe('colorblind');
    expect(parseAccessibilityMode('bad')).toBeUndefined();
    expect(accessibilityModeLabel('standard')).toBe('标准');
    expect(accessibilityModeLabel('colorblind')).toBe('色盲友好');
    expect(DEFAULT_CONTROL_SETTINGS.accessibilityMode).toBe('standard');
    expect(normalizeControlSettings({ accessibilityMode: 'colorblind' }).accessibilityMode).toBe('colorblind');
    expect(normalizeControlSettings({ accessibilityMode: 'bad' }).accessibilityMode).toBe('standard');
  });

  it('小地图显示设置:cycle/parse/label + 默认', () => {
    expect(cycleMinimapHeroDisplayMode('dots')).toBe('icons');
    expect(cycleMinimapHeroDisplayMode('icons')).toBe('names');
    expect(cycleMinimapHeroDisplayMode('names')).toBe('dots');
    expect(parseMinimapHeroDisplayMode('icons')).toBe('icons');
    expect(parseMinimapHeroDisplayMode('bad')).toBeUndefined();
    expect(minimapHeroDisplayModeLabel('dots')).toBe('点');
    expect(minimapHeroDisplayModeLabel('icons')).toBe('图标');
    expect(minimapHeroDisplayModeLabel('names')).toBe('名字');

    expect(cycleMinimapBackgroundMode('terrain')).toBe('simple');
    expect(cycleMinimapBackgroundMode('simple')).toBe('terrain');
    expect(parseMinimapBackgroundMode('simple')).toBe('simple');
    expect(parseMinimapBackgroundMode('bad')).toBeUndefined();
    expect(minimapBackgroundModeLabel('terrain')).toBe('地形');
    expect(minimapBackgroundModeLabel('simple')).toBe('简洁');

    expect(cycleMinimapSide('right')).toBe('left');
    expect(cycleMinimapSide('left')).toBe('right');
    expect(parseMinimapSide('left')).toBe('left');
    expect(parseMinimapSide('bad')).toBeUndefined();
    expect(minimapSideLabel('right')).toBe('右侧');
    expect(minimapSideLabel('left')).toBe('左侧');

    expect(DEFAULT_CONTROL_SETTINGS.minimapHeroDisplayMode).toBe('dots');
    expect(DEFAULT_CONTROL_SETTINGS.minimapBackgroundMode).toBe('terrain');
    expect(DEFAULT_CONTROL_SETTINGS.minimapSide).toBe('right');
    expect(normalizeControlSettings({
      minimapHeroDisplayMode: 'names',
      minimapBackgroundMode: 'simple',
      minimapSide: 'left',
    })).toEqual({
      ...DEFAULT_CONTROL_SETTINGS,
      minimapHeroDisplayMode: 'names',
      minimapBackgroundMode: 'simple',
      minimapSide: 'left',
    });
    expect(normalizeControlSettings({
      minimapHeroDisplayMode: 'bad',
      minimapBackgroundMode: 'bad',
      minimapSide: 'bad',
    })).toEqual(DEFAULT_CONTROL_SETTINGS);
  });

  it('聊天轮盘预设:cycle/parse/label + 默认', () => {
    expect(cycleChatWheelPreset('balanced')).toBe('objective');
    expect(cycleChatWheelPreset('objective')).toBe('defensive');
    expect(cycleChatWheelPreset('defensive')).toBe('balanced');
    expect(parseChatWheelPreset('objective')).toBe('objective');
    expect(parseChatWheelPreset('bad')).toBeUndefined();
    expect(chatWheelPresetLabel('balanced')).toBe('均衡');
    expect(chatWheelPresetLabel('objective')).toBe('目标');
    expect(chatWheelPresetLabel('defensive')).toBe('防守');
    expect(DEFAULT_CONTROL_SETTINGS.chatWheelPreset).toBe('balanced');
    expect(normalizeControlSettings({ chatWheelPreset: 'defensive' }).chatWheelPreset).toBe('defensive');
    expect(normalizeControlSettings({ chatWheelPreset: 'bad' }).chatWheelPreset).toBe('balanced');
  });

  it('normalizes local chat wheel custom labels without allowing unbounded menu text', () => {
    const labels = normalizeChatWheelCustomLabels([
      '  开雾抓中  ',
      '',
      '控符然后推塔但是这个文本会被截断到合适长度',
      42,
    ]);

    expect(labels).toHaveLength(8);
    expect(labels[0]).toBe('开雾抓中');
    expect(labels[1]).toBe('');
    expect(labels[2]).toHaveLength(12);
    expect(labels[3]).toBe('');
    expect(labels.slice(4)).toEqual(['', '', '', '']);
    expect(normalizeControlSettings({ chatWheelCustomLabels: labels }).chatWheelCustomLabels).toEqual(labels);
    expect(applyControlPreset(normalizeControlSettings({ chatWheelCustomLabels: labels }), 'legacy').chatWheelCustomLabels).toEqual(labels);
  });

  it('normalizes partial settings and rejects unknown modes', () => {
    expect(normalizeControlSettings({ abilityCast: 'quick' })).toEqual({
      ...DEFAULT_CONTROL_SETTINGS,
      abilityCast: 'quick',
    });
    expect(normalizeControlSettings({ abilityCast: 'bad', itemCast: 'smart' })).toEqual({
      ...DEFAULT_CONTROL_SETTINGS,
      itemCast: 'smart',
    });
    expect(normalizeControlSettings({ cameraEdgePan: false, cameraPanSpeed: 'fast' })).toEqual({
      ...DEFAULT_CONTROL_SETTINGS,
      cameraEdgePan: false,
      cameraPanSpeed: 'fast',
    });
    expect(normalizeControlSettings({ cameraEdgePan: 'off', cameraPanSpeed: 'turbo' })).toEqual({
      ...DEFAULT_CONTROL_SETTINGS,
    });
  });

  it('normalizes fixed per-slot override arrays and rejects unknown modes', () => {
    expect(normalizeControlSettings({
      abilityCast: 'normal',
      itemCast: 'quick',
      abilityCasts: ['quick', 'bad', 'smart', null, 'normal'],
      itemCasts: ['smart', 'normal', 'bad'],
    })).toEqual({
      ...DEFAULT_CONTROL_SETTINGS,
      abilityCast: 'normal',
      itemCast: 'quick',
      abilityCasts: ['quick', undefined, 'smart', undefined],
      itemCasts: ['smart', 'normal', undefined, undefined, undefined, undefined],
    });
  });

  it('resolves slot overrides before global modes', () => {
    const settings = normalizeControlSettings({
      abilityCast: 'normal',
      itemCast: 'quick',
      abilityCasts: ['quick'],
      itemCasts: [undefined, 'smart'],
    });
    expect(resolveAbilityCastMode(settings, 0)).toBe('quick');
    expect(resolveAbilityCastMode(settings, 1)).toBe('normal');
    expect(resolveItemCastMode(settings, 0)).toBe('quick');
    expect(resolveItemCastMode(settings, 1)).toBe('smart');
  });

  it('cycles cast override slots through auto then concrete modes', () => {
    expect(cycleCastInputOverride(undefined)).toBe('normal');
    expect(cycleCastInputOverride('normal')).toBe('quick');
    expect(cycleCastInputOverride('quick')).toBe('smart');
    expect(cycleCastInputOverride('smart')).toBeUndefined();
  });

  it('cycles camera pan speeds in slow normal fast order', () => {
    expect(cycleCameraPanSpeed('slow')).toBe('normal');
    expect(cycleCameraPanSpeed('normal')).toBe('fast');
    expect(cycleCameraPanSpeed('fast')).toBe('slow');
  });

  it('cycles number-row mode between items and control groups', () => {
    expect(cycleNumberRowMode('items')).toBe('controlGroups');
    expect(cycleNumberRowMode('controlGroups')).toBe('items');
    expect(numberRowModeLabel('items')).toBe('物品');
    expect(numberRowModeLabel('controlGroups')).toBe('控制组');
  });

  it('provides short display labels', () => {
    expect(castInputModeLabel('normal')).toBe('普通');
    expect(castInputModeLabel('quick')).toBe('快速');
    expect(castInputModeLabel('smart')).toBe('智能');
  });

  it('includes a rebindable subgroup cycle action without using Tab', () => {
    expect(REBINDABLE_ACTIONS).toContain('cycleSubgroup');
    expect(DEFAULT_KEY_BINDS.cycleSubgroup).toBe('c');
    expect(ACTION_LABEL.cycleSubgroup).toContain('子组');
    expect(normalizeControlSettings({}).keyBinds.cycleSubgroup).toBe('c');
    expect(normalizeControlSettings({ keyBinds: { cycleSubgroup: 'x' } }).keyBinds.cycleSubgroup).toBe('x');
  });

  it('includes a rebindable chat wheel action', () => {
    expect(REBINDABLE_ACTIONS).toContain('chatWheel');
    expect(DEFAULT_KEY_BINDS.chatWheel).toBe('y');
    expect(ACTION_LABEL.chatWheel).toContain('聊天');
    expect(normalizeControlSettings({}).keyBinds.chatWheel).toBe('y');
    expect(normalizeControlSettings({ keyBinds: { chatWheel: 'u' } }).keyBinds.chatWheel).toBe('u');
  });

  it('labels override slots with inherited auto fallback', () => {
    expect(castInputModeOverrideLabel(undefined, 'quick')).toBe('自动 快速');
    expect(castInputModeOverrideLabel('smart', 'quick')).toBe('智能');
  });

  it('provides camera speed labels and multipliers', () => {
    expect(cameraPanSpeedLabel('slow')).toBe('慢');
    expect(cameraPanSpeedLabel('normal')).toBe('中');
    expect(cameraPanSpeedLabel('fast')).toBe('快');
    expect(cameraPanSpeedMultiplier('slow')).toBeLessThan(cameraPanSpeedMultiplier('normal'));
    expect(cameraPanSpeedMultiplier('fast')).toBeGreaterThan(cameraPanSpeedMultiplier('normal'));
  });

  it('applies an RTS legacy preset while preserving display accessibility preferences', () => {
    const settings = normalizeControlSettings({
      abilityCast: 'quick',
      itemCast: 'smart',
      abilityCasts: ['quick', 'smart'],
      itemCasts: ['quick'],
      numberRowMode: 'items',
      autoAttack: 'always',
      hudScale: 'large',
      accessibilityMode: 'colorblind',
      minimapHeroDisplayMode: 'names',
      minimapBackgroundMode: 'simple',
      minimapSide: 'left',
      cameraPanSpeed: 'fast',
      keyBinds: { ...DEFAULT_CONTROL_SETTINGS.keyBinds, attackMove: 'x', stop: 'z' },
    });

    expect(applyControlPreset(settings, 'legacy')).toEqual({
      ...DEFAULT_CONTROL_SETTINGS,
      abilityCast: 'normal',
      itemCast: 'normal',
      numberRowMode: 'controlGroups',
      autoAttack: 'standard',
      hudScale: 'large',
      accessibilityMode: 'colorblind',
      minimapHeroDisplayMode: 'names',
      minimapBackgroundMode: 'simple',
      minimapSide: 'left',
      cameraPanSpeed: 'fast',
      keyBinds: DEFAULT_CONTROL_SETTINGS.keyBinds,
    });
  });

  it('applies the modern preset without carrying stale per-slot overrides', () => {
    const settings = normalizeControlSettings({
      abilityCast: 'smart',
      itemCast: 'smart',
      abilityCasts: ['quick', 'smart', 'normal'],
      itemCasts: ['quick', 'smart'],
      numberRowMode: 'controlGroups',
      autoAttack: 'never',
    });

    expect(applyControlPreset(settings, 'modern')).toEqual(DEFAULT_CONTROL_SETTINGS);
  });
});
