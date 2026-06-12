import { describe, expect, it } from 'vitest';
import { UxFeedback } from '../src/ui/uxFeedback';

describe('UxFeedback', () => {
  it('expires world pulses deterministically', () => {
    const ux = new UxFeedback();
    ux.addWorldPulse({ kind: 'move', pos: { x: 100, y: 200 }, time: 10 });

    expect(ux.worldPulsesAt(10.1)).toHaveLength(1);
    expect(ux.worldPulsesAt(10.7)).toHaveLength(0);
  });

  it('tracks targeting mode and clears it after confirm or cancel', () => {
    const ux = new UxFeedback();
    ux.setTargeting({ abilityIndex: 1, mode: 'line', origin: { x: 10, y: 20 }, range: 900, radius: 110 });

    expect(ux.targeting?.abilityIndex).toBe(1);
    expect(ux.targeting?.mode).toBe('line');

    ux.clearTargeting();
    expect(ux.targeting).toBeNull();
  });

  it('records HUD slot flashes by stable key', () => {
    const ux = new UxFeedback();
    ux.flashHudSlot('ability-2', 'reject', 5);

    expect(ux.hudFlashFor('ability-2', 5.2)?.kind).toBe('reject');
    expect(ux.hudFlashFor('ability-2', 5.7)).toBeNull();
  });

  it('replaces targeting state when a new ability is selected', () => {
    const ux = new UxFeedback();
    ux.setTargeting({ abilityIndex: 0, mode: 'area', origin: { x: 0, y: 0 }, range: 600, radius: 250 });
    ux.setTargeting({ abilityIndex: 2, mode: 'unit', origin: { x: 50, y: 60 }, range: 700 });

    expect(ux.targeting).toEqual({ abilityIndex: 2, mode: 'unit', origin: { x: 50, y: 60 }, range: 700 });
  });
});
