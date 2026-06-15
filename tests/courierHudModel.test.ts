import { describe, expect, it } from 'vitest';
import { buildCourierHudModel } from '../src/ui/courierHudModel';

describe('buildCourierHudModel', () => {
  it('reports missing when no allied courier is visible to the HUD model', () => {
    expect(buildCourierHudModel({ courier: undefined, selectedUnitId: 1 })).toEqual({
      visible: true,
      status: 'missing',
      label: 'Courier',
      detail: 'No allied courier',
      tone: 'muted',
      hpPercent: 0,
      selected: false,
    });
  });

  it('reports dead couriers before checking orders', () => {
    const model = buildCourierHudModel({
      selectedUnitId: 7,
      courier: {
        id: 7,
        alive: false,
        hp: 0,
        maxHp: 300,
        orderType: 'move',
        atFountain: false,
        stashItems: 2,
      },
    });

    expect(model.status).toBe('dead');
    expect(model.detail).toBe('Dead / respawning');
    expect(model.tone).toBe('danger');
    expect(model.hpPercent).toBe(0);
    expect(model.selected).toBe(true);
  });

  it('shows returning when a living courier is moving without stash cargo', () => {
    const model = buildCourierHudModel({
      selectedUnitId: 1,
      courier: {
        id: 4,
        alive: true,
        hp: 210,
        maxHp: 300,
        orderType: 'move',
        atFountain: false,
        stashItems: 0,
      },
    });

    expect(model.status).toBe('returning');
    expect(model.detail).toBe('Returning to base');
    expect(model.tone).toBe('busy');
    expect(model.hpPercent).toBe(70);
    expect(model.selected).toBe(false);
  });

  it('shows delivering when a courier is moving while the hero has stash items', () => {
    const model = buildCourierHudModel({
      selectedUnitId: 4,
      courier: {
        id: 4,
        alive: true,
        hp: 300,
        maxHp: 300,
        orderType: 'move',
        atFountain: false,
        stashItems: 3,
      },
    });

    expect(model.status).toBe('delivering');
    expect(model.detail).toBe('Delivering stash x3');
    expect(model.tone).toBe('busy');
    expect(model.hpPercent).toBe(100);
    expect(model.selected).toBe(true);
  });

  it('shows ready when idle at fountain and highlights pending stash', () => {
    const model = buildCourierHudModel({
      selectedUnitId: 1,
      courier: {
        id: 8,
        alive: true,
        hp: 180,
        maxHp: 300,
        orderType: undefined,
        atFountain: true,
        stashItems: 2,
      },
    });

    expect(model.status).toBe('ready');
    expect(model.detail).toBe('Ready / stash x2');
    expect(model.tone).toBe('ready');
    expect(model.hpPercent).toBe(60);
  });
});
