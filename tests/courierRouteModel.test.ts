import { describe, expect, it } from 'vitest';
import { buildCourierRouteModel } from '../src/render/courierRouteModel';

describe('buildCourierRouteModel', () => {
  it('shows a delivery route when an alive courier is moving with stash items pending', () => {
    expect(buildCourierRouteModel({
      courier: {
        id: 7,
        alive: true,
        pos: { x: 100, y: 120 },
        hp: 260,
        maxHp: 300,
        order: { type: 'move', pos: { x: 700, y: 760 } },
      },
      stashItems: 3,
    })).toEqual({
      visible: true,
      kind: 'delivering',
      tone: 'busy',
      label: 'Courier delivering x3',
      from: { x: 100, y: 120 },
      to: { x: 700, y: 760 },
    });
  });

  it('shows a return route when an alive courier is moving without stash cargo pending', () => {
    expect(buildCourierRouteModel({
      courier: {
        id: 8,
        alive: true,
        pos: { x: 640, y: 700 },
        hp: 280,
        maxHp: 300,
        order: { type: 'move', pos: { x: 120, y: 140 } },
      },
      stashItems: 0,
    })).toMatchObject({
      visible: true,
      kind: 'returning',
      tone: 'ready',
      label: 'Courier returning',
    });
  });

  it('uses danger tone for low-health route and hides dead or idle couriers', () => {
    expect(buildCourierRouteModel({
      courier: {
        id: 9,
        alive: true,
        pos: { x: 100, y: 100 },
        hp: 50,
        maxHp: 300,
        order: { type: 'move', pos: { x: 180, y: 220 } },
      },
      stashItems: 1,
    })).toMatchObject({
      visible: true,
      tone: 'danger',
      label: 'Courier danger x1',
    });

    expect(buildCourierRouteModel({
      courier: {
        id: 10,
        alive: false,
        pos: { x: 100, y: 100 },
        hp: 0,
        maxHp: 300,
        order: { type: 'move', pos: { x: 180, y: 220 } },
      },
      stashItems: 1,
    }).visible).toBe(false);

    expect(buildCourierRouteModel({
      courier: {
        id: 11,
        alive: true,
        pos: { x: 100, y: 100 },
        hp: 300,
        maxHp: 300,
        order: null,
      },
      stashItems: 1,
    }).visible).toBe(false);
  });
});
