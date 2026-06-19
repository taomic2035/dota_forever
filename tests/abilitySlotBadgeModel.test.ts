import { describe, expect, it } from 'vitest';
import { buildAbilitySlotBadges } from '../src/ui/abilitySlotBadgeModel';
import type { AbilityDef } from '../src/data/heroes/types';

describe('buildAbilitySlotBadges', () => {
  it('marks passive abilities without implying they are pressable', () => {
    expect(buildAbilitySlotBadges(ability({ targetMode: 'passive' }), { learned: true })).toEqual([
      { key: 'passive', label: 'P', tone: 'passive', title: 'Passive ability' },
    ]);
  });

  it('marks orb passives as attack modifiers for Dota-like readability', () => {
    expect(buildAbilitySlotBadges(ability({ targetMode: 'passive', tags: ['orb'] }), { learned: true })).toEqual([
      { key: 'orb', label: 'ORB', tone: 'orb', title: 'Attack modifier' },
      { key: 'passive', label: 'P', tone: 'passive', title: 'Passive ability' },
    ]);
  });

  it('adds ultimate and active scepter badges without exceeding compact slot capacity', () => {
    expect(buildAbilitySlotBadges(ability({
      ultimate: true,
      tags: ['orb'],
      scepter: { desc: 'Upgraded.' },
    }), { learned: true, scepterOn: true })).toEqual([
      { key: 'orb', label: 'ORB', tone: 'orb', title: 'Attack modifier' },
      { key: 'ultimate', label: 'ULT', tone: 'ultimate', title: 'Ultimate ability' },
      { key: 'scepter', label: 'SCP', tone: 'scepter', title: 'Scepter upgrade active' },
    ]);
  });

  it('hides passive/orb badges on unlearned skills but keeps learnable ultimate identity', () => {
    expect(buildAbilitySlotBadges(ability({ targetMode: 'passive', tags: ['orb'], ultimate: true }), { learned: false })).toEqual([
      { key: 'ultimate', label: 'ULT', tone: 'ultimate', title: 'Ultimate ability' },
    ]);
  });
});

function ability(over: Partial<AbilityDef>): AbilityDef {
  return {
    key: 'test',
    name: 'Test',
    maxLevel: 4,
    targetMode: 'unit',
    tags: [],
    description: '',
    ...over,
  };
}
