import type { AbilityDef } from '../data/heroes/types';

export type AbilitySlotBadgeTone =
  | 'autocastOn'
  | 'autocastOff'
  | 'toggleOn'
  | 'toggleOff'
  | 'passive'
  | 'orb'
  | 'ultimate'
  | 'scepter'
  | 'shard';

export interface AbilitySlotBadge {
  key: string;
  label: string;
  tone: AbilitySlotBadgeTone;
  title: string;
}

export interface AbilitySlotBadgeInput {
  learned: boolean;
  scepterOn?: boolean;
  shardOn?: boolean;
  autocastOn?: boolean;
  toggleOn?: boolean;
}

export function buildAbilitySlotBadges(def: AbilityDef, input: AbilitySlotBadgeInput): AbilitySlotBadge[] {
  const badges: AbilitySlotBadge[] = [];
  if (input.learned && def.tags.includes('autocast')) {
    const on = input.autocastOn === true;
    badges.push({
      key: on ? 'autocast-on' : 'autocast-off',
      label: on ? 'AUTO ON' : 'AUTO OFF',
      tone: on ? 'autocastOn' : 'autocastOff',
      title: on ? 'Autocast enabled' : 'Autocast disabled',
    });
  } else if (input.learned && def.tags.includes('orb')) {
    badges.push({ key: 'orb', label: 'ORB', tone: 'orb', title: 'Attack modifier' });
  }
  if (input.learned && def.tags.includes('toggle')) {
    const on = input.toggleOn === true;
    badges.push({
      key: on ? 'toggle-on' : 'toggle-off',
      label: on ? 'ON' : 'OFF',
      tone: on ? 'toggleOn' : 'toggleOff',
      title: on ? 'Toggle enabled' : 'Toggle disabled',
    });
  }
  if (input.learned && def.targetMode === 'passive') {
    badges.push({ key: 'passive', label: 'P', tone: 'passive', title: 'Passive ability' });
  }
  if (def.ultimate) {
    badges.push({ key: 'ultimate', label: 'ULT', tone: 'ultimate', title: 'Ultimate ability' });
  }
  if (input.scepterOn && (def.scepter || def.scepterPassive)) {
    badges.push({ key: 'scepter', label: 'SCP', tone: 'scepter', title: 'Scepter upgrade active' });
  }
  if (input.shardOn && def.shard) {
    badges.push({ key: 'shard', label: 'SHD', tone: 'shard', title: 'Shard upgrade active' });
  }
  return compactBadges(badges);
}

function compactBadges(badges: AbilitySlotBadge[]): AbilitySlotBadge[] {
  const priority: Record<AbilitySlotBadgeTone, number> = {
    autocastOn: 0,
    autocastOff: 0,
    toggleOn: 0,
    toggleOff: 0,
    orb: 1,
    passive: 2,
    ultimate: 3,
    scepter: 4,
    shard: 5,
  };
  return [...badges].sort((a, b) => priority[a.tone] - priority[b.tone]).slice(0, 3);
}
