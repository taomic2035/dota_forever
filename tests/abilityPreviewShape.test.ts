import { describe, expect, it } from 'vitest';
import {
  abilityPreviewShape,
  itemPreviewShape,
  previewTargetingGeometry,
} from '../src/engine/abilityPreviewShape';
import { LIYA_Q } from '../src/data/heroes/liya';
import type { AbilityDef } from '../src/data/heroes/types';
import type { ItemDef } from '../src/data/items';

function ability(over: Partial<AbilityDef>): AbilityDef {
  return { key: 'x', name: 'x', maxLevel: 4, targetMode: 'point', tags: [], description: '', ...over };
}

function active(over: Partial<NonNullable<ItemDef['active']>>): NonNullable<ItemDef['active']> {
  return { name: 'x', cooldown: 1, targetMode: 'point', onUse: () => true, ...over };
}

describe('abilityPreviewShape', () => {
  it('maps unit-target abilities to a unit reticle', () => {
    expect(abilityPreviewShape(ability({ targetMode: 'unit' }), 1)).toEqual({ kind: 'unit' });
  });

  it('maps point abilities with aoeRadius to their real per-level area radius', () => {
    expect(abilityPreviewShape(LIYA_Q, 1)).toEqual({ kind: 'area', radius: 400 });
    expect(abilityPreviewShape(LIYA_Q, 4)).toEqual({ kind: 'area', radius: 400 });
  });

  it('keeps point abilities without aoeRadius as a point marker instead of a fake area ring', () => {
    expect(abilityPreviewShape(ability({ targetMode: 'point' }), 1)).toEqual({ kind: 'point' });
  });

  it('maps line targetMode or lineWidth abilities to a line preview sized by cast range', () => {
    const def = ability({ targetMode: 'line', lineWidth: 120, castRange: [900, 1000, 1100, 1200] });
    expect(abilityPreviewShape(def, 2)).toEqual({ kind: 'line', width: 120, length: 1000 });
  });

  it('clamps aoeRadius to the last declared level', () => {
    const def = ability({ targetMode: 'point', aoeRadius: [200, 300] });
    expect(abilityPreviewShape(def, 4)).toEqual({ kind: 'area', radius: 300 });
  });

  it('maps passive and instant abilities to a bare point shape', () => {
    expect(abilityPreviewShape(ability({ targetMode: 'none' }), 1)).toEqual({ kind: 'point' });
    expect(abilityPreviewShape(ability({ targetMode: 'passive' }), 1)).toEqual({ kind: 'point' });
  });
});

describe('itemPreviewShape', () => {
  it('uses item activeAoeRadius for point-target item area previews', () => {
    expect(itemPreviewShape(active({ activeAoeRadius: 500 }))).toEqual({ kind: 'area', radius: 500 });
  });

  it('keeps point-target items without activeAoeRadius as a point marker', () => {
    expect(itemPreviewShape(active({ targetMode: 'point' }))).toEqual({ kind: 'point' });
  });
});

describe('previewTargetingGeometry', () => {
  it('converts preview shapes to the targeting geometry consumed by 2D and 3D renderers', () => {
    expect(previewTargetingGeometry({ kind: 'area', radius: 400 }, 700)).toEqual({
      mode: 'area',
      range: 700,
      radius: 400,
    });
    expect(previewTargetingGeometry({ kind: 'line', width: 120, length: 1000 }, 700)).toEqual({
      mode: 'line',
      range: 1000,
      width: 120,
    });
    expect(previewTargetingGeometry({ kind: 'point' }, 700)).toEqual({ mode: 'point', range: 700 });
  });
});
