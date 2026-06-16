import { describe, expect, it } from 'vitest';
import { Team } from '../src/sim/map';
import { buildBuildingAttackAlertPulses } from '../src/ui/buildingAttackAlertModel';

describe('buildBuildingAttackAlertPulses', () => {
  it('emits a danger ping when an allied building is attacked by an enemy hero', () => {
    const pulses = buildBuildingAttackAlertPulses({
      viewerTeam: Team.Dawn,
      time: 80,
      events: [{ kind: 'unit_damaged', unitId: 10, sourceId: 99 }],
      units: [
        { id: 10, kind: 'tower', team: Team.Dawn, pos: { x: 300, y: 400 } },
        { id: 99, kind: 'hero', team: Team.Night, pos: { x: 330, y: 390 } },
      ],
      lastAlertAtByUnit: new Map(),
    });

    expect(pulses).toEqual([
      {
        kind: 'dangerPing',
        pos: { x: 300, y: 400 },
        time: 80,
        targetId: 10,
      },
    ]);
  });

  it('ignores creep damage, friendly hero damage, and enemy buildings', () => {
    const pulses = buildBuildingAttackAlertPulses({
      viewerTeam: Team.Dawn,
      time: 81,
      events: [
        { kind: 'unit_damaged', unitId: 10, sourceId: 2 },
        { kind: 'unit_damaged', unitId: 10, sourceId: 3 },
        { kind: 'unit_damaged', unitId: 11, sourceId: 1 },
      ],
      units: [
        { id: 1, kind: 'hero', team: Team.Dawn, pos: { x: 100, y: 100 } },
        { id: 2, kind: 'creep', team: Team.Night, pos: { x: 110, y: 110 } },
        { id: 3, kind: 'hero', team: Team.Dawn, pos: { x: 120, y: 120 } },
        { id: 10, kind: 'tower', team: Team.Dawn, pos: { x: 300, y: 400 } },
        { id: 11, kind: 'building', team: Team.Night, pos: { x: 800, y: 900 } },
      ],
      lastAlertAtByUnit: new Map(),
    });

    expect(pulses).toEqual([]);
  });

  it('respects per-building alert cooldown', () => {
    const pulses = buildBuildingAttackAlertPulses({
      viewerTeam: Team.Dawn,
      time: 85,
      events: [{ kind: 'unit_damaged', unitId: 10, sourceId: 99 }],
      units: [
        { id: 10, kind: 'tower', team: Team.Dawn, pos: { x: 300, y: 400 } },
        { id: 99, kind: 'hero', team: Team.Night, pos: { x: 330, y: 390 } },
      ],
      lastAlertAtByUnit: new Map([[10, 80]]),
      cooldownSeconds: 6,
    });

    expect(pulses).toEqual([]);
  });

  it('deduplicates repeated damage events for the same building in one batch', () => {
    const pulses = buildBuildingAttackAlertPulses({
      viewerTeam: Team.Dawn,
      time: 86,
      events: [
        { kind: 'unit_damaged', unitId: 10, sourceId: 99 },
        { kind: 'unit_damaged', unitId: 10, sourceId: 99 },
      ],
      units: [
        { id: 10, kind: 'tower', team: Team.Dawn, pos: { x: 300, y: 400 } },
        { id: 99, kind: 'hero', team: Team.Night, pos: { x: 330, y: 390 } },
      ],
      lastAlertAtByUnit: new Map(),
    });

    expect(pulses).toHaveLength(1);
    expect(pulses[0]?.targetId).toBe(10);
  });

  it('allows a new alert after cooldown expires', () => {
    const pulses = buildBuildingAttackAlertPulses({
      viewerTeam: Team.Dawn,
      time: 87,
      events: [{ kind: 'unit_damaged', unitId: 10, sourceId: 99 }],
      units: [
        { id: 10, kind: 'building', team: Team.Dawn, pos: { x: 300, y: 400 } },
        { id: 99, kind: 'hero', team: Team.Night, pos: { x: 330, y: 390 } },
      ],
      lastAlertAtByUnit: new Map([[10, 80]]),
      cooldownSeconds: 6,
    });

    expect(pulses.map((pulse) => pulse.kind)).toEqual(['dangerPing']);
  });
});
