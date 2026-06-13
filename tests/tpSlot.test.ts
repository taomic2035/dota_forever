import { describe, it, expect, beforeEach } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { buyItem, sellItem, useItem, takeFromStash, makeItem, itemInSlot, TP_SLOT } from '../src/sim/items';
import { REIN } from '../src/data/heroes';
import type { World } from '../src/sim/world';
import type { Unit } from '../src/sim/unit';

const map = new GameMap();

let w: World;
let h: Unit;
beforeEach(() => {
  w = createWorld(map, { seed: 23, startTime: 0 });
  h = spawnHero(w, REIN, Team.Dawn); // 泉水旁 → home 商店
  h.heroMeta!.gold = 5000;
});

describe('专属回城卷轴槽(TP slot)', () => {
  it('购买 TP 进专属槽,不占 6 个物品格', () => {
    expect(buyItem(w, h, 'tp')).toBe('ok');
    expect(h.tpSlot?.itemKey).toBe('tp');
    expect(h.inventory.every((s) => s === null)).toBe(true);
  });

  it('itemInSlot(TP_SLOT) 返回专属槽物品,0–5 仍读物品栏', () => {
    buyItem(w, h, 'tp');
    buyItem(w, h, 'broadsword');
    expect(itemInSlot(h, TP_SLOT)?.itemKey).toBe('tp');
    expect(itemInSlot(h, 0)?.itemKey).toBe('broadsword');
    expect(itemInSlot(h, 1)).toBeNull();
  });

  it('6 件普通物品 + 1 张 TP 可同时携带(TP 不抢格子)', () => {
    for (let i = 0; i < 6; i++) expect(buyItem(w, h, 'branch')).toBe('ok');
    expect(buyItem(w, h, 'tp')).toBe('ok'); // 物品栏已满仍可买 TP
    expect(h.inventory.filter((s) => s !== null).length).toBe(6);
    expect(h.tpSlot?.itemKey).toBe('tp');
  });

  it('多张 TP 在专属槽内叠加充能', () => {
    buyItem(w, h, 'tp');
    buyItem(w, h, 'tp');
    buyItem(w, h, 'tp');
    expect(h.tpSlot?.charges).toBe(3);
  });

  it('从专属槽使用 TP:起手引导且消耗一层', () => {
    buyItem(w, h, 'tp');
    buyItem(w, h, 'tp'); // 2 层
    h.pos = w.map.nearestWalkable({ x: 5790, y: 9530 });
    h.mp = 200;
    expect(useItem(w, h, TP_SLOT, { x: 9240, y: 13890 })).toBe(true);
    expect(h.tpSlot?.charges).toBe(1); // 用掉一层,仍留一张
  });

  it('从专属槽出售 TP:返还金币并清空', () => {
    buyItem(w, h, 'tp');
    const g = h.heroMeta!.gold;
    expect(sellItem(w, h, TP_SLOT)).toBe(true);
    expect(h.tpSlot).toBeNull();
    expect(h.heroMeta!.gold).toBeGreaterThan(g);
  });

  it('储藏中的 TP 取出时归位专属槽(而非占物品格)', () => {
    h.stash[0] = makeItem('tp');
    expect(takeFromStash(w, h, 0)).toBe(true);
    expect(h.tpSlot?.itemKey).toBe('tp');
    expect(h.stash[0]).toBeNull();
    expect(h.inventory.every((s) => s === null)).toBe(true);
  });

  it('普通物品永不进专属槽', () => {
    buyItem(w, h, 'broadsword');
    expect(h.tpSlot).toBeNull();
    expect(h.inventory[0]?.itemKey).toBe('broadsword');
  });
});
