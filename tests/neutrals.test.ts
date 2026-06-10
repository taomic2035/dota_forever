import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { applyDamage } from '../src/sim/combat';
import { CAMP_ROSTERS } from '../src/data/neutrals';
import { REIN } from '../src/data/heroes';
import { V } from '../src/core/vec2';

const map = new GameMap();

describe('neutral camps', () => {
  it('all camps spawn at 0:30', () => {
    const w = createWorld(map, { seed: 24, creeps: true, startTime: 25 });
    for (let i = 0; i < 30 * 8; i++) w.step(); // 到 0:33
    const neutrals = [...w.units.values()].filter((u) => u.kind === 'neutral' && u.alive);
    const expected = map.camps.reduce((s, c) => s + CAMP_ROSTERS[c.tier].length, 0);
    expect(neutrals.length).toBe(expected); // 10 营地 × 3 = 30
  });

  it('cleared camp respawns at next minute; occupied camp does not', () => {
    const w = createWorld(map, { seed: 24, creeps: true, startTime: 25 });
    for (let i = 0; i < 30 * 8; i++) w.step();
    const camp = map.camps.find((c) => c.side === Team.Dawn && c.tier === 'small')!;
    // 清掉这个营地
    for (const u of [...w.units.values()]) {
      if (u.campId === camp.id) applyDamage(w, u, { source: 0, attackType: 'hero', amount: 1e6, flags: { pure: true } });
    }
    // 站一个英雄占着 → 不刷
    const squatter = spawnHero(w, REIN, Team.Dawn, w.map.nearestWalkable(camp.pos));
    while (w.time < 95) w.step(); // 过 1:00 检查点
    expect([...w.units.values()].filter((u) => u.campId === camp.id && u.alive).length).toBe(0);
    // 离开 → 下一分钟刷新
    squatter.pos = w.map.nearestWalkable({ x: 5790, y: 9530 });
    while (w.time < 155) w.step(); // 过 2:00
    expect([...w.units.values()].filter((u) => u.campId === camp.id && u.alive).length).toBe(CAMP_ROSTERS.small.length);
  }, 30000);

  it('neutrals leash back home and reset to full hp', () => {
    const w = createWorld(map, { seed: 24, creeps: true, startTime: 25 });
    for (let i = 0; i < 30 * 8; i++) w.step();
    // 选晨曦小营(7800,12200)的狼,拖到通往中型营的走廊上(可达且 >800)
    const camp = map.camps.find((c) => c.side === Team.Dawn && c.tier === 'small')!;
    const n = [...w.units.values()].find((u) => u.campId === camp.id && u.alive)!;
    n.hp = n.calc.maxHp * 0.4;
    n.pos = w.map.nearestWalkable({ x: 8500, y: 11600 }); // 营地间走廊,距家 ~920
    for (let i = 0; i < 30 * 20; i++) w.step(); // 给足走回家的时间
    expect(V.dist(n.pos, n.homePos!)).toBeLessThan(200);
    expect(n.hp).toBeCloseTo(n.calc.maxHp, 0);
  });

  it('killing neutrals pays gold and xp', () => {
    const w = createWorld(map, { seed: 24, creeps: true, startTime: 25 });
    for (let i = 0; i < 30 * 8; i++) w.step();
    const camp = map.camps.find((c) => c.side === Team.Dawn && c.tier === 'small')!;
    const h = spawnHero(w, REIN, Team.Dawn, w.map.nearestWalkable(V.add(camp.pos, { x: 300, y: 0 })));
    h.base.dmgMin = 500; h.base.dmgMax = 500; // 秒杀野怪
    const gold0 = h.heroMeta!.gold;
    const target = [...w.units.values()].find((u) => u.campId === camp.id && u.alive)!;
    h.issueOrder({ type: 'attack', targetId: target.id });
    for (let i = 0; i < 30 * 10 && target.alive; i++) w.step();
    expect(target.alive).toBe(false);
    expect(h.heroMeta!.gold).toBeGreaterThan(gold0 + 15);
    expect(h.heroMeta!.xp).toBeGreaterThan(20);
  });
});
