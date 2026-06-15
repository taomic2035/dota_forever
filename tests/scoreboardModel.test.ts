import { describe, expect, it } from 'vitest';
import { scoreboardHeroSummary } from '../src/ui/scoreboardModel';

describe('scoreboardHeroSummary', () => {
  it('counts gold, inventory, backpack, stash, and TP charges toward net worth', () => {
    expect(scoreboardHeroSummary({
      gold: 603,
      inventory: [
        { itemKey: 'blink' },
        null,
        { itemKey: 'broadsword' },
        null,
        null,
        null,
      ],
      backpack: [{ itemKey: 'branch' }, null, null],
      stash: [{ itemKey: 'branch' }, null, null, null, null, null],
      tpSlot: { itemKey: 'tp', charges: 3 },
    })).toMatchObject({
      gold: 603,
      netWorth: 4264,
    });
  });

  it('uses gold only when a hero has no items anywhere', () => {
    expect(scoreboardHeroSummary({
      gold: 1200,
      inventory: [null, null, null, null, null, null],
      backpack: [null, null, null],
      stash: [null, null, null, null, null, null],
      tpSlot: null,
    }).netWorth).toBe(1200);
  });

  it('does not multiply non-stack item value by charges', () => {
    expect(scoreboardHeroSummary({
      gold: 0,
      inventory: [{ itemKey: 'branch', charges: 2 }, null, null, null, null, null],
      backpack: [null, null, null],
      stash: [null, null, null, null, null, null],
      tpSlot: null,
    }).netWorth).toBe(53);
  });
});
