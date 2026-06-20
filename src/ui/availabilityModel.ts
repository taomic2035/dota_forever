export type AvailabilityReason =
  | 'ready'
  | 'empty'
  | 'noSelection'
  | 'noGroup'
  | 'courierDead'
  | 'invalidTarget'
  | 'outOfRange'
  | 'unlearned'
  | 'passive'
  | 'cooldown'
  | 'noMana'
  | 'noGold'
  | 'wrongShop'
  | 'noSpace'
  | 'backpackDelay'
  | 'autocastOn'
  | 'autocastOff'
  | 'toggleOn'
  | 'toggleOff';

export interface AvailabilityModel {
  reason: AvailabilityReason;
  ready: boolean;
  detail?: string;
  seconds?: number;
  manaCost?: number;
  currentMana?: number;
  charges?: number;
  goldDeficit?: number;
}

export interface AbilityAvailabilityInput {
  learned: boolean;
  passive: boolean;
  cooldownRemaining: number;
  manaCost: number;
  currentMana: number;
  autocastOn?: boolean;
  toggleOn?: boolean;
}

export interface ItemAvailabilityInput {
  empty?: boolean;
  hasActive: boolean;
  cooldownRemaining: number;
  manaCost?: number;
  currentMana?: number;
  charges?: number;
  backpackDelayRemaining?: number;
}

export interface ShopAvailabilityInput {
  canBuy: boolean;
  blockedBy?: 'gold' | 'shop' | 'space';
  goldDeficit?: number;
}

export interface CastAvailabilityInput {
  status: 'ready' | 'walk' | 'invalid';
  invalidReason?: string;
}

export function buildAbilityAvailability(input: AbilityAvailabilityInput): AvailabilityModel {
  if (!input.learned) return { reason: 'unlearned', ready: false };
  if (input.autocastOn !== undefined) {
    return { reason: input.autocastOn ? 'autocastOn' : 'autocastOff', ready: true };
  }
  if (input.toggleOn !== undefined) {
    return { reason: input.toggleOn ? 'toggleOn' : 'toggleOff', ready: true };
  }
  if (input.passive) return { reason: 'passive', ready: true };
  if (input.cooldownRemaining > 0) return { reason: 'cooldown', ready: false, seconds: input.cooldownRemaining };
  if (input.manaCost > input.currentMana) {
    return {
      reason: 'noMana',
      ready: false,
      manaCost: input.manaCost,
      currentMana: input.currentMana,
    };
  }
  return { reason: 'ready', ready: true };
}

export function buildItemAvailability(input: ItemAvailabilityInput): AvailabilityModel {
  if (input.empty) return { reason: 'empty', ready: false };
  if (input.backpackDelayRemaining && input.backpackDelayRemaining > 0) {
    return { reason: 'backpackDelay', ready: false, seconds: input.backpackDelayRemaining };
  }
  if (!input.hasActive) return { reason: 'passive', ready: true };
  if (input.cooldownRemaining > 0) return { reason: 'cooldown', ready: false, seconds: input.cooldownRemaining };
  const manaCost = input.manaCost ?? 0;
  const currentMana = input.currentMana ?? Number.POSITIVE_INFINITY;
  if (manaCost > currentMana) {
    return {
      reason: 'noMana',
      ready: false,
      manaCost,
      currentMana,
    };
  }
  return { reason: 'ready', ready: true, charges: input.charges };
}

export function buildShopAvailability(input: ShopAvailabilityInput): AvailabilityModel {
  if (input.canBuy) return { reason: 'ready', ready: true };
  if (input.blockedBy === 'gold') return { reason: 'noGold', ready: false, goldDeficit: input.goldDeficit };
  if (input.blockedBy === 'space') return { reason: 'noSpace', ready: false };
  return { reason: 'wrongShop', ready: false };
}

export function buildCastAvailability(input: CastAvailabilityInput): AvailabilityModel {
  if (input.status === 'invalid') {
    return { reason: 'invalidTarget', ready: false, detail: input.invalidReason || '目标无效' };
  }
  if (input.status === 'walk') return { reason: 'outOfRange', ready: true };
  return { reason: 'ready', ready: true };
}

export function availabilityCurrentLine(model: AvailabilityModel): string {
  return `当前: ${availabilityStatusSuffix(model)}`;
}

export function availabilityStatusSuffix(model: AvailabilityModel): string {
  switch (model.reason) {
    case 'empty': return '空槽';
    case 'noSelection': return '没有可命令单位';
    case 'noGroup': return '没有可全选编队';
    case 'courierDead': return '信使不可用';
    case 'invalidTarget': return model.detail || '目标无效';
    case 'outOfRange': return '走近后施放';
    case 'unlearned': return '未学习';
    case 'passive': return '被动';
    case 'autocastOn': return 'AUTO ON';
    case 'autocastOff': return 'AUTO OFF';
    case 'toggleOn': return 'ON';
    case 'toggleOff': return 'OFF';
    case 'cooldown': return `冷却 ${formatSeconds(model.seconds ?? 0)}`;
    case 'backpackDelay': return `背包延迟 ${formatSeconds(model.seconds ?? 0)}`;
    case 'noMana': return `法力不足 ${Math.floor(model.currentMana ?? 0)}/${model.manaCost ?? 0}`;
    case 'noGold': return model.goldDeficit && model.goldDeficit > 0 ? `金币不足 ${Math.ceil(model.goldDeficit)}` : '金币不足';
    case 'wrongShop': return '商店不符';
    case 'noSpace': return '空间不足';
    case 'ready': {
      const charges = model.charges && model.charges > 0 ? ` · ${model.charges} 次` : '';
      return `就绪${charges}`;
    }
  }
}

function formatSeconds(seconds: number): string {
  return `${Math.ceil(seconds)}s`;
}
