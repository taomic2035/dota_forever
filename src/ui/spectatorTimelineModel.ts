import type { Vec2 } from '../core/vec2';
import type { GameEvent } from '../sim/world';
import type { UnitKind } from '../sim/unit';
import { Team } from '../sim/map';

export type SpectatorTimelineTone = 'kill' | 'structure' | 'courier' | 'objective' | 'system';

export interface SpectatorTimelineUnit {
  id: number;
  name: string;
  kind: UnitKind;
  team: Team;
  pos: Vec2;
}

export interface SpectatorTimelineEntry {
  id: string;
  at: number;
  timeLabel: string;
  label: string;
  detail: string;
  tone: SpectatorTimelineTone;
  focus?: {
    unitId?: number;
    pos?: Vec2;
  };
}

export interface SpectatorTimelineInput {
  now: number;
  events: readonly GameEvent[];
  units: readonly SpectatorTimelineUnit[];
}

const RUNE_NAME: Record<string, string> = {
  haste: '极速',
  doubledamage: '双倍伤害',
  regen: '恢复',
  invis: '隐身',
  illusion: '幻象',
  bounty: '赏金',
};

export function buildSpectatorTimelineEntries(input: SpectatorTimelineInput): SpectatorTimelineEntry[] {
  const units = new Map(input.units.map((unit) => [unit.id, unit]));
  const entries: SpectatorTimelineEntry[] = [];

  input.events.forEach((event, index) => {
    const entry = entryFromEvent(event, input.now, index, units);
    if (entry) entries.push(entry);
  });

  return entries;
}

export class SpectatorTimelineLog {
  private readonly maxEntries: number;
  private log: SpectatorTimelineEntry[] = [];

  constructor(maxEntries = 12) {
    this.maxEntries = Math.max(1, Math.floor(maxEntries));
  }

  pushEvents(input: SpectatorTimelineInput): void {
    const entries = buildSpectatorTimelineEntries(input);
    if (entries.length === 0) return;
    this.log = [...entries.reverse(), ...this.log].slice(0, this.maxEntries);
  }

  entries(): SpectatorTimelineEntry[] {
    return [...this.log];
  }
}

export class SpectatorTimelineJumpHistoryLog {
  private readonly maxEntries: number;
  private log: SpectatorTimelineEntry[] = [];

  constructor(maxEntries = 6) {
    this.maxEntries = Math.max(1, Math.floor(maxEntries));
  }

  record(entry: SpectatorTimelineEntry): void {
    const copy = copyEntry(entry);
    this.log = [copy, ...this.log.filter((item) => item.id !== entry.id)].slice(0, this.maxEntries);
  }

  entries(): SpectatorTimelineEntry[] {
    return this.log.map(copyEntry);
  }
}

function copyEntry(entry: SpectatorTimelineEntry): SpectatorTimelineEntry {
  return {
    ...entry,
    focus: entry.focus ? {
      unitId: entry.focus.unitId,
      pos: entry.focus.pos ? { ...entry.focus.pos } : undefined,
    } : undefined,
  };
}

function entryFromEvent(
  event: GameEvent,
  now: number,
  index: number,
  units: Map<number, SpectatorTimelineUnit>,
): SpectatorTimelineEntry | null {
  const timeLabel = formatTime(now);

  if (event.kind === 'hero_kill') {
    const killer = units.get(event.killerId);
    const victim = units.get(event.victimId);
    return {
      id: `${now}:hero_kill:${event.killerId}:${event.victimId}:${index}`,
      at: now,
      timeLabel,
      label: `${unitName(killer, '英雄')} 击杀 ${unitName(victim, '英雄')}`,
      detail: event.bounty > 0 ? `赏金 +${Math.round(event.bounty)}` : '英雄阵亡',
      tone: 'kill',
      focus: focusFor(victim) ?? focusFor(killer),
    };
  }

  if (event.kind === 'tower_fell' || event.kind === 'rax_fell') {
    const unit = units.get(event.unitId);
    return {
      id: `${now}:${event.kind}:${event.unitId}:${index}`,
      at: now,
      timeLabel,
      label: `${unitName(unit, event.kind === 'tower_fell' ? '防御塔' : '兵营')} 被摧毁`,
      detail: `${teamName(event.team)} 建筑倒下`,
      tone: 'structure',
      focus: focusFor(unit),
    };
  }

  if (event.kind === 'unit_died') {
    const unit = units.get(event.unitId);
    if (unit?.kind !== 'courier') return null;
    return {
      id: `${now}:courier:${event.unitId}:${index}`,
      at: now,
      timeLabel,
      label: `${unit.name} 阵亡`,
      detail: `${teamName(unit.team)} 信使被击杀`,
      tone: 'courier',
      focus: { unitId: unit.id, pos: { ...event.pos } },
    };
  }

  if (event.kind === 'boss_killed') {
    return {
      id: `${now}:boss:${event.killerId}:${index}`,
      at: now,
      timeLabel,
      label: '深渊领主被击败',
      detail: `${teamName(event.byTeam)} 获得 Boss 目标`,
      tone: 'objective',
      focus: focusFor(units.get(event.killerId)),
    };
  }

  if (event.kind === 'rune_spawned') {
    return {
      id: `${now}:rune_spawned:${event.rune}:${index}`,
      at: now,
      timeLabel,
      label: `${runeName(event.rune)}神符刷新`,
      detail: '河道目标刷新',
      tone: 'objective',
      focus: { pos: { ...event.pos } },
    };
  }

  if (event.kind === 'rune_taken') {
    const unit = units.get(event.unitId);
    return {
      id: `${now}:rune_taken:${event.rune}:${event.unitId}:${index}`,
      at: now,
      timeLabel,
      label: `${unitName(unit, '单位')} 拾取${runeName(event.rune)}神符`,
      detail: '河道目标被拾取',
      tone: 'objective',
      focus: focusFor(unit),
    };
  }

  if (event.kind === 'game_over') {
    return {
      id: `${now}:game_over:${event.winner}:${index}`,
      at: now,
      timeLabel,
      label: `${teamName(event.winner)} 获胜`,
      detail: '比赛结束',
      tone: 'system',
    };
  }

  return null;
}

function focusFor(unit: SpectatorTimelineUnit | undefined): SpectatorTimelineEntry['focus'] | undefined {
  if (!unit) return undefined;
  return { unitId: unit.id, pos: { ...unit.pos } };
}

function unitName(unit: SpectatorTimelineUnit | undefined, fallback: string): string {
  return unit?.name ?? fallback;
}

function runeName(rune: string): string {
  return RUNE_NAME[rune] ?? rune;
}

function teamName(team: Team): string {
  if (team === Team.Dawn) return '晨曦';
  if (team === Team.Night) return '永夜';
  return '中立';
}

function formatTime(time: number): string {
  const sign = time < 0 ? '-' : '';
  const whole = Math.max(0, Math.floor(Math.abs(time)));
  const mm = Math.floor(whole / 60);
  const ss = (whole % 60).toString().padStart(2, '0');
  return `${sign}${mm}:${ss}`;
}
