import { describe, expect, it } from 'vitest';
import { buildAnnouncements } from '../src/ui/announceModel';
import { Team } from '../src/sim/map';

describe('buildAnnouncements', () => {
  it('announces allied courier death as a high-priority warning', () => {
    const announcements = buildAnnouncements({
      viewerTeam: Team.Dawn,
      events: [{ kind: 'unit_died', unitId: 7, killerId: 99, pos: { x: 100, y: 200 } }],
      units: [
        { id: 7, kind: 'courier', team: Team.Dawn },
        { id: 99, kind: 'hero', team: Team.Night },
      ],
    });

    expect(announcements).toEqual([
      {
        text: 'Courier killed!',
        color: '#ff5252',
        audioCue: 'alert',
      },
    ]);
  });

  it('announces visible enemy courier death as a positive event', () => {
    const announcements = buildAnnouncements({
      viewerTeam: Team.Dawn,
      events: [{ kind: 'unit_died', unitId: 8, killerId: 1, pos: { x: 100, y: 200 } }],
      units: [
        { id: 1, kind: 'hero', team: Team.Dawn },
        { id: 8, kind: 'courier', team: Team.Night },
      ],
    });

    expect(announcements).toEqual([
      {
        text: 'Enemy courier killed',
        color: '#ffd54f',
        audioCue: 'announce',
      },
    ]);
  });

  it('ignores non-courier unit deaths', () => {
    const announcements = buildAnnouncements({
      viewerTeam: Team.Dawn,
      events: [{ kind: 'unit_died', unitId: 2, killerId: 1, pos: { x: 100, y: 200 } }],
      units: [
        { id: 1, kind: 'hero', team: Team.Dawn },
        { id: 2, kind: 'creep', team: Team.Night },
      ],
    });

    expect(announcements).toEqual([]);
  });

  it('returns at most one courier death announcement per event batch', () => {
    const announcements = buildAnnouncements({
      viewerTeam: Team.Dawn,
      events: [
        { kind: 'unit_died', unitId: 7, killerId: 99, pos: { x: 100, y: 200 } },
        { kind: 'unit_died', unitId: 8, killerId: 1, pos: { x: 150, y: 250 } },
      ],
      units: [
        { id: 1, kind: 'hero', team: Team.Dawn },
        { id: 7, kind: 'courier', team: Team.Dawn },
        { id: 8, kind: 'courier', team: Team.Night },
        { id: 99, kind: 'hero', team: Team.Night },
      ],
    });

    expect(announcements).toHaveLength(1);
    expect(announcements[0].text).toBe('Courier killed!');
  });
});
