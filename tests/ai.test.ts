import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { installBotAI } from '../src/sim/ai/bots';
import { HEROES } from '../src/data/heroes';

const map = new GameMap();

describe('bot ai headless simulation', () => {
  it('4v4 bots: lane, lasthit, level up, fight — 10 min without crash', () => {
    const w = createWorld(map, { seed: 1701, creeps: true, startTime: 60 });
    const heroes = [];
    for (const team of [Team.Dawn, Team.Night]) {
      for (let i = 0; i < 4; i++) heroes.push(spawnHero(w, HEROES[i], team));
    }
    installBotAI(w, () => false);

    const TEN_MIN = 30 * 60 * 10;
    for (let i = 0; i < TEN_MIN && w.gameOver === null; i++) w.step();

    // 不崩 & 仍在运行
    expect(w.tick).toBeGreaterThan(1000);

    // 全员吃到经验升级
    const levels = heroes.map((h) => h.level);
    expect(Math.min(...levels)).toBeGreaterThanOrEqual(3);

    // 有人在补刀
    const lastHits = heroes.reduce((s, h) => s + h.heroMeta!.lastHits, 0);
    expect(lastHits).toBeGreaterThan(30);

    // 发生过战斗:有英雄死亡或塔受损
    const deaths = heroes.reduce((s, h) => s + h.heroMeta!.deaths, 0);
    const towers = [...w.units.values()].filter((u) => u.kind === 'tower');
    const towerDamaged = towers.some((t) => !t.alive || t.hp < t.calc.maxHp * 0.98);
    expect(deaths > 0 || towerDamaged).toBe(true);

    // 技能被使用过(有人花了技能点)
    const skillsLearned = heroes.reduce(
      (s, h) => s + h.abilities.reduce((a, inst) => a + inst.level, 0), 0,
    );
    expect(skillsLearned).toBeGreaterThanOrEqual(heroes.length * 2);
  }, 120000);

  it('bots retreat at low hp and heal at fountain', () => {
    const w = createWorld(map, { seed: 1702, creeps: true, startTime: 60 });
    const h = spawnHero(w, HEROES[0], Team.Dawn);
    installBotAI(w, () => false);
    for (let i = 0; i < 90; i++) w.step(); // 让 AI 进入状态
    h.hp = h.calc.maxHp * 0.15; // 打残
    for (let i = 0; i < 30 * 30; i++) w.step(); // 30 秒
    expect(h.alive).toBe(true);
    expect(h.hp / h.calc.maxHp).toBeGreaterThan(0.6); // 回去补血了
  }, 60000);
});
