import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONTROL_SETTINGS,
  DEFAULT_KEY_BINDS,
  captureRebindKey,
  normalizeControlSettings,
  normalizeKeyBinds,
} from '../src/engine/controlSettings';

describe('control key binds for selection commands', () => {
  it('keeps number row item hotkeys while adding selection command defaults', () => {
    const binds = normalizeKeyBinds({});

    expect(binds.item0).toBe('1');
    expect(binds.item5).toBe('6');
    expect(DEFAULT_KEY_BINDS.selectHero).toBe('f1');
    expect(DEFAULT_KEY_BINDS.selectCourier).toBe('f2');
    expect(DEFAULT_KEY_BINDS.selectAllControlled).toBe('f3');
    expect(binds.selectHero).toBe('f1');
    expect(binds.selectCourier).toBe('f2');
    expect(binds.selectAllControlled).toBe('f3');
  });

  it('keeps item number row as the default number-row mode', () => {
    expect(DEFAULT_CONTROL_SETTINGS.numberRowMode).toBe('items');
    expect(normalizeControlSettings({ numberRowMode: 'controlGroups' }).numberRowMode).toBe('controlGroups');
    expect(normalizeControlSettings({ numberRowMode: 'bad' }).numberRowMode).toBe('items');
  });

  it('captures a rebind and swaps conflicts to keep one action per key', () => {
    const binds = {
      ...DEFAULT_KEY_BINDS,
      attackMove: 'a',
      stop: 's',
    };

    expect(captureRebindKey(binds, 'attackMove', 'S')).toEqual({
      changed: true,
      keyBinds: {
        ...DEFAULT_KEY_BINDS,
        attackMove: 's',
        stop: 'a',
      },
    });
  });

  it('cancels escape or empty captures without mutating binds', () => {
    const binds = { ...DEFAULT_KEY_BINDS, attackMove: 'x' };

    expect(captureRebindKey(binds, 'attackMove', 'Escape')).toEqual({
      changed: false,
      keyBinds: binds,
    });
    expect(captureRebindKey(binds, 'attackMove', '')).toEqual({
      changed: false,
      keyBinds: binds,
    });
  });
});
