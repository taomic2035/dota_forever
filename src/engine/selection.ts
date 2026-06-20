import type { EntityId, UnitKind } from '../sim/unit';

export interface SelectableUnitLike {
  id: EntityId;
  team: number;
  kind: UnitKind;
  name?: string;
  alive: boolean;
  visible?: boolean;
  summonOwnerId?: EntityId;
}

export interface SelectionSnapshot {
  primaryId: EntityId | 0;
  selectedIds: EntityId[];
  commandableIds: EntityId[];
  inspectId: EntityId | 0;
}

export type ControlGroupSlot = 1 | 2 | 3 | 4 | 5 | 6;

export interface SelectOptions {
  additive?: boolean;
}

export class SelectionState {
  private primaryId: EntityId | 0 = 0;
  private selectedIds: EntityId[] = [];
  private commandableIds: EntityId[] = [];
  private inspectId: EntityId | 0 = 0;
  private groups = new Map<ControlGroupSlot, EntityId[]>();

  constructor(
    private readonly playerTeam: number,
    private readonly playerHeroId: EntityId,
  ) {}

  select(unit: SelectableUnitLike | null | undefined, options: SelectOptions = {}): void {
    if (!unit || !unit.alive) return;
    const commandable = isCommandableByPlayer(unit, this.playerTeam, this.playerHeroId);
    if (!options.additive) {
      this.replaceSelection(unit, commandable);
      return;
    }

    if (!commandable) {
      this.replaceSelection(unit, false);
      return;
    }

    if (this.commandableIds.includes(unit.id)) {
      if (this.commandableIds.length <= 1) return;
      this.commandableIds = this.commandableIds.filter((id) => id !== unit.id);
      this.selectedIds = this.selectedIds.filter((id) => id !== unit.id);
      if (this.primaryId === unit.id) this.primaryId = this.commandableIds[0] ?? 0;
      this.inspectId = 0;
      return;
    }

    if (this.inspectId) {
      this.selectedIds = [];
      this.commandableIds = [];
      this.inspectId = 0;
    }
    this.selectedIds = appendUnique(this.selectedIds, unit.id);
    this.commandableIds = appendUnique(this.commandableIds, unit.id);
    if (!this.primaryId) this.primaryId = unit.id;
  }

  selectMany(units: SelectableUnitLike[], options: SelectOptions = {}): void {
    const alive = units.filter((unit) => unit.alive);
    const commandable = alive.filter((unit) => isCommandableByPlayer(unit, this.playerTeam, this.playerHeroId));
    if (commandable.length > 0) {
      const ids = unique(commandable.map((unit) => unit.id));
      if (options.additive && !this.inspectId) {
        this.commandableIds = unique([...this.commandableIds, ...ids]);
        this.selectedIds = unique([...this.selectedIds, ...ids]);
        if (!this.primaryId) this.primaryId = this.commandableIds[0] ?? 0;
      } else {
        this.commandableIds = ids;
        this.selectedIds = ids;
        this.primaryId = ids[0] ?? 0;
      }
      this.inspectId = 0;
      return;
    }

    this.replaceSelection(alive[0], false);
  }

  clearToHero(hero: SelectableUnitLike | null | undefined): void {
    if (hero && isCommandableByPlayer(hero, this.playerTeam, this.playerHeroId)) {
      this.replaceSelection(hero, true);
      return;
    }
    this.primaryId = 0;
    this.selectedIds = [];
    this.commandableIds = [];
    this.inspectId = 0;
  }

  bindGroup(slot: ControlGroupSlot): void {
    this.groups.set(slot, [...this.commandableIds]);
  }

  selectGroup(slot: ControlGroupSlot, unitsById: Map<EntityId, SelectableUnitLike>): void {
    const ids = this.groups.get(slot) ?? [];
    const units = ids
      .map((id) => unitsById.get(id))
      .filter((unit): unit is SelectableUnitLike =>
        !!unit && isCommandableByPlayer(unit, this.playerTeam, this.playerHeroId),
      );
    if (units.length > 0) this.selectMany(units);
  }

  group(slot: ControlGroupSlot): EntityId[] {
    return [...(this.groups.get(slot) ?? [])];
  }

  cyclePrimary(): EntityId | 0 {
    if (this.commandableIds.length <= 1) return this.primaryId;
    const index = this.commandableIds.indexOf(this.primaryId);
    const next = this.commandableIds[(index + 1 + this.commandableIds.length) % this.commandableIds.length] ?? this.commandableIds[0] ?? 0;
    this.primaryId = next;
    this.inspectId = 0;
    return this.primaryId;
  }

  selectSameType(anchor: SelectableUnitLike | null | undefined, candidates: SelectableUnitLike[]): void {
    if (!anchor || !isCommandableByPlayer(anchor, this.playerTeam, this.playerHeroId)) {
      this.select(anchor);
      return;
    }
    const signature = unitTypeSignature(anchor);
    const matches = candidates.filter((unit) =>
      unit.visible !== false
      && isCommandableByPlayer(unit, this.playerTeam, this.playerHeroId)
      && unitTypeSignature(unit) === signature,
    );
    if (matches.length > 0) {
      this.selectMany(orderAnchorFirst(anchor.id, matches));
      return;
    }
    this.select(anchor);
  }

  snapshot(): SelectionSnapshot {
    return {
      primaryId: this.primaryId,
      selectedIds: [...this.selectedIds],
      commandableIds: [...this.commandableIds],
      inspectId: this.inspectId,
    };
  }

  private replaceSelection(unit: SelectableUnitLike | undefined, commandable: boolean): void {
    if (!unit) {
      this.primaryId = 0;
      this.selectedIds = [];
      this.commandableIds = [];
      this.inspectId = 0;
      return;
    }
    this.primaryId = unit.id;
    this.selectedIds = [unit.id];
    this.commandableIds = commandable ? [unit.id] : [];
    this.inspectId = commandable ? 0 : unit.id;
  }
}

export function isCommandableByPlayer(
  unit: SelectableUnitLike,
  playerTeam: number,
  playerHeroId: EntityId,
): boolean {
  if (!unit.alive || unit.team !== playerTeam) return false;
  if (unit.id === playerHeroId) return true;
  if (unit.kind === 'courier') return true;
  if (unit.summonOwnerId === playerHeroId) return true;
  return false;
}

function appendUnique(ids: EntityId[], id: EntityId): EntityId[] {
  return ids.includes(id) ? ids : [...ids, id];
}

function unique(ids: EntityId[]): EntityId[] {
  return Array.from(new Set(ids));
}

function unitTypeSignature(unit: SelectableUnitLike): string {
  return `${unit.kind}:${unit.name ?? unit.kind}`;
}

function orderAnchorFirst(anchorId: EntityId, units: SelectableUnitLike[]): SelectableUnitLike[] {
  const anchor = units.find((unit) => unit.id === anchorId);
  const rest = units.filter((unit) => unit.id !== anchorId);
  return anchor ? [anchor, ...rest] : units;
}
