import { describe, expect, it } from 'vitest';
import { buildCourierControlModel } from '../src/ui/courierControlModel';

describe('buildCourierControlModel', () => {
  it('shows select and deliver as available when stash delivery can start', () => {
    const model = buildCourierControlModel({
      status: 'ready',
      primaryAction: 'deliver',
      selected: false,
      stashItems: 2,
      tone: 'ready',
    });

    expect(model.summary).toBe('Courier ready · stash x2');
    expect(model.actions.map((action) => [action.key, action.enabled, action.pendingSimApi])).toEqual([
      ['select', true, false],
      ['deliver', true, false],
      ['return', false, true],
      ['stop', false, true],
      ['burst', false, true],
    ]);
  });

  it('keeps task context visible while delivering but does not fake unavailable commands', () => {
    const model = buildCourierControlModel({
      status: 'delivering',
      primaryAction: 'select',
      selected: true,
      stashItems: 3,
      tone: 'busy',
      hpPercent: 80,
    });

    expect(model.summary).toBe('Courier selected · delivering stash x3');
    expect(model.actions.find((action) => action.key === 'select')).toMatchObject({
      enabled: true,
      label: 'Select',
      hotkey: 'F2',
      tone: 'active',
    });
    expect(model.actions.find((action) => action.key === 'deliver')).toMatchObject({
      enabled: false,
      reason: 'Already delivering',
    });
    expect(model.actions.find((action) => action.key === 'return')).toMatchObject({
      enabled: false,
      pendingSimApi: true,
      reason: 'Needs return-to-fountain API',
    });
  });

  it('turns low-health and dead states into danger/read-only guidance', () => {
    expect(buildCourierControlModel({
      status: 'delivering',
      primaryAction: 'select',
      selected: false,
      stashItems: 1,
      tone: 'danger',
      hpPercent: 30,
    }).summary).toBe('Courier danger · delivering stash x1');

    const dead = buildCourierControlModel({
      status: 'dead',
      primaryAction: 'none',
      selected: false,
      stashItems: 0,
      tone: 'danger',
      hpPercent: 0,
    });

    expect(dead.summary).toBe('Courier dead · wait respawn');
    expect(dead.actions.every((action) => !action.enabled)).toBe(true);
  });
});
