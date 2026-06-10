/** mulberry32 种子随机:模拟确定性的基础。渲染/音频等非模拟用途请另建实例。 */
export class Rng {
  private s: number;

  constructor(seed: number) {
    this.s = seed >>> 0;
  }

  /** [0, 1) */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** [a, b) 浮点 */
  range(a: number, b: number): number {
    return a + this.next() * (b - a);
  }

  /** [a, b] 整数 */
  int(a: number, b: number): number {
    return a + Math.floor(this.next() * (b - a + 1));
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  chance(p: number): boolean {
    return this.next() < p;
  }
}
