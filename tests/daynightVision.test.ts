import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { HEROES } from '../src/data/heroes';
import { DT, DAY_LENGTH } from '../src/data/balance';

// D2 回归:vision 必须读取**当前 tick** 的 isNight(daynight 先于 vision 安装)。
// 构造:让黑夜起点(t=DAY_LENGTH)正好落在 vision 重算 tick(tick%8===0)。
// 若 vision 仍读上一 tick 的 isNight(bug),该 tick 会用白昼半径 → 可见格数与白昼世界相同。
function visibleCells(team: Team, startTime: number): number {
  const map = new GameMap();
  const w = createWorld(map, { seed: 1, noBuildings: true, startTime });
  spawnHero(w, HEROES[0], team, { x: 7520, y: 7520 });
  for (let i = 0; i < 8; i++) w.step(); // tick 8:首个含英雄的重算
  const grid = w.vision!.grids[team as 0 | 1];
  let n = 0;
  for (let i = 0; i < grid.length; i++) n += grid[i];
  return n;
}

describe('昼夜/视野同 tick(D2)', () => {
  it('夜晚起始 tick 的视野立即收缩(无一 tick 滞后)', () => {
    // 黑夜起点对齐到 tick 8;加微小 epsilon 抵御浮点边界
    const nightStart = DAY_LENGTH - 8 * DT + 0.002;
    const nightCells = visibleCells(Team.Dawn, nightStart);
    const dayCells = visibleCells(Team.Dawn, 0); // 始终白昼作参照
    expect(dayCells).toBeGreaterThan(0);
    expect(nightCells).toBeGreaterThan(0);
    // 夜视半径(800)远小于昼视(1800)→ 夜晚格数应明显更少
    expect(nightCells).toBeLessThan(dayCells * 0.6);
  });
});
