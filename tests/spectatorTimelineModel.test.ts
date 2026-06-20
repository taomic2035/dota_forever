import { describe, expect, it } from 'vitest';
import { Team } from '../src/sim/map';
import { buildSpectatorTimelineEntries, SpectatorTimelineJumpHistoryLog, SpectatorTimelineLog } from '../src/ui/spectatorTimelineModel';

const units = [
  { id: 1, name: 'Lina', kind: 'hero', team: Team.Dawn, pos: { x: 100, y: 200 } },
  { id: 2, name: 'Axe', kind: 'hero', team: Team.Night, pos: { x: 300, y: 420 } },
  { id: 3, name: 'Top Tower', kind: 'tower', team: Team.Night, pos: { x: 900, y: 1000 } },
  { id: 4, name: 'Night Courier', kind: 'courier', team: Team.Night, pos: { x: 700, y: 800 } },
  { id: 5, name: 'Pit Lord', kind: 'boss', team: Team.Neutral, pos: { x: 640, y: 640 } },
] as const;

describe('spectatorTimelineModel', () => {
  it('builds jumpable entries for major match events', () => {
    const entries = buildSpectatorTimelineEntries({
      now: 754.2,
      events: [
        { kind: 'hero_kill', killerId: 1, victimId: 2, bounty: 300 },
        { kind: 'tower_fell', unitId: 3, team: Team.Night, byTeam: Team.Dawn },
        { kind: 'unit_died', unitId: 4, killerId: 1, pos: { x: 720, y: 820 } },
        { kind: 'boss_killed', killerId: 1, byTeam: Team.Dawn },
        { kind: 'rune_spawned', rune: 'haste', pos: { x: 500, y: 600 } },
        { kind: 'rune_taken', rune: 'bounty', unitId: 2 },
      ],
      units,
    });

    expect(entries.map((entry) => entry.label)).toEqual([
      'Lina 击杀 Axe',
      'Top Tower 被摧毁',
      'Night Courier 阵亡',
      '深渊领主被击败',
      '极速神符刷新',
      'Axe 拾取赏金神符',
    ]);
    expect(entries[0]).toMatchObject({
      at: 754.2,
      timeLabel: '12:34',
      tone: 'kill',
      focus: { unitId: 2, pos: { x: 300, y: 420 } },
    });
    expect(entries[2]).toMatchObject({
      tone: 'courier',
      focus: { unitId: 4, pos: { x: 720, y: 820 } },
    });
    expect(entries[4]).toMatchObject({
      tone: 'objective',
      focus: { pos: { x: 500, y: 600 } },
    });
  });

  it('keeps a capped newest-first event log', () => {
    const log = new SpectatorTimelineLog(3);
    log.pushEvents({
      now: 1,
      events: [
        { kind: 'rune_spawned', rune: 'haste', pos: { x: 10, y: 10 } },
        { kind: 'rune_spawned', rune: 'bounty', pos: { x: 20, y: 20 } },
      ],
      units,
    });
    log.pushEvents({
      now: 2,
      events: [
        { kind: 'tower_fell', unitId: 3, team: Team.Night, byTeam: Team.Dawn },
        { kind: 'boss_killed', killerId: 1, byTeam: Team.Dawn },
      ],
      units,
    });

    expect(log.entries().map((entry) => entry.label)).toEqual([
      '深渊领主被击败',
      'Top Tower 被摧毁',
      '赏金神符刷新',
    ]);
  });

  it('keeps a capped local jump history for clicked spectator events', () => {
    const [kill, tower, courier] = buildSpectatorTimelineEntries({
      now: 754.2,
      events: [
        { kind: 'hero_kill', killerId: 1, victimId: 2, bounty: 300 },
        { kind: 'tower_fell', unitId: 3, team: Team.Night, byTeam: Team.Dawn },
        { kind: 'unit_died', unitId: 4, killerId: 1, pos: { x: 720, y: 820 } },
      ],
      units,
    });
    const history = new SpectatorTimelineJumpHistoryLog(2);

    history.record(kill);
    history.record(tower);
    history.record(kill);
    history.record(courier);

    expect(history.entries().map((entry) => [entry.id, entry.label, entry.focus?.unitId])).toEqual([
      [courier.id, 'Night Courier 阵亡', 4],
      [kill.id, 'Lina 击杀 Axe', 2],
    ]);
  });
});
