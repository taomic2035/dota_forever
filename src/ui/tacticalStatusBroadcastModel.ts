import type { RuneType } from '../data/balance';

export interface GameClockBroadcastInput {
  time: number;
  isNight: boolean;
}

export interface ResourceStatusBroadcastInput {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
}

export interface CooldownStatusBroadcastInput {
  readyIn: number;
}

export interface BuybackStatusBroadcastInput {
  alive: boolean;
  gold: number;
  cost: number;
  cooldownRemaining: number;
}

export interface RuneStatusBroadcastInput {
  activeRunes: Array<{ type: string }>;
  readyIn: number;
}

export interface BossStatusBroadcastInput {
  active: boolean;
  alive: boolean;
  respawnIn: number;
}

const RUNE_SHORT_NAME: Partial<Record<RuneType, string>> = {
  haste: '极速',
  doubledamage: '双倍',
  regen: '恢复',
  invis: '隐身',
  illusion: '幻象',
  bounty: '赏金',
};

export function gameClockBroadcastLabel(input: GameClockBroadcastInput): string {
  return `时间 ${formatSignedClock(input.time)} · ${input.isNight ? '夜晚' : '白昼'}`;
}

export function resourceStatusBroadcastLabel(input: ResourceStatusBroadcastInput): string {
  const hp = resourcePart('生命', input.hp, input.maxHp);
  const mp = resourcePart('法力', input.mp, input.maxMp);
  return `资源: ${hp} · ${mp}`;
}

export function glyphStatusBroadcastLabel(input: CooldownStatusBroadcastInput): string {
  const readyIn = Math.max(0, Math.ceil(input.readyIn));
  return readyIn <= 0 ? '守护符文: 就绪' : `守护符文: 冷却 ${formatDuration(readyIn)}`;
}

export function runeStatusBroadcastLabel(input: RuneStatusBroadcastInput): string {
  if (input.activeRunes.length > 0) {
    const names = input.activeRunes.map((rune) => runeShortName(rune.type)).join(' / ');
    return `神符: 已刷新 ${names}`;
  }
  const readyIn = Math.max(0, Math.ceil(input.readyIn));
  return `神符: 下波 ${formatDuration(readyIn)}`;
}

export function bossStatusBroadcastLabel(input: BossStatusBroadcastInput): string {
  if (!input.active) return 'Boss: 状态未知';
  if (input.alive) return 'Boss: 在世';
  const respawnIn = Math.max(0, Math.ceil(input.respawnIn));
  return `Boss: 重生 ${formatDuration(respawnIn)}`;
}

export function buybackStatusBroadcastLabel(input: BuybackStatusBroadcastInput): string {
  if (input.alive) return '买活: 英雄存活';
  const cooldown = Math.max(0, Math.ceil(input.cooldownRemaining));
  if (cooldown > 0) return `买活: 冷却 ${formatDuration(cooldown)}`;
  const gold = Math.max(0, Math.floor(input.gold));
  const cost = Math.max(0, Math.floor(input.cost));
  if (gold < cost) return `买活: 金币不足 ${gold}/${cost}`;
  return `买活: 就绪 · 需要 ${cost} 金`;
}

function resourcePart(label: string, value: number, max: number): string {
  const safeMax = Math.max(1, Math.round(max));
  const safeValue = Math.max(0, Math.round(value));
  const pct = Math.max(0, Math.min(100, Math.round((safeValue / safeMax) * 100)));
  return `${label} ${safeValue}/${safeMax} (${pct}%)`;
}

function runeShortName(type: string): string {
  return RUNE_SHORT_NAME[type as RuneType] ?? type;
}

function formatSignedClock(time: number): string {
  const sign = time < 0 ? '-' : '';
  return `${sign}${formatDuration(Math.abs(time))}`;
}

function formatDuration(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const mm = Math.floor(whole / 60);
  const ss = (whole % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}
