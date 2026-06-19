import { describe, it, expect } from 'vitest';
import { CombatLog, formatClock } from '../src/ui/combatLogModel';

describe('formatClock', () => {
  it('负时间(开局前)显示 -m:ss', () => {
    expect(formatClock(-72)).toBe('-1:12');
  });
  it('正时间显示 m:ss 补零', () => {
    expect(formatClock(125)).toBe('2:05');
    expect(formatClock(5)).toBe('0:05');
  });
});

describe('CombatLog', () => {
  it('push/recent 串联,newest 在末尾', () => {
    const log = new CombatLog(10);
    log.push(10, 'A', '#fff');
    log.push(20, 'B', '#f00');
    const r = log.recent();
    expect(r.map((e) => e.text)).toEqual(['A', 'B']);
    expect(r[1]).toMatchObject({ at: 20, text: 'B', color: '#f00' });
  });

  it('环形容量:超出丢最旧', () => {
    const log = new CombatLog(3);
    for (let i = 1; i <= 5; i++) log.push(i, `e${i}`);
    expect(log.recent().map((e) => e.text)).toEqual(['e3', 'e4', 'e5']);
  });

  it('recent(max) 只取最近 max 条(保序)', () => {
    const log = new CombatLog(20);
    for (let i = 1; i <= 6; i++) log.push(i, `e${i}`);
    expect(log.recent(2).map((e) => e.text)).toEqual(['e5', 'e6']);
  });

  it('clear 清空', () => {
    const log = new CombatLog(5);
    log.push(1, 'x');
    log.clear();
    expect(log.recent()).toEqual([]);
    expect(log.size).toBe(0);
  });
});
