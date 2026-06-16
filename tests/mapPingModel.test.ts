import { describe, expect, it } from 'vitest';
import { mapPingKindFromModifiers, mapPingVisual } from '../src/ui/mapPingModel';

describe('mapPingModel', () => {
  it('does not create a ping unless Alt is held', () => {
    expect(mapPingKindFromModifiers({ altKey: false, ctrlKey: false, shiftKey: false })).toBeNull();
    expect(mapPingKindFromModifiers({ altKey: false, ctrlKey: true, shiftKey: true })).toBeNull();
  });

  it('maps Alt-click to the regular ping channel', () => {
    expect(mapPingKindFromModifiers({ altKey: true, ctrlKey: false, shiftKey: false })).toBe('ping');
  });

  it('maps Alt+Ctrl-click to danger ping and gives it priority over retreat', () => {
    expect(mapPingKindFromModifiers({ altKey: true, ctrlKey: true, shiftKey: false })).toBe('dangerPing');
    expect(mapPingKindFromModifiers({ altKey: true, ctrlKey: true, shiftKey: true })).toBe('dangerPing');
  });

  it('maps Alt+Shift-click to retreat ping', () => {
    expect(mapPingKindFromModifiers({ altKey: true, ctrlKey: false, shiftKey: true })).toBe('retreatPing');
  });

  it('keeps world and minimap colors distinct for ping types', () => {
    expect(mapPingVisual('ping')).toEqual({
      worldColor: '#48d8ff',
      minimapRgb: '72,216,255',
      minimapRadius: 18,
    });
    expect(mapPingVisual('dangerPing')).toEqual({
      worldColor: '#ff4c42',
      minimapRgb: '255,76,66',
      minimapRadius: 22,
    });
    expect(mapPingVisual('retreatPing')).toEqual({
      worldColor: '#8dff7a',
      minimapRgb: '141,255,122',
      minimapRadius: 20,
    });
  });
});
