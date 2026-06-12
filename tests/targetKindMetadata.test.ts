import { describe, expect, it } from 'vitest';
import { itemDef } from '../src/data/items';
import { HEROES } from '../src/data/heroes';

function ability(heroKey: string, abilityKey: string) {
  const hero = HEROES.find((h) => h.key === heroKey);
  if (!hero) throw new Error(`missing hero ${heroKey}`);
  const def = hero.abilities.find((a) => a.key === abilityKey);
  if (!def) throw new Error(`missing ability ${abilityKey}`);
  return def;
}

describe('target kind metadata', () => {
  it('marks initial non-hero commands with explicit targetKind metadata', () => {
    expect(itemDef('midas').active?.targetKind).toBe('nonHeroNonBuilding');
    expect(ability('lyk', 'lyk_ritual').targetKind).toBe('creep');
    expect(ability('dum', 'dum_devour').targetKind).toBe('nonHeroNonBuilding');
  });
});
