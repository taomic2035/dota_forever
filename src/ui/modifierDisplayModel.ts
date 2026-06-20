import type { Modifier, StateMods } from '../sim/modifiers';

export type ModifierTokenTone = 'disable' | 'buff' | 'debuff';

export interface ModifierIconToken {
  key: string;
  label: string;
  color: string;
  remaining: number;
  tooltip: string;
  tone: ModifierTokenTone;
}

export interface DisableBarHiddenModel {
  visible: false;
}

export interface DisableBarVisibleModel {
  visible: true;
  key: string;
  label: string;
  color: string;
  remaining: number;
  percent: number;
  detail: string;
}

export type DisableBarModel = DisableBarHiddenModel | DisableBarVisibleModel;

interface ModifierDisplayInput {
  modifiers: Modifier[];
  now: number;
  max?: number;
}

interface StatusPresentation {
  label: string;
  color: string;
  tone: ModifierTokenTone;
}

const FALLBACK_DEBUFF: StatusPresentation = { label: '▼', color: '#ff9c4a', tone: 'debuff' };
const FALLBACK_BUFF: StatusPresentation = { label: '▲', color: '#78d66a', tone: 'buff' };

export function buildModifierIconTokens(input: ModifierDisplayInput): ModifierIconToken[] {
  const max = input.max ?? 10;
  return activeTimedModifiers(input.modifiers, input.now)
    .sort((a, b) => a.expiresAt - b.expiresAt)
    .slice(0, max)
    .map((modifier) => {
      const status = presentationFor(modifier);
      const remaining = Math.max(0, modifier.expiresAt - input.now);
      return {
        key: modifier.key,
        label: status.label,
        color: status.color,
        remaining,
        tone: status.tone,
        tooltip: `${expandedLabel(status.label)} · ${modifier.key} · ${modifierTokenTime(remaining)}s`,
      };
    });
}

export function buildDisableBarModel(input: Pick<ModifierDisplayInput, 'modifiers' | 'now'>): DisableBarModel {
  const candidates = activeTimedModifiers(input.modifiers, input.now)
    .map((modifier) => {
      const disable = disablePresentationFor(modifier);
      if (!disable) return null;
      const remaining = Math.max(0, modifier.expiresAt - input.now);
      const duration = Math.max(remaining, modifier.def.duration ?? remaining);
      return {
        modifier,
        disable,
        remaining,
        percent: clampPercent(duration > 0 ? (remaining / duration) * 100 : 100),
      };
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null)
    .sort((a, b) => b.remaining - a.remaining);

  const top = candidates[0];
  if (!top) return { visible: false };
  return {
    visible: true,
    key: top.modifier.key,
    label: top.disable.label,
    color: top.disable.color,
    remaining: top.remaining,
    percent: top.percent,
    detail: `${top.disable.label} · ${top.modifier.key} · ${modifierTokenTime(top.remaining)}s`,
  };
}

export function modifierTokenTime(remaining: number): string {
  return remaining >= 1 ? String(Math.ceil(remaining)) : remaining.toFixed(1);
}

function activeTimedModifiers(modifiers: Modifier[], now: number): Modifier[] {
  return modifiers.filter((modifier) => Number.isFinite(modifier.expiresAt) && modifier.expiresAt > now);
}

function presentationFor(modifier: Modifier): StatusPresentation {
  const disable = disablePresentationFor(modifier);
  if (disable) return { label: shortDisableLabel(disable.label), color: disable.color, tone: 'disable' };
  const states = modifier.def.states;
  if (states?.invisible) return { label: '隐', color: '#62c7ff', tone: modifier.def.isBuff ? 'buff' : 'debuff' };
  if (states?.magicImmune) return { label: '免', color: '#ffd54f', tone: 'buff' };
  if (states?.physImmune) return { label: '虚', color: '#7ee5ff', tone: 'buff' };
  if (modifier.def.isBuff) return FALLBACK_BUFF;
  return FALLBACK_DEBUFF;
}

function disablePresentationFor(modifier: Modifier): Omit<StatusPresentation, 'tone'> | null {
  if (modifier.def.isBuff) return null;
  const states = modifier.def.states;
  const key = modifier.key.toLowerCase();
  if (isHex(states, key)) return { label: '妖术', color: '#cda7ff' };
  if (isSleep(key)) return { label: '睡眠', color: '#88d7ff' };
  if (isCyclone(states, key)) return { label: '吹风', color: '#9be8ff' };
  if (isTaunt(key)) return { label: '嘲讽', color: '#ff6b6b' };
  if (states?.stunned) return { label: '眩晕', color: '#ffd45c' };
  if (states?.rooted) return { label: '缠绕', color: '#9be36f' };
  if (states?.silenced) return { label: '沉默', color: '#b7a7ff' };
  if (states?.muted) return { label: '禁物', color: '#db8cff' };
  if (states?.disarmed) return { label: '缴械', color: '#ffb36d' };
  if (states?.broken) return { label: '破坏', color: '#ff6fae' };
  return null;
}

function isHex(states: StateMods | undefined, key: string): boolean {
  return key.includes('hex') || (states?.silenced === true && states.muted === true && states.disarmed === true);
}

function isSleep(key: string): boolean {
  return key.includes('sleep') || key.includes('nightmare');
}

function isCyclone(states: StateMods | undefined, key: string): boolean {
  return key.includes('cyclone') || key.includes('eul') || (states?.untargetable === true && key.includes('banish'));
}

function isTaunt(key: string): boolean {
  return key.includes('taunt') || key.includes('duel');
}

function expandedLabel(label: string): string {
  const labels: Record<string, string> = {
    '晕': '眩晕',
    '缚': '缠绕',
    '沉': '沉默',
    '缴': '缴械',
    '禁': '禁物',
    '破': '破坏',
    '妖': '妖术',
    '睡': '睡眠',
    '旋': '吹风',
    '嘲': '嘲讽',
    '眩晕': '眩晕',
    '缠绕': '缠绕',
    '沉默': '沉默',
    '缴械': '缴械',
    '禁物': '禁物',
    '破坏': '破坏',
    '妖术': '妖术',
    '睡眠': '睡眠',
    '吹风': '吹风',
    '嘲讽': '嘲讽',
    '隐': '隐身',
    '免': '魔免',
    '虚': '无敌',
    '▲': '增益',
    '▼': '减益',
  };
  return labels[label] ?? label;
}

function shortDisableLabel(label: string): string {
  const labels: Record<string, string> = {
    '眩晕': '晕',
    '缠绕': '缚',
    '沉默': '沉',
    '缴械': '缴',
    '禁物': '禁',
    '破坏': '破',
    '妖术': '妖',
    '睡眠': '睡',
    '吹风': '旋',
    '嘲讽': '嘲',
  };
  return labels[label] ?? label;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
