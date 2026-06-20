import { describe, expect, it } from 'vitest';
import {
  MINIMAP_DRAW_DISTANCE_PX,
  activeMinimapDrawStrokes,
  appendMinimapDrawPoint,
  createMinimapDrawStroke,
  minimapCommunicationGesture,
} from '../src/ui/minimapDrawingModel';

describe('minimapDrawingModel', () => {
  it('keeps Alt short clicks as pings and upgrades Alt drags to drawing', () => {
    expect(minimapCommunicationGesture({
      altKey: false,
      button: 0,
      dragDistancePx: MINIMAP_DRAW_DISTANCE_PX + 10,
    })).toBe('none');

    expect(minimapCommunicationGesture({
      altKey: true,
      button: 0,
      dragDistancePx: MINIMAP_DRAW_DISTANCE_PX - 1,
    })).toBe('ping');

    expect(minimapCommunicationGesture({
      altKey: true,
      button: 0,
      dragDistancePx: MINIMAP_DRAW_DISTANCE_PX,
    })).toBe('draw');
  });

  it('samples draw strokes without adding jitter points', () => {
    const stroke = createMinimapDrawStroke({
      id: 7,
      kind: 'dangerPing',
      point: { x: 100, y: 100, timeMs: 1_000 },
    });

    const ignored = appendMinimapDrawPoint(stroke, {
      point: { x: 102, y: 103, timeMs: 1_020 },
      minPointDistanceWorld: 8,
    });
    expect(ignored.points).toHaveLength(1);
    expect(ignored.updatedAtMs).toBe(1_000);

    const appended = appendMinimapDrawPoint(ignored, {
      point: { x: 112, y: 100, timeMs: 1_040 },
      minPointDistanceWorld: 8,
    });
    expect(appended.points).toHaveLength(2);
    expect(appended.updatedAtMs).toBe(1_040);
    expect(appended.colorRgb).toBe('255,76,66');
  });

  it('fades and expires old minimap strokes', () => {
    const fresh = createMinimapDrawStroke({
      id: 1,
      kind: 'ping',
      point: { x: 10, y: 20, timeMs: 1_000 },
    });
    const stale = createMinimapDrawStroke({
      id: 2,
      kind: 'retreatPing',
      point: { x: 30, y: 40, timeMs: 1_000 },
    });

    const active = activeMinimapDrawStrokes([fresh, stale], {
      nowMs: 3_500,
      ttlMs: 4_000,
    });
    expect(active).toHaveLength(2);
    expect(active[0]?.alpha).toBeCloseTo(0.375, 3);

    const expired = activeMinimapDrawStrokes([fresh, stale], {
      nowMs: 5_100,
      ttlMs: 4_000,
    });
    expect(expired).toHaveLength(0);
  });
});
