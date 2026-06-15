import { itemDef } from '../data/items';

export interface ShopOwnedItemInput {
  itemKey: string;
  charges?: number;
}

export type ShopOwnedLane = 'inventory' | 'backpack' | 'stash' | 'tp';

export interface ShopOwnedBadge {
  lane: ShopOwnedLane;
  label: string;
  count: number;
}

export interface ShopOwnershipModel {
  visible: boolean;
  badges: ShopOwnedBadge[];
  detail: string;
}

export interface ShopOwnershipInput {
  itemKey: string;
  inventory: Array<ShopOwnedItemInput | null>;
  backpack: Array<ShopOwnedItemInput | null>;
  stash: Array<ShopOwnedItemInput | null>;
  tpSlot?: ShopOwnedItemInput | null;
}

export function buildShopOwnershipModel(input: ShopOwnershipInput): ShopOwnershipModel {
  const def = itemDef(input.itemKey);
  const badges = [
    countLane(input.inventory, input.itemKey, 'inventory', def.stackCharges),
    countLane(input.backpack, input.itemKey, 'backpack', def.stackCharges),
    countLane(input.stash, input.itemKey, 'stash', def.stackCharges),
    countLane(input.tpSlot ? [input.tpSlot] : [], input.itemKey, 'tp', def.stackCharges),
  ].filter((badge): badge is ShopOwnedBadge => !!badge);

  return {
    visible: badges.length > 0,
    badges,
    detail: badges.length > 0
      ? `Owned: ${badges.map((badge) => `${badge.label} x${badge.count}`).join(' / ')}`
      : '',
  };
}

function countLane(
  items: Array<ShopOwnedItemInput | null>,
  itemKey: string,
  lane: ShopOwnedLane,
  stackCharges?: boolean,
): ShopOwnedBadge | null {
  const count = items.reduce((sum, item) => {
    if (!item || item.itemKey !== itemKey) return sum;
    return sum + (stackCharges ? Math.max(1, Math.floor(item.charges ?? 1)) : 1);
  }, 0);
  if (count <= 0) return null;
  return { lane, label: laneLabel(lane), count };
}

function laneLabel(lane: ShopOwnedLane): string {
  if (lane === 'inventory') return 'Hero';
  if (lane === 'backpack') return 'Backpack';
  if (lane === 'stash') return 'Stash';
  return 'TP';
}
