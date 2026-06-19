import { describe, it, expect } from 'vitest';
import { DamageLog, aggregateRecap, ControlLog, controlTimeline, controlLockdownSeconds, type DamageInstance, type ControlInstance } from '../src/ui/deathRecapModel';

function inst(at: number, groupKey: number | string, amount: number, type: DamageInstance['type'] = 'physical', sourceName = `u${groupKey}`): DamageInstance {
  return { at, groupKey: String(groupKey), sourceName, amount, type };
}

describe('aggregateRecap', () => {
  it('空日志 → 空数组', () => {
    expect(aggregateRecap([], 10)).toEqual([]);
  });

  it('单来源多次伤害 → 合并求和', () => {
    const r = aggregateRecap([inst(100, 7, 50), inst(101, 7, 30), inst(102, 7, 20)], 10);
    expect(r).toHaveLength(1);
    expect(r[0].groupKey).toBe("7");
    expect(r[0].total).toBe(100);
  });

  it('多来源按总伤害降序,并截断到 maxEntries', () => {
    const r = aggregateRecap(
      [inst(100, 1, 30), inst(100, 2, 90), inst(100, 3, 60), inst(100, 4, 10), inst(100, 5, 5)],
      10,
      3,
    );
    expect(r.map((e) => e.groupKey)).toEqual(['2', '3', '1']);
    expect(r).toHaveLength(3);
  });

  it('锚定最近伤害(致命一击)回看窗口,窗口外旧伤害被排除', () => {
    // 最近伤害在 t=200;窗口 10s → 仅 [190,200];t=100 的旧伤害排除
    const r = aggregateRecap([inst(100, 1, 999), inst(195, 2, 40), inst(200, 2, 60)], 10);
    expect(r).toHaveLength(1);
    expect(r[0].groupKey).toBe("2");
    expect(r[0].total).toBe(100);
  });

  it('按伤害类型拆分 byType', () => {
    const r = aggregateRecap([inst(100, 1, 40, 'physical'), inst(101, 1, 30, 'magical'), inst(102, 1, 10, 'pure')], 10);
    expect(r[0].byType).toEqual({ physical: 40, magical: 30, pure: 10 });
    expect(r[0].total).toBe(80);
  });

  it('通用单位按 groupKey 合并:多个小兵 → 一行(避免刷屏)', () => {
    const r = aggregateRecap(
      [inst(100, '小兵', 12, 'physical', '小兵'), inst(101, '小兵', 18, 'physical', '小兵'), inst(102, '小兵', 10, 'physical', '小兵')],
      10,
    );
    expect(r).toHaveLength(1);
    expect(r[0].groupKey).toBe('小兵');
    expect(r[0].total).toBe(40);
  });

  it('来源名取该来源最新一次实例的名字', () => {
    const r = aggregateRecap([inst(100, 1, 10, 'physical', '旧名'), inst(105, 1, 10, 'physical', '新名')], 10);
    expect(r[0].sourceName).toBe('新名');
  });
});

describe('DamageLog', () => {
  it('push/recap 串联,clear 清空', () => {
    const log = new DamageLog(8);
    log.push(inst(100, 3, 40, 'magical'));
    log.push(inst(101, 3, 60, 'magical'));
    const r = log.recap(10);
    expect(r).toHaveLength(1);
    expect(r[0].total).toBe(100);
    log.clear();
    expect(log.recap(10)).toEqual([]);
  });

  it('lastAt 返回最近受伤时间(空为 -Infinity)', () => {
    const log = new DamageLog(8);
    expect(log.lastAt()).toBe(-Infinity);
    log.push(inst(100, 1, 10));
    log.push(inst(140, 2, 20));
    log.push(inst(120, 3, 15));
    expect(log.lastAt()).toBe(140);
  });

  it('环形容量上限:超出丢弃最旧', () => {
    const log = new DamageLog(3);
    log.push(inst(1, 1, 10));
    log.push(inst(2, 2, 10));
    log.push(inst(3, 3, 10));
    log.push(inst(4, 4, 10)); // 挤掉 t=1
    // 最近伤害 t=4,窗口 10 → [−6,4] 含 t=2,3,4(t=1 已被挤掉)
    const ids = log.recap(10).map((e) => e.groupKey).sort();
    expect(ids).toEqual(['2', '3', '4']);
  });
});

function ctrl(at: number, control: ControlInstance['control'], duration: number, sourceName = 'X'): ControlInstance {
  return { at, control, duration, sourceName };
}

describe('controlTimeline', () => {
  it('空 → 空数组', () => {
    expect(controlTimeline([], 10)).toEqual([]);
  });

  it('按时间顺序返回(不聚合):晕→晕→沉默', () => {
    const r = controlTimeline([ctrl(100, 'stun', 1.5, 'A'), ctrl(101.5, 'stun', 1.2, 'A'), ctrl(102.7, 'silence', 3, 'B')], 10);
    expect(r.map((c) => c.control)).toEqual(['stun', 'stun', 'silence']);
    expect(r.map((c) => c.sourceName)).toEqual(['A', 'A', 'B']);
  });

  it('锚定最近控制回看窗口,旧控制排除', () => {
    const r = controlTimeline([ctrl(100, 'stun', 2), ctrl(195, 'root', 1), ctrl(200, 'stun', 1)], 10);
    expect(r.map((c) => c.at)).toEqual([195, 200]);
  });

  it('只取最近 maxEntries 条(保序)', () => {
    const r = controlTimeline([ctrl(100, 'stun', 1), ctrl(101, 'root', 1), ctrl(102, 'silence', 1), ctrl(103, 'disarm', 1)], 10, 2);
    expect(r.map((c) => c.control)).toEqual(['silence', 'disarm']);
  });
});

describe('controlLockdownSeconds(区间并集)', () => {
  it('空 → 0', () => {
    expect(controlLockdownSeconds([], 10)).toBe(0);
  });
  it('连续不重叠 → 求和', () => {
    // 晕[100,101.5] + 沉默[102,105] = 1.5 + 3 = 4.5(中间 0.5s 间隙不计)
    expect(controlLockdownSeconds([ctrl(100, 'stun', 1.5), ctrl(102, 'silence', 3)], 20)).toBeCloseTo(4.5);
  });
  it('重叠控制取并集,不重复计', () => {
    // 晕[100,102] 与 缠绕[101,103] 重叠 → 并集 [100,103] = 3(而非 2+2=4)
    expect(controlLockdownSeconds([ctrl(100, 'stun', 2), ctrl(101, 'root', 2)], 20)).toBeCloseTo(3);
  });
  it('完全被包含的区间不增加总时长', () => {
    // 晕[100,104] 包含 沉默[101,102] → 仍 4
    expect(controlLockdownSeconds([ctrl(100, 'stun', 4), ctrl(101, 'silence', 1)], 20)).toBeCloseTo(4);
  });
  it('窗口裁剪:窗外旧控制不计', () => {
    // 最近控制起于 t=195;窗口 10 → windowStart=185。旧控制 [100,102] 在窗外 → 不计;[195,198]=3
    expect(controlLockdownSeconds([ctrl(100, 'stun', 2), ctrl(195, 'stun', 3)], 10)).toBeCloseTo(3);
  });
  it('控制从窗外延入窗内:只计窗内部分(起点裁到 windowStart)', () => {
    // endTime=190;窗口 10 → windowStart=180。[178,188] 延入 → 计 [180,188]=8;[190,190.x] 锚点
    expect(controlLockdownSeconds([ctrl(178, 'stun', 10), ctrl(190, 'silence', 0.5)], 10)).toBeCloseTo(8.5);
  });
});

describe('ControlLog', () => {
  it('push/timeline/clear + lockdownSeconds', () => {
    const log = new ControlLog(8);
    log.push(ctrl(100, 'stun', 1.5));
    log.push(ctrl(101, 'silence', 2));
    expect(log.timeline(10).map((c) => c.control)).toEqual(['stun', 'silence']);
    expect(log.lockdownSeconds(20)).toBeCloseTo(3); // [100,101.5]∪[101,103] = [100,103] = 3
    log.clear();
    expect(log.timeline(10)).toEqual([]);
    expect(log.lockdownSeconds(10)).toBe(0);
  });
});
