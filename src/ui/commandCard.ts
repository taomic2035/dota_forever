import type { ControlSettings, RebindAction } from '../engine/controlSettings';
import { DEFAULT_KEY_BINDS } from '../engine/controlSettings';
import type { UnitKind } from '../sim/unit';

export type CommandCardAction =
  | 'move'
  | 'attackMove'
  | 'stop'
  | 'hold'
  | 'selectHero'
  | 'selectCourier'
  | 'selectAllControlled'
  | 'glyph'
  | 'shop';

export interface CommandCardButton {
  action: CommandCardAction;
  label: string;
  hotkey: string;
  tooltip: string;
  enabled: boolean;
}

interface CommandCardSpec {
  action: CommandCardAction;
  label: string;
  tooltip: string;
  bind?: RebindAction;
  fixedHotkey?: string;
}

const COMMAND_CARD: CommandCardSpec[] = [
  { action: 'move', label: 'Move', tooltip: 'Right-click ground to move selected controllable units.', fixedHotkey: 'RMB' },
  { action: 'attackMove', label: 'Attack', tooltip: 'Attack-move toward a point or deny low-health allied creeps.', bind: 'attackMove' },
  { action: 'stop', label: 'Stop', tooltip: 'Cancel the current command for selected controllable units.', bind: 'stop' },
  { action: 'hold', label: 'Hold', tooltip: 'Hold position and do not chase.', bind: 'hold' },
  { action: 'selectHero', label: 'Hero', tooltip: 'Select your hero.', bind: 'selectHero' },
  { action: 'selectCourier', label: 'Courier', tooltip: 'Select your courier if it is alive.', bind: 'selectCourier' },
  { action: 'selectAllControlled', label: 'All', tooltip: 'Select hero, courier, illusions, and owned summons.', bind: 'selectAllControlled' },
  { action: 'glyph', label: 'Glyph', tooltip: 'Activate building protection.', bind: 'glyph' },
  { action: 'shop', label: 'Shop', tooltip: 'Open or close the shop.', bind: 'shop' },
];

export function buildCommandCard(settings: ControlSettings): CommandCardButton[] {
  return COMMAND_CARD.map((spec) => ({
    action: spec.action,
    label: spec.label,
    tooltip: spec.tooltip,
    hotkey: spec.fixedHotkey ?? hotkeyLabel(settings.keyBinds[spec.bind!] ?? DEFAULT_KEY_BINDS[spec.bind!]),
    enabled: true,
  }));
}

export interface SelectionSummaryUnit {
  kind: UnitKind;
  summonOwnerId?: number;
}

export interface SelectionSummaryInput {
  primaryName: string;
  commandableUnits: SelectionSummaryUnit[];
}

export interface SelectionSummary {
  visible: boolean;
  title: string;
  detail: string;
}

export function buildSelectionSummary(input: SelectionSummaryInput): SelectionSummary {
  const total = input.commandableUnits.length;
  if (total <= 1) return { visible: false, title: '', detail: '' };
  const hero = input.commandableUnits.filter((unit) => unit.kind === 'hero').length;
  const summon = input.commandableUnits.filter((unit) => unit.kind !== 'illusion' && unit.kind !== 'courier' && unit.summonOwnerId !== undefined).length;
  const illusion = input.commandableUnits.filter((unit) => unit.kind === 'illusion').length;
  const courier = input.commandableUnits.filter((unit) => unit.kind === 'courier').length;
  const parts = [
    input.primaryName,
    hero ? `Hero ${hero}` : '',
    summon ? `Summon ${summon}` : '',
    illusion ? `Illusion ${illusion}` : '',
    courier ? `Courier ${courier}` : '',
  ].filter(Boolean);
  return {
    visible: true,
    title: `${total} selected`,
    detail: parts.join(' · '),
  };
}

function hotkeyLabel(key: string): string {
  if (key === ' ') return 'SPACE';
  return key.toUpperCase();
}
