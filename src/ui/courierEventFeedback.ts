import type { Vec2 } from '../core/vec2';
import type { UnitKind } from '../sim/unit';
import type { WorldPulse } from './uxFeedback';

export interface CourierEventFeedbackEvent {
  kind: string;
  unitId?: number;
  killerId?: number;
  pos?: Vec2;
}

export interface CourierEventFeedbackUnit {
  id: number;
  kind: UnitKind;
  team: number;
}

export interface CourierEventFeedbackInput {
  viewerTeam: number | null;
  events: readonly CourierEventFeedbackEvent[];
  units: readonly CourierEventFeedbackUnit[];
  time: number;
}

export function buildCourierDeathPulses(input: CourierEventFeedbackInput): WorldPulse[] {
  const units = new Map(input.units.map((unit) => [unit.id, unit]));
  let fallbackPulse: WorldPulse | null = null;

  for (const event of input.events) {
    if (event.kind !== 'unit_died' || event.unitId === undefined || !event.pos) continue;

    const unit = units.get(event.unitId);
    if (unit?.kind !== 'courier') continue;

    const pulse: WorldPulse = {
      kind: 'ping',
      pos: event.pos,
      time: input.time,
      targetId: unit.id,
    };

    if (input.viewerTeam !== null && unit.team === input.viewerTeam) return [pulse];
    if (!fallbackPulse) fallbackPulse = pulse;
  }

  return fallbackPulse ? [fallbackPulse] : [];
}
