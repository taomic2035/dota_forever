/**
 * 目标合法性规则:谁能被一条命令合法选中(队伍 + 单位种类)。
 *
 * 这是 sim 域的单一真相源:
 *  - sim(abilities/items 的施法执行)用它做权威校验 —— 人类、AI、未来的网络命令一视同仁。
 *  - engine/ui(预览、确认、拒绝文案)复用同一套规则 —— 保证「光标不说谎」。
 *
 * 纯逻辑,只依赖 core;不触 DOM、不依赖 sim 的具体 Unit 类(用结构化 TargetableUnit)。
 */
import type { Vec2 } from '../core/vec2';
import { V } from '../core/vec2';

export type TargetTeamFilter = 'any' | 'enemy' | 'ally' | 'allyOrSelf' | 'self';
export type TargetKindFilter =
  | 'any'
  | 'hero'
  | 'nonHero'
  | 'nonHeroNonBuilding'
  | 'creep'
  | 'building'
  | 'ward'
  | 'boss';
export type TargetFilterRejectReason = 'dead' | 'team' | 'kind';

export interface TargetableUnit {
  id: number;
  team: number;
  alive: boolean;
  pos: Vec2;
  kind?: string;
  buildingKind?: string;
  isHero?(): boolean;
  isBuilding?(): boolean;
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
  kindFilter: TargetKindFilter = 'any',
): boolean {
  if (!target.alive) return false;
  if (!targetMatchesTeam(caster, target, filter)) return false;
  return targetMatchesKind(target, kindFilter);
}

export function targetFilterRejectReason(
  caster: TargetableUnit,
  target: TargetableUnit,
  filter: TargetTeamFilter = 'any',
  kindFilter: TargetKindFilter = 'any',
): TargetFilterRejectReason | null {
  if (!target.alive) return 'dead';
  if (!targetMatchesTeam(caster, target, filter)) return 'team';
  if (!targetMatchesKind(target, kindFilter)) return 'kind';
  return null;
}

export function targetMatchesTeam(
  caster: TargetableUnit,
  target: TargetableUnit,
  filter: TargetTeamFilter = 'any',
): boolean {
  if (filter === 'self') return target.id === caster.id;
  if (filter === 'enemy') return target.team !== caster.team;
  if (filter === 'ally') return target.team === caster.team && target.id !== caster.id;
  if (filter === 'allyOrSelf') return target.team === caster.team;
  return target.id !== caster.id;
}

export function targetMatchesKind(
  target: TargetableUnit,
  filter: TargetKindFilter = 'any',
): boolean {
  if (filter === 'any') return true;
  const isHero = target.isHero?.() ?? target.kind === 'hero';
  const inferredBuilding =
    target.kind === 'tower' || target.kind === 'building' || target.buildingKind !== undefined;
  const isBuilding = target.isBuilding?.() ?? inferredBuilding;
  const isWard = target.kind === 'ward';
  if (filter === 'hero') return isHero;
  if (filter === 'nonHero') return !isHero;
  if (filter === 'nonHeroNonBuilding') return !isHero && !isBuilding && !isWard;
  if (filter === 'creep') return target.kind === 'creep' || target.kind === 'neutral';
  if (filter === 'building') return isBuilding;
  if (filter === 'ward') return isWard;
  if (filter === 'boss') return target.kind === 'boss';
  return true;
}

export function findFilteredTarget<T extends TargetableUnit>(
  query: TargetQuery<T>,
  caster: T,
  pos: Vec2,
  radius: number,
  filter: TargetTeamFilter = 'any',
  kindFilter: TargetKindFilter = 'any',
): T | undefined {
  const targets = query(pos, radius, (unit) => targetMatchesFilter(caster, unit, filter, kindFilter));
  targets.sort((a, b) => V.distSq(pos, a.pos) - V.distSq(pos, b.pos));
  return targets[0];
}
