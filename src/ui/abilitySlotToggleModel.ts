import type { AbilityDef } from '../data/heroes/types';
import type { AbilityCastReason, AbilityInstance } from '../sim/abilities';

export type AbilitySlotToggleResult =
  | {
    ok: true;
    mode: 'autocast' | 'toggle';
    enabled: boolean;
    label: string;
  }
  | {
    ok: false;
    reason: 'not-learned' | 'not-toggleable';
  };

export function toggleAbilitySlotState(def: AbilityDef, inst: AbilityInstance): AbilitySlotToggleResult {
  if (inst.level <= 0) return { ok: false, reason: 'not-learned' };
  if (def.tags.includes('autocast')) {
    inst.autocastOn = inst.autocastOn !== true;
    return {
      ok: true,
      mode: 'autocast',
      enabled: inst.autocastOn,
      label: `${def.name} 自动施放:${inst.autocastOn ? '开' : '关'}`,
    };
  }
  if (def.tags.includes('toggle')) {
    inst.toggleOn = inst.toggleOn !== true;
    return {
      ok: true,
      mode: 'toggle',
      enabled: inst.toggleOn,
      label: `${def.name} 开关:${inst.toggleOn ? '开' : '关'}`,
    };
  }
  return { ok: false, reason: 'not-toggleable' };
}

export function shouldToggleAbilityFromHotkey(
  def: AbilityDef,
  inst: AbilityInstance,
  castReason: AbilityCastReason | null,
): boolean {
  if (castReason !== 'passive') return false;
  if (inst.level <= 0) return false;
  return def.tags.includes('autocast') || def.tags.includes('toggle');
}
