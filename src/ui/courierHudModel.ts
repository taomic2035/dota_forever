import type { OrderType } from '../sim/unit';

export type CourierHudStatus = 'missing' | 'dead' | 'ready' | 'delivering' | 'returning';
export type CourierHudTone = 'muted' | 'danger' | 'ready' | 'busy';

export interface CourierHudInputUnit {
  id: number;
  alive: boolean;
  hp: number;
  maxHp: number;
  orderType?: OrderType;
  atFountain: boolean;
  stashItems: number;
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
      tone: 'muted',
      hpPercent: 0,
      selected: false,
    };
  }

  const hpPercent = Math.round(Math.max(0, Math.min(1, courier.hp / Math.max(1, courier.maxHp))) * 100);
  const selected = input.selectedUnitId === courier.id;

  if (!courier.alive) {
    return {
      visible: true,
      status: 'dead',
      label: 'Courier',
      detail: 'Dead / respawning',
      actionLabel: 'Wait respawn',
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
      detail: `Delivering stash x${courier.stashItems}`,
      actionLabel: 'F2 follow delivery',
      tone: 'busy',
      hpPercent,
      selected,
    };
  }

  if (courier.orderType === 'move' && !courier.atFountain) {
    return {
      visible: true,
      status: 'returning',
      label: 'Courier',
      detail: 'Returning to base',
      actionLabel: 'F2 follow return',
      tone: 'busy',
      hpPercent,
      selected,
    };
  }

  return {
    visible: true,
    status: 'ready',
    label: 'Courier',
    detail: courier.stashItems > 0 ? `Ready / stash x${courier.stashItems}` : 'Ready at base',
    actionLabel: courier.stashItems > 0 ? 'F2 select / stash ready' : 'F2 select',
    tone: 'ready',
    hpPercent,
    selected,
  };
}
