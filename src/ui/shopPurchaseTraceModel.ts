import { itemDef } from '../data/items';
import type { BuyResult } from '../sim/items';

export type ShopPurchaseTraceTone = 'ready' | 'busy' | 'blocked';
export type ShopPurchaseSource = 'direct' | 'quickbuy' | 'recipe';

export interface ShopPurchaseTraceEvent {
  itemKey: string;
  result: BuyResult;
  source: ShopPurchaseSource;
  sequence: number;
}

export interface ShopPurchaseTraceEntry {
  itemKey: string;
  label: string;
  destinationLabel: string;
  tone: ShopPurchaseTraceTone;
  detail: string;
  actionHint: string;
}

export interface ShopPurchaseTraceModel {
  visible: boolean;
  entries: ShopPurchaseTraceEntry[];
  summary: string;
}

export function buildShopPurchaseTraceModel(input: {
  events: ShopPurchaseTraceEvent[];
  maxEntries?: number;
}): ShopPurchaseTraceModel {
  const maxEntries = Math.max(1, Math.floor(input.maxEntries ?? 4));
  const entries = [...input.events]
    .sort((a, b) => b.sequence - a.sequence)
    .slice(0, maxEntries)
    .map(traceEntry);

  if (entries.length === 0) {
    return { visible: false, entries: [], summary: '' };
  }

  const latest = entries[0];
  const summary = latest.tone === 'blocked'
    ? `Latest purchase: ${latest.label} blocked`
    : `Latest purchase: ${latest.label} -> ${latest.destinationLabel}`;

  return {
    visible: true,
    entries,
    summary,
  };
}

function traceEntry(event: ShopPurchaseTraceEvent): ShopPurchaseTraceEntry {
  const def = itemDef(event.itemKey);
  const label = def.name;
  if (event.result === 'ok') {
    return {
      itemKey: event.itemKey,
      label,
      destinationLabel: 'Hero',
      tone: 'ready',
      detail: 'Landed in hero inventory',
      actionHint: 'Use from main slots',
    };
  }
  if (event.result === 'ok_backpack') {
    return {
      itemKey: event.itemKey,
      label,
      destinationLabel: 'Backpack',
      tone: 'busy',
      detail: 'No main inventory room; no stats until moved',
      actionHint: 'Move to inventory',
    };
  }
  if (event.result === 'ok_stash') {
    return {
      itemKey: event.itemKey,
      label,
      destinationLabel: 'Stash',
      tone: 'busy',
      detail: 'Retrieve at fountain or dispatch courier',
      actionHint: 'Take stash / Deliver',
    };
  }
  if (event.result === 'no_gold') {
    return blockedEntry(event.itemKey, label, 'Not enough gold', 'Farm gold');
  }
  if (event.result === 'no_shop') {
    return blockedEntry(event.itemKey, label, 'Need the correct shop or range', 'Move to shop');
  }
  return blockedEntry(event.itemKey, label, 'Inventory, backpack, and stash full', 'Free a slot');
}

function blockedEntry(itemKey: string, label: string, detail: string, actionHint: string): ShopPurchaseTraceEntry {
  return {
    itemKey,
    label,
    destinationLabel: 'Blocked',
    tone: 'blocked',
    detail,
    actionHint,
  };
}
