import { describe, expect, it } from 'vitest';
import { buybackCost } from '../src/data/balance';
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

  it('reports live heroes as ready on the scoreboard', () => {
    expect(scoreboardHeroSummary({
      gold: 900,
      level: 8,
      alive: true,
      now: 100,
      respawnAt: -Infinity,
      buybackCooldownUntil: -Infinity,
      inventory: [null, null, null, null, null, null],
    }).status).toEqual({
      kind: 'alive',
      label: 'LIVE',
      detail: '',
      color: '#9cff74',
    });
  });

  it('reports dead heroes with enough gold and no cooldown as buyback-ready', () => {
    expect(scoreboardHeroSummary({
      gold: buybackCost(10),
      level: 10,
      alive: false,
      now: 60,
      respawnAt: 75,
      buybackCooldownUntil: -Infinity,
      inventory: [null, null, null, null, null, null],
    }).status).toEqual({
      kind: 'buybackReady',
      label: 'BUYBACK',
      detail: '15s / 300g',
      color: '#9fe87a',
    });
  });

  it('prioritizes buyback cooldown over gold when a dead hero cannot buy back yet', () => {
    expect(scoreboardHeroSummary({
      gold: 9999,
      level: 10,
      alive: false,
      now: 60,
      respawnAt: 75,
      buybackCooldownUntil: 120,
      inventory: [null, null, null, null, null, null],
    }).status).toEqual({
      kind: 'buybackCooldown',
      label: 'BB CD',
      detail: '60s / respawn 15s',
      color: '#ef9a9a',
    });
  });

  it('reports dead heroes without enough gold for buyback', () => {
    expect(scoreboardHeroSummary({
      gold: buybackCost(10) - 1,
      level: 10,
      alive: false,
      now: 60,
      respawnAt: 75,
      buybackCooldownUntil: -Infinity,
      inventory: [null, null, null, null, null, null],
    }).status).toEqual({
      kind: 'noBuybackGold',
      label: 'NO GOLD',
      detail: '15s / need 1g',
      color: '#d8a84c',
    });
  });
});
