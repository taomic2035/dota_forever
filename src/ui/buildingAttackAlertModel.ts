import type { Vec2 } from '../core/vec2';
import type { UnitKind } from '../sim/unit';
import type { WorldPulse } from './uxFeedback';

export interface BuildingAttackAlertEvent {
  kind: string;
  unitId?: number;
  sourceId?: number;
}

export interface BuildingAttackAlertUnit {
  id: number;
  kind: UnitKind;
  team: number;
  pos: Vec2;
}

export interface BuildingAttackAlertInput {
  viewerTeam: number | null;
  events: readonly BuildingAttackAlertEvent[];
  units: readonly BuildingAttackAlertUnit[];
  time: number;
  lastAlertAtByUnit: ReadonlyMap<number, number>;
  cooldownSeconds?: number;
}

const DEFAULT_BUILDING_ALERT_COOLDOWN = 6;

export function buildBuildingAttackAlertPulses(input: BuildingAttackAlertInput): WorldPulse[] {
  if (input.viewerTeam === null) return [];

  const cooldown = input.cooldownSeconds ?? DEFAULT_BUILDING_ALERT_COOLDOWN;
  const units = new Map(input.units.map((unit) => [unit.id, unit]));
  const alertedThisBatch = new Set<number>();
  const pulses: WorldPulse[] = [];

  for (const event of input.events) {
    if (event.kind !== 'unit_damaged' || event.unitId === undefined || event.sourceId === undefined) continue;

    const target = units.get(event.unitId);
    if (!target || !isBuildingKind(target.kind) || target.team !== input.viewerTeam) continue;

    const source = units.get(event.sourceId);
    if (!source || source.kind !== 'hero' || source.team === input.viewerTeam) continue;
    if (alertedThisBatch.has(target.id)) continue;
    if (input.time - (input.lastAlertAtByUnit.get(target.id) ?? -Infinity) < cooldown) continue;

    alertedThisBatch.add(target.id);
    pulses.push({
      kind: 'dangerPing',
      pos: target.pos,
      time: input.time,
      targetId: target.id,
    });
  }

  return pulses;
}

function isBuildingKind(kind: UnitKind): boolean {
  return kind === 'tower' || kind === 'building';
}
