import type { Vec2 } from '../core/vec2';
import { RUNE_INTERVAL } from '../data/balance';
import { RUNE_NAME } from '../sim/runes';
import type { RuneType } from '../data/balance';

export type MapMechanicsChipKey = 'neutrals' | 'runes' | 'height' | 'forest' | 'miss';
export type MapMechanicsChipTone = 'neutral' | 'info' | 'highground' | 'forest' | 'warning' | 'ready';
export type MapMechanicsRadarKey = 'camp' | 'rune' | 'highground' | 'forest';

export interface MapMechanicsChip {
  key: MapMechanicsChipKey;
  label: string;
  value: string;
  title: string;
  tone: MapMechanicsChipTone;
}

export interface MapMechanicsRadarEntry {
  key: MapMechanicsRadarKey;
  label: string;
  value: string;
  title: string;
  tone: MapMechanicsChipTone;
}

export interface MapMechanicsRune {
  type: RuneType;
  pos: Vec2;
}

export interface MapMechanicsNearestCamp {
  tier: string;
  distance: number;
  alive: boolean;
}

export interface MapMechanicsNearestRune {
  distance: number;
  activeType?: RuneType;
}

export interface MapMechanicsNearestHighGround {
  distance: number;
  current: boolean;
}

export interface MapMechanicsNearestForestPocket {
  distance: number;
  inside?: boolean;
}

export interface MapMechanicsInput {
  time: number;
  totalCamps: number;
  aliveCamps: number;
  aliveNeutrals: number;
  activeRunes: MapMechanicsRune[];
  heroHeight: number;
  nearTreeWall: boolean;
  insideForestPocket?: boolean;
  evasion: number;
  trueStrike: boolean;
  uphillMissChance: number;
  nearestCamp?: MapMechanicsNearestCamp;
  nearestRune?: MapMechanicsNearestRune;
  nearestHighGround?: MapMechanicsNearestHighGround;
  nearestForestPocket?: MapMechanicsNearestForestPocket;
}

export interface MapMechanicsModel {
  chips: MapMechanicsChip[];
  radar: MapMechanicsRadarEntry[];
}

export function buildMapMechanicsModel(input: MapMechanicsInput): MapMechanicsModel {
  return {
    chips: [
      neutralChip(input),
      runeChip(input),
      heightChip(input),
      forestChip(input),
      missChip(input),
    ],
    radar: buildRadar(input),
  };
}

function neutralChip(input: MapMechanicsInput): MapMechanicsChip {
  const next = neutralNextCheckSeconds(input.time);
  const value = `${input.aliveCamps}/${input.totalCamps}`;
  if (input.time < 30 && input.aliveCamps === 0 && input.aliveNeutrals === 0) {
    return {
      key: 'neutrals',
      label: '野怪',
      value: '首刷',
      tone: 'warning',
      title: `野区营地: ${value} 已刷新 · 首刷 ${formatClock(next)} · 野怪 ${input.aliveNeutrals}`,
    };
  }
  return {
    key: 'neutrals',
    label: '野怪',
    value,
    tone: input.aliveCamps > 0 || input.aliveNeutrals > 0 ? 'ready' : 'neutral',
    title: `野区营地: ${value} 已刷新 · 野怪 ${input.aliveNeutrals} · 下一次整分钟检查 ${formatSeconds(next)}`,
  };
}

function runeChip(input: MapMechanicsInput): MapMechanicsChip {
  const active = input.activeRunes.length;
  const next = nextRuneSeconds(input.time);
  const runeNames = active > 0
    ? input.activeRunes.map((rune) => RUNE_NAME[rune.type] ?? rune.type).join(' / ')
    : '当前无可见神符';
  return {
    key: 'runes',
    label: '神符',
    value: active > 0 ? `${active}枚` : formatClock(next),
    tone: active > 0 ? 'info' : 'neutral',
    title: `河道神符: ${runeNames} · 下一波 ${formatClock(next)}`,
  };
}

function heightChip(input: MapMechanicsInput): MapMechanicsChip {
  if (input.heroHeight <= 0) {
    return {
      key: 'height',
      label: '地形',
      value: '河道',
      tone: 'info',
      title: '当前位置: 河道低地 · 河道看岸上受高低地视野限制',
    };
  }
  if (input.heroHeight >= 2) {
    return {
      key: 'height',
      label: '地形',
      value: '高地',
      tone: 'highground',
      title: `当前位置: 高地 · 低处攻击高处有 ${percent(input.uphillMissChance)} miss`,
    };
  }
  return {
    key: 'height',
    label: '地形',
    value: '平地',
    tone: 'neutral',
    title: `当前位置: 平地 · 低打高有 ${percent(input.uphillMissChance)} miss`,
  };
}

function forestChip(input: MapMechanicsInput): MapMechanicsChip {
  if (input.insideForestPocket || input.nearestForestPocket?.inside) {
    return {
      key: 'forest',
      label: '树林',
      value: '林影',
      tone: 'forest',
      title: '已贴近树林阴影: 林影提供遮蔽读法,树墙仍阻挡直线路径',
    };
  }
  return {
    key: 'forest',
    label: '树林',
    value: input.nearTreeWall ? '入口' : '远',
    tone: input.nearTreeWall ? 'forest' : 'neutral',
    title: input.nearTreeWall
      ? '附近有林间入口/树线: 沿现有野区路径靠近林影,树墙仍阻挡直线路径'
      : '附近没有树墙: 地形遮挡主要来自高低地与战争迷雾',
  };
}

function missChip(input: MapMechanicsInput): MapMechanicsChip {
  if (input.trueStrike) {
    return {
      key: 'miss',
      label: 'MISS',
      value: '必中',
      tone: 'ready',
      title: '已启用必中: 无视闪避与低打高 miss',
    };
  }
  return {
    key: 'miss',
    label: 'MISS',
    value: input.evasion > 0 ? percent(input.evasion) : percent(input.uphillMissChance),
    tone: input.evasion > 0 ? 'warning' : 'neutral',
    title: `当前闪避 ${percent(input.evasion)} · 低打高额外 ${percent(input.uphillMissChance)} miss · 未启用必中`,
  };
}

function buildRadar(input: MapMechanicsInput): MapMechanicsRadarEntry[] {
  const radar: MapMechanicsRadarEntry[] = [];
  if (input.nearestCamp) radar.push(campRadar(input, input.nearestCamp));
  if (input.nearestRune) radar.push(runeRadar(input, input.nearestRune));
  if (input.nearestHighGround) radar.push(highGroundRadar(input, input.nearestHighGround));
  if (input.nearestForestPocket) radar.push(forestRadar(input.nearestForestPocket));
  return radar;
}

function campRadar(input: MapMechanicsInput, camp: MapMechanicsNearestCamp): MapMechanicsRadarEntry {
  const tierLabel = campTierLabel(camp.tier);
  const state = camp.alive
    ? '已刷新'
    : input.time < 30
      ? `0:30 首刷倒计时 ${formatClock(30 - input.time)}`
      : `下次检查 ${formatSeconds(neutralNextCheckSeconds(input.time))}`;
  return {
    key: 'camp',
    label: '野怪营',
    value: `${tierLabel} ${formatDistance(camp.distance)}`,
    tone: camp.alive ? 'ready' : 'neutral',
    title: camp.alive
      ? `最近${tierLabel}: ${state} · 营地有地面旗标与小地图字母,靠近可拉野/清野`
      : `最近${tierLabel}: ${state} · 地面旗标/小地图字母常显,到点会刷出野怪`,
  };
}

function runeRadar(input: MapMechanicsInput, rune: MapMechanicsNearestRune): MapMechanicsRadarEntry {
  const active = rune.activeType ? RUNE_NAME[rune.activeType] ?? rune.activeType : undefined;
  const next = nextRuneSeconds(input.time);
  return {
    key: 'rune',
    label: '河道神符',
    value: `${active ?? `下波 ${formatClock(next)}`} ${formatDistance(rune.distance)}`,
    tone: active ? 'info' : 'neutral',
    title: active
      ? `河道有${active}: 靠近自动拾取/装瓶 · 下一波 ${formatClock(next)}`
      : `最近符文点: ${formatDistance(rune.distance)} · 下一波 ${formatClock(next)}`,
  };
}

function highGroundRadar(input: MapMechanicsInput, high: MapMechanicsNearestHighGround): MapMechanicsRadarEntry {
  return {
    key: 'highground',
    label: '高地',
    value: `${high.current ? '脚下' : '坡道'} ${formatDistance(high.distance)}`,
    tone: high.current ? 'highground' : 'warning',
    title: `最近高地/坡道: ${formatDistance(high.distance)} · 低打高 ${percent(input.uphillMissChance)} miss,高低差会影响视野`,
  };
}

function forestRadar(forest: MapMechanicsNearestForestPocket): MapMechanicsRadarEntry {
  return {
    key: 'forest',
    label: forest.inside ? '树林阴影' : '树林阴影',
    value: forest.inside ? '脚下' : `树线 ${formatDistance(forest.distance)}`,
    tone: 'forest',
    title: forest.inside
      ? '已贴近树林阴影 · 林影提示当前位置可用于绕视野/卡迷雾'
      : `最近树林阴影: ${formatDistance(forest.distance)} · 沿现有野区入口靠近树线,不要穿树墙`,
  };
}

function neutralNextCheckSeconds(time: number): number {
  if (time < 30) return Math.ceil(30 - time);
  return Math.max(0, Math.ceil(60 - (time % 60 || 60)));
}

function nextRuneSeconds(time: number): number {
  if (time < 0) return Math.ceil(-time);
  const next = (Math.floor(time / RUNE_INTERVAL) + 1) * RUNE_INTERVAL;
  return Math.max(0, Math.ceil(next - time));
}

function formatSeconds(seconds: number): string {
  return `${Math.ceil(seconds)}s`;
}

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatDistance(distance: number): string {
  return `${Math.max(0, Math.round(distance))}`;
}

function campTierLabel(tier: string): string {
  if (tier === 'ancient') return '远古';
  if (tier === 'large') return '大营';
  if (tier === 'medium') return '中营';
  if (tier === 'small') return '小营';
  return '营地';
}
