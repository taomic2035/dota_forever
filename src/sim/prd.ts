/**
 * 伪随机分布(PRD)——经典 DotA 的暴击/触发概率模型。
 *
 * 纯随机(每次独立 P 概率)会出现「连续 10 次不暴击」或「连暴 3 次」的极端运气,手感差、不公平。
 * PRD:目标概率 P 对应一个常数 C(C < P);自上次触发后第 N 次尝试的触发概率 = C·N(封顶 1),
 * 触发即归零重计。如此长期触发率仍精确 = P(均值不变,平衡不受影响),但方差大幅降低——
 * 25% 暴击近似「每 ~4 次一暴」而非赌运气。
 *
 * 纯函数 + 按 P 记忆化,确定性(不依赖全局随机源/墙钟;实际投掷用 world 的种子 rng)。
 */

/** 给定 PRD 常数 c,返回其长期触发率(= 1 / 期望触发间隔)。 */
function expectedProcRate(c: number): number {
  let pNoProcThrough = 1; // 前 N-1 次都未触发的概率
  let expectedAttacks = 0; // 期望「首次触发所需尝试数」
  const maxN = Math.ceil(1 / c) + 1; // c·N≥1 之后必触发,无需再算
  for (let n = 1; n <= maxN; n++) {
    const pProcOnN = Math.min(1, c * n);
    const pFirstProcAtN = pNoProcThrough * pProcOnN;
    expectedAttacks += n * pFirstProcAtN;
    pNoProcThrough *= 1 - pProcOnN;
  }
  return 1 / expectedAttacks;
}

const cCache = new Map<number, number>();

/** 由目标概率 P 反解 PRD 常数 C(二分;C∈(0,P];按 P 记忆化)。 */
export function prdConstant(p: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  const cached = cCache.get(p);
  if (cached !== undefined) return cached;
  let lo = 0;
  let hi = p; // C 必然 ≤ P
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (expectedProcRate(mid) < p) lo = mid;
    else hi = mid;
  }
  const c = (lo + hi) / 2;
  cCache.set(p, c);
  return c;
}

/** PRD 当前尝试的触发概率:自上次触发已连续 streak 次未触发 → 本次概率 = C·(streak+1),封顶 1。 */
export function prdChance(p: number, streak: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  return Math.min(1, prdConstant(p) * (streak + 1));
}
