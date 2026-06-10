/**
 * 平衡批跑(手动):npm run batchsim
 * 多种子整局仿真,输出时长/胜负/击杀/经济摘要,断言基本健康度。
 */
import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { installBotAI } from '../src/sim/ai/bots';
import { HEROES } from '../src/data/heroes';

const SEEDS = [11, 777, 90210];

describe('balance batch', () => {
  it.each(SEEDS)('seed %i: match is decisive and sane', (seed) => {
    const map = new GameMap();
    const w = createWorld(map, { seed, creeps: true, startTime: -10 });
    for (const team of [Team.Dawn, Team.Night]) {
      for (let i = 0; i < 5; i++) {
        // 错开阵容:不同种子不同英雄组合
        const idx = (i * 2 + seed + (team === Team.Dawn ? 0 : 1)) % HEROES.length;
        spawnHero(w, HEROES[idx], team);
      }
    }
    installBotAI(w, () => false);

    const LIMIT = 30 * 60 * 90;
    for (let i = 0; i < LIMIT && w.gameOver === null; i++) w.step();

    const heroes = [...w.units.values()].filter((u) => u.isHero());
    const kills = heroes.reduce((s, h) => s + h.heroMeta!.kills, 0);
    const lastHits = heroes.reduce((s, h) => s + h.heroMeta!.lastHits, 0);
    const networth = heroes.reduce((s, h) => s + h.heroMeta!.gold, 0);
    console.log(
      `seed=${seed} 胜者=${w.gameOver === Team.Dawn ? '晨曦' : w.gameOver === Team.Night ? '永夜' : '无'} ` +
      `时长=${Math.round(w.time / 60)}min 总击杀=${kills} 总正补=${lastHits} 存量金=${networth}`,
    );

    expect(w.gameOver).not.toBeNull();
    expect(w.time / 60).toBeGreaterThan(8);
    expect(kills).toBeGreaterThan(3);
  }, 600000);
});
