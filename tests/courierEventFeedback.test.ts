import { describe, expect, it } from 'vitest';
import { buildCourierDeathPulses } from '../src/ui/courierEventFeedback';
import { Team } from '../src/sim/map';

describe('buildCourierDeathPulses', () => {
  it('emits a danger pulse at allied courier death location', () => {
    const pulses = buildCourierDeathPulses({
      viewerTeam: Team.Dawn,
      time: 42,
      events: [{ kind: 'unit_died', unitId: 7, killerId: 99, pos: { x: 100, y: 200 } }],
      units: [
        { id: 7, kind: 'courier', team: Team.Dawn },
        { id: 99, kind: 'hero', team: Team.Night },
      ],
    });

    expect(pulses).toEqual([
      {
        kind: 'dangerPing',
        pos: { x: 100, y: 200 },
        time: 42,
        targetId: 7,
      },
    ]);
  });

  it('emits a map pulse at enemy courier death location', () => {
    const pulses = buildCourierDeathPulses({
      viewerTeam: Team.Dawn,
      time: 51,
      events: [{ kind: 'unit_died', unitId: 8, killerId: 1, pos: { x: 150, y: 250 } }],
      units: [
        { id: 1, kind: 'hero', team: Team.Dawn },
        { id: 8, kind: 'courier', team: Team.Night },
      ],
    });

    expect(pulses).toEqual([
      {
        kind: 'ping',
        pos: { x: 150, y: 250 },
        time: 51,
        targetId: 8,
      },
    ]);
  });

  it('ignores non-courier deaths and courier deaths without a location', () => {
    const pulses = buildCourierDeathPulses({
      viewerTeam: Team.Dawn,
      time: 60,
      events: [
        { kind: 'unit_died', unitId: 2, killerId: 1, pos: { x: 100, y: 200 } },
        { kind: 'unit_died', unitId: 7, killerId: 99 },
      ],
      units: [
        { id: 1, kind: 'hero', team: Team.Dawn },
        { id: 2, kind: 'creep', team: Team.Night },
        { id: 7, kind: 'courier', team: Team.Dawn },
      ],
    });

    expect(pulses).toEqual([]);
  });

  it('prioritizes one allied courier death pulse per event batch', () => {
    const pulses = buildCourierDeathPulses({
      viewerTeam: Team.Dawn,
      time: 70,
      events: [
        { kind: 'unit_died', unitId: 8, killerId: 1, pos: { x: 150, y: 250 } },
        { kind: 'unit_died', unitId: 7, killerId: 99, pos: { x: 100, y: 200 } },
      ],
      units: [
        { id: 1, kind: 'hero', team: Team.Dawn },
        { id: 7, kind: 'courier', team: Team.Dawn },
        { id: 8, kind: 'courier', team: Team.Night },
        { id: 99, kind: 'hero', team: Team.Night },
      ],
    });

    expect(pulses).toEqual([
      {
        kind: 'dangerPing',
        pos: { x: 100, y: 200 },
        time: 70,
        targetId: 7,
      },
    ]);
  });
});
