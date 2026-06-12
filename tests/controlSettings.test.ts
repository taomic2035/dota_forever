import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONTROL_SETTINGS,
  castInputModeOverrideLabel,
  cycleCastInputOverride,
  castInputModeLabel,
  cycleCastInputMode,
  normalizeControlSettings,
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

  it('normalizes partial settings and rejects unknown modes', () => {
    expect(normalizeControlSettings({ abilityCast: 'quick' })).toEqual({
      ...DEFAULT_CONTROL_SETTINGS,
      abilityCast: 'quick',
    });
    expect(normalizeControlSettings({ abilityCast: 'bad', itemCast: 'smart' })).toEqual({
      ...DEFAULT_CONTROL_SETTINGS,
      itemCast: 'smart',
    });
  });

  it('normalizes fixed per-slot override arrays and rejects unknown modes', () => {
    expect(normalizeControlSettings({
      abilityCast: 'normal',
      itemCast: 'quick',
      abilityCasts: ['quick', 'bad', 'smart', null, 'normal'],
      itemCasts: ['smart', 'normal', 'bad'],
    })).toEqual({
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

  it('provides short display labels', () => {
    expect(castInputModeLabel('normal')).toBe('Normal');
    expect(castInputModeLabel('quick')).toBe('Quick');
    expect(castInputModeLabel('smart')).toBe('Smart');
  });

  it('labels override slots with inherited auto fallback', () => {
    expect(castInputModeOverrideLabel(undefined, 'quick')).toBe('Auto Quick');
    expect(castInputModeOverrideLabel('smart', 'quick')).toBe('Smart');
  });
});
