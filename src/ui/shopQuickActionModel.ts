import type { AvailabilityModel } from './availabilityModel';

export interface ShopQuickActionVisibleItem {
  key: string;
  name: string;
}

export interface ShopQuickActionDestination {
  canBuy: boolean;
  detail: string;
  availability?: AvailabilityModel;
}

export interface ShopQuickActionModel {
  visible: boolean;
  itemKey: string | null;
  label: string;
  detail: string;
  availability?: AvailabilityModel;
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
  availability?: AvailabilityModel;
}

export interface ShopRecipeBatchActionModel {
  visible: boolean;
  parentItemKey: string | null;
  itemKeys: string[];
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
        availability: destination.availability,
      };
    }
  }

  const first = input.destinations.get(input.visibleItems[0].key);
  return {
    visible: true,
    itemKey: null,
    label: 'Enter: blocked',
    detail: first?.detail ?? 'No buyable item',
    availability: first?.availability,
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
        availability: destination.availability,
      };
    }
    return {
      visible: true,
      parentItemKey: item.key,
      itemKey: null,
      label: 'Shift+Enter: blocked',
      detail: `${next.name}: ${destination?.detail ?? 'Cannot buy component'}`,
      availability: destination?.availability,
    };
  }

  return { visible: false, parentItemKey: null, itemKey: null, label: '', detail: '' };
}

export function buildShopRecipeBatchActionModel(input: {
  visibleItems: ShopQuickActionVisibleItem[];
  missingComponents: ReadonlyMap<string, ShopRecipeNextComponent[]>;
  destinations: ReadonlyMap<string, ShopQuickActionDestination>;
}): ShopRecipeBatchActionModel {
  for (const item of input.visibleItems) {
    const missing = input.missingComponents.get(item.key);
    if (!missing || missing.length === 0) continue;
    const buyable = missing.filter((component) => input.destinations.get(component.key)?.canBuy);
    if (buyable.length === 0) {
      return {
        visible: true,
        parentItemKey: item.key,
        itemKeys: [],
        label: 'Ctrl+Enter: blocked',
        detail: `${item.name}: no buyable missing components`,
      };
    }
    return {
      visible: true,
      parentItemKey: item.key,
      itemKeys: buyable.map((component) => component.key),
      label: `Ctrl+Enter: Buy ${buyable.length} ${buyable.length === 1 ? 'component' : 'components'}`,
      detail: `For ${item.name}: ${componentSummary(buyable)}`,
    };
  }

  return { visible: false, parentItemKey: null, itemKeys: [], label: '', detail: '' };
}

function componentSummary(components: ShopRecipeNextComponent[]): string {
  const counts = new Map<string, { name: string; count: number }>();
  for (const component of components) {
    const current = counts.get(component.key);
    if (current) current.count++;
    else counts.set(component.key, { name: component.name, count: 1 });
  }
  return [...counts.values()]
    .map((component) => component.count > 1 ? `${component.name} x${component.count}` : component.name)
    .join(' / ');
}
