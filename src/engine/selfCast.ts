import {
  targetMatchesKind,
  type TargetKindFilter,
  type TargetTeamFilter,
  type TargetableUnit,
} from './targetFilters';

export function targetTeamAllowsSelfCast(filter: TargetTeamFilter | undefined): boolean {
  return filter === 'self' || filter === 'allyOrSelf' || filter === 'any';
}

export function resolveSelfCastTarget<T extends TargetableUnit>(
  caster: T,
  filter: TargetTeamFilter | undefined,
  kindFilter: TargetKindFilter = 'any',
): T | undefined {
  if (!targetTeamAllowsSelfCast(filter)) return undefined;
  return targetMatchesKind(caster, kindFilter) ? caster : undefined;
}
