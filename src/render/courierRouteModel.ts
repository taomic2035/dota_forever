import type { Vec2 } from '../core/vec2';
import type { Order } from '../sim/unit';

export type CourierRouteKind = 'delivering' | 'returning' | 'none';
export type CourierRouteTone = 'ready' | 'busy' | 'danger' | 'muted';

export interface CourierRouteUnit {
  id: number;
  alive: boolean;
  pos: Vec2;
  hp: number;
  maxHp: number;
  order: Order | null;
}

export interface CourierRouteModel {
  visible: boolean;
  kind: CourierRouteKind;
  tone: CourierRouteTone;
  label: string;
  from: Vec2 | null;
  to: Vec2 | null;
}

export function buildCourierRouteModel(input: {
  courier: CourierRouteUnit | null | undefined;
  stashItems: number;
}): CourierRouteModel {
  const courier = input.courier;
  if (!courier?.alive || courier.order?.type !== 'move' || !courier.order.pos) return hiddenRoute();

  const stashItems = Math.max(0, Math.floor(input.stashItems));
  const hpPercent = courier.maxHp > 0 ? courier.hp / courier.maxHp : 0;
  const danger = hpPercent <= 0.35;
  const kind: CourierRouteKind = stashItems > 0 ? 'delivering' : 'returning';
  const label = danger
    ? `Courier danger${stashItems > 0 ? ` x${stashItems}` : ''}`
    : kind === 'delivering'
      ? `Courier delivering x${stashItems}`
      : 'Courier returning';

  return {
    visible: true,
    kind,
    tone: danger ? 'danger' : kind === 'delivering' ? 'busy' : 'ready',
    label,
    from: courier.pos,
    to: courier.order.pos,
  };
}

function hiddenRoute(): CourierRouteModel {
  return {
    visible: false,
    kind: 'none',
    tone: 'muted',
    label: '',
    from: null,
    to: null,
  };
}
