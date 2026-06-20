import type { ControlSettings, RebindAction } from '../engine/controlSettings';
import { DEFAULT_KEY_BINDS } from '../engine/controlSettings';
import type { CommandCardAction } from '../engine/commandCardActions';
import type { UnitKind } from '../sim/unit';
import { availabilityCurrentLine, type AvailabilityModel } from './availabilityModel';

export interface CommandCardButton {
  action: CommandCardAction;
  label: string;
  hotkey: string;
  tooltip: string;
  enabled: boolean;
  availability: AvailabilityModel;
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

export interface CommandCardContext {
  selectedCommandableCount: number;
  controlledCommandableCount: number;
  courierAlive: boolean;
  glyphReadyIn: number;
}

export function buildCommandCard(settings: ControlSettings, context?: CommandCardContext): CommandCardButton[] {
  return COMMAND_CARD.map((spec) => ({
    action: spec.action,
    label: spec.label,
    tooltip: commandTooltip(spec, commandAvailability(spec.action, context)),
    hotkey: spec.fixedHotkey ?? hotkeyLabel(settings.keyBinds[spec.bind!] ?? DEFAULT_KEY_BINDS[spec.bind!]),
    enabled: commandAvailability(spec.action, context).ready,
    availability: commandAvailability(spec.action, context),
  }));
}

function commandAvailability(action: CommandCardAction, context?: CommandCardContext): AvailabilityModel {
  if (!context) return { reason: 'ready', ready: true };
  if (['move', 'attackMove', 'stop', 'hold'].includes(action) && context.selectedCommandableCount <= 0) {
    return { reason: 'noSelection', ready: false };
  }
  if (action === 'selectCourier' && !context.courierAlive) {
    return { reason: 'courierDead', ready: false };
  }
  if (action === 'selectAllControlled' && context.controlledCommandableCount <= 1) {
    return { reason: 'noGroup', ready: false };
  }
  if (action === 'glyph' && context.glyphReadyIn > 0) {
    return { reason: 'cooldown', ready: false, seconds: context.glyphReadyIn };
  }
  return { reason: 'ready', ready: true };
}

function commandTooltip(spec: CommandCardSpec, availability: AvailabilityModel): string {
  if (availability.ready) return spec.tooltip;
  return `${spec.tooltip} ${availabilityCurrentLine(availability)}`;
}

export interface SelectionSummaryUnit {
  kind: UnitKind;
  summonOwnerId?: number;
}

export interface SelectionSummaryInput {
  primaryName: string;
  cycleHotkey?: string;
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
    `Primary ${input.primaryName}`,
    input.cycleHotkey ? `Cycle ${hotkeyLabel(input.cycleHotkey)}` : '',
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
