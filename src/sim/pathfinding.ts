/**
 * 网格 A*(二叉堆 + 8 向 + 禁止穿角)+ 视线拉直。
 * 目标不可达时退化为"朝目标的最近可达格"。
 */
import { V, type Vec2 } from '../core/vec2';
import type { GameMap } from './map';

class MinHeap {
  keys: number[] = [];
  vals: number[] = [];
  get size() { return this.keys.length; }
  push(key: number, val: number) {
    this.keys.push(key); this.vals.push(val);
    let i = this.keys.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.keys[p] <= this.keys[i]) break;
      this.swap(i, p); i = p;
    }
  }
  pop(): number {
    const top = this.vals[0];
    const lk = this.keys.pop()!, lv = this.vals.pop()!;
    if (this.keys.length) {
      this.keys[0] = lk; this.vals[0] = lv;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < this.keys.length && this.keys[l] < this.keys[m]) m = l;
        if (r < this.keys.length && this.keys[r] < this.keys[m]) m = r;
        if (m === i) break;
        this.swap(i, m); i = m;
      }
    }
    return top;
  }
  private swap(a: number, b: number) {
    [this.keys[a], this.keys[b]] = [this.keys[b], this.keys[a]];
    [this.vals[a], this.vals[b]] = [this.vals[b], this.vals[a]];
  }
}

const DIRS: ReadonlyArray<readonly [number, number, number]> = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
];

/** 两点间逐格直线可走检查(超采样防斜穿)。 */
export function lineWalkable(map: GameMap, a: Vec2, b: Vec2): boolean {
  const dist = V.dist(a, b);
  const steps = Math.max(1, Math.ceil(dist / (map.CELL * 0.45)));
  for (let i = 0; i <= steps; i++) {
    if (!map.isWalkable(V.lerp(a, b, i / steps))) return false;
  }
  return true;
}

/** 性能统计(诊断用,均为确定性整数计数;耗时计时移出 sim 以守住「无墙钟」不变量)。 */
export const PATH_STATS = { calls: 0, expansions: 0, failed: 0 };

/** 复用的寻路缓冲(generation 戳记免清零)。模拟单线程,安全。 */
let SCR: {
  n: number;
  g: Float64Array;
  parent: Int32Array;
  stamp: Int32Array;
  closed: Int32Array;
  gen: number;
} | null = null;

export function findPath(map: GameMap, from: Vec2, to: Vec2): Vec2[] {
  return findPathInner(map, from, to);
}

function findPathInner(map: GameMap, from: Vec2, to: Vec2): Vec2[] {
  PATH_STATS.calls++;
  const start = map.cellOf(map.nearestWalkable(from));
  const goalPos = map.nearestWalkable(to);
  const goal = map.cellOf(goalPos);
  const W = map.GW, H = map.GH, N = W * H;
  const startI = start.cy * W + start.cx;
  const goalI = goal.cy * W + goal.cx;

  if (startI === goalI) return [V.clone(goalPos)];

  if (!SCR || SCR.n !== N) {
    SCR = { n: N, g: new Float64Array(N), parent: new Int32Array(N), stamp: new Int32Array(N), closed: new Int32Array(N), gen: 0 };
  }
  SCR.gen++;
  const { g, parent, stamp, closed } = SCR;
  const gen = SCR.gen;
  const gAt = (i: number) => (stamp[i] === gen ? g[i] : Infinity);
  const heap = new MinHeap();
  g[startI] = 0;
  stamp[startI] = gen;
  parent[startI] = -1;
  heap.push(0, startI);

  const h = (i: number) => {
    const x = i % W, y = (i / W) | 0;
    const dx = Math.abs(x - goal.cx), dy = Math.abs(y - goal.cy);
    return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
  };

  let best = startI;
  let bestH = h(startI);
  let found = false;
  let expanded = 0;
  const MAX_EXPAND = 12000; // 超限按最近接近点返回,调用方下次重试

  while (heap.size && expanded < MAX_EXPAND) {
    const cur = heap.pop();
    if (closed[cur] === gen) continue;
    closed[cur] = gen;
    expanded++;
    if (cur === goalI) { found = true; break; }
    const hh = h(cur);
    if (hh < bestH) { bestH = hh; best = cur; }
    const cx = cur % W, cy = (cur / W) | 0;
    for (const [dx, dy, cost] of DIRS) {
      const nx = cx + dx, ny = cy + dy;
      if (!map.isWalkableCell(nx, ny)) continue;
      // 禁止穿角:斜向要求两个相邻正交格都可走
      if (dx !== 0 && dy !== 0) {
        if (!map.isWalkableCell(cx + dx, cy) || !map.isWalkableCell(cx, cy + dy)) continue;
      }
      const ni = ny * W + nx;
      if (closed[ni] === gen) continue;
      const ng = g[cur] + cost;
      if (ng < gAt(ni)) {
        g[ni] = ng;
        stamp[ni] = gen;
        parent[ni] = cur;
        heap.push(ng + h(ni), ni);
      }
    }
  }

  PATH_STATS.expansions += expanded;
  if (!found) PATH_STATS.failed++;
  const endI = found ? goalI : best;
  // 回溯
  const cells: number[] = [];
  for (let i = endI; i !== -1; i = parent[i]) cells.push(i);
  cells.reverse();

  let pts: Vec2[] = cells.map((i) => map.cellCenter(i % W, (i / W) | 0));
  if (found) pts[pts.length - 1] = V.clone(goalPos);
  pts[0] = V.clone(map.nearestWalkable(from));

  // 视线拉直
  const smooth: Vec2[] = [pts[0]];
  let anchor = 0;
  for (let i = 2; i < pts.length; i++) {
    if (!lineWalkable(map, pts[anchor], pts[i])) {
      smooth.push(pts[i - 1]);
      anchor = i - 1;
    }
  }
  if (pts.length > 1) smooth.push(pts[pts.length - 1]);
  return smooth;
}
