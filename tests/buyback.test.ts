import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero, tryBuyback, canBuyback } from '../src/sim/hero';
import { HEROES } from '../src/data/heroes';
import { kill } from '../src/sim/combat';
import { buybackCost, BUYBACK_COOLDOWN } from '../src/data/balance';

// M3 回归:买活必须有冷却,防止同一英雄短时间反复买活。
describe('买活冷却(M3)', () => {
  it('买活成功后进入冷却,冷却中再次阵亡不可买活', () => {
    const w = createWorld(new GameMap(), { seed: 1, noBuildings: true });
    const h = spawnHero(w, HEROES[0], Team.Dawn, { x: 7520, y: 7520 });
    h.heroMeta!.gold = 100000;

    kill(w, h, 0);
    expect(canBuyback(w, h)).toBe(true);
    expect(tryBuyback(w, h)).toBe(true);
    expect(h.alive).toBe(true);
    expect(h.heroMeta!.buybackCooldownUntil).toBeGreaterThan(w.time);

    // 再次阵亡,但仍在买活冷却中 → 不可买活
    kill(w, h, 0);
    expect(canBuyback(w, h)).toBe(false);
    expect(tryBuyback(w, h)).toBe(false);
    expect(h.alive).toBe(false);
  });

  it('冷却结束后可再次买活', () => {
    const w = createWorld(new GameMap(), { seed: 1, noBuildings: true });
    const h = spawnHero(w, HEROES[0], Team.Dawn, { x: 7520, y: 7520 });
    h.heroMeta!.gold = 100000;
    kill(w, h, 0);
    tryBuyback(w, h);
    kill(w, h, 0);
    // 跳过买活冷却
    h.heroMeta!.buybackCooldownUntil = w.time - 1;
    expect(canBuyback(w, h)).toBe(true);
    expect(tryBuyback(w, h)).toBe(true);
    expect(h.alive).toBe(true);
  });

  it('金币不足不可买活', () => {
    const w = createWorld(new GameMap(), { seed: 1, noBuildings: true });
    const h = spawnHero(w, HEROES[0], Team.Dawn, { x: 7520, y: 7520 });
    h.heroMeta!.gold = buybackCost(h.level) - 1;
    kill(w, h, 0);
    expect(canBuyback(w, h)).toBe(false);
    expect(tryBuyback(w, h)).toBe(false);
  });

  it('冷却时长为 BUYBACK_COOLDOWN', () => {
    const w = createWorld(new GameMap(), { seed: 1, noBuildings: true });
    const h = spawnHero(w, HEROES[0], Team.Dawn, { x: 7520, y: 7520 });
    h.heroMeta!.gold = 100000;
    const t0 = w.time;
    kill(w, h, 0);
    tryBuyback(w, h);
    expect(h.heroMeta!.buybackCooldownUntil).toBeCloseTo(t0 + BUYBACK_COOLDOWN, 5);
  });
});
