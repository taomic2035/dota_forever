/**
 * 物品内容完整性(商用级守卫):校验全部物品结构 + 合成树一致性——
 * key 唯一、类别合法、成本非负、recipe 组件均存在(无悬空引用)、
 * 合成件成本 = 组件成本之和 + 卷轴价(经济自洽)。
 */
import { describe, it, expect } from 'vitest';
import { ITEMS } from '../src/data/items';

const CATEGORIES = ['consumable', 'attribute', 'weapon', 'armor', 'arcane', 'combined'];

describe('物品内容完整性', () => {
  const byKey = new Map(ITEMS.map((i) => [i.key, i]));

  it('key 全局唯一,基本字段合理', () => {
    const keys = ITEMS.map((i) => i.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const it of ITEMS) {
      expect(it.key, it.key).toBeTruthy();
      expect(it.name, it.key).toBeTruthy();
      expect(CATEGORIES, it.key).toContain(it.category);
      expect(it.cost, it.key).toBeGreaterThanOrEqual(0);
    }
  });

  it('合成配方组件均存在(无悬空引用)', () => {
    for (const it of ITEMS) {
      if (!it.recipe) continue;
      expect(Array.isArray(it.recipe.components), it.key).toBe(true);
      expect(it.recipe.components.length, it.key).toBeGreaterThan(0);
      for (const c of it.recipe.components) {
        expect(byKey.has(c), `${it.key} 组件 ${c} 不存在`).toBe(true);
      }
      expect(it.recipe.recipeCost, it.key).toBeGreaterThanOrEqual(0);
    }
  });

  it('合成件成本 = 组件成本之和 + 卷轴价(经济自洽)', () => {
    for (const it of ITEMS) {
      if (!it.recipe) continue;
      const sum = it.recipe.components.reduce((s, c) => s + (byKey.get(c)?.cost ?? 0), 0) + it.recipe.recipeCost;
      expect(it.cost, `${it.key} 成本应=组件和(${sum})`).toBe(sum);
    }
  });
});
