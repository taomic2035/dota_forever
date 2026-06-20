import { describe, expect, it } from 'vitest';
import {
  ThreatDirectionLog,
  buildThreatEdgeIndicators,
  threatEdgeBucket,
  type ThreatDirectionInstance,
} from '../src/ui/threatDirectionModel';

function hit(overrides: Partial<ThreatDirectionInstance> = {}): ThreatDirectionInstance {
  return {
    at: 10,
    targetPos: { x: 100, y: 100 },
    sourcePos: { x: 180, y: 100 },
    sourceName: 'Sniper',
    groupKey: 'h-sniper',
    sourceColor: '#d9b44a',
    amount: 120,
    type: 'physical',
    ...overrides,
  };
}

describe('threatEdgeBucket', () => {
  it('maps world-space source direction to screen edge buckets', () => {
    expect(threatEdgeBucket({ x: 100, y: 100 }, { x: 200, y: 110 })).toBe('right');
    expect(threatEdgeBucket({ x: 100, y: 100 }, { x: 10, y: 110 })).toBe('left');
    expect(threatEdgeBucket({ x: 100, y: 100 }, { x: 90, y: 0 })).toBe('top');
    expect(threatEdgeBucket({ x: 100, y: 100 }, { x: 90, y: 220 })).toBe('bottom');
  });

  it('falls back to top for zero-length vectors', () => {
    expect(threatEdgeBucket({ x: 100, y: 100 }, { x: 100, y: 100 })).toBe('top');
  });
});

describe('buildThreatEdgeIndicators', () => {
  it('aggregates active damage by edge and source, keeping source categorization for death recap parity', () => {
    const indicators = buildThreatEdgeIndicators({
      now: 11,
      events: [
        hit({ at: 10, amount: 80, type: 'physical', sourceName: 'Sniper' }),
        hit({ at: 10.4, amount: 40, type: 'magical', sourceName: 'Sniper' }),
        hit({ at: 10.2, sourcePos: { x: 100, y: 20 }, sourceName: 'Zeus', groupKey: 'h-zeus', amount: 60, type: 'magical' }),
      ],
    });

    expect(indicators.map((item) => item.edge)).toEqual(['right', 'top']);
    expect(indicators[0]).toMatchObject({
      edge: 'right',
      sourceName: 'Sniper',
      groupKey: 'h-sniper',
      total: 120,
      dominantType: 'physical',
      sourceColor: '#d9b44a',
    });
    expect(indicators[0].intensity).toBeGreaterThan(indicators[1].intensity);
  });

  it('decays and expires old threat indicators', () => {
    const fresh = buildThreatEdgeIndicators({ now: 10.2, events: [hit({ at: 10 })] })[0];
    const stale = buildThreatEdgeIndicators({ now: 11.1, events: [hit({ at: 10 })] })[0];
    const gone = buildThreatEdgeIndicators({ now: 12.5, events: [hit({ at: 10 })] });

    expect(fresh.intensity).toBeGreaterThan(stale.intensity);
    expect(stale.intensity).toBeGreaterThan(0);
    expect(gone).toEqual([]);
  });
});

describe('ThreatDirectionLog', () => {
  it('keeps a bounded recent buffer and clears cleanly', () => {
    const log = new ThreatDirectionLog(2);
    log.push(hit({ at: 1, groupKey: 'a', sourceName: 'A' }));
    log.push(hit({ at: 2, groupKey: 'b', sourceName: 'B' }));
    log.push(hit({ at: 3, groupKey: 'c', sourceName: 'C' }));

    expect(log.indicators(3).map((item) => item.groupKey)).toEqual(['c', 'b']);
    log.clear();
    expect(log.indicators(3)).toEqual([]);
  });
});
