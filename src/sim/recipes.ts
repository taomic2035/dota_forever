/**
 * 合成系统:购买合成件 = 购入配方卷轴;卷轴 + 全部组件齐于背包 → 自动合成。
 * recipeCost 为 0 的配方无卷轴,组件齐即合成。
 */
import { ITEMS, ITEM_BY_KEY, itemDef, type ItemDef } from '../data/items';
import type { World } from './world';
import type { Unit } from './unit';
import { makeItem, inventoryHooks, afterInventoryChange } from './items';

export const RECIPE_PREFIX = 'recipe_';

/** 注册配方卷轴伪物品(模块加载时执行一次)。 */
export function registerRecipeScrolls(): void {
  for (const def of [...ITEMS]) {
    if (!def.recipe || def.recipe.recipeCost <= 0) continue;
    const scrollKey = RECIPE_PREFIX + def.key;
    if (ITEM_BY_KEY.has(scrollKey)) continue;
    const scroll: ItemDef = {
      key: scrollKey,
      name: `卷轴:${def.name}`,
      cost: def.recipe.recipeCost,
      category: 'combined',
      description: `${def.name} 的合成卷轴。`,
    };
    ITEMS.push(scroll);
    ITEM_BY_KEY.set(scrollKey, scroll);
  }
}
registerRecipeScrolls();

/** 合成件总价 = 组件价格和 + 卷轴价(数据一致性由测试保证)。 */
export function combinedCost(def: ItemDef): number {
  if (!def.recipe) return def.cost;
  return def.recipe.components.reduce((s, c) => s + itemDef(c).cost, 0) + def.recipe.recipeCost;
}

/** 尝试合成(循环至无变化)。 */
export function tryCombine(w: World, hero: Unit): void {
  let changed = true;
  let guard = 8;
  while (changed && guard-- > 0) {
    changed = false;
    for (const def of ITEMS) {
      if (!def.recipe) continue;
      const needScroll = def.recipe.recipeCost > 0;
      const slots: number[] = [];
      if (needScroll) {
        const s = hero.inventory.findIndex((i) => i?.itemKey === RECIPE_PREFIX + def.key);
        if (s < 0) continue;
        slots.push(s);
      }
      let ok = true;
      for (const comp of def.recipe.components) {
        const s = hero.inventory.findIndex(
          (i, idx) => i?.itemKey === comp && !slots.includes(idx),
        );
        if (s < 0) { ok = false; break; }
        slots.push(s);
      }
      if (!ok) continue;
      // 合成:清空所用槽位,放入成品
      for (const s of slots) hero.inventory[s] = null;
      hero.inventory[slots[0]] = makeItem(def.key);
      w.emit({ kind: 'fx', fx: 'combine', pos: { x: hero.pos.x, y: hero.pos.y } });
      changed = true;
    }
  }
}

let installed = false;
export function installRecipes(): void {
  if (installed) return;
  installed = true;
  inventoryHooks.push((w, hero) => {
    // 防递归:tryCombine 内部不再触发 afterInventoryChange
    tryCombine(w, hero);
  });
}
installRecipes();

/** 购买映射:买合成件(有卷轴价)= 买它的卷轴。 */
export function purchaseKeyFor(key: string): string {
  const def = itemDef(key);
  if (def.recipe && def.recipe.recipeCost > 0) return RECIPE_PREFIX + key;
  if (def.recipe && def.recipe.recipeCost === 0) return key; // 无卷轴配方:直接由组件合成,购买本体无意义
  return key;
}

export { afterInventoryChange };
