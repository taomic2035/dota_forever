import type { CommandMessage, CursorIntent } from './uxFeedback';

export type CursorVisualTone = 'ability' | 'item' | 'hostile' | 'support' | 'ground' | 'neutral' | 'attack' | 'reject' | 'alert' | 'info';

export interface CursorBadgeVisual {
  icon: string;
  color: string;
  tone: CursorVisualTone;
  background: string;
  textColor: string;
}

type BadgeVariant = 'intent' | 'message';

const INTENT_BACKGROUND = '#081006e8';
const MESSAGE_BACKGROUND = '#160807ee';

function baseVisual(icon: string, color: string, tone: CursorVisualTone, variant: BadgeVariant = 'intent'): CursorBadgeVisual {
  return {
    icon,
    color,
    tone,
    background: variant === 'message' ? MESSAGE_BACKGROUND : INTENT_BACKGROUND,
    textColor: variant === 'message' ? '#ffd6d6' : '#f7f1d0',
  };
}

export function cursorIntentVisual(intent: CursorIntent): CursorBadgeVisual {
  if (intent.kind === 'attackmove' || intent.targetHint === 'attack') {
    return baseVisual('A', '#ffd45a', 'attack');
  }
  if (intent.targetHint === 'enemy') return baseVisual('X', '#ff5366', 'hostile');
  if (intent.targetHint === 'ally' || intent.targetHint === 'allyOrSelf' || intent.targetHint === 'self') {
    return baseVisual('+', '#62e889', 'support');
  }
  if (intent.targetHint === 'ground') {
    return baseVisual('.', intent.kind === 'item' ? '#d9b44a' : '#5aa2ff', 'ground');
  }
  if (intent.targetHint === 'any') return baseVisual('O', '#d8d0a0', 'neutral');
  if (intent.kind === 'item') return baseVisual('I', intent.color ?? '#d9b44a', 'item');
  return baseVisual('Q', intent.color ?? '#5aa2ff', 'ability');
}

export function commandMessageVisual(message: CommandMessage): CursorBadgeVisual {
  if (message.kind === 'alert') return baseVisual('!', message.color ?? '#ff8f8f', 'alert', 'message');
  if (message.kind === 'info') return baseVisual('i', message.color ?? '#8fd0ff', 'info', 'message');
  return baseVisual('!', message.color ?? '#ff3040', 'reject', 'message');
}

export function escapeHtml(label: string): string {
  return label
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderCursorBadge(label: string, visual: CursorBadgeVisual, variant: BadgeVariant = 'intent'): string {
  const safeLabel = escapeHtml(label);
  const safeIcon = escapeHtml(visual.icon);
  const iconTextColor = variant === 'message' ? visual.background : '#111';
  return `
      <div data-cursor-tone="${visual.tone}" style="display:flex;align-items:center;gap:5px;background:${visual.background};border:1px solid ${visual.color};border-radius:5px;padding:3px 7px;box-shadow:0 0 10px ${visual.color}${variant === 'message' ? '66' : '55'};color:${visual.textColor};">
        <span style="display:flex;align-items:center;justify-content:center;width:15px;height:15px;border-radius:50%;background:${visual.color};color:${iconTextColor};font-size:10px;font-weight:900;line-height:15px;">${safeIcon}</span>
        <span style="white-space:nowrap">${safeLabel}</span>
      </div>`;
}
