import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { HEROES } from '../src/data/heroes';
import { cellVisible } from '../src/sim/vision';
import {
  makeOutposts,
  outpostSpots,
  outpostXp,
  stepOutpostCapture,
  stepOutpostXp,
  OUTPOST_CAPTURE_TIME,
  OUTPOST_XP_INTERVAL,
} from '../src/sim/outposts';

const map = new GameMap();

describe('前哨', () => {
  it('初始化:2 个中立前哨,位于双方秘密商店点', () => {
    const ops = makeOutposts(map);
    expect(ops.length).toBe(2);
    for (const op of ops) expect(op.team).toBe(Team.Neutral);
    const spots = outpostSpots(map);
    expect(spots.length).toBe(2);
    // 对称:两点关于地图中心镜像(x1+x2 == y1+y2 的镜像关系下,和应相等)
    expect(Math.round(spots[0].x + spots[1].x)).toBe(Math.round(spots[0].y + spots[1].y));
  });

  it('经验随游戏时长递增', () => {
    expect(outpostXp(0)).toBeGreaterThan(0);
    expect(outpostXp(600)).toBeGreaterThan(outpostXp(0));
    expect(outpostXp(1800)).toBeGreaterThan(outpostXp(600));
  });

  it('单方英雄持续站位 → 占领时间后归属翻转', () => {
    const w = createWorld(map, { seed: 1, startTime: 100 });
    const op = makeOutposts(map)[0];
    spawnHero(w, HEROES[0], Team.Dawn, { x: op.pos.x, y: op.pos.y });
    const steps = Math.ceil(OUTPOST_CAPTURE_TIME / w.dt) + 2;
    for (let i = 0; i < steps; i++) stepOutpostCapture(w, op);
    expect(op.team).toBe(Team.Dawn);
  });

  it('双方争夺 → 不进度(僵持)', () => {
    const w = createWorld(map, { seed: 1, startTime: 100 });
    const op = makeOutposts(map)[0];
    spawnHero(w, HEROES[0], Team.Dawn, { x: op.pos.x, y: op.pos.y });
    spawnHero(w, HEROES[1], Team.Night, { x: op.pos.x, y: op.pos.y });
    const steps = Math.ceil(OUTPOST_CAPTURE_TIME / w.dt) + 5;
    for (let i = 0; i < steps; i++) stepOutpostCapture(w, op);
    expect(op.team).toBe(Team.Neutral);
    expect(op.progress).toBe(0);
  });

  it('敌方可再占已占领的前哨', () => {
    const w = createWorld(map, { seed: 1, startTime: 100 });
    const op = makeOutposts(map)[0];
    op.team = Team.Dawn; // 先归晨曦
    spawnHero(w, HEROES[0], Team.Night, { x: op.pos.x, y: op.pos.y });
    const steps = Math.ceil(OUTPOST_CAPTURE_TIME / w.dt) + 2;
    for (let i = 0; i < steps; i++) stepOutpostCapture(w, op);
    expect(op.team).toBe(Team.Night);
  });

  it('占领方每间隔获得团队经验;中立前哨不发', () => {
    const w = createWorld(map, { seed: 1, startTime: 600 });
    const op = makeOutposts(map)[0];
    const h = spawnHero(w, HEROES[0], Team.Dawn, { x: 200, y: 200 });
    const before = h.heroMeta!.xp;
    const beforeLvl = h.level;

    // 中立 → 不发
    op.team = Team.Neutral;
    expect(stepOutpostXp(w, op)).toBe(false);

    // 占领且到间隔 → 发
    op.team = Team.Dawn;
    op.lastXpAt = w.time - OUTPOST_XP_INTERVAL - 1;
    expect(stepOutpostXp(w, op)).toBe(true);
    expect(h.heroMeta!.xp > before || h.level > beforeLvl).toBe(true);

    // 刚发完未到间隔 → 不再发
    expect(stepOutpostXp(w, op)).toBe(false);
  });

  it('占领方在前哨周围获得视野(DotA 前哨效果)', () => {
    const w = createWorld(map, { seed: 1, startTime: 100 });
    w.outposts = makeOutposts(map);
    const op = w.outposts[1]; // 永夜秘密商店侧——晨曦初始看不见
    expect(cellVisible(w, Team.Dawn, op.pos)).toBe(false);
    op.team = Team.Dawn; // 晨曦占领
    for (let i = 0; i < 10; i++) w.step(); // 触发视野重算(每 8 tick)
    expect(cellVisible(w, Team.Dawn, op.pos)).toBe(true);
  });
});
