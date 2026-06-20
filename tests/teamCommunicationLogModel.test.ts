import { describe, expect, it } from 'vitest';
import {
  TeamCommunicationLog,
  buildTeamCommunicationEntry,
} from '../src/ui/teamCommunicationLogModel';

describe('teamCommunicationLogModel', () => {
  it('turns status broadcasts into stable visible team-log entries', () => {
    const entry = buildTeamCommunicationEntry({
      at: 83.4,
      label: '神符: 已刷新 加速符文',
      source: 'Liya',
    }, 2);

    expect(entry).toEqual({
      id: '83.4-2',
      at: 83.4,
      timeLabel: '1:23',
      label: '神符: 已刷新 加速符文',
      source: 'Liya',
      tone: 'objective',
    });
  });

  it('keeps newest entries first, caps the log, and expires old calls', () => {
    const log = new TeamCommunicationLog(3, 10);

    log.push({ at: 1, label: '集合推进', source: 'Rein', tone: 'chat' });
    log.push({ at: 2, label: '撤退!', source: 'Kog' });
    log.push({ at: 3, label: '买活: 金币不足', source: 'Liya' });
    log.push({ at: 4, label: 'Boss: 在世', source: 'Team' });

    expect(log.entries(5).map((entry) => [entry.label, entry.tone])).toEqual([
      ['Boss: 在世', 'objective'],
      ['买活: 金币不足', 'status'],
      ['撤退!', 'warning'],
    ]);

    expect(log.entries(14).map((entry) => entry.label)).toEqual(['Boss: 在世']);
  });

  it('falls back to team source and status tone for generic calls', () => {
    const entry = buildTeamCommunicationEntry({ at: -2.1, label: '主控 Rein' });

    expect(entry.source).toBe('Team');
    expect(entry.timeLabel).toBe('-0:02');
    expect(entry.tone).toBe('status');
  });
});
