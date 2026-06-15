import { itemDef } from '../data/items';
import { buybackCost } from '../data/balance';

export interface ScoreboardItemInput {
  itemKey: string;
  charges?: number;
}

export interface ScoreboardHeroSummaryInput {
  gold: number;
  level?: number;
  alive?: boolean;
  now?: number;
  respawnAt?: number;
  buybackCooldownUntil?: number;
  inventory: Array<ScoreboardItemInput | null>;
  backpack?: Array<ScoreboardItemInput | null>;
  stash?: Array<ScoreboardItemInput | null>;
  tpSlot?: ScoreboardItemInput | null;
}

export type ScoreboardItemLane = 'inventory' | 'backpack' | 'stash' | 'tp';

export interface ScoreboardItemSummary {
  key: string;
  lane: ScoreboardItemLane;
  label: string;
  tooltip: string;
  charges: number;
  value: number;
}

export interface ScoreboardHeroSummary {
  gold: number;
  netWorth: number;
  items: ScoreboardItemSummary[];
  status: ScoreboardHeroStatus;
}

export type ScoreboardHeroStatusKind = 'alive' | 'buybackReady' | 'buybackCooldown' | 'noBuybackGold';

export interface ScoreboardHeroStatus {
  kind: ScoreboardHeroStatusKind;
  label: string;
  detail: string;
  color: string;
}

export function scoreboardHeroSummary(input: ScoreboardHeroSummaryInput): ScoreboardHeroSummary {
  const gold = Math.max(0, Math.floor(input.gold));
  const items = [
    ...summarizeLane(input.inventory, 'inventory'),
    ...summarizeLane(input.backpack ?? [], 'backpack'),
    ...summarizeLane(input.stash ?? [], 'stash'),
    ...(input.tpSlot ? [summarizeItem(input.tpSlot, 'tp')] : []),
  ];
  return {
    gold,
    netWorth: gold + items.reduce((sum, item) => sum + item.value, 0),
    items,
    status: heroStatus(input, gold),
  };
}

function heroStatus(input: ScoreboardHeroSummaryInput, gold: number): ScoreboardHeroStatus {
  if (input.alive !== false) {
    return { kind: 'alive', label: 'LIVE', detail: '', color: '#9cff74' };
  }

  const now = input.now ?? 0;
  const level = input.level ?? 1;
  const respawnIn = Math.max(0, Math.ceil((input.respawnAt ?? now) - now));
  const cooldownIn = Math.max(0, Math.ceil((input.buybackCooldownUntil ?? -Infinity) - now));
  const cost = buybackCost(level);

  if (cooldownIn > 0) {
    return {
      kind: 'buybackCooldown',
      label: 'BB CD',
      detail: `${cooldownIn}s / respawn ${respawnIn}s`,
      color: '#ef9a9a',
    };
  }

  if (gold >= cost) {
    return {
      kind: 'buybackReady',
      label: 'BUYBACK',
      detail: `${respawnIn}s / ${cost}g`,
      color: '#9fe87a',
    };
  }

  return {
    kind: 'noBuybackGold',
    label: 'NO GOLD',
    detail: `${respawnIn}s / need ${cost - gold}g`,
    color: '#d8a84c',
  };
}

function summarizeLane(
  laneItems: Array<ScoreboardItemInput | null>,
  lane: ScoreboardItemLane,
): ScoreboardItemSummary[] {
  return laneItems
    .filter((item): item is ScoreboardItemInput => !!item)
    .map((item) => summarizeItem(item, lane));
}

function summarizeItem(item: ScoreboardItemInput, lane: ScoreboardItemLane): ScoreboardItemSummary {
  const def = itemDef(item.itemKey);
  const charges = Math.max(0, Math.floor(item.charges ?? 0));
  const quantity = def.stackCharges ? Math.max(1, charges || def.charges || 1) : 1;
  return {
    key: item.itemKey,
    lane,
    label: item.itemKey === 'tp' ? 'TP' : compactItemName(def.name),
    tooltip: lane === 'inventory' ? def.name : `${def.name} / ${laneLabel(lane)}`,
    charges,
    value: def.cost * quantity,
  };
}

function compactItemName(name: string): string {
  return Array.from(name).slice(0, 2).join('');
}

function laneLabel(lane: ScoreboardItemLane): string {
  if (lane === 'backpack') return 'Backpack';
  if (lane === 'stash') return 'Stash';
  if (lane === 'tp') return 'TP slot';
  return 'Inventory';
}
