import { describe, expect, it } from 'vitest';
import { shouldToggleAbilityFromHotkey, toggleAbilitySlotState } from '../src/ui/abilitySlotToggleModel';
import type { AbilityDef } from '../src/data/heroes/types';
import type { AbilityInstance } from '../src/sim/abilities';

describe('toggleAbilitySlotState', () => {
  it('rejects unlearned and non-toggleable abilities', () => {
    expect(toggleAbilitySlotState(ability({ tags: ['autocast'] }), inst({ level: 0 }))).toEqual({
      ok: false,
      reason: 'not-learned',
    });
    expect(toggleAbilitySlotState(ability({ tags: ['nuke'] }), inst({ level: 1 }))).toEqual({
      ok: false,
      reason: 'not-toggleable',
    });
  });

  it('toggles autocast state and returns a HUD message', () => {
    const abilityInst = inst({ level: 1 });
    expect(toggleAbilitySlotState(ability({ name: '霜寒之箭', tags: ['orb', 'autocast'] }), abilityInst)).toEqual({
      ok: true,
      mode: 'autocast',
      enabled: true,
      label: '霜寒之箭 自动施放:开',
    });
    expect(abilityInst.autocastOn).toBe(true);

    expect(toggleAbilitySlotState(ability({ name: '霜寒之箭', tags: ['orb', 'autocast'] }), abilityInst)).toEqual({
      ok: true,
      mode: 'autocast',
      enabled: false,
      label: '霜寒之箭 自动施放:关',
    });
    expect(abilityInst.autocastOn).toBe(false);
  });

  it('toggles active toggle state independently from autocast', () => {
    const abilityInst = inst({ level: 1 });
    expect(toggleAbilitySlotState(ability({ name: '燃烧姿态', tags: ['toggle'] }), abilityInst)).toEqual({
      ok: true,
      mode: 'toggle',
      enabled: true,
      label: '燃烧姿态 开关:开',
    });
    expect(abilityInst.toggleOn).toBe(true);
    expect(abilityInst.autocastOn).toBeUndefined();
  });

  it('only lets hotkeys toggle learned passive autocast/toggle abilities', () => {
    expect(shouldToggleAbilityFromHotkey(ability({ tags: ['orb', 'autocast'] }), inst({ level: 1 }), 'passive')).toBe(true);
    expect(shouldToggleAbilityFromHotkey(ability({ tags: ['toggle'] }), inst({ level: 1 }), 'passive')).toBe(true);
    expect(shouldToggleAbilityFromHotkey(ability({ tags: ['orb'] }), inst({ level: 1 }), 'passive')).toBe(false);
    expect(shouldToggleAbilityFromHotkey(ability({ tags: ['autocast'] }), inst({ level: 0 }), 'passive')).toBe(false);
    expect(shouldToggleAbilityFromHotkey(ability({ tags: ['autocast'] }), inst({ level: 1 }), null)).toBe(false);
  });
});

function ability(over: Partial<AbilityDef>): AbilityDef {
  return {
    key: 'test',
    name: 'Test',
    maxLevel: 4,
    targetMode: 'passive',
    tags: [],
    description: '',
    ...over,
  };
}

function inst(over: Partial<AbilityInstance>): AbilityInstance {
  return {
    key: 'test',
    level: 1,
    cooldownUntil: -Infinity,
    ...over,
  };
}
