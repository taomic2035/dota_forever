import { describe, expect, it } from 'vitest';
import { HEROES } from '../src/data/heroes';
import { ITEMS } from '../src/data/items';

describe('targetTeam metadata coverage', () => {
  it('declares targetTeam for every unit-target hero ability', () => {
    const missing = HEROES.flatMap((hero) =>
      hero.abilities
        .filter((ability) => ability.targetMode === 'unit' && ability.targetTeam === undefined)
        .map((ability) => `${hero.key}.${ability.key}`),
    );

    expect(missing).toEqual([]);
  });

  it('declares targetTeam for every unit-target active item', () => {
    const missing = ITEMS
      .filter((item) => item.active?.targetMode === 'unit' && item.active.targetTeam === undefined)
      .map((item) => item.key);

    expect(missing).toEqual([]);
  });
});
