export interface ShopQuickActionVisibleItem {
  key: string;
  name: string;
}

export interface ShopQuickActionDestination {
  canBuy: boolean;
  detail: string;
}

export interface ShopQuickActionModel {
  visible: boolean;
  itemKey: string | null;
  label: string;
  detail: string;
}

export function buildShopQuickActionModel(_input: {
  visibleItems: ShopQuickActionVisibleItem[];
  destinations: ReadonlyMap<string, ShopQuickActionDestination>;
}): ShopQuickActionModel {
  const input = _input;
  if (input.visibleItems.length === 0) return { visible: false, itemKey: null, label: '', detail: '' };

  for (const item of input.visibleItems) {
    const destination = input.destinations.get(item.key);
    if (destination?.canBuy) {
      return {
        visible: true,
        itemKey: item.key,
        label: `Enter: Buy ${item.name}`,
        detail: destination.detail,
      };
    }
  }

  const first = input.destinations.get(input.visibleItems[0].key);
  return {
    visible: true,
    itemKey: null,
    label: 'Enter: blocked',
    detail: first?.detail ?? 'No buyable item',
  };
}
