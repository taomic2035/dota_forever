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

export interface ShopListAvailability {
  canBuy: boolean;
}

export type ShopSearchMatchedField = 'key' | 'name' | 'description' | 'category';
export type ShopSearchHighlightTone = 'match' | 'buyable' | 'blocked';

export interface ShopSearchHighlightModel {
  tokens: string[];
  matchedFields: ShopSearchMatchedField[];
  score: number;
  label: string;
  title: string;
  tone: ShopSearchHighlightTone;
  canBuy: boolean;
}

export interface ShopVisibleItemRow<T extends ShopListItem> {
  item: T;
  highlight: ShopSearchHighlightModel;
}

export function buildShopVisibleItems<T extends ShopListItem>(items: T[], filter: ShopListFilter): T[] {
  return buildShopVisibleItemRows(items, filter).map((row) => row.item);
}

export function buildShopVisibleItemRows<T extends ShopListItem>(
  items: T[],
  filter: ShopListFilter,
  availability: ReadonlyMap<string, ShopListAvailability> = new Map(),
): ShopVisibleItemRow<T>[] {
  const tokens = normalizeShopQuery(filter.query);
  const rows = items
    .filter((item) => isVisibleShopItem(item, filter, tokens))
    .map((item, index) => ({
      item,
      index,
      highlight: buildShopSearchHighlightModel(item, filter, availability.get(item.key)),
    }));
  if (tokens.length > 0) {
    rows.sort((a, b) => b.highlight.score - a.highlight.score || a.index - b.index);
  }
  return rows.map(({ item, highlight }) => ({ item, highlight }));
}

export function buildShopSearchHighlightModel(
  item: ShopListItem,
  filter: ShopListFilter,
  availability?: ShopListAvailability,
): ShopSearchHighlightModel {
  const tokens = normalizeShopQuery(filter.query);
  const fields: Array<{ key: ShopSearchMatchedField; value: string; weight: number }> = [
    { key: 'key', value: item.key, weight: 30 },
    { key: 'name', value: item.name, weight: 40 },
    { key: 'description', value: item.description ?? '', weight: 10 },
    { key: 'category', value: item.category, weight: 20 },
  ];
  const matched = new Set<ShopSearchMatchedField>();
  let score = 0;
  for (const token of tokens) {
    for (const field of fields) {
      if (!field.value.toLocaleLowerCase().includes(token)) continue;
      matched.add(field.key);
      score += field.weight;
    }
  }
  const canBuy = availability?.canBuy === true;
  const tone: ShopSearchHighlightTone = canBuy ? 'buyable' : availability ? 'blocked' : 'match';
  const matchedFields = [...matched];
  return {
    tokens,
    matchedFields,
    score,
    label: tokens.join(' / '),
    title: tokens.length > 0
      ? `Matched ${tokens.join(', ')} in ${matchedFields.join(', ') || 'item text'}`
      : '',
    tone,
    canBuy,
  };
}

export function orderShopVisibleItemsByAvailability<T extends ShopListItem>(
  items: T[],
  availability: ReadonlyMap<string, ShopListAvailability>,
): T[] {
  return items
    .map((item, index) => ({ item, index, canBuy: availability.get(item.key)?.canBuy === true }))
    .sort((a, b) => Number(b.canBuy) - Number(a.canBuy) || a.index - b.index)
    .map((row) => row.item);
}

function isVisibleShopItem(item: ShopListItem, filter: ShopListFilter, tokens: string[]): boolean {
  if (item.cost <= 0) return false;
  if (item.key.startsWith(filter.recipePrefix)) return false;
  if (tokens.length === 0 && filter.category !== 'all' && item.category !== filter.category) return false;
  if (tokens.length === 0) return true;
  const haystack = `${item.key} ${item.name} ${item.description ?? ''} ${item.category}`.toLocaleLowerCase();
  return tokens.every((token) => haystack.includes(token));
}

function normalizeShopQuery(query: string): string[] {
  return query
    .trim()
    .toLocaleLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}
