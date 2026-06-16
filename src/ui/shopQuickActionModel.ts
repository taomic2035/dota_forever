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

export interface ShopRecipeNextComponent {
  key: string;
  name: string;
}

export interface ShopRecipeNextActionModel {
  visible: boolean;
  parentItemKey: string | null;
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

export function buildShopRecipeNextActionModel(input: {
  visibleItems: ShopQuickActionVisibleItem[];
  nextComponents: ReadonlyMap<string, ShopRecipeNextComponent>;
  destinations: ReadonlyMap<string, ShopQuickActionDestination>;
}): ShopRecipeNextActionModel {
  for (const item of input.visibleItems) {
    const next = input.nextComponents.get(item.key);
    if (!next) continue;
    const destination = input.destinations.get(next.key);
    if (destination?.canBuy) {
      return {
        visible: true,
        parentItemKey: item.key,
        itemKey: next.key,
        label: `Shift+Enter: Buy ${next.name}`,
        detail: `For ${item.name} / ${destination.detail}`,
      };
    }
    return {
      visible: true,
      parentItemKey: item.key,
      itemKey: null,
      label: 'Shift+Enter: blocked',
      detail: `${next.name}: ${destination?.detail ?? 'Cannot buy component'}`,
    };
  }

  return { visible: false, parentItemKey: null, itemKey: null, label: '', detail: '' };
}
