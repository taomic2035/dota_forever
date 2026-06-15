import { describe, it, expect } from 'vitest';
import { castBarInfo, CAST_COLOR, CHANNEL_COLOR, type CastTrackEntry } from '../src/render/castBar';

type FakeUnit = Parameters<typeof castBarInfo>[1];
function unit(over: Partial<FakeUnit> = {}): FakeUnit {
  return { id: 1, casting: null, channeling: null, ...over } as FakeUnit;
}

describe('castBarInfo (shared 2D/3D cast progress)', () => {
  it('returns null and clears the track when not casting', () => {
    const track = new Map<number, CastTrackEntry>([[1, { start: 0, end: 1 }]]);
    expect(castBarInfo(track, unit(), 0.5)).toBeNull();
    expect(track.has(1)).toBe(false);
  });

  it('captures start on first sight and reports cast progress (cyan)', () => {
    const track = new Map<number, CastTrackEntry>();
    const u = unit({ casting: { abilityIndex: 0, pointUntil: 2 } });
    const a = castBarInfo(track, u, 1)!; // start=1, end=2
    expect(a.channel).toBe(false);
    expect(a.color).toBe(CAST_COLOR);
    expect(a.frac).toBeCloseTo(0, 5);
    expect(castBarInfo(track, u, 1.5)!.frac).toBeCloseTo(0.5, 5);
  });

  it('channel reports progress in gold', () => {
    const track = new Map<number, CastTrackEntry>();
    const u = unit({ channeling: { abilityIndex: 1, until: 5, nextTickAt: 0 } });
    const a = castBarInfo(track, u, 1)!; // start=1, end=5
    expect(a.channel).toBe(true);
    expect(a.color).toBe(CHANNEL_COLOR);
    expect(castBarInfo(track, u, 3)!.frac).toBeCloseTo(0.5, 5);
  });

  it('re-captures start when the end time changes (a new cast began)', () => {
    const track = new Map<number, CastTrackEntry>();
    const u = unit({ casting: { abilityIndex: 0, pointUntil: 2 } });
    castBarInfo(track, u, 1);
    u.casting = { abilityIndex: 0, pointUntil: 4 }; // new cast, different end
    expect(castBarInfo(track, u, 2)!.frac).toBeCloseTo(0, 5); // start re-captured at now=2
  });
});
