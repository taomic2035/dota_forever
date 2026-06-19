/**
 * 战斗日志(可 toggle 的可滚动面板)纯模型。
 * 记录玩家参与的战斗事件(伤害收/发、击杀、控制)+ 时间戳;环形缓冲。
 * 文案与着色由调用方(main,需单位名)格式化后 push;本模型只存与裁剪,保持纯/可测。
 */
export interface CombatLogEntry {
  at: number;
  text: string;
  color: string;
}

/** 世界时间 → m:ss(负为开局前 -m:ss),供日志行时间戳。 */
export function formatClock(t: number): string {
  const sign = t < 0 ? '-' : '';
  const a = Math.abs(Math.floor(t));
  const m = Math.floor(a / 60);
  const s = (a % 60).toString().padStart(2, '0');
  return `${sign}${m}:${s}`;
}

export class CombatLog {
  private buf: CombatLogEntry[] = [];
  constructor(private readonly cap = 60) {}

  push(at: number, text: string, color = '#cfd8a0'): void {
    this.buf.push({ at, text, color });
    if (this.buf.length > this.cap) this.buf.shift();
  }

  /** 最近 max 条(保序,newest 在末尾)。 */
  recent(max = 40): CombatLogEntry[] {
    return this.buf.slice(-max);
  }

  clear(): void {
    this.buf = [];
  }

  get size(): number {
    return this.buf.length;
  }
}
