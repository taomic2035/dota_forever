/** 2D 向量。模拟层全部使用普通对象 + 静态方法,避免 GC 压力时也便于序列化。 */
export interface Vec2 {
  x: number;
  y: number;
}

export const V = {
  make(x: number, y: number): Vec2 {
    return { x, y };
  },
  clone(a: Vec2): Vec2 {
    return { x: a.x, y: a.y };
  },
  add(a: Vec2, b: Vec2): Vec2 {
    return { x: a.x + b.x, y: a.y + b.y };
  },
  sub(a: Vec2, b: Vec2): Vec2 {
    return { x: a.x - b.x, y: a.y - b.y };
  },
  scale(a: Vec2, s: number): Vec2 {
    return { x: a.x * s, y: a.y * s };
  },
  len(a: Vec2): number {
    return Math.hypot(a.x, a.y);
  },
  dist(a: Vec2, b: Vec2): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
  },
  distSq(a: Vec2, b: Vec2): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  },
  norm(a: Vec2): Vec2 {
    const l = Math.hypot(a.x, a.y);
    if (l === 0) return { x: 0, y: 0 };
    return { x: a.x / l, y: a.y / l };
  },
  lerp(a: Vec2, b: Vec2, t: number): Vec2 {
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  },
  /** 从 a 朝 b 方向前进 d,不越过 b。 */
  moveTowards(a: Vec2, b: Vec2, d: number): Vec2 {
    const dist = V.dist(a, b);
    if (dist <= d || dist === 0) return V.clone(b);
    const t = d / dist;
    return V.lerp(a, b, t);
  },
  angle(a: Vec2, b: Vec2): number {
    return Math.atan2(b.y - a.y, b.x - a.x);
  },
};
