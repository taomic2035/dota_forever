import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { installNeutrals } from '../src/sim/neutrals';
import { CAMP_ROSTERS, neutralStats } from '../src/data/neutrals';
import { NEUTRAL_LEASH } from '../src/data/balance';

// D11 回归:野怪被拉出驻留范围后回营,到家必须满血重置。
// 此前以 order?.type==='move' 判定"正在回营",但回程 move 指令到点会被 stepMovement 清空,
// 导致到家时 returning=false → 满血重置被漏掉。改用显式 leashing 标记。
describe('野怪 leash 回营满血重置(D11)', () => {
  it('被拉出 leash 后回营 → 满血、解除回营态、闲置', () => {
    const map = new GameMap();
    const w = createWorld(map, { seed: 1, noBuildings: true }); // 不装 neutrals
    installNeutrals(w);
    const home = { x: 7520, y: 7520 };
    expect(map.isWalkable(home)).toBe(true);
    // 在 home 周围找一个可行走、且距离 > leash 的出生点(避免落在树/悬崖)
    let start: { x: number; y: number } | null = null;
    const R = NEUTRAL_LEASH + 120;
    for (let k = 0; k < 24 && !start; k++) {
      const a = (k / 24) * Math.PI * 2;
      const p = { x: home.x + Math.cos(a) * R, y: home.y + Math.sin(a) * R };
      if (map.isWalkable(p)) start = p;
    }
    expect(start).not.toBeNull();

    const spec = CAMP_ROSTERS.small[0];
    const n = w.spawnUnit({ kind: 'neutral', team: Team.Neutral, pos: { ...start! }, name: spec.name, stats: neutralStats(spec) });
    n.homePos = { ...home };
    n.hp = 1;

    for (let i = 0; i < 1500; i++) w.step(); // 充足时间回营(time 仍 < 0,不触发野区刷新)

    expect(n.alive).toBe(true);
    expect(Math.hypot(n.pos.x - home.x, n.pos.y - home.y)).toBeLessThan(200);
    expect(n.hp).toBe(n.calc.maxHp); // 满血重置(仅 leash 回营会做)
    expect(n.leashing).toBe(false);
    expect(n.order).toBeNull();
  });

  it('已到家且回程指令已自然结束(order=null)仍满血重置', () => {
    // 直击 bug:回程 move 指令到点后被清空,旧逻辑以 order 类型判定 → 漏掉满血重置。
    const map = new GameMap();
    const w = createWorld(map, { seed: 1, noBuildings: true });
    installNeutrals(w);
    const home = { x: 7520, y: 7520 };
    const spec = CAMP_ROSTERS.small[0];
    const n = w.spawnUnit({ kind: 'neutral', team: Team.Neutral, pos: { ...home }, name: spec.name, stats: neutralStats(spec) });
    n.homePos = { ...home };
    n.hp = 1;
    n.leashing = true; // 处于回营态
    n.order = null; // 回程指令已自然结束
    for (let i = 0; i < 16; i++) w.step(); // 跨过一次 leash 检查(每 15 tick)
    expect(n.hp).toBe(n.calc.maxHp);
    expect(n.leashing).toBe(false);
  });
});
