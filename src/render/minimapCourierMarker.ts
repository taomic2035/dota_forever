import type { Vec2 } from '../core/vec2';
import type { OrderType, UnitKind } from '../sim/unit';

export type CourierMinimapTone = 'ally' | 'enemy' | 'busy' | 'danger';

export interface CourierMinimapUnit {
  id: number;
  kind: UnitKind;
  team: number;
  alive: boolean;
  pos: Vec2;
  hp: number;
  maxHp: number;
  orderType?: OrderType;
}

export interface CourierMinimapMarker {
  id: number;
  x: number;
  y: number;
  tone: CourierMinimapTone;
  label: string;
}

export interface CourierMinimapMarkerInput {
  viewerTeam: number | null;
  worldSize: number;
  minimapSize: number;
  units: Iterable<CourierMinimapUnit>;
  isVisible: (unit: CourierMinimapUnit) => boolean;
}

export function buildCourierMinimapMarkers(input: CourierMinimapMarkerInput): CourierMinimapMarker[] {
  const markers: CourierMinimapMarker[] = [];
  const scale = input.minimapSize / Math.max(1, input.worldSize);

  for (const unit of input.units) {
    if (unit.kind !== 'courier' || !unit.alive) continue;

    const isSpectator = input.viewerTeam === null;
    const isAlly = input.viewerTeam !== null && unit.team === input.viewerTeam;
    if (!isSpectator && !isAlly && !input.isVisible(unit)) continue;

    const hpPercent = Math.max(0, Math.min(1, unit.hp / Math.max(1, unit.maxHp)));
    const tone = courierTone({
      isAlly: isAlly || isSpectator,
      isEnemy: !isSpectator && !isAlly,
      hpPercent,
      orderType: unit.orderType,
    });

    markers.push({
      id: unit.id,
      x: Math.round(unit.pos.x * scale * 100) / 100,
      y: Math.round(unit.pos.y * scale * 100) / 100,
      tone,
      label: courierLabel(tone),
    });
  }

  return markers;
}

function courierTone(input: { isAlly: boolean; isEnemy: boolean; hpPercent: number; orderType?: OrderType }): CourierMinimapTone {
  if (input.isEnemy) return 'enemy';
  if (input.hpPercent <= 0.35) return 'danger';
  if (input.orderType === 'move') return 'busy';
  return input.isAlly ? 'ally' : 'enemy';
}

function courierLabel(tone: CourierMinimapTone): string {
  if (tone === 'danger') return 'Courier low';
  if (tone === 'busy') return 'Courier moving';
  return 'Courier';
}
