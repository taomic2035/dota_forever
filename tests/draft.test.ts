import { describe, it, expect } from 'vitest';
import { shuffledHeroPool } from '../src/sim/draft';
import { HEROES } from '../src/data/heroes';

describe('bot 阵容抽取(shuffledHeroPool)', () => {
  it('同种子复现同一顺序(?seed 可复现整局阵容)', () => {
    const a = shuffledHeroPool(HEROES, 12345).map((h) => h.key);
    const b = shuffledHeroPool(HEROES, 12345).map((h) => h.key);
    expect(a).toEqual(b);
  });

  it('不同种子给出不同阵容(前 9 抽样几乎必不同)', () => {
    const a = shuffledHeroPool(HEROES, 1).slice(0, 9).map((h) => h.key);
    const b = shuffledHeroPool(HEROES, 2).slice(0, 9).map((h) => h.key);
    expect(a).not.toEqual(b);
  });

  it('排除玩家英雄:洗牌池不含其 key,长度减一', () => {
    const pool = shuffledHeroPool(HEROES, 777, 'rein');
    expect(pool.length).toBe(HEROES.length - 1);
    expect(pool.some((h) => h.key === 'rein')).toBe(false);
  });

  it('顺序取用天然无重复(一局英雄唯一,不镜像)', () => {
    const pool = shuffledHeroPool(HEROES, 42);
    const first10 = pool.slice(0, 10).map((h) => h.key);
    expect(new Set(first10).size).toBe(10);
  });

  it('是排列而非丢弃:返回的就是同一批英雄', () => {
    const pool = shuffledHeroPool(HEROES, 9999);
    expect(pool.length).toBe(HEROES.length);
    expect(new Set(pool.map((h) => h.key))).toEqual(new Set(HEROES.map((h) => h.key)));
  });

  it('多种子覆盖面:50 局首抽英雄应触达 ≥20 个不同英雄(替代旧的永远前 5)', () => {
    const seen = new Set<string>();
    for (let s = 0; s < 50; s++) {
      const pool = shuffledHeroPool(HEROES, s);
      for (const h of pool.slice(0, 9)) seen.add(h.key);
    }
    expect(seen.size).toBeGreaterThanOrEqual(20);
  });

  it('不修改传入数组(纯函数,无副作用)', () => {
    const before = HEROES.map((h) => h.key);
    shuffledHeroPool(HEROES, 555);
    expect(HEROES.map((h) => h.key)).toEqual(before);
  });
});
