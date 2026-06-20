import { availabilityCurrentLine, buildItemAvailability } from './availabilityModel';

export interface ItemSlotActiveTooltipInput {
  cooldown?: number;
  manaCost?: number;
  castRange?: number;
}

export interface ItemSlotTitleInput {
  name: string;
  description: string;
  hotkey: string;
  active: ItemSlotActiveTooltipInput | null;
  cooldownRemaining: number;
  backpackDelayRemaining?: number;
  currentMana: number;
  charges?: number;
  canBackpack?: boolean;
}

export interface EmptyItemSlotTitleInput {
  hotkey: string;
  isTpSlot: boolean;
}

export interface BackpackItemSlotTitleInput {
  name: string;
  description: string;
  charges?: number;
}

export function buildEmptyItemSlotTitle(input: EmptyItemSlotTitleInput): string {
  if (!input.isTpSlot) return '';
  return `回城卷轴槽(按 ${input.hotkey} 使用)\n当前: 空槽`;
}

export function buildEmptyBackpackSlotTitle(): string {
  return '背包栏(随身·不提供加成)\n当前: 空槽';
}

export function buildItemSlotTitle(input: ItemSlotTitleInput): string {
  const lines = [input.name];
  const staticLine = itemStaticActiveLine(input.active);
  if (staticLine) lines.push(staticLine);
  lines.push(input.description);
  lines.push(itemCurrentStateLine(input));
  if (input.canBackpack) lines.push('左键移入背包栏 · 右键出售');
  return lines.join('\n');
}

export function buildBackpackItemSlotTitle(input: BackpackItemSlotTitleInput): string {
  const charges = input.charges && input.charges > 0 ? ` · ${input.charges} 次` : '';
  return [
    input.name,
    input.description,
    `当前: 背包栏 · 无加成${charges}`,
    '点击移入物品栏,移入后 6 秒就绪',
  ].join('\n');
}

function itemStaticActiveLine(active: ItemSlotActiveTooltipInput | null): string {
  if (!active) return '';
  return [
    active.manaCost ? `法力 ${active.manaCost}` : '',
    active.cooldown ? `冷却 ${active.cooldown}s` : '',
    active.castRange ? `施法距离 ${active.castRange}` : '',
  ].filter(Boolean).join(' · ');
}

function itemCurrentStateLine(input: ItemSlotTitleInput): string {
  return availabilityCurrentLine(buildItemAvailability({
    hasActive: !!input.active,
    cooldownRemaining: input.cooldownRemaining,
    backpackDelayRemaining: input.backpackDelayRemaining,
    manaCost: input.active?.manaCost ?? 0,
    currentMana: input.currentMana,
    charges: input.charges,
  }));
}
