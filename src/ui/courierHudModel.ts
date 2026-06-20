import type { OrderType } from '../sim/unit';

export type CourierHudStatus = 'missing' | 'dead' | 'ready' | 'delivering' | 'returning';
export type CourierHudTone = 'muted' | 'danger' | 'ready' | 'busy';
export type CourierHudPrimaryAction = 'select' | 'deliver' | 'none';

export interface CourierHudInputUnit {
  id: number;
  alive: boolean;
  hp: number;
  maxHp: number;
  orderType?: OrderType;
  atFountain: boolean;
  stashItems: number;
  etaSeconds?: number;
}

export interface CourierHudInput {
  courier?: CourierHudInputUnit;
  selectedUnitId?: number;
}

export interface CourierHudModel {
  visible: true;
  status: CourierHudStatus;
  label: string;
  detail: string;
  actionLabel: string;
  primaryAction: CourierHudPrimaryAction;
  tone: CourierHudTone;
  hpPercent: number;
  selected: boolean;
}

export function buildCourierHudModel(input: CourierHudInput): CourierHudModel {
  const courier = input.courier;
  if (!courier) {
    return {
      visible: true,
      status: 'missing',
      label: 'Courier',
      detail: 'No allied courier',
      actionLabel: 'No courier',
      primaryAction: 'none',
      tone: 'muted',
      hpPercent: 0,
      selected: false,
    };
  }

  const hpPercent = Math.round(Math.max(0, Math.min(1, courier.hp / Math.max(1, courier.maxHp))) * 100);
  const selected = input.selectedUnitId === courier.id;
  const lowHealth = hpPercent <= 35;
  const withEta = (detail: string): string => {
    if (!courier.etaSeconds || courier.etaSeconds <= 0) return detail;
    return `${detail} / ETA ${Math.ceil(courier.etaSeconds)}s`;
  };
  const detailFor = (detail: string): string => lowHealth ? `Low HP / ${detail}` : detail;
  const actionFor = (actionLabel: string): string => lowHealth ? 'F2 select / save courier' : actionLabel;
  const toneFor = (tone: CourierHudTone): CourierHudTone => lowHealth ? 'danger' : tone;

  if (!courier.alive) {
    return {
      visible: true,
      status: 'dead',
      label: 'Courier',
      detail: 'Dead / respawning',
      actionLabel: 'Wait respawn',
      primaryAction: 'none',
      tone: 'danger',
      hpPercent,
      selected,
    };
  }

  if (courier.orderType === 'move' && courier.stashItems > 0) {
    return {
      visible: true,
      status: 'delivering',
      label: 'Courier',
      detail: detailFor(withEta(`Delivering stash x${courier.stashItems}`)),
      actionLabel: actionFor('F2 follow delivery'),
      primaryAction: 'select',
      tone: toneFor('busy'),
      hpPercent,
      selected,
    };
  }

  if (courier.orderType === 'move' && !courier.atFountain) {
    return {
      visible: true,
      status: 'returning',
      label: 'Courier',
      detail: detailFor(withEta('Returning to base')),
      actionLabel: actionFor('F2 follow return'),
      primaryAction: 'select',
      tone: toneFor('busy'),
      hpPercent,
      selected,
    };
  }

  return {
    visible: true,
    status: 'ready',
    label: 'Courier',
    detail: detailFor(courier.stashItems > 0 ? `Ready / stash x${courier.stashItems}` : 'Ready at base'),
    actionLabel: actionFor(courier.stashItems > 0 ? 'Deliver stash' : 'F2 select'),
    primaryAction: lowHealth ? 'select' : courier.stashItems > 0 ? 'deliver' : 'select',
    tone: toneFor('ready'),
    hpPercent,
    selected,
  };
}
