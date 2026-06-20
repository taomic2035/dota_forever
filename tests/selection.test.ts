import { describe, expect, it } from 'vitest';
import { SelectionState, isCommandableByPlayer, type SelectableUnitLike } from '../src/engine/selection';
import { Team } from '../src/sim/map';

function unit(overrides: Partial<SelectableUnitLike> & { id: number }): SelectableUnitLike {
  return {
    id: overrides.id,
    team: overrides.team ?? Team.Dawn,
    kind: overrides.kind ?? 'hero',
    name: overrides.name,
    alive: overrides.alive ?? true,
    visible: overrides.visible,
    summonOwnerId: overrides.summonOwnerId,
  };
}

describe('selection state', () => {
  it('selects the player hero as a commandable single selection', () => {
    const hero = unit({ id: 1, kind: 'hero', team: Team.Dawn });
    const selection = new SelectionState(Team.Dawn, hero.id);

    selection.select(hero);

    expect(selection.snapshot()).toEqual({
      primaryId: hero.id,
      selectedIds: [hero.id],
      commandableIds: [hero.id],
      inspectId: 0,
    });
  });

  it('selects an enemy as inspect-only without changing command authority', () => {
    const hero = unit({ id: 1, kind: 'hero', team: Team.Dawn });
    const enemy = unit({ id: 2, kind: 'hero', team: Team.Night });
    const selection = new SelectionState(Team.Dawn, hero.id);
    selection.select(hero);

    selection.select(enemy);

    expect(selection.snapshot()).toEqual({
      primaryId: enemy.id,
      selectedIds: [enemy.id],
      commandableIds: [],
      inspectId: enemy.id,
    });
  });

  it('shift-selects owned summons into the commandable selection', () => {
    const hero = unit({ id: 1, kind: 'hero', team: Team.Dawn });
    const summon = unit({ id: 3, kind: 'creep', team: Team.Dawn, summonOwnerId: hero.id });
    const selection = new SelectionState(Team.Dawn, hero.id);
    selection.select(hero);

    selection.select(summon, { additive: true });

    expect(selection.snapshot()).toMatchObject({
      primaryId: hero.id,
      selectedIds: [hero.id, summon.id],
      commandableIds: [hero.id, summon.id],
      inspectId: 0,
    });
  });

  it('shift-selecting an already selected unit removes it while keeping one commandable unit', () => {
    const hero = unit({ id: 1, kind: 'hero', team: Team.Dawn });
    const summon = unit({ id: 3, kind: 'creep', team: Team.Dawn, summonOwnerId: hero.id });
    const selection = new SelectionState(Team.Dawn, hero.id);
    selection.selectMany([hero, summon]);

    selection.select(summon, { additive: true });

    expect(selection.snapshot()).toMatchObject({
      primaryId: hero.id,
      selectedIds: [hero.id],
      commandableIds: [hero.id],
      inspectId: 0,
    });
  });

  it('binds control groups with commandable units only', () => {
    const hero = unit({ id: 1, kind: 'hero', team: Team.Dawn });
    const summon = unit({ id: 3, kind: 'creep', team: Team.Dawn, summonOwnerId: hero.id });
    const enemy = unit({ id: 9, kind: 'hero', team: Team.Night });
    const selection = new SelectionState(Team.Dawn, hero.id);
    selection.selectMany([hero, summon, enemy]);

    selection.bindGroup(1);

    expect(selection.group(1)).toEqual([hero.id, summon.id]);
  });

  it('restores alive commandable group members and drops missing or dead ids', () => {
    const hero = unit({ id: 1, kind: 'hero', team: Team.Dawn });
    const summon = unit({ id: 3, kind: 'creep', team: Team.Dawn, summonOwnerId: hero.id });
    const deadSummon = unit({ id: 4, kind: 'creep', team: Team.Dawn, summonOwnerId: hero.id, alive: false });
    const selection = new SelectionState(Team.Dawn, hero.id);
    selection.selectMany([hero, summon, deadSummon]);
    selection.bindGroup(2);

    selection.select(unit({ id: 10, kind: 'hero', team: Team.Night }));
    selection.selectGroup(2, new Map([[hero.id, hero], [summon.id, summon], [deadSummon.id, deadSummon]]));

    expect(selection.snapshot()).toMatchObject({
      primaryId: hero.id,
      selectedIds: [hero.id, summon.id],
      commandableIds: [hero.id, summon.id],
      inspectId: 0,
    });
  });

  it('cycles primary command subject inside a multi-unit selection without changing the group', () => {
    const hero = unit({ id: 1, kind: 'hero', team: Team.Dawn, name: 'Hero' });
    const wolf = unit({ id: 3, kind: 'creep', team: Team.Dawn, summonOwnerId: hero.id, name: 'Spirit Wolf' });
    const courier = unit({ id: 4, kind: 'courier', team: Team.Dawn, name: 'Courier' });
    const selection = new SelectionState(Team.Dawn, hero.id);
    selection.selectMany([hero, wolf, courier]);

    expect(selection.cyclePrimary()).toBe(wolf.id);
    expect(selection.snapshot()).toMatchObject({
      primaryId: wolf.id,
      selectedIds: [hero.id, wolf.id, courier.id],
      commandableIds: [hero.id, wolf.id, courier.id],
    });

    expect(selection.cyclePrimary()).toBe(courier.id);
    expect(selection.cyclePrimary()).toBe(hero.id);
  });

  it('double-click same-type selection keeps visible owned matches and excludes enemies, neutrals, dead, and hidden units', () => {
    const hero = unit({ id: 1, kind: 'hero', team: Team.Dawn, name: 'Hero' });
    const wolfA = unit({ id: 3, kind: 'creep', team: Team.Dawn, summonOwnerId: hero.id, name: 'Spirit Wolf' });
    const wolfB = unit({ id: 4, kind: 'creep', team: Team.Dawn, summonOwnerId: hero.id, name: 'Spirit Wolf' });
    const bear = unit({ id: 5, kind: 'creep', team: Team.Dawn, summonOwnerId: hero.id, name: 'Spirit Bear' });
    const hiddenWolf = unit({ id: 6, kind: 'creep', team: Team.Dawn, summonOwnerId: hero.id, name: 'Spirit Wolf', visible: false });
    const enemyWolf = unit({ id: 7, kind: 'creep', team: Team.Night, name: 'Spirit Wolf' });
    const deadWolf = unit({ id: 8, kind: 'creep', team: Team.Dawn, summonOwnerId: hero.id, name: 'Spirit Wolf', alive: false });
    const selection = new SelectionState(Team.Dawn, hero.id);

    selection.selectSameType(wolfA, [hero, wolfA, wolfB, bear, hiddenWolf, enemyWolf, deadWolf]);

    expect(selection.snapshot()).toMatchObject({
      primaryId: wolfA.id,
      selectedIds: [wolfA.id, wolfB.id],
      commandableIds: [wolfA.id, wolfB.id],
      inspectId: 0,
    });
  });
});

describe('isCommandableByPlayer', () => {
  it('allows the player hero, owned summons, owned illusions, and own courier', () => {
    expect(isCommandableByPlayer(unit({ id: 1, kind: 'hero' }), Team.Dawn, 1)).toBe(true);
    expect(isCommandableByPlayer(unit({ id: 2, kind: 'creep', summonOwnerId: 1 }), Team.Dawn, 1)).toBe(true);
    expect(isCommandableByPlayer(unit({ id: 3, kind: 'illusion', summonOwnerId: 1 }), Team.Dawn, 1)).toBe(true);
    expect(isCommandableByPlayer(unit({ id: 4, kind: 'courier' }), Team.Dawn, 1)).toBe(true);
  });

  it('rejects enemies, lane creeps, dead units, and allied non-owned heroes', () => {
    expect(isCommandableByPlayer(unit({ id: 2, team: Team.Night }), Team.Dawn, 1)).toBe(false);
    expect(isCommandableByPlayer(unit({ id: 3, kind: 'creep' }), Team.Dawn, 1)).toBe(false);
    expect(isCommandableByPlayer(unit({ id: 4, kind: 'hero' }), Team.Dawn, 1)).toBe(false);
    expect(isCommandableByPlayer(unit({ id: 5, alive: false }), Team.Dawn, 5)).toBe(false);
  });
});
