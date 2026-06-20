import {
  availabilityStatusSuffix,
  buildAbilityAvailability,
  buildItemAvailability,
} from './availabilityModel';

export interface AbilityStatusBroadcastInput {
  name: string;
  hotkey: string;
  learned: boolean;
  passive: boolean;
  cooldownRemaining: number;
  manaCost: number;
  currentMana: number;
  autocastOn?: boolean;
  toggleOn?: boolean;
}

export interface ItemStatusBroadcastInput {
  hotkey: string;
  name?: string;
  empty?: boolean;
  hasActive: boolean;
  cooldownRemaining: number;
  backpackDelayRemaining?: number;
  manaCost?: number;
  currentMana?: number;
  charges?: number;
}

export function abilityStatusBroadcastLabel(input: AbilityStatusBroadcastInput): string {
  const prefix = `${input.hotkey} ${input.name}:`;
  return `${prefix} ${availabilityStatusSuffix(buildAbilityAvailability(input))}`;
}

export function itemStatusBroadcastLabel(input: ItemStatusBroadcastInput): string {
  const prefix = `${input.hotkey} ${input.name ?? '物品'}:`;
  if (input.empty) return `${input.hotkey}: ${availabilityStatusSuffix(buildItemAvailability(input))}`;
  return `${prefix} ${availabilityStatusSuffix(buildItemAvailability(input))}`;
}
