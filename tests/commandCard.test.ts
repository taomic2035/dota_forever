import { describe, expect, it } from 'vitest';
import { buildCommandCard, buildSelectionSummary } from '../src/ui/commandCard';
import { DEFAULT_CONTROL_SETTINGS } from '../src/engine/controlSettings';

describe('buildCommandCard', () => {
  it('exposes Dota-style command buttons with current hotkeys', () => {
    const card = buildCommandCard(DEFAULT_CONTROL_SETTINGS);

    expect(card.map((button) => button.action)).toEqual([
      'move',
      'attackMove',
      'stop',
      'hold',
      'selectHero',
      'selectCourier',
      'selectAllControlled',
      'glyph',
      'shop',
    ]);
    expect(card.find((button) => button.action === 'attackMove')?.hotkey).toBe('A');
    expect(card.find((button) => button.action === 'selectHero')?.hotkey).toBe('F1');
    expect(card.find((button) => button.action === 'selectCourier')?.hotkey).toBe('F2');
    expect(card.find((button) => button.action === 'selectAllControlled')?.hotkey).toBe('F3');
    expect(card.find((button) => button.action === 'move')?.hotkey).toBe('RMB');
  });

  it('reflects custom key bindings for visible commands', () => {
    const card = buildCommandCard({
      ...DEFAULT_CONTROL_SETTINGS,
      keyBinds: {
        ...DEFAULT_CONTROL_SETTINGS.keyBinds,
        attackMove: 'x',
        selectHero: 'home',
      },
    });

    expect(card.find((button) => button.action === 'attackMove')?.hotkey).toBe('X');
    expect(card.find((button) => button.action === 'selectHero')?.hotkey).toBe('HOME');
  });
});

describe('buildSelectionSummary', () => {
  it('summarizes multi-unit commandable selections by unit role', () => {
    const summary = buildSelectionSummary({
      primaryName: 'Zola',
      commandableUnits: [
        { kind: 'hero' },
        { kind: 'creep', summonOwnerId: 1 },
        { kind: 'illusion', summonOwnerId: 1 },
        { kind: 'courier' },
      ],
    });

    expect(summary).toEqual({
      visible: true,
      title: '4 selected',
      detail: 'Zola · Hero 1 · Summon 1 · Illusion 1 · Courier 1',
    });
  });

  it('hides the summary for single-unit selections', () => {
    const summary = buildSelectionSummary({
      primaryName: 'Zola',
      commandableUnits: [{ kind: 'hero' }],
    });

    expect(summary.visible).toBe(false);
  });
});
