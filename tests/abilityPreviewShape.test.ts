import { describe, it, expect } from 'vitest';
import { abilityPreviewShape, DEFAULT_AREA_RADIUS } from '../src/engine/abilityPreviewShape';
import { LIYA_Q } from '../src/data/heroes/liya';
import type { AbilityDef } from '../src/data/heroes/types';

function ability(over: Partial<AbilityDef>): AbilityDef {
  return { key: 'x', name: 'x', maxLevel: 4, targetMode: 'point', tags: [], description: '', ...over };
}

describe('abilityPreviewShape', () => {
  it('unit-target → unit reticle', () => {
    expect(abilityPreviewShape(ability({ targetMode: 'unit' }), 1)).toEqual({ kind: 'unit' });
  });

  it('point + aoeRadius → real area radius per level (liya_nova = 400)', () => {
    expect(abilityPreviewShape(LIYA_Q, 1)).toEqual({ kind: 'area', radius: 400 });
    expect(abilityPreviewShape(LIYA_Q, 4)).toEqual({ kind: 'area', radius: 400 });
  });

  it('point without aoeRadius falls back to the default radius (no regression)', () => {
    expect(abilityPreviewShape(ability({ targetMode: 'point' }), 1)).toEqual({
      kind: 'area', radius: DEFAULT_AREA_RADIUS,
    });
  });

  it('point + lineWidth → line shape sized by castRange length', () => {
    const def = ability({ targetMode: 'point', lineWidth: 120, castRange: [900, 1000, 1100, 1200] });
    expect(abilityPreviewShape(def, 2)).toEqual({ kind: 'line', width: 120, length: 1000 });
  });

  it('none / passive → bare point (no area ring)', () => {
    expect(abilityPreviewShape(ability({ targetMode: 'none' }), 1)).toEqual({ kind: 'point' });
    expect(abilityPreviewShape(ability({ targetMode: 'passive' }), 1)).toEqual({ kind: 'point' });
  });

  it('aoeRadius clamps to the last level when over-indexed', () => {
    const def = ability({ targetMode: 'point', aoeRadius: [200, 300] });
    expect(abilityPreviewShape(def, 4)).toEqual({ kind: 'area', radius: 300 });
  });
});
