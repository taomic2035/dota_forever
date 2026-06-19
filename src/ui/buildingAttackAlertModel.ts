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
  buildingKind?: string;
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
const BUILDING_ALERT_MESSAGE_TTL = 1.8;

export interface BuildingAttackAlertMessage {
  kind: 'alert';
  label: string;
  color: string;
  ttl: number;
}

export interface BuildingAttackAlertFeedback {
  pulse: WorldPulse;
  message: BuildingAttackAlertMessage;
}

export function buildBuildingAttackAlertPulses(input: BuildingAttackAlertInput): WorldPulse[] {
  return buildBuildingAttackAlertFeedback(input).map((feedback) => feedback.pulse);
}

export function buildBuildingAttackAlertFeedback(input: BuildingAttackAlertInput): BuildingAttackAlertFeedback[] {
  if (input.viewerTeam === null) return [];

  const cooldown = input.cooldownSeconds ?? DEFAULT_BUILDING_ALERT_COOLDOWN;
  const units = new Map(input.units.map((unit) => [unit.id, unit]));
  const alertedThisBatch = new Set<number>();
  const feedback: BuildingAttackAlertFeedback[] = [];

  for (const event of input.events) {
    if (event.kind !== 'unit_damaged' || event.unitId === undefined || event.sourceId === undefined) continue;

    const target = units.get(event.unitId);
    if (!target || !isBuildingKind(target.kind) || target.team !== input.viewerTeam) continue;

    const source = units.get(event.sourceId);
    if (!source || source.kind !== 'hero' || source.team === input.viewerTeam) continue;
    if (alertedThisBatch.has(target.id)) continue;
    if (input.time - (input.lastAlertAtByUnit.get(target.id) ?? -Infinity) < cooldown) continue;

    alertedThisBatch.add(target.id);
    feedback.push({
      pulse: {
        kind: 'dangerPing',
        pos: target.pos,
        time: input.time,
        targetId: target.id,
      },
      message: {
        kind: 'alert',
        label: `${buildingLabel(target)}遭受攻击`,
        color: '#ff8f8f',
        ttl: BUILDING_ALERT_MESSAGE_TTL,
      },
    });
  }

  return feedback;
}

function isBuildingKind(kind: UnitKind): boolean {
  return kind === 'tower' || kind === 'building';
}

function buildingLabel(unit: BuildingAttackAlertUnit): string {
  switch (unit.buildingKind) {
    case 'tower1': return '一塔';
    case 'tower2': return '二塔';
    case 'tower3': return '高地塔';
    case 'tower4': return '基地塔';
    case 'rax_melee': return '近战兵营';
    case 'rax_ranged': return '远程兵营';
    case 'ancient': return '基地';
    case 'fountain': return '泉水';
    default:
      return unit.kind === 'tower' ? '防御塔' : '建筑';
  }
}
