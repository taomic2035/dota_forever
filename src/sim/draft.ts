/** 对局开场 bot 阵容抽取:按种子洗牌英雄池,供两队无重复取用(DotA 一局英雄唯一,不镜像)。 */
import type { HeroDef } from '../data/heroes/types';
import { Rng } from '../core/rng';

/**
 * 按对局种子确定性洗牌英雄池(可排除玩家英雄)。
 *
 * 纯函数:同 `seed` 同结果(`?seed=X` 可复现整局阵容);用独立 `Rng` 实例,
 * 不触碰 sim 随机流,故不影响模拟确定性。调用方按顺序从返回数组取英雄即天然无重复。
 */
export function shuffledHeroPool(
  heroes: readonly HeroDef[],
  seed: number,
  excludeKey?: string,
): HeroDef[] {
  // 与 sim 种子解耦(异或常量),避免阵容与开局随机事件平凡相关。
  const rng = new Rng((seed ^ 0x9e3779b1) >>> 0);
  const pool = heroes.filter((h) => h.key !== excludeKey);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rng.int(0, i); // Fisher-Yates;Rng.int 含端点 [0, i]
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}
