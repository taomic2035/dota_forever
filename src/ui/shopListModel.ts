import type { ItemCategory } from '../data/items';

export type ShopListCategory = ItemCategory | 'all';

export interface ShopListItem {
  key: string;
  name: string;
  category: ItemCategory;
  cost: number;
  description?: string;
}

export interface ShopListFilter {
  category: ShopListCategory;
  query: string;
  recipePrefix: string;
}

export function buildShopVisibleItems<T extends ShopListItem>(items: T[], filter: ShopListFilter): T[] {
  const tokens = normalizeShopQuery(filter.query);
  return items.filter((item) => {
    if (item.cost <= 0) return false;
    if (item.key.startsWith(filter.recipePrefix)) return false;
    if (tokens.length === 0 && filter.category !== 'all' && item.category !== filter.category) return false;
    if (tokens.length === 0) return true;
    const haystack = `${item.key} ${item.name} ${item.description ?? ''} ${item.category}`.toLocaleLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });
}

function normalizeShopQuery(query: string): string[] {
  return query
    .trim()
    .toLocaleLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}
