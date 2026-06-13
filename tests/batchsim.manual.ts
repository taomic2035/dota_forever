/**
 * 平衡批跑(手动):npm run batchsim
 * 多种子整局仿真,输出时长/胜负/击杀/经济摘要 + 聚合健康度断言。
 * 目标是验证「复刻 DotA1」的平衡在更大样本下仍健康(对称地图 → 阵营不应一边倒)。
 */
import { describe, it, expect, afterAll } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { installBotAI } from '../src/sim/ai/bots';
import { HEROES } from '../src/data/heroes';

const SEEDS = [11, 777, 90210, 42, 2024, 31337, 8088, 65537];

interface Res { seed: number; winner: Team | null; minutes: number; kills: number; lastHits: number; }
const results: Res[] = [];

describe('balance batch', () => {
  it.each(SEEDS)('seed %i: match is decisive and sane', (seed) => {
    const map = new GameMap();
    const w = createWorld(map, { seed, creeps: true, startTime: -10 });
    for (const team of [Team.Dawn, Team.Night]) {
      for (let i = 0; i < 5; i++) {
        // 错开阵容:不同种子不同英雄组合(跨 roster 取样,非固定前 5)
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
    results.push({ seed, winner: w.gameOver, minutes: w.time / 60, kills, lastHits });
    console.log(
      `seed=${seed} 胜者=${w.gameOver === Team.Dawn ? '晨曦' : w.gameOver === Team.Night ? '永夜' : '无'} ` +
      `时长=${Math.round(w.time / 60)}min 总击杀=${kills} 总正补=${lastHits} 存量金=${networth}`,
    );

    expect(w.gameOver).not.toBeNull();
    expect(w.time / 60).toBeGreaterThan(8);
    expect(kills).toBeGreaterThan(3);
  }, 600000);

  afterAll(() => {
    if (results.length === 0) return;
    const dawn = results.filter((r) => r.winner === Team.Dawn).length;
    const night = results.filter((r) => r.winner === Team.Night).length;
    const decisive = results.filter((r) => r.winner !== null).length;
    const mins = results.map((r) => r.minutes);
    const avg = mins.reduce((a, b) => a + b, 0) / mins.length;
    const kills = results.map((r) => r.kills);
    console.log(
      `\n=== 聚合(${results.length} 局)===\n` +
      `阵营胜场: 晨曦 ${dawn} / 永夜 ${night}  决胜率 ${decisive}/${results.length}\n` +
      `时长(min): 最短 ${Math.round(Math.min(...mins))} / 均 ${Math.round(avg)} / 最长 ${Math.round(Math.max(...mins))}\n` +
      `击杀: 最少 ${Math.min(...kills)} / 最多 ${Math.max(...kills)}`,
    );
    // 健康度:全部决胜;对称地图下任一阵营不应一边倒(允许样本方差,但不接受清一色横扫)。
    expect(decisive).toBe(results.length);
    expect(Math.max(dawn, night)).toBeLessThanOrEqual(Math.ceil(results.length * 0.8));
    // 节奏:平均时长落在合理区间(避免过快崩盘或拖沓不决)。
    expect(avg).toBeGreaterThan(15);
    expect(avg).toBeLessThan(75);
  });
});
