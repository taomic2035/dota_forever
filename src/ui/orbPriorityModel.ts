import type { AbilityDef } from '../data/heroes/types';
import type { AbilityInstance } from '../sim/abilities';

export type OrbPriorityState = 'primary' | 'conflict' | 'off';

export interface OrbPriorityEntry {
  slot: number;
  key: string;
  name: string;
  state: OrbPriorityState;
  label: string;
  title: string;
}

export interface OrbPriorityModel {
  visible: boolean;
  summary: string;
  title: string;
  entries: OrbPriorityEntry[];
}

export function buildOrbPriorityModel(defs: AbilityDef[], instances: AbilityInstance[]): OrbPriorityModel {
  const candidates = defs
    .map((def, slot) => ({ def, inst: instances[slot], slot }))
    .filter(({ def, inst }) => !!inst && inst.level > 0 && def.tags.includes('orb'));
  const active = candidates.filter(({ def, inst }) => !def.tags.includes('autocast') || inst.autocastOn === true);
  const primary = active[0];
  const entries: OrbPriorityEntry[] = candidates.map(({ def, inst, slot }) => {
    const off = def.tags.includes('autocast') && inst.autocastOn !== true;
    const state: OrbPriorityState = off ? 'off' : primary?.slot === slot ? 'primary' : 'conflict';
    return {
      slot,
      key: def.key,
      name: def.name,
      state,
      label: state === 'primary' ? 'MAIN' : state === 'conflict' ? '+ORB' : 'OFF',
      title: orbEntryTitle(def.name, state),
    };
  });
  if (entries.length === 0) return { visible: false, summary: '', title: '', entries: [] };

  const primaryName = primary?.def.name ?? 'no active orb';
  const conflictCount = entries.filter((entry) => entry.state === 'conflict').length;
  const offCount = entries.filter((entry) => entry.state === 'off').length;
  const suffix = [
    conflictCount > 0 ? `+${conflictCount} conflict` : '',
    offCount > 0 ? `${offCount} off` : '',
  ].filter(Boolean).join(' · ');
  return {
    visible: true,
    summary: `ORB ${primaryName}${suffix ? ` · ${suffix}` : ''}`,
    title: [
      'Attack modifier priority preview',
      ...entries.map((entry) => `${entry.label}: ${entry.name}`),
    ].join('\n'),
    entries,
  };
}

function orbEntryTitle(name: string, state: OrbPriorityState): string {
  if (state === 'primary') return `${name}: primary attack modifier preview`;
  if (state === 'conflict') return `${name}: also active; Opus owns final single-orb sim priority`;
  return `${name}: autocast disabled`;
}
