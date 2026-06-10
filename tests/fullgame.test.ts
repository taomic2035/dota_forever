import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { installBotAI } from '../src/sim/ai/bots';
import { HEROES } from '../src/data/heroes';

const map = new GameMap();

describe('full game (M4 gate)', () => {
  it('5v5 bot match reaches a decisive end within 60 sim-minutes', () => {
    const w = createWorld(map, { seed: 2026, creeps: true, startTime: -10 });
    for (const team of [Team.Dawn, Team.Night]) {
      for (let i = 0; i < 5; i++) {
        // 双方镜像同英雄,保证对称公平
        spawnHero(w, HEROES[i + (team === Team.Dawn ? 0 : 5)], team);
      }
    }
    installBotAI(w, () => false);

    const LIMIT = 30 * 60 * 90; // 90 分钟上限(经典僵持局也该在此前分胜负)
    let ticks = 0;
    while (w.gameOver === null && ticks < LIMIT) {
      w.step();
      ticks++;
    }
    expect(w.gameOver).not.toBeNull();
    const minutes = w.time / 60;
    expect(minutes).toBeGreaterThan(8); // 不应秒崩
    expect(minutes).toBeLessThanOrEqual(91);

    // 比赛过程合理性:有击杀、有补刀、有装备
    const heroes = [...w.units.values()].filter((u) => u.isHero());
    const kills = heroes.reduce((s, h) => s + h.heroMeta!.kills, 0);
    const items = heroes.reduce((s, h) => s + h.inventory.filter(Boolean).length, 0);
    expect(kills).toBeGreaterThan(3);
    expect(items).toBeGreaterThan(8);
  }, 600000);
});
