import type { AbilityDef } from '../data/heroes/types';

export type AbilitySlotBadgeTone = 'passive' | 'orb' | 'ultimate' | 'scepter' | 'shard';

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
}

export function buildAbilitySlotBadges(def: AbilityDef, input: AbilitySlotBadgeInput): AbilitySlotBadge[] {
  const badges: AbilitySlotBadge[] = [];
  if (input.learned && def.tags.includes('orb')) {
    badges.push({ key: 'orb', label: 'ORB', tone: 'orb', title: 'Attack modifier' });
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
    orb: 0,
    passive: 1,
    ultimate: 2,
    scepter: 3,
    shard: 4,
  };
  return [...badges].sort((a, b) => priority[a.tone] - priority[b.tone]).slice(0, 3);
}
