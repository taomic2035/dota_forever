import type { Vec2 } from '../core/vec2';
import { V } from '../core/vec2';

export type TargetTeamFilter = 'any' | 'enemy' | 'ally' | 'allyOrSelf' | 'self';

export interface TargetableUnit {
  id: number;
  team: number;
  alive: boolean;
  pos: Vec2;
}

export type TargetQuery<T extends TargetableUnit> = (
  pos: Vec2,
  radius: number,
  pred: (unit: T) => boolean,
) => T[];

export function targetMatchesFilter(
  caster: TargetableUnit,
  target: TargetableUnit,
  filter: TargetTeamFilter = 'any',
): boolean {
  if (!target.alive) return false;
  if (filter === 'self') return target.id === caster.id;
  if (filter === 'enemy') return target.team !== caster.team;
  if (filter === 'ally') return target.team === caster.team && target.id !== caster.id;
  if (filter === 'allyOrSelf') return target.team === caster.team;
  return target.id !== caster.id;
}

export function findFilteredTarget<T extends TargetableUnit>(
  query: TargetQuery<T>,
  caster: T,
  pos: Vec2,
  radius: number,
  filter: TargetTeamFilter = 'any',
): T | undefined {
  const targets = query(pos, radius, (unit) => targetMatchesFilter(caster, unit, filter));
  targets.sort((a, b) => V.distSq(pos, a.pos) - V.distSq(pos, b.pos));
  return targets[0];
}
