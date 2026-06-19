import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONTROL_SETTINGS,
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
});
