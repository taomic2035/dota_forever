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
    tone: 'ready',
    hpPercent,
    selected,
  };
}
