import { itemDef } from '../data/items';
import type { CastTrackEntry } from '../render/castBar';
import { castBarInfo } from '../render/castBar';
import type { Unit } from '../sim/unit';

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

export interface InspectCastProgressUnit extends Pick<Unit, 'id' | 'casting' | 'channeling'> {
  heroDef?: { abilities: Array<{ name: string } | undefined> };
}

export interface InspectCastProgress {
  kind: 'cast' | 'channel';
  label: string;
  abilityName: string;
  frac: number;
  percent: number;
  remaining: number;
  color: string;
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

export function inspectCastProgress(
  track: Map<number, CastTrackEntry>,
  unit: InspectCastProgressUnit,
  now: number,
): InspectCastProgress | null {
  const info = castBarInfo(track, unit, now);
  if (!info) return null;
  const cast = unit.casting;
  const channel = unit.channeling;
  const abilityIndex = cast ? cast.abilityIndex : channel ? channel.abilityIndex : -1;
  const end = cast ? cast.pointUntil : channel ? channel.until : now;
  return {
    kind: info.channel ? 'channel' : 'cast',
    label: info.channel ? '引导中' : '施法中',
    abilityName: unit.heroDef?.abilities[abilityIndex]?.name ?? `技能 ${abilityIndex + 1}`,
    frac: info.frac,
    percent: Math.round(info.frac * 100),
    remaining: Math.max(0, end - now),
    color: info.color,
  };
}

function compactItemName(name: string): string {
  return Array.from(name).slice(0, 2).join('');
}
