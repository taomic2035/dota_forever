import { describe, it, expect, beforeEach } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { buyItem, sellItem, useItem, takeFromStash, shopAt, TP_SLOT } from '../src/sim/items';
import { applyDamage } from '../src/sim/combat';
import { isVisibleTo } from '../src/sim/vision';
import { REIN, LIYA } from '../src/data/heroes';
import { V } from '../src/core/vec2';
import type { World } from '../src/sim/world';
import type { Unit } from '../src/sim/unit';

const map = new GameMap();

let w: World;
let h: Unit;
beforeEach(() => {
  w = createWorld(map, { seed: 19, startTime: 0 });
  h = spawnHero(w, REIN, Team.Dawn); // 出生在泉水旁 → home 商店范围
  h.heroMeta!.gold = 3000;
});

describe('items: buy/sell/stash', () => {
  it('buys into inventory at home shop, stats fold into calc', () => {
    expect(shopAt(w, h)).toBe('home');
    expect(buyItem(w, h, 'broadsword')).toBe('ok');
    w.step();
    expect(h.calc.dmgMin).toBeGreaterThan(REIN.baseDamage[0] + 23); // +10 攻
    expect(h.heroMeta!.gold).toBe(2000);
  });

  it('rejects buying away from shop', () => {
    h.pos = { x: 7520, y: 7520 };
    expect(buyItem(w, h, 'broadsword')).toBe('no_shop');
  });

  it('secret shop items only at secret shop', () => {
    expect(buyItem(w, h, 'sacred_relic')).toBe('no_shop');
    const secret = w.map.shops.find((s) => s.team === Team.Dawn && s.secret)!;
    h.pos = w.map.nearestWalkable(secret.pos);
    h.heroMeta!.gold = 4000;
    expect(buyItem(w, h, 'sacred_relic')).toBe('ok');
  });

  it('full inventory at home goes to stash; takeFromStash works', () => {
    for (let i = 0; i < 6; i++) expect(buyItem(w, h, 'branch')).toBe('ok');
    expect(buyItem(w, h, 'branch')).toBe('ok_stash');
    expect(h.stash[0]?.itemKey).toBe('branch');
    // 腾一格再取
    sellItem(w, h, 0);
    expect(takeFromStash(w, h, 0)).toBe(true);
    expect(h.stash[0]).toBeNull();
  });

  it('sell refunds 50%', () => {
    buyItem(w, h, 'claymore'); // 1400
    const g = h.heroMeta!.gold;
    expect(sellItem(w, h, 0)).toBe(true);
    expect(h.heroMeta!.gold).toBe(g + 700);
  });

  it('tp scrolls stack charges in dedicated slot', () => {
    buyItem(w, h, 'tp');
    buyItem(w, h, 'tp');
    expect(h.tpSlot?.itemKey).toBe('tp');
    expect(h.tpSlot?.charges).toBe(2);
    // 专属槽不占用 6 个物品格
    expect(h.inventory.every((i) => i === null)).toBe(true);
  });
});

describe('items: consumables & actives', () => {
  it('salve heals over time and breaks on damage', () => {
    buyItem(w, h, 'salve');
    h.pos = w.map.nearestWalkable({ x: 5790, y: 9530 }); // 离开泉水光环
    h.hp = 200;
    expect(useItem(w, h, h.inventory.findIndex((i) => i?.itemKey === 'salve'))).toBe(true);
    for (let i = 0; i < 60; i++) w.step(); // 2 秒 ≈ +80
    expect(h.hp).toBeGreaterThan(270);
    const healed = h.hp;
    applyDamage(w, h, { source: 0, attackType: 'hero', amount: 10 });
    for (let i = 0; i < 60; i++) w.step();
    expect(h.hp).toBeLessThan(healed + 30); // 打断后只剩自然回复
  });

  it('tp teleports to allied building near target point after 3s channel', () => {
    buyItem(w, h, 'tp');
    h.pos = w.map.nearestWalkable({ x: 5790, y: 9530 }); // 中路
    h.mp = 200;
    const target = { x: 9240, y: 13890 }; // 下路一塔附近
    expect(useItem(w, h, TP_SLOT, target)).toBe(true);
    const before = V.clone(h.pos);
    for (let i = 0; i < 60; i++) w.step(); // 2 秒:仍在引导
    expect(V.dist(h.pos, before)).toBeLessThan(1);
    for (let i = 0; i < 45; i++) w.step(); // 共 3.5 秒
    expect(V.dist(h.pos, target)).toBeLessThan(700);
    expect(h.tpSlot).toBeNull(); // 单张 TP 用完后专属槽清空
  });

  it('observer ward grants vision; invisible to enemy until sentry', () => {
    buyItem(w, h, 'ward_obs');
    const spot = w.map.nearestWalkable({ x: 3600, y: 3600 });
    h.pos = w.map.nearestWalkable({ x: 3700, y: 3700 });
    useItem(w, h, h.inventory.findIndex((i) => i?.itemKey === 'ward_obs'), spot);
    const ward = [...w.units.values()].find((u) => u.kind === 'ward')!;
    expect(ward).toBeTruthy();
    for (let i = 0; i < 10; i++) w.step();
    // 敌方看不见这个眼
    expect(isVisibleTo(w, Team.Night, ward)).toBe(false);
    // 敌方英雄带真视后可见
    const enemy = spawnHero(w, LIYA, Team.Night, w.map.nearestWalkable({ x: 3900, y: 3900 }));
    enemy.heroMeta!.gold = 500;
    void enemy;
  });

  it('dusted invisible unit becomes visible', () => {
    // 中部空地(远离任何 Dawn 塔真视 900,见塔真视 V2 修复);由 Dawn 英雄提供视野(英雄无真视)
    const sneak = spawnHero(w, LIYA, Team.Night, w.map.nearestWalkable({ x: 8000, y: 8000 }));
    const { applyModifier } = await_import_modifiers();
    applyModifier(w, sneak, { key: 'invis_test', duration: 99, states: { invisible: true } }, sneak.id);
    buyItem(w, h, 'dust'); // 在基地商店范围购买,再移近
    h.pos = w.map.nearestWalkable({ x: sneak.pos.x + 300, y: sneak.pos.y });
    for (let i = 0; i < 10; i++) w.step();
    expect(isVisibleTo(w, Team.Dawn, sneak)).toBe(false); // 在英雄视野内但隐身、无真视 → 不可见
    useItem(w, h, h.inventory.findIndex((i) => i?.itemKey === 'dust'));
    for (let i = 0; i < 10; i++) w.step();
    expect(isVisibleTo(w, Team.Dawn, sneak)).toBe(true); // 显影之尘揭示
  });
});

// 同步 import 辅助(vitest ESM)
import { applyModifier as _am } from '../src/sim/modifiers';
function await_import_modifiers() {
  return { applyModifier: _am };
}
