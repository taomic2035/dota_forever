import { describe, expect, it } from 'vitest';
import { buildOrbPriorityModel } from '../src/ui/orbPriorityModel';
import type { AbilityDef } from '../src/data/heroes/types';
import type { AbilityInstance } from '../src/sim/abilities';

describe('buildOrbPriorityModel', () => {
  it('marks the first active learned orb as primary and later active orbs as conflicts', () => {
    const model = buildOrbPriorityModel([
      ability({ key: 'frost', name: 'Frost Arrows', tags: ['orb', 'autocast'] }),
      ability({ key: 'poison', name: 'Poison Attack', tags: ['orb', 'autocast'] }),
      ability({ key: 'bash', name: 'Bash', targetMode: 'passive' }),
    ], [
      inst({ key: 'frost', level: 2, autocastOn: true }),
      inst({ key: 'poison', level: 1, autocastOn: true }),
      inst({ key: 'bash', level: 1 }),
    ]);

    expect(model.summary).toBe('ORB Frost Arrows · +1 conflict');
    expect(model.entries.map((entry) => [entry.slot, entry.state, entry.label])).toEqual([
      [0, 'primary', 'MAIN'],
      [1, 'conflict', '+ORB'],
    ]);
    expect(model.title).toContain('Frost Arrows');
    expect(model.title).toContain('Poison Attack');
  });

  it('shows disabled autocast orbs without treating them as active priority candidates', () => {
    const model = buildOrbPriorityModel([
      ability({ key: 'frost', name: 'Frost Arrows', tags: ['orb', 'autocast'] }),
      ability({ key: 'glaive', name: 'Glaives', tags: ['orb'] }),
    ], [
      inst({ key: 'frost', level: 1, autocastOn: false }),
      inst({ key: 'glaive', level: 1 }),
    ]);

    expect(model.summary).toBe('ORB Glaives · 1 off');
    expect(model.entries.map((entry) => [entry.slot, entry.state, entry.label])).toEqual([
      [0, 'off', 'OFF'],
      [1, 'primary', 'MAIN'],
    ]);
  });

  it('stays hidden when there are no learned orb abilities', () => {
    const model = buildOrbPriorityModel([
      ability({ key: 'frost', name: 'Frost Arrows', tags: ['orb', 'autocast'] }),
      ability({ key: 'bolt', name: 'Bolt', tags: ['nuke'] }),
    ], [
      inst({ key: 'frost', level: 0, autocastOn: true }),
      inst({ key: 'bolt', level: 1 }),
    ]);

    expect(model.visible).toBe(false);
    expect(model.entries).toEqual([]);
  });
});

function ability(over: Partial<AbilityDef>): AbilityDef {
  return {
    key: 'test',
    name: 'Test',
    maxLevel: 4,
    targetMode: 'passive',
    tags: [],
    description: '',
    ...over,
  };
}

function inst(over: Partial<AbilityInstance>): AbilityInstance {
  return {
    key: 'test',
    level: 1,
    cooldownUntil: -Infinity,
    ...over,
  };
}
