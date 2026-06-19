import { describe, expect, it } from 'vitest';
import { buildGameSpeedHudModel } from '../src/ui/gameSpeedHudModel';

describe('buildGameSpeedHudModel', () => {
  it('hides the chip at normal unpaused speed', () => {
    expect(buildGameSpeedHudModel({ speed: 1, paused: false })).toEqual({
      visible: false,
      label: '1x',
      title: 'Game speed: 1x',
      tone: 'normal',
    });
  });

  it('shows slow and fast speed multipliers', () => {
    expect(buildGameSpeedHudModel({ speed: 0.5, paused: false })).toMatchObject({
      visible: true,
      label: '0.5x',
      tone: 'slow',
    });
    expect(buildGameSpeedHudModel({ speed: 4, paused: false })).toMatchObject({
      visible: true,
      label: '4x',
      tone: 'fast',
    });
  });

  it('prioritizes paused state over the current speed', () => {
    expect(buildGameSpeedHudModel({ speed: 8, paused: true })).toEqual({
      visible: true,
      label: '暂停',
      title: 'Game paused at 8x',
      tone: 'paused',
    });
  });
});

