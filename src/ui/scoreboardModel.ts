import { itemDef } from '../data/items';

export interface ScoreboardItemInput {
  itemKey: string;
  charges?: number;
}

export interface ScoreboardHeroSummaryInput {
  gold: number;
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
