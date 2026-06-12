import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONTROL_SETTINGS,
  castInputModeLabel,
  cycleCastInputMode,
  normalizeControlSettings,
  parseCastInputMode,
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

  it('provides short display labels', () => {
    expect(castInputModeLabel('normal')).toBe('Normal');
    expect(castInputModeLabel('quick')).toBe('Quick');
    expect(castInputModeLabel('smart')).toBe('Smart');
  });
});
