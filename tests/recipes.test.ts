import { describe, it, expect, beforeEach } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { buyItem } from '../src/sim/items';
import { combinedCost, RECIPE_PREFIX } from '../src/sim/recipes';
import { ITEMS, itemDef } from '../src/data/items';
import { REIN } from '../src/data/heroes';
import type { World } from '../src/sim/world';
import type { Unit } from '../src/sim/unit';

const map = new GameMap();

let w: World;
let h: Unit;
beforeEach(() => {
  w = createWorld(map, { seed: 20, startTime: 0 });
  h = spawnHero(w, REIN, Team.Dawn);
  h.heroMeta!.gold = 99999;
});

describe('recipes', () => {
  it('all recipes resolvable and cost = sum of parts', () => {
    for (const def of ITEMS) {
      if (!def.recipe) continue;
      for (const comp of def.recipe.components) {
        expect(() => itemDef(comp), `${def.key} 缺组件 ${comp}`).not.toThrow();
      }
      expect(combinedCost(def), `${def.key} 总价不一致`).toBe(def.cost);
    }
  });

  it('scroll + components auto-combine (bracer)', () => {
    buyItem(w, h, 'gauntlet');
    buyItem(w, h, 'circlet');
    expect(h.inventory.filter(Boolean).length).toBe(2);
    buyItem(w, h, RECIPE_PREFIX + 'bracer');
    // 自动合成
    expect(h.inventory.filter(Boolean).length).toBe(1);
    expect(h.inventory.find((i) => i?.itemKey === 'bracer')).toBeTruthy();
    w.step();
    expect(h.bonusAttr.str).toBeGreaterThanOrEqual(6);
  });

  it('zero-scroll recipe combines when components complete (power_treads)', () => {
    buyItem(w, h, 'boots');
    buyItem(w, h, 'gloves_haste');
    expect(h.inventory.find((i) => i?.itemKey === 'power_treads')).toBeFalsy();
    buyItem(w, h, 'belt');
    expect(h.inventory.find((i) => i?.itemKey === 'power_treads')).toBeTruthy();
    w.step();
    expect(h.calc.moveSpeed).toBeGreaterThan(REIN.baseMs + 55);
  });

  it('scroll without all components stays as scroll', () => {
    buyItem(w, h, RECIPE_PREFIX + 'bracer');
    buyItem(w, h, 'gauntlet');
    expect(h.inventory.find((i) => i?.itemKey === RECIPE_PREFIX + 'bracer')).toBeTruthy();
    expect(h.inventory.find((i) => i?.itemKey === 'bracer')).toBeFalsy();
  });

  it('chained combine works in one purchase pass', () => {
    // 一次性把巨人之心的料买齐(屠戮之刃在秘密商店,先挪过去买)
    const secret = w.map.shops.find((s) => s.team === Team.Dawn && s.secret)!;
    h.pos = w.map.nearestWalkable(secret.pos);
    expect(buyItem(w, h, 'reaver')).toBe('ok');
    expect(buyItem(w, h, 'vitality_booster')).toBe('ok');
    // 回基地买卷轴
    h.pos = w.map.nearestWalkable({ x: 1400, y: 13600 });
    expect(buyItem(w, h, RECIPE_PREFIX + 'heart')).toBe('ok');
    expect(h.inventory.find((i) => i?.itemKey === 'heart')).toBeTruthy();
  });
});
