export type ShopRelatedShop = 'home' | 'side' | 'secret' | null;

export interface ShopRelatedCatalogItem {
  key: string;
  name: string;
  cost: number;
  secretShop?: boolean;
  sideShop?: boolean;
  recipe?: { components: string[]; recipeCost: number };
}

export interface ShopRelatedOwnedItem {
  itemKey: string;
  charges?: number;
}

export type ShopRelatedItemState = 'owned' | 'missing' | 'gated' | 'target';

export interface ShopRelatedItemNode {
  key: string;
  label: string;
  state: ShopRelatedItemState;
  countLabel: string;
  detail: string;
  cost: number;
  secretShop: boolean;
}

export interface ShopRelatedItemsModel {
  visible: boolean;
  selectedKey: string | null;
  title: string;
  buildsFrom: ShopRelatedItemNode[];
  buildsInto: ShopRelatedItemNode[];
  summary: string;
}

export interface ShopRelatedItemsInput {
  selectedKey: string | null;
  catalog: ShopRelatedCatalogItem[];
  inventory: Array<ShopRelatedOwnedItem | null>;
  backpack: Array<ShopRelatedOwnedItem | null>;
  stash: Array<ShopRelatedOwnedItem | null>;
  tpSlot?: ShopRelatedOwnedItem | null;
  shop: ShopRelatedShop;
}

const HIDDEN: ShopRelatedItemsModel = {
  visible: false,
  selectedKey: null,
  title: '',
  buildsFrom: [],
  buildsInto: [],
  summary: '',
};

export function buildShopRelatedItemsModel(input: ShopRelatedItemsInput): ShopRelatedItemsModel {
  if (!input.selectedKey) return HIDDEN;
  const byKey = new Map(input.catalog.map((item) => [item.key, item]));
  const selected = byKey.get(input.selectedKey);
  if (!selected) return HIDDEN;
  const owned = countOwned(input);
  const buildsFrom = buildComponents(selected, byKey, owned, input.shop);
  const buildsInto = input.catalog
    .filter((item) => item.recipe?.components.includes(selected.key))
    .map((parent) => buildParent(parent, selected.key, byKey, owned, input.shop));

  return {
    visible: true,
    selectedKey: selected.key,
    title: selected.name,
    buildsFrom,
    buildsInto,
    summary: `From ${buildsFrom.filter((item) => item.state === 'owned').length}/${buildsFrom.length} · Into ${buildsInto.length}`,
  };
}

function buildComponents(
  selected: ShopRelatedCatalogItem,
  byKey: Map<string, ShopRelatedCatalogItem>,
  owned: Map<string, number>,
  shop: ShopRelatedShop,
): ShopRelatedItemNode[] {
  if (!selected.recipe) return [];
  const required = countRequired(selected.recipe.components);
  return [...required.entries()].map(([key, count]) => {
    const item = byKey.get(key);
    const ownedCount = Math.min(count, owned.get(key) ?? 0);
    const gated = item?.secretShop === true && shop !== 'secret' && ownedCount < count;
    const state: ShopRelatedItemState = ownedCount >= count ? 'owned' : gated ? 'gated' : 'missing';
    return {
      key,
      label: item?.name ?? key,
      state,
      countLabel: `${ownedCount}/${count}`,
      detail: state === 'gated'
        ? 'Need secret shop'
        : ownedCount > 0
          ? `Owned ${ownedCount} / need ${count}`
          : `Missing ${count}`,
      cost: item?.cost ?? 0,
      secretShop: item?.secretShop === true,
    };
  });
}

function buildParent(
  parent: ShopRelatedCatalogItem,
  selectedKey: string,
  byKey: Map<string, ShopRelatedCatalogItem>,
  owned: Map<string, number>,
  shop: ShopRelatedShop,
): ShopRelatedItemNode {
  const missing = missingComponents(parent, selectedKey, owned);
  const gated = parent.secretShop === true && shop !== 'secret';
  const state: ShopRelatedItemState = missing.length === 0 ? 'owned' : gated ? 'gated' : 'missing';
  return {
    key: parent.key,
    label: parent.name,
    state,
    countLabel: parent.recipe ? `${parent.recipe.components.length - missing.length}/${parent.recipe.components.length}` : '',
    detail: state === 'owned'
      ? 'Ready from owned components'
      : state === 'gated'
        ? 'Need secret shop'
        : `Missing ${missing.map(([key, count]) => `${byKey.get(key)?.key ?? key} x${count}`).join(' / ')}`,
    cost: parent.cost,
    secretShop: parent.secretShop === true,
  };
}

function missingComponents(
  item: ShopRelatedCatalogItem,
  selectedKey: string,
  owned: Map<string, number>,
): Array<[string, number]> {
  if (!item.recipe) return [];
  const required = countRequired(item.recipe.components);
  required.set(selectedKey, Math.max(0, (required.get(selectedKey) ?? 0) - 1));
  const missing: Array<[string, number]> = [];
  for (const [key, count] of required) {
    if (count <= 0) continue;
    const need = Math.max(0, count - (owned.get(key) ?? 0));
    if (need > 0) missing.push([key, need]);
  }
  return missing;
}

function countOwned(input: ShopRelatedItemsInput): Map<string, number> {
  const counts = new Map<string, number>();
  const items = [
    ...input.inventory,
    ...input.backpack,
    ...input.stash,
    ...(input.tpSlot ? [input.tpSlot] : []),
  ];
  for (const item of items) {
    if (!item) continue;
    counts.set(item.itemKey, (counts.get(item.itemKey) ?? 0) + 1);
  }
  return counts;
}

function countRequired(components: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const key of components) counts.set(key, (counts.get(key) ?? 0) + 1);
  return counts;
}
