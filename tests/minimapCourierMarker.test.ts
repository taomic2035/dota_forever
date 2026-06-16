import { describe, expect, it } from 'vitest';
import { buildCourierMinimapMarkers } from '../src/render/minimapCourierMarker';
import { Team } from '../src/sim/map';

describe('buildCourierMinimapMarkers', () => {
  it('keeps the allied courier visible on the minimap even through fog', () => {
    const markers = buildCourierMinimapMarkers({
      viewerTeam: Team.Dawn,
      worldSize: 1000,
      minimapSize: 100,
      units: [
        {
          id: 7,
          kind: 'courier',
          team: Team.Dawn,
          alive: true,
          pos: { x: 250, y: 750 },
          hp: 300,
          maxHp: 300,
        },
      ],
      isVisible: () => false,
    });

    expect(markers).toEqual([
      {
        id: 7,
        x: 25,
        y: 75,
        tone: 'ally',
        label: 'Courier',
      },
    ]);
  });

  it('hides dead couriers and enemy couriers that are not visible', () => {
    const markers = buildCourierMinimapMarkers({
      viewerTeam: Team.Dawn,
      worldSize: 1000,
      minimapSize: 100,
      units: [
        {
          id: 8,
          kind: 'courier',
          team: Team.Dawn,
          alive: false,
          pos: { x: 250, y: 750 },
          hp: 0,
          maxHp: 300,
        },
        {
          id: 9,
          kind: 'courier',
          team: Team.Night,
          alive: true,
          pos: { x: 800, y: 200 },
          hp: 300,
          maxHp: 300,
        },
      ],
      isVisible: (unit) => unit.team === Team.Dawn,
    });

    expect(markers).toEqual([]);
  });

  it('prioritizes danger tone over moving tone for low-health couriers', () => {
    const markers = buildCourierMinimapMarkers({
      viewerTeam: Team.Dawn,
      worldSize: 1000,
      minimapSize: 100,
      units: [
        {
          id: 10,
          kind: 'courier',
          team: Team.Dawn,
          alive: true,
          pos: { x: 500, y: 500 },
          hp: 90,
          maxHp: 300,
          orderType: 'move',
        },
      ],
      isVisible: () => true,
    });

    expect(markers[0]).toMatchObject({
      id: 10,
      x: 50,
      y: 50,
      tone: 'danger',
      label: 'Courier low',
    });
  });

  it('marks healthy moving couriers as busy', () => {
    const markers = buildCourierMinimapMarkers({
      viewerTeam: null,
      worldSize: 1000,
      minimapSize: 100,
      units: [
        {
          id: 11,
          kind: 'courier',
          team: Team.Night,
          alive: true,
          pos: { x: 800, y: 200 },
          hp: 280,
          maxHp: 300,
          orderType: 'move',
        },
      ],
      isVisible: () => false,
    });

    expect(markers[0]).toMatchObject({
      id: 11,
      x: 80,
      y: 20,
      tone: 'busy',
      label: 'Courier moving',
    });
  });

  it('keeps visible enemy couriers enemy-toned even when they are moving', () => {
    const markers = buildCourierMinimapMarkers({
      viewerTeam: Team.Dawn,
      worldSize: 1000,
      minimapSize: 100,
      units: [
        {
          id: 12,
          kind: 'courier',
          team: Team.Night,
          alive: true,
          pos: { x: 800, y: 200 },
          hp: 300,
          maxHp: 300,
          orderType: 'move',
        },
      ],
      isVisible: () => true,
    });

    expect(markers[0]).toMatchObject({
      id: 12,
      x: 80,
      y: 20,
      tone: 'enemy',
      label: 'Courier',
    });
  });
});
