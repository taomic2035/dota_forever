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

// ---------- 控制时间线(死亡回顾 V3) ----------

export type ControlKind = 'stun' | 'root' | 'silence' | 'disarm' | 'mute' | 'lift';

export interface ControlInstance {
  at: number;
  sourceName: string;
  sourceColor?: string;
  control: ControlKind;
  /** 控制持续秒数。 */
  duration: number;
}

/**
 * 致命前的控制时间线:锚定最近一次控制(贴近死亡)回看 windowSec,按时间顺序返回最近 maxEntries 条。
 * 不聚合——控制的「顺序」本身就是死因故事(被晕→再被晕→被沉默)。
 */
export function controlTimeline(instances: ControlInstance[], windowSec: number, maxEntries = 5): ControlInstance[] {
  if (instances.length === 0) return [];
  let endTime = -Infinity;
  for (const c of instances) if (c.at > endTime) endTime = c.at;
  const windowStart = endTime - windowSec;
  return instances.filter((c) => c.at >= windowStart).slice(-maxEntries);
}

/**
 * 致命前总锁定时长(秒):取窗口内控制区间 [at, at+duration] 的**并集**长度,
 * 合并重叠(同时眩晕+缠绕不重复计)→ 真实「你被锁了多久」。
 */
export function controlLockdownSeconds(instances: ControlInstance[], windowSec: number): number {
  if (instances.length === 0) return 0;
  let endTime = -Infinity;
  for (const c of instances) if (c.at > endTime) endTime = c.at;
  const windowStart = endTime - windowSec;
  const ivals = instances
    .filter((c) => c.at + c.duration >= windowStart)
    .map((c) => [Math.max(windowStart, c.at), c.at + c.duration] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  if (ivals.length === 0) return 0;
  let total = 0;
  let [curStart, curEnd] = ivals[0];
  for (let i = 1; i < ivals.length; i++) {
    const [s, e] = ivals[i];
    if (s <= curEnd) {
      if (e > curEnd) curEnd = e;
    } else {
      total += curEnd - curStart;
      curStart = s;
      curEnd = e;
    }
  }
  total += curEnd - curStart;
  return total;
}

export class ControlLog {
  private buf: ControlInstance[] = [];
  constructor(private readonly cap = 24) {}

  push(inst: ControlInstance): void {
    this.buf.push(inst);
    if (this.buf.length > this.cap) this.buf.shift();
  }

  clear(): void {
    this.buf = [];
  }

  timeline(windowSec = 10, maxEntries = 5): ControlInstance[] {
    return controlTimeline(this.buf, windowSec, maxEntries);
  }

  /** 窗口内总锁定时长(秒,区间并集)。 */
  lockdownSeconds(windowSec = 10): number {
    return controlLockdownSeconds(this.buf, windowSec);
  }

  get size(): number {
    return this.buf.length;
  }
}
