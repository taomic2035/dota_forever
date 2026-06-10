export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** 弧度差归一到 (-PI, PI] */
export function angleDiff(from: number, to: number): number {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

/** 朝目标角度转动,每步至多 maxStep 弧度。 */
export function turnTowards(facing: number, target: number, maxStep: number): number {
  const d = angleDiff(facing, target);
  if (Math.abs(d) <= maxStep) return target;
  return facing + Math.sign(d) * maxStep;
}
