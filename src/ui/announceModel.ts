import type { Vec2 } from '../core/vec2';
import type { UnitKind } from '../sim/unit';

export type AnnouncementAudioCue = 'announce' | 'alert';

export interface AnnouncementEvent {
  kind: string;
  unitId?: number;
  killerId?: number;
  pos?: Vec2;
  streakText?: string;
}

export interface AnnouncementUnit {
  id: number;
  kind: UnitKind;
  team: number;
  streak?: number;
}

export interface AnnouncementModel {
  text: string;
  color: string;
  audioCue: AnnouncementAudioCue;
}

export interface AnnouncementInput {
  viewerTeam: number | null;
  events: readonly AnnouncementEvent[];
  units: readonly AnnouncementUnit[];
}

export function buildAnnouncements(input: AnnouncementInput): AnnouncementModel[] {
  const units = new Map(input.units.map((unit) => [unit.id, unit]));
  const announcements: AnnouncementModel[] = [];

  for (const event of input.events) {
    if (event.kind === 'unit_died' && event.unitId !== undefined) {
      const unit = units.get(event.unitId);
      if (unit?.kind !== 'courier') continue;

      announcements.push(courierDeathAnnouncement(unit.team, input.viewerTeam));
      break;
    }

    if (event.kind === 'first_blood') {
      announcements.push({ text: '一血!', color: '#ff5252', audioCue: 'announce' });
      break;
    }

    if (event.kind === 'hero_kill' && event.streakText && event.killerId !== undefined) {
      const killer = units.get(event.killerId);
      if ((killer?.streak ?? 0) >= 3) {
        announcements.push({ text: event.streakText, color: '#ffd54f', audioCue: 'announce' });
        break;
      }
    }
  }

  return announcements;
}

function courierDeathAnnouncement(courierTeam: number, viewerTeam: number | null): AnnouncementModel {
  if (viewerTeam !== null && courierTeam === viewerTeam) {
    return { text: 'Courier killed!', color: '#ff5252', audioCue: 'alert' };
  }
  return { text: 'Enemy courier killed', color: '#ffd54f', audioCue: 'announce' };
}
