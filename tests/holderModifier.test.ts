import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { HEROES } from '../src/data/heroes';
import { makeItem, afterInventoryChange } from '../src/sim/items';

// D1 回归:无光环的 holderModifier(林肯法球的法术屏障标记)在失去物品后必须移除,
// 否则永久泄漏。此前移除逻辑仅删带 aura 的 holderModifier。
describe('holderModifier 失去物品即移除(D1)', () => {
  it('林肯(无光环 holderModifier)拿到→挂载,丢弃→移除', () => {
    const w = createWorld(new GameMap(), { seed: 1, noBuildings: true });
    const hero = spawnHero(w, HEROES[0], Team.Dawn, { x: 7520, y: 7520 });

    hero.inventory[0] = makeItem('linken');
    afterInventoryChange(w, hero);
    expect(hero.modifiers.some((m) => m.key === 'item_linken_aura')).toBe(true);

    hero.inventory[0] = null;
    afterInventoryChange(w, hero);
    expect(hero.modifiers.some((m) => m.key === 'item_linken_aura')).toBe(false);
  });

  it('带光环的 holderModifier(辉光)同样在丢弃后移除', () => {
    const w = createWorld(new GameMap(), { seed: 1, noBuildings: true });
    const hero = spawnHero(w, HEROES[0], Team.Dawn, { x: 7520, y: 7520 });
    hero.inventory[0] = makeItem('radiance');
    afterInventoryChange(w, hero);
    expect(hero.modifiers.some((m) => m.key === 'item_radiance_aura')).toBe(true);
    hero.inventory[0] = null;
    afterInventoryChange(w, hero);
    expect(hero.modifiers.some((m) => m.key === 'item_radiance_aura')).toBe(false);
  });
});
