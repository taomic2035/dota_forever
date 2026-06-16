export type ShopStashActionTone = 'muted' | 'ready' | 'busy' | 'blocked';

export interface ShopStashActionInput {
  stashItemCount: number;
  atHomeShop: boolean;
  inventoryFreeSlots: number;
}

export interface ShopStashActionModel {
  visible: boolean;
  enabled: boolean;
  label: string;
  detail: string;
  tone: ShopStashActionTone;
}

export function buildShopStashActionModel(input: ShopStashActionInput): ShopStashActionModel {
  const stashItemCount = Math.max(0, Math.floor(input.stashItemCount));
  const inventoryFreeSlots = Math.max(0, Math.floor(input.inventoryFreeSlots));

  if (stashItemCount === 0) {
    return { visible: false, enabled: false, label: '', detail: '', tone: 'muted' };
  }

  if (!input.atHomeShop) {
    return {
      visible: true,
      enabled: false,
      label: 'Take all blocked',
      detail: 'Need home shop',
      tone: 'blocked',
    };
  }

  if (inventoryFreeSlots <= 0) {
    return {
      visible: true,
      enabled: false,
      label: 'Take all blocked',
      detail: 'Inventory full',
      tone: 'blocked',
    };
  }

  if (inventoryFreeSlots < stashItemCount) {
    return {
      visible: true,
      enabled: true,
      label: `Take ${inventoryFreeSlots} / ${stashItemCount}`,
      detail: 'Inventory room is limited',
      tone: 'busy',
    };
  }

  return {
    visible: true,
    enabled: true,
    label: `Take all x${stashItemCount}`,
    detail: 'Move stash items into inventory',
    tone: 'ready',
  };
}
