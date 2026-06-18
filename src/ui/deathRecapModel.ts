/**
 * 死亡回顾(伤害来源拆解)的纯 UX 模型。
 *
 * 数据来自 sim 的 `unit_damaged` 事件(在 UX 层累积,不进 sim 状态 → 不影响确定性)。
 * recap 锚定在「最近一次伤害」(即致命一击)向前回看 windowSec,按来源聚合——
 * 这样无论英雄死了多久,展示的始终是把它打死的那段爆发,而非随当前时间滑走。
 */
export type DamageType = 'physical' | 'magical' | 'pure';

export interface DamageInstance {
  at: number;
  /** 聚合键:英雄按个体(如 h12),通用单位按类型(小兵/防御塔/野怪…)→ 避免多兵多塔刷屏。 */
  groupKey: string;
  sourceName: string;
  /** 来源着色(英雄色由 main 解析后传入),用于条形/标签。 */
  sourceColor?: string;
  amount: number;
  type: DamageType;
}

export interface DeathRecapEntry {
  groupKey: string;
  sourceName: string;
  sourceColor?: string;
  total: number;
  byType: Record<DamageType, number>;
}

function emptyByType(): Record<DamageType, number> {
  return { physical: 0, magical: 0, pure: 0 };
}

export function aggregateRecap(
  instances: DamageInstance[],
  windowSec: number,
  maxEntries = 4,
): DeathRecapEntry[] {
  if (instances.length === 0) return [];
  let endTime = -Infinity;
  for (const d of instances) if (d.at > endTime) endTime = d.at;
  const windowStart = endTime - windowSec;

  const bySource = new Map<string, DeathRecapEntry & { latestAt: number }>();
  for (const d of instances) {
    if (d.at < windowStart) continue;
    let e = bySource.get(d.groupKey);
    if (!e) {
      e = { groupKey: d.groupKey, sourceName: d.sourceName, sourceColor: d.sourceColor, total: 0, byType: emptyByType(), latestAt: -Infinity };
      bySource.set(d.groupKey, e);
    }
    e.total += d.amount;
    e.byType[d.type] += d.amount;
    if (d.at >= e.latestAt) {
      e.latestAt = d.at;
      e.sourceName = d.sourceName; // 名字/颜色取该来源最新实例
      e.sourceColor = d.sourceColor;
    }
  }

  return [...bySource.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, maxEntries)
    .map(({ latestAt: _drop, ...entry }) => entry);
}

export class DamageLog {
  private buf: DamageInstance[] = [];
  constructor(private readonly cap = 24) {}

  push(inst: DamageInstance): void {
    this.buf.push(inst);
    if (this.buf.length > this.cap) this.buf.shift();
  }

  clear(): void {
    this.buf = [];
  }

  recap(windowSec = 10, maxEntries = 4): DeathRecapEntry[] {
    return aggregateRecap(this.buf, windowSec, maxEntries);
  }

  get size(): number {
    return this.buf.length;
  }
}
