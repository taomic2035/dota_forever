/**
 * 核心不变量护栏:
 *  1) 确定性 —— 同种子 + 同输入 → 逐 tick 完全一致。
 *  2) sim 纯净性 —— sim/core/data 不依赖 DOM / 墙钟 / 全局随机;只读查询不改写世界。
 */
import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { installBotAI } from '../src/sim/ai/bots';
import { acquireTarget } from '../src/sim/combat';
import { isVisibleTo, cellVisible } from '../src/sim/vision';
import { HEROES } from '../src/data/heroes';
import type { World } from '../src/sim/world';

/** 世界状态的确定性快照(序列化为字符串,便于精确逐字段比对)。 */
function snapshot(w: World): string {
  const units = [...w.units.values()].map((u) => [
    u.id, u.kind, u.team, u.alive ? 1 : 0,
    u.pos.x, u.pos.y, u.hp, u.mp, u.level,
    u.order?.type ?? '', u.order?.targetId ?? 0,
    u.modifiers.length,
    u.heroMeta?.gold ?? 0, u.heroMeta?.xp ?? 0,
  ]);
  return JSON.stringify({
    tick: w.tick,
    rng: (w.rng as unknown as { s: number }).s,
    proj: w.projectiles.length,
    units,
  });
}

function buildMatchWorld(seed: number): World {
  // 注意:NEXT_ID 为模块级全局,World 构造会 resetIds();因此必须「一个 world 跑完再建下一个」,
  // 不可交错步进(交错会抢占同一 id 序列)。这正是已知的「单 world / 单线程」约束。
  const w = createWorld(new GameMap(), { seed, creeps: true, startTime: 60 });
  for (const team of [Team.Dawn, Team.Night]) {
    for (let i = 0; i < 5; i++) spawnHero(w, HEROES[i], team);
  }
  installBotAI(w, () => false);
  return w;
}

describe('determinism', () => {
  it('full 5v5 sim is reproducible tick-for-tick from the same seed', () => {
    const TOTAL = 1000;
    const CHECKPOINTS = new Set([199, 499, 999]);
    const run = (): string[] => {
      const w = buildMatchWorld(24601);
      const snaps: string[] = [];
      for (let t = 0; t < TOTAL; t++) {
        w.step();
        if (CHECKPOINTS.has(t)) snaps.push(snapshot(w));
      }
      return snaps;
    };
    const a = run();
    const b = run(); // 第二次构造会 resetIds → id 分配镜像第一次
    expect(b).toEqual(a);
    expect(a[a.length - 1].length).toBeGreaterThan(100); // 快照非空(确有状态在变化)
  }, 30000);

  it('a different seed produces a different trajectory', () => {
    const run = (seed: number): string => {
      const w = buildMatchWorld(seed);
      for (let t = 0; t < 400; t++) w.step();
      return snapshot(w);
    };
    const a = run(1);
    const b = run(2);
    expect(a).not.toEqual(b);
  }, 30000);
});

describe('sim purity (static)', () => {
  const FORBIDDEN = [
    { re: /\bdocument\b/, name: 'document' },
    { re: /\bwindow\./, name: 'window.' },
    { re: /\blocalStorage\b/, name: 'localStorage' },
    { re: /\brequestAnimationFrame\b/, name: 'requestAnimationFrame' },
    { re: /performance\s*\.\s*now/, name: 'performance.now' },
    { re: /Math\s*\.\s*random/, name: 'Math.random' },
    { re: /Date\s*\.\s*now/, name: 'Date.now' },
    { re: /new\s+Date\s*\(/, name: 'new Date()' },
  ];

  // vite 原生 glob,把源码作为原始字符串内联(无需 node:fs,可通过 tsc 类型检查)。
  const files = {
    ...import.meta.glob('../src/sim/**/*.ts', { query: '?raw', import: 'default', eager: true }),
    ...import.meta.glob('../src/core/**/*.ts', { query: '?raw', import: 'default', eager: true }),
    ...import.meta.glob('../src/data/**/*.ts', { query: '?raw', import: 'default', eager: true }),
  } as Record<string, string>;

  it('src/sim, src/core, src/data import no DOM / wall-clock / global RNG', () => {
    expect(Object.keys(files).length).toBeGreaterThan(20); // 确认 glob 命中文件
    const offenders: string[] = [];
    for (const [path, text] of Object.entries(files)) {
      for (const f of FORBIDDEN) {
        if (f.re.test(text)) offenders.push(`${path} → ${f.name}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('sim purity (dynamic)', () => {
  it('read-only world queries do not mutate sim state', () => {
    const w = buildMatchWorld(777);
    for (let t = 0; t < 200; t++) w.step(); // 发育出丰富状态
    const before = snapshot(w);
    // 各类只读查询:不得改写世界
    for (const u of [...w.units.values()]) {
      w.queryRadius(u.pos, 700, (x) => x.alive);
      w.getUnit(u.id);
      acquireTarget(w, u);
      isVisibleTo(w, Team.Dawn, u);
      isVisibleTo(w, Team.Night, u);
    }
    cellVisible(w, Team.Dawn, { x: 7520, y: 7520 });
    [...w.aliveUnits()];
    const after = snapshot(w);
    expect(after).toBe(before);
  }, 20000);
});
