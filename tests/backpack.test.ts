import { describe, it, expect, beforeEach } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { buyItem, moveToBackpack, moveFromBackpack, makeItem, itemUseReason } from '../src/sim/items';
import { REIN } from '../src/data/heroes';
import type { World } from '../src/sim/world';
import type { Unit } from '../src/sim/unit';

const map = new GameMap();

let w: World;
let h: Unit;
beforeEach(() => {
  w = createWorld(map, { seed: 31, startTime: 0 });
  h = spawnHero(w, REIN, Team.Dawn); // 泉水旁 → home 商店
  h.heroMeta!.gold = 6000;
});

describe('背包栏(后备栏 3 格)', () => {
  it('主物品栏满 → 购买溢出至背包栏(ok_backpack),不进储藏', () => {
    for (let i = 0; i < 6; i++) expect(buyItem(w, h, 'branch')).toBe('ok');
    expect(buyItem(w, h, 'broadsword')).toBe('ok_backpack');
    expect(h.backpack.some((s) => s?.itemKey === 'broadsword')).toBe(true);
    expect(h.stash.every((s) => s === null)).toBe(true);
  });

  it('背包栏物品不提供加成,移入物品栏后生效', () => {
    w.step();
    const base = h.calc.dmgMin;
    h.backpack[0] = makeItem('broadsword'); // +攻击力
    w.step();
    expect(h.calc.dmgMin).toBe(base); // 背包栏不折算
    expect(moveFromBackpack(w, h, 0)).toBe(true);
    w.step();
    expect(h.calc.dmgMin).toBeGreaterThan(base); // 进物品栏后加成生效
  });

  it('moveToBackpack:腾出物品栏一格,物品转入背包栏', () => {
    buyItem(w, h, 'broadsword');
    expect(moveToBackpack(w, h, 0)).toBe(true);
    expect(h.inventory[0]).toBeNull();
    expect(h.backpack.some((s) => s?.itemKey === 'broadsword')).toBe(true);
  });

  it('从背包栏移入物品栏的物品有 6 秒就绪延迟(延迟内不可用)', () => {
    h.backpack[0] = makeItem('salve'); // 主动消耗品
    expect(moveFromBackpack(w, h, 0)).toBe(true);
    const slot = h.inventory.findIndex((s) => s?.itemKey === 'salve');
    expect(itemUseReason(w, h, slot)).toBe('cooldown'); // 就绪延迟内
    for (let i = 0; i < 6 * 30 + 4; i++) w.step(); // 6 秒后
    expect(itemUseReason(w, h, slot)).toBeNull(); // 可用
  });

  it('物品栏满时无法从背包栏移入(需空格)', () => {
    for (let i = 0; i < 6; i++) h.inventory[i] = makeItem('branch');
    h.backpack[0] = makeItem('broadsword');
    expect(moveFromBackpack(w, h, 0)).toBe(false);
    expect(h.backpack[0]?.itemKey).toBe('broadsword'); // 仍留背包栏
  });

  it('背包栏满时无法移入(需空背包格)', () => {
    for (let i = 0; i < 3; i++) h.backpack[i] = makeItem('branch');
    h.inventory[0] = makeItem('broadsword');
    expect(moveToBackpack(w, h, 0)).toBe(false);
    expect(h.inventory[0]?.itemKey).toBe('broadsword');
  });

  it('回城卷轴永不进背包栏(走专属 TP 槽)', () => {
    for (let i = 0; i < 6; i++) buyItem(w, h, 'branch'); // 物品栏满
    expect(buyItem(w, h, 'tp')).toBe('ok'); // TP 仍进专属槽,非背包
    expect(h.tpSlot?.itemKey).toBe('tp');
    expect(h.backpack.every((s) => s === null)).toBe(true);
  });
});
