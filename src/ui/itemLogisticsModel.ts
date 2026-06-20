import { itemDef } from '../data/items';

export type ItemLogisticsLane = 'inventory' | 'backpack' | 'stash' | 'tp' | 'courier';
export type ItemLogisticsTone = 'ready' | 'busy' | 'blocked' | 'muted';

export interface ItemLogisticsItemInput {
  itemKey: string;
  charges?: number;
  backpackDelayRemaining?: number;
}

export interface CourierLogisticsInput {
  alive: boolean;
  task?: 'idle' | 'retrieving' | 'delivering' | 'returning' | 'dead';
  etaSeconds?: number;
  respawnSeconds?: number;
  cargo: Array<ItemLogisticsItemInput | null>;
}

export interface ItemLogisticsInput {
  inventory: Array<ItemLogisticsItemInput | null>;
  backpack: Array<ItemLogisticsItemInput | null>;
  stash: Array<ItemLogisticsItemInput | null>;
  tpSlot?: ItemLogisticsItemInput | null;
  courier?: CourierLogisticsInput;
  quickbuyKey?: string | null;
  selectedRecipeKey?: string | null;
}

export interface ItemLogisticsLaneModel {
  lane: ItemLogisticsLane;
  label: string;
  filled: number;
  totalSlots: number;
  tone: ItemLogisticsTone;
  detail: string;
}

export type ItemLogisticsActionId =
  | 'move-backpack-to-inventory'
  | 'move-inventory-to-backpack'
  | 'take-stash'
  | 'deliver-stash'
  | 'none';

export interface ItemLogisticsActionModel {
  visible: boolean;
  id: ItemLogisticsActionId;
  label: string;
  detail: string;
  tone: ItemLogisticsTone;
}

export interface ItemSlotLogisticsModel {
  lane: ItemLogisticsLane;
  index: number;
  itemKey: string;
  label: string;
  quantity: number;
  highlights: {
    quickbuyComponent: boolean;
    combineReady: boolean;
    backpackDelay: boolean;
  };
  backpackDelayRemaining: number;
  title: string;
}

export interface ItemLogisticsModel {
  lanes: ItemLogisticsLaneModel[];
  slots: ItemSlotLogisticsModel[];
  summary: string;
  quickbuyDetail: string;
  combineDetail: string;
  backpackDelayDetail: string;
  canCombineNow: boolean;
  primaryAction: ItemLogisticsActionModel;
}

interface SlotDraft {
  lane: ItemLogisticsLane;
  index: number;
  item: ItemLogisticsItemInput;
}

export function buildItemLogisticsModel(input: ItemLogisticsInput): ItemLogisticsModel {
  const courier = input.courier;
  const activeCourierCargo = courier?.alive ? courier.cargo : [];
  const slotDrafts = [
    ...laneSlots('inventory', input.inventory),
    ...laneSlots('backpack', input.backpack),
    ...laneSlots('stash', input.stash),
    ...(input.tpSlot ? [{ lane: 'tp' as const, index: 0, item: input.tpSlot }] : []),
    ...laneSlots('courier', activeCourierCargo),
  ];

  const quickbuySlotKeys = reserveRecipeSlots(slotDrafts, input.quickbuyKey);
  const combineSlotKeys = reserveHeroReadyRecipeSlots(slotDrafts, input.selectedRecipeKey);
  const selectedDef = input.selectedRecipeKey ? safeItemDef(input.selectedRecipeKey) : null;
  const canCombineNow = combineSlotKeys.size > 0 && !!selectedDef?.recipe;
  const slots = slotDrafts.map((slot) => {
    const def = itemDef(slot.item.itemKey);
    const key = slotKey(slot);
    const quickbuyComponent = quickbuySlotKeys.has(key);
    const combineReady = combineSlotKeys.has(key);
    const backpackDelayRemaining = Math.max(0, Math.ceil(slot.item.backpackDelayRemaining ?? 0));
    const backpackDelay = backpackDelayRemaining > 0;
    const badges = [
      quickbuyComponent ? 'quickbuy component' : '',
      combineReady ? 'ready to combine' : '',
      backpackDelay ? `backpack ready delay ${backpackDelayRemaining}s` : '',
    ].filter(Boolean);
    return {
      lane: slot.lane,
      index: slot.index,
      itemKey: slot.item.itemKey,
      label: def.name,
      quantity: itemQuantity(slot.item),
      highlights: { quickbuyComponent, combineReady, backpackDelay },
      backpackDelayRemaining,
      title: badges.length > 0 ? `${def.name} - ${badges.join(', ')}` : def.name,
    };
  });

  const lanes = [
    inventoryLane(input.inventory),
    fixedLane('backpack', 'Backpack', input.backpack, 'busy'),
    fixedLane('stash', 'Stash', input.stash, 'busy'),
    tpLane(input.tpSlot),
    courierLane(courier),
  ];

  return {
    lanes,
    slots,
    summary: [...lanes.map((lane) => lane.detail), backpackDelayDetail(slots)].filter(Boolean).join(' · '),
    quickbuyDetail: quickbuyDetail(slots),
    combineDetail: canCombineNow ? `Ready to combine: ${selectedDef!.name}` : '',
    backpackDelayDetail: backpackDelayDetail(slots),
    canCombineNow,
    primaryAction: primaryLogisticsAction(input),
  };
}

function primaryLogisticsAction(input: ItemLogisticsInput): ItemLogisticsActionModel {
  const inventoryFree = freeSlots(input.inventory);
  const backpackFree = freeSlots(input.backpack);
  const backpackFilled = filledSlots(input.backpack);
  const inventoryFilled = filledSlots(input.inventory);
  const stashFilled = filledSlots(input.stash);
  if (backpackFilled > 0 && inventoryFree > 0) {
    return {
      visible: true,
      id: 'move-backpack-to-inventory',
      label: 'Backpack -> Hero',
      detail: 'Click a backpack item to move it into inventory; it has a 6s ready delay',
      tone: 'ready',
    };
  }
  if (inventoryFilled > 0 && backpackFree > 0) {
    return {
      visible: true,
      id: 'move-inventory-to-backpack',
      label: 'Hero -> Backpack',
      detail: 'Click a hero inventory item to free an active slot',
      tone: 'busy',
    };
  }
  if (stashFilled > 0 && inventoryFree > 0) {
    return {
      visible: true,
      id: 'take-stash',
      label: 'Stash -> Hero',
      detail: 'At the home shop, click stash rows to move items into inventory',
      tone: 'ready',
    };
  }
  if (stashFilled > 0 && input.courier?.alive) {
    return {
      visible: true,
      id: 'deliver-stash',
      label: 'Deliver stash',
      detail: 'Use courier delivery to bring stash items to your hero',
      tone: input.courier.task === 'idle' ? 'ready' : 'busy',
    };
  }
  return { visible: false, id: 'none', label: '', detail: '', tone: 'muted' };
}

function freeSlots(items: Array<unknown | null>): number {
  return items.filter((item) => item === null).length;
}

function filledSlots(items: Array<unknown | null>): number {
  return items.length - freeSlots(items);
}

function laneSlots(lane: ItemLogisticsLane, items: Array<ItemLogisticsItemInput | null>): SlotDraft[] {
  return items
    .map((item, index) => item ? { lane, index, item } : null)
    .filter((slot): slot is SlotDraft => !!slot);
}

function inventoryLane(items: Array<ItemLogisticsItemInput | null>): ItemLogisticsLaneModel {
  return fixedLane('inventory', 'Hero', items, 'ready');
}

function fixedLane(
  lane: ItemLogisticsLane,
  label: string,
  items: Array<ItemLogisticsItemInput | null>,
  tone: ItemLogisticsTone,
): ItemLogisticsLaneModel {
  const filled = items.filter(Boolean).length;
  return {
    lane,
    label,
    filled,
    totalSlots: items.length,
    tone: filled > 0 ? tone : 'muted',
    detail: `${label} ${filled}/${items.length}`,
  };
}

function tpLane(tpSlot?: ItemLogisticsItemInput | null): ItemLogisticsLaneModel {
  const filled = tpSlot ? itemQuantity(tpSlot) : 0;
  return {
    lane: 'tp',
    label: 'TP',
    filled,
    totalSlots: 1,
    tone: filled > 0 ? 'ready' : 'muted',
    detail: `TP x${filled}`,
  };
}

function courierLane(courier?: CourierLogisticsInput): ItemLogisticsLaneModel {
  if (!courier) {
    return { lane: 'courier', label: 'Courier', filled: 0, totalSlots: 0, tone: 'muted', detail: 'Courier none' };
  }
  const filled = courier.cargo.filter(Boolean).length;
  if (!courier.alive) {
    const respawn = courier.respawnSeconds && courier.respawnSeconds > 0 ? `, ${Math.ceil(courier.respawnSeconds)}s` : '';
    return { lane: 'courier', label: 'Courier', filled, totalSlots: courier.cargo.length, tone: 'blocked', detail: `Courier dead${respawn}` };
  }
  const task = courier.task ?? 'idle';
  const eta = courier.etaSeconds && courier.etaSeconds > 0 ? `, ${Math.ceil(courier.etaSeconds)}s` : '';
  return {
    lane: 'courier',
    label: 'Courier',
    filled,
    totalSlots: courier.cargo.length,
    tone: task === 'idle' ? 'ready' : 'busy',
    detail: `Courier ${task} ${filled}/${courier.cargo.length}${eta}`,
  };
}

function reserveRecipeSlots(slots: SlotDraft[], itemKey?: string | null): Set<string> {
  const def = itemKey ? safeItemDef(itemKey) : null;
  if (!def?.recipe) return new Set();
  return reserveSlotsByRequirements(slots, recipeRequirements(def.recipe.components));
}

function reserveHeroReadyRecipeSlots(slots: SlotDraft[], itemKey?: string | null): Set<string> {
  const def = itemKey ? safeItemDef(itemKey) : null;
  if (!def?.recipe) return new Set();
  const inventorySlots = slots.filter((slot) => slot.lane === 'inventory');
  const requirements = recipeRequirements(def.recipe.components);
  if (!requirementsSatisfied(inventorySlots, requirements)) return new Set();
  return reserveSlotsByRequirements(inventorySlots, requirements);
}

function recipeRequirements(components: string[]): Map<string, number> {
  const requirements = new Map<string, number>();
  for (const component of components) requirements.set(component, (requirements.get(component) ?? 0) + 1);
  return requirements;
}

function requirementsSatisfied(slots: SlotDraft[], requirements: Map<string, number>): boolean {
  const counts = new Map<string, number>();
  for (const slot of slots) {
    if (!requirements.has(slot.item.itemKey)) continue;
    counts.set(slot.item.itemKey, (counts.get(slot.item.itemKey) ?? 0) + itemQuantity(slot.item));
  }
  for (const [key, required] of requirements) {
    if ((counts.get(key) ?? 0) < required) return false;
  }
  return true;
}

function reserveSlotsByRequirements(slots: SlotDraft[], requirements: Map<string, number>): Set<string> {
  const remaining = new Map(requirements);
  const reserved = new Set<string>();
  for (const slot of slots) {
    const need = remaining.get(slot.item.itemKey) ?? 0;
    if (need <= 0) continue;
    reserved.add(slotKey(slot));
    remaining.set(slot.item.itemKey, Math.max(0, need - itemQuantity(slot.item)));
  }
  return reserved;
}

function quickbuyDetail(slots: ItemSlotLogisticsModel[]): string {
  const counts = new Map<ItemLogisticsLane, number>();
  for (const slot of slots) {
    if (!slot.highlights.quickbuyComponent) continue;
    counts.set(slot.lane, (counts.get(slot.lane) ?? 0) + 1);
  }
  if (counts.size === 0) return '';
  const parts: string[] = [];
  for (const lane of ['inventory', 'backpack', 'stash', 'tp', 'courier'] as const) {
    const count = counts.get(lane) ?? 0;
    if (count > 0) parts.push(`${laneLabel(lane)} x${count}`);
  }
  return `Quickbuy components: ${parts.join(' / ')}`;
}

function backpackDelayDetail(slots: ItemSlotLogisticsModel[]): string {
  const delayed = slots.filter((slot) => slot.highlights.backpackDelay);
  if (delayed.length === 0) return '';
  return `Backpack delay: ${delayed.map((slot) => `${slot.label} ${slot.backpackDelayRemaining}s`).join(' / ')}`;
}

function itemQuantity(item: ItemLogisticsItemInput): number {
  const def = itemDef(item.itemKey);
  return def.stackCharges ? Math.max(1, Math.floor(item.charges ?? 1)) : 1;
}

function slotKey(slot: SlotDraft): string {
  return `${slot.lane}:${slot.index}`;
}

function laneLabel(lane: ItemLogisticsLane): string {
  if (lane === 'inventory') return 'Hero';
  if (lane === 'backpack') return 'Backpack';
  if (lane === 'stash') return 'Stash';
  if (lane === 'tp') return 'TP';
  return 'Courier';
}

function safeItemDef(itemKey: string) {
  try {
    return itemDef(itemKey);
  } catch {
    return null;
  }
}
