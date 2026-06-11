import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { applyDamage } from '../src/sim/combat';
import { V } from '../src/core/vec2';

const map = new GameMap();

describe('creep waves', () => {
  it('first wave spawns 4 creeps per lane per team at 1:30', () => {
    const w = createWorld(map, { seed: 1, creeps: true, startTime: 88 });
    for (let i = 0; i < 90; i++) w.step(); // 88s → 91s
    const creeps = [...w.units.values()].filter((u) => u.kind === 'creep');
    expect(creeps.length).toBe(24); // 2队 × 3路 × (3近+1远)
    const dawnMid = creeps.filter((u) => u.team === Team.Dawn && u.lane === 'mid');
    expect(dawnMid.length).toBe(4);
  });

  it('every 7th wave includes a siege engine', () => {
    const w = createWorld(map, { seed: 1, creeps: true, startTime: 88 + 5 * 30 }); // 跳到第6波前
    // 第6波 t=240,第7波 t=270
    let sieges = 0;
    for (let i = 0; i < 30 * 40 && sieges === 0; i++) {
      w.step();
      sieges = [...w.units.values()].filter((u) => u.name.includes('投石车')).length;
    }
    expect(sieges).toBeGreaterThanOrEqual(6); // 双方三路各一辆
  });

  it('creeps march toward enemy base', () => {
    const w = createWorld(map, { seed: 1, creeps: true, startTime: 88 });
    for (let i = 0; i < 90; i++) w.step();
    const dawnMid = [...w.units.values()].find((u) => u.kind === 'creep' && u.team === Team.Dawn && u.lane === 'mid')!;
    const startDist = V.dist(dawnMid.pos, { x: 13140, y: 1900 });
    for (let i = 0; i < 300; i++) w.step(); // 10 秒
    const endDist = V.dist(dawnMid.pos, { x: 13140, y: 1900 });
    expect(endDist).toBeLessThan(startDist - 1500);
  });

  it('lanes clash and creeps die in the middle', () => {
    const w = createWorld(map, { seed: 1, creeps: true, startTime: 88 });
    // 跑 100 秒:两波兵相遇交战
    for (let i = 0; i < 30 * 100; i++) w.step();
    const deaths = [...w.units.values()].filter((u) => u.kind === 'creep' && !u.alive).length;
    const aliveCreeps = [...w.units.values()].filter((u) => u.kind === 'creep' && u.alive).length;
    // 已刷 4 波 × 24 = 96;交战必有死亡(尸体 2.5s 清理,看总数缺口)
    expect(aliveCreeps).toBeLessThan(96 - 10);
    expect(aliveCreeps).toBeGreaterThan(20);
    void deaths;
  }, 30000); // 重型仿真(3000 步):并行 CPU 争用下放宽超时,避免偶发超时误判

  it('destroying enemy melee rax spawns super melee creeps on that lane', () => {
    const w = createWorld(map, { seed: 1, creeps: true, startTime: 80 });
    // 拆掉永夜中路近战兵营
    const rax = [...w.units.values()].find(
      (u) => u.team === Team.Night && u.buildingKind === 'rax_melee' && u.lane === 'mid',
    )!;
    applyDamage(w, rax, { source: 0, attackType: 'hero', amount: 1e6, flags: { pure: true } });
    expect(rax.alive).toBe(false);
    for (let i = 0; i < 30 * 15; i++) w.step(); // 到 95s,首波已出
    const superMelee = [...w.units.values()].filter(
      (u) => u.kind === 'creep' && u.team === Team.Dawn && u.lane === 'mid' && u.name.startsWith('超级') && u.name.includes('战士'),
    );
    expect(superMelee.length).toBe(3);
    // 其他路不受影响
    const topMelee = [...w.units.values()].filter(
      (u) => u.kind === 'creep' && u.team === Team.Dawn && u.lane === 'top' && u.name.startsWith('超级'),
    );
    expect(topMelee.length).toBe(0);
  });
});
