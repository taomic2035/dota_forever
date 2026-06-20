import { describe, expect, it } from 'vitest';
import { buildDisableBarModel, buildModifierIconTokens, modifierTokenTime } from '../src/ui/modifierDisplayModel';
import type { Modifier } from '../src/sim/modifiers';

function mod(key: string, expiresAt: number, extra: Partial<Modifier['def']> = {}): Modifier {
  return {
    key,
    sourceId: 1,
    expiresAt,
    def: {
      key,
      duration: expiresAt,
      ...extra,
    },
    data: {},
  };
}

describe('modifierDisplayModel', () => {
  it('builds compact icon tokens with color, tooltip, and remaining time', () => {
    const tokens = buildModifierIconTokens({
      now: 10,
      modifiers: [
        mod('stun_short', 12, { states: { stunned: true } }),
        mod('haste_buff', 15, { isBuff: true }),
        mod('dot_debuff', 16),
        mod('aura_permanent', Infinity, { isBuff: true }),
      ],
    });

    expect(tokens.map((token) => token.label)).toEqual(['晕', '▲', '▼']);
    expect(tokens[0]).toMatchObject({
      key: 'stun_short',
      tone: 'disable',
      color: '#ffd45c',
      remaining: 2,
      tooltip: '眩晕 · stun_short · 2s',
    });
    expect(tokens[1].tone).toBe('buff');
    expect(tokens[2].tone).toBe('debuff');
  });

  it('caps icon tokens after sorting by soonest expiry', () => {
    const tokens = buildModifierIconTokens({
      now: 0,
      max: 3,
      modifiers: [
        mod('slow4', 4),
        mod('slow2', 2),
        mod('slow3', 3),
        mod('slow1', 1),
      ],
    });

    expect(tokens.map((token) => token.key)).toEqual(['slow1', 'slow2', 'slow3']);
  });

  it('selects the longest active disable for the timed disable bar', () => {
    const bar = buildDisableBarModel({
      now: 3,
      modifiers: [
        mod('short_stun', 5, { duration: 5, states: { stunned: true } }),
        mod('long_root', 9, { duration: 8, states: { rooted: true } }),
        mod('long_buff', 20, { duration: 20, isBuff: true }),
      ],
    });

    expect(bar).toMatchObject({
      visible: true,
      key: 'long_root',
      label: '缠绕',
      remaining: 6,
      percent: 75,
      color: '#9be36f',
      detail: '缠绕 · long_root · 6s',
    });
  });

  it('recognizes Dota-style hex and cyclone from existing modifier data', () => {
    const hex = buildDisableBarModel({
      now: 0,
      modifiers: [
        mod('item_hex', 3.2, { states: { silenced: true, muted: true, disarmed: true }, stats: { setMoveSpeed: 100 } }),
      ],
    });
    const cyclone = buildDisableBarModel({
      now: 0,
      modifiers: [
        mod('item_eul_cyclone', 2.5, { states: { untargetable: true } }),
      ],
    });

    expect(hex.visible).toBe(true);
    expect(cyclone.visible).toBe(true);
    if (!hex.visible || !cyclone.visible) throw new Error('expected visible disable bars');
    expect(hex.label).toBe('妖术');
    expect(hex.percent).toBe(100);
    expect(cyclone.label).toBe('吹风');
  });

  it('is hidden when there are no active timed disables', () => {
    expect(buildDisableBarModel({
      now: 5,
      modifiers: [
        mod('expired_stun', 4, { states: { stunned: true } }),
        mod('permanent_root', Infinity, { states: { rooted: true } }),
        mod('positive_haste', 10, { isBuff: true }),
      ],
    })).toEqual({ visible: false });
  });

  it('formats token time consistently', () => {
    expect(modifierTokenTime(2.1)).toBe('3');
    expect(modifierTokenTime(1)).toBe('1');
    expect(modifierTokenTime(0.6)).toBe('0.6');
  });
});
