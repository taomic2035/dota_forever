import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { makeItem } from '../src/sim/items';
import { requestCourierDelivery } from '../src/sim/courier';
import { REIN } from '../src/data/heroes';

const map = new GameMap();

describe('信使 courier', () => {
  it('每队各生成一只信使', () => {
    const w = createWorld(map, { seed: 3, startTime: 0 });
    const couriers = [...w.units.values()].filter((u) => u.kind === 'courier');
    expect(couriers.length).toBe(2);
    expect(couriers.some((c) => c.team === Team.Dawn)).toBe(true);
    expect(couriers.some((c) => c.team === Team.Night)).toBe(true);
  });

  it('把远离泉水英雄的储藏物品送达其物品栏', () => {
    const w = createWorld(map, { seed: 3, startTime: 0 });
    const hero = spawnHero(w, REIN, Team.Dawn, w.map.nearestWalkable({ x: 7520, y: 7520 })); // 中路,远离泉水
    hero.stash[0] = makeItem('broadsword');
    hero.stash[1] = makeItem('branch');
    const before = hero.inventory.filter((i) => i).length;
    for (let i = 0; i < 30 * 90 && hero.stash.some((s) => s); i++) w.step(); // 信使从泉水飞到中路送达
    expect(hero.stash.every((s) => s === null)).toBe(true);
    expect(hero.inventory.filter((i) => i).length).toBeGreaterThan(before);
  });

  it('allows the player to manually dispatch the courier for nearby stash items', () => {
    const w = createWorld(map, { seed: 3, startTime: 0 });
    const fountain = [...w.units.values()].find((u) => u.kind === 'building' && u.team === Team.Dawn && u.buildingKind === 'fountain')!;
    const hero = spawnHero(w, REIN, Team.Dawn, w.map.nearestWalkable({ x: fountain.pos.x + 120, y: fountain.pos.y + 120 }));
    hero.stash[0] = makeItem('branch');

    expect(requestCourierDelivery(w, hero)).toBe('ok');
    for (let i = 0; i < 10 && hero.stash.some(Boolean); i++) w.step();

    expect(hero.stash.every((s) => s === null)).toBe(true);
    expect(hero.inventory.some((item) => item?.itemKey === 'branch')).toBe(true);
  });

  it('信使可被击杀并在泉水重生', () => {
    const w = createWorld(map, { seed: 3, startTime: 0 });
    const courier = [...w.units.values()].find((u) => u.kind === 'courier' && u.team === Team.Dawn)!;
    courier.hp = 0; courier.alive = false; // 模拟被击杀
    w.emit({ kind: 'unit_died', unitId: courier.id, killerId: 0, pos: courier.pos });
    // 重生延迟(35s)后应有新信使
    for (let i = 0; i < 30 * 40; i++) w.step();
    const couriers = [...w.units.values()].filter((u) => u.kind === 'courier' && u.team === Team.Dawn && u.alive);
    expect(couriers.length).toBe(1);
  });
});
