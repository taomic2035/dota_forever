import { itemDef } from '../data/items';

export type InspectPanelAuthorityKind = 'commandable' | 'inspect';

export interface InspectPanelAuthorityInput {
  unitId: number;
  commandableSelectedIds: number[];
  inspectUnitId: number;
}

export interface InspectPanelAuthority {
  kind: InspectPanelAuthorityKind;
  label: string;
  detail: string;
  color: string;
  background: string;
}

export interface InspectInventoryItemInput {
  itemKey: string;
  charges?: number;
}

export interface InspectInventorySummaryInput {
  inventory: Array<InspectInventoryItemInput | null>;
  tpSlot?: InspectInventoryItemInput | null;
}

export interface InspectInventorySummaryItem {
  key: string;
  label: string;
  tooltip: string;
  charges: number;
}

export interface InspectInventorySummary {
  visible: boolean;
  items: InspectInventorySummaryItem[];
}

export function inspectPanelAuthority(input: InspectPanelAuthorityInput): InspectPanelAuthority | null {
  if (!input.unitId) return null;
  if (input.commandableSelectedIds.includes(input.unitId)) {
    return {
      kind: 'commandable',
      label: 'COMMANDABLE',
      detail: 'Orders affect this selected unit.',
      color: '#9cff74',
      background: '#183315',
    };
  }
  return {
    kind: 'inspect',
    label: 'VIEW ONLY',
    detail: 'Orders fall back to your hero.',
    color: '#ffd76a',
    background: '#332715',
  };
}

export function inspectInventorySummary(input: InspectInventorySummaryInput): InspectInventorySummary {
  const items = [
    ...input.inventory.filter((item): item is InspectInventoryItemInput => !!item),
    ...(input.tpSlot ? [input.tpSlot] : []),
  ].map((item) => {
    const def = itemDef(item.itemKey);
    return {
      key: item.itemKey,
      label: item.itemKey === 'tp' ? 'TP' : compactItemName(def.name),
      tooltip: def.name,
      charges: Math.max(0, Math.floor(item.charges ?? 0)),
    };
  });
  return { visible: items.length > 0, items };
}

function compactItemName(name: string): string {
  return Array.from(name).slice(0, 2).join('');
}
