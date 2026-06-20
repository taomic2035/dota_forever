import { describe, expect, it } from 'vitest';
import {
  availabilityCurrentLine,
  availabilityStatusSuffix,
  buildAbilityAvailability,
  buildCastAvailability,
  buildItemAvailability,
  buildShopAvailability,
} from '../src/ui/availabilityModel';

describe('availabilityModel', () => {
  it('prioritizes ability availability reasons consistently', () => {
    expect(buildAbilityAvailability({
      learned: false,
      passive: false,
      cooldownRemaining: 0,
      manaCost: 0,
      currentMana: 100,
    })).toMatchObject({ reason: 'unlearned', ready: false });

    expect(buildAbilityAvailability({
      learned: true,
      passive: true,
      cooldownRemaining: 10,
      manaCost: 200,
      currentMana: 0,
    })).toMatchObject({ reason: 'passive', ready: true });

    expect(buildAbilityAvailability({
      learned: true,
      passive: false,
      cooldownRemaining: 4.2,
      manaCost: 200,
      currentMana: 0,
    })).toMatchObject({ reason: 'cooldown', ready: false, seconds: 4.2 });

    expect(buildAbilityAvailability({
      learned: true,
      passive: false,
      cooldownRemaining: 0,
      manaCost: 120,
      currentMana: 60,
    })).toMatchObject({ reason: 'noMana', ready: false, currentMana: 60, manaCost: 120 });
  });

  it('uses one wording contract for current tooltip lines and broadcast suffixes', () => {
    const cooldown = buildAbilityAvailability({
      learned: true,
      passive: false,
      cooldownRemaining: 7.1,
      manaCost: 60,
      currentMana: 300,
    });
    expect(availabilityCurrentLine(cooldown)).toBe('当前: 冷却 8s');
    expect(availabilityStatusSuffix(cooldown)).toBe('冷却 8s');

    const noMana = buildItemAvailability({
      empty: false,
      hasActive: true,
      cooldownRemaining: 0,
      manaCost: 75,
      currentMana: 20,
    });
    expect(availabilityCurrentLine(noMana)).toBe('当前: 法力不足 20/75');
    expect(availabilityStatusSuffix(noMana)).toBe('法力不足 20/75');
  });

  it('labels item passive, empty, backpack delay, and charged ready states', () => {
    expect(buildItemAvailability({
      empty: true,
      hasActive: false,
      cooldownRemaining: 0,
    })).toMatchObject({ reason: 'empty', ready: false });

    expect(buildItemAvailability({
      empty: false,
      hasActive: false,
      cooldownRemaining: 0,
    })).toMatchObject({ reason: 'passive', ready: true });

    expect(availabilityCurrentLine(buildItemAvailability({
      empty: false,
      hasActive: true,
      cooldownRemaining: 0,
      backpackDelayRemaining: 5.5,
    }))).toBe('当前: 背包延迟 6s');

    expect(availabilityCurrentLine(buildItemAvailability({
      empty: false,
      hasActive: true,
      cooldownRemaining: 0,
      manaCost: 0,
      currentMana: 0,
      charges: 2,
    }))).toBe('当前: 就绪 · 2 次');
  });

  it('maps shop purchase blocks into the same reason contract', () => {
    expect(buildShopAvailability({ canBuy: true })).toMatchObject({
      ready: true,
      reason: 'ready',
    });

    const noGold = buildShopAvailability({ canBuy: false, blockedBy: 'gold', goldDeficit: 350 });
    expect(noGold).toMatchObject({ ready: false, reason: 'noGold', goldDeficit: 350 });
    expect(availabilityStatusSuffix(noGold)).toBe('金币不足 350');

    expect(availabilityStatusSuffix(buildShopAvailability({ canBuy: false, blockedBy: 'shop' })))
      .toBe('商店不符');
    expect(availabilityStatusSuffix(buildShopAvailability({ canBuy: false, blockedBy: 'space' })))
      .toBe('空间不足');
  });

  it('maps cast preview status into shared availability copy', () => {
    expect(buildCastAvailability({ status: 'ready' })).toMatchObject({
      ready: true,
      reason: 'ready',
    });

    const walk = buildCastAvailability({ status: 'walk' });
    expect(walk).toMatchObject({ ready: true, reason: 'outOfRange' });
    expect(availabilityCurrentLine(walk)).toBe('当前: 走近后施放');

    const invalid = buildCastAvailability({ status: 'invalid', invalidReason: '需要敌方单位' });
    expect(invalid).toMatchObject({
      ready: false,
      reason: 'invalidTarget',
      detail: '需要敌方单位',
    });
    expect(availabilityCurrentLine(invalid)).toBe('当前: 需要敌方单位');
  });
});
