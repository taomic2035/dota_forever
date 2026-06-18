import { describe, it, expect } from 'vitest';
import { DamageLog, aggregateRecap, type DamageInstance } from '../src/ui/deathRecapModel';

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
