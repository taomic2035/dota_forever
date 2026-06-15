import { describe, it, expect } from 'vitest';
import { HEROES } from '../src/data/heroes';
import { abilityPreviewShape } from '../src/engine/abilityPreviewShape';

function ability(heroKey: string, abilityKey: string) {
  const hero = HEROES.find((h) => h.key === heroKey);
  const def = hero?.abilities.find((a) => a.key === abilityKey);
  if (!def) throw new Error(`missing ${heroKey}.${abilityKey}`);
  return def;
}

describe('ability preview shape from real hero data', () => {
  it('line skillshots (hook / impale / fissure) preview as lines, not fake circles', () => {
    for (const [h, a] of [['grosh', 'grosh_hook'], ['nyx', 'nyx_impale'], ['ear', 'ear_fissure']] as const) {
      const shape = abilityPreviewShape(ability(h, a), 1);
      expect(shape.kind).toBe('line');
    }
  });

  it('AoE point spells preview with their real radius (liya_nova = 400)', () => {
    expect(abilityPreviewShape(ability('liya', 'liya_nova'), 1)).toEqual({ kind: 'area', radius: 400 });
  });

  it('unit-target abilities preview as a unit reticle', () => {
    expect(abilityPreviewShape(ability('liya', 'liya_bind'), 1)).toEqual({ kind: 'unit' });
  });
});
