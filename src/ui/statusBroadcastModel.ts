export interface AbilityStatusBroadcastInput {
  name: string;
  hotkey: string;
  learned: boolean;
  passive: boolean;
  cooldownRemaining: number;
  manaCost: number;
  currentMana: number;
}

export interface ItemStatusBroadcastInput {
  hotkey: string;
  name?: string;
  empty?: boolean;
  hasActive: boolean;
  cooldownRemaining: number;
  manaCost?: number;
  currentMana?: number;
  charges?: number;
}

export function abilityStatusBroadcastLabel(input: AbilityStatusBroadcastInput): string {
  const prefix = `${input.hotkey} ${input.name}:`;
  if (!input.learned) return `${prefix} 未学习`;
  if (input.passive) return `${prefix} 被动`;
  if (input.cooldownRemaining > 0) return `${prefix} 冷却 ${formatSeconds(input.cooldownRemaining)}`;
  if (input.manaCost > input.currentMana) return `${prefix} 法力不足 ${Math.floor(input.currentMana)}/${input.manaCost}`;
  return `${prefix} 就绪`;
}

export function itemStatusBroadcastLabel(input: ItemStatusBroadcastInput): string {
  if (input.empty) return `${input.hotkey}: 空槽`;
  const prefix = `${input.hotkey} ${input.name ?? '物品'}:`;
  if (!input.hasActive) return `${prefix} 被动`;
  if (input.cooldownRemaining > 0) return `${prefix} 冷却 ${formatSeconds(input.cooldownRemaining)}`;
  if ((input.manaCost ?? 0) > (input.currentMana ?? Number.POSITIVE_INFINITY)) {
    return `${prefix} 法力不足 ${Math.floor(input.currentMana ?? 0)}/${input.manaCost}`;
  }
  const charges = input.charges && input.charges > 0 ? ` · ${input.charges} 次` : '';
  return `${prefix} 就绪${charges}`;
}

function formatSeconds(seconds: number): string {
  return `${Math.ceil(seconds)}s`;
}
