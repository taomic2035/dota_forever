import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { HEROES } from '../src/data/heroes';
import { makeItem, afterInventoryChange, useItem } from '../src/sim/items';
import { tryLinkenBlock, hasModifier } from '../src/sim/modifiers';

function setup() {
  const w = createWorld(new GameMap(), { seed: 1, noBuildings: true });
  const holder = spawnHero(w, HEROES[0], Team.Dawn, { x: 7520, y: 7520 });
  const enemy = spawnHero(w, HEROES[1], Team.Night, { x: 7600, y: 7520 });
  holder.inventory[0] = makeItem('linken');
  afterInventoryChange(w, holder);
  return { w, holder, enemy };
}

describe('林肯法球格挡(M4)', () => {
  it('格挡敌方一次,随后进入冷却', () => {
    const { w, holder, enemy } = setup();
    expect(tryLinkenBlock(w, holder, enemy.id)).toBe(true); // 首次格挡
    expect(tryLinkenBlock(w, holder, enemy.id)).toBe(false); // 冷却中
  });

  it('冷却结束后再次格挡', () => {
    const { w, holder, enemy } = setup();
    tryLinkenBlock(w, holder, enemy.id);
    const m = holder.modifiers.find((mm) => mm.key === 'item_linken_aura')!;
    m.data!.blockReadyAt = w.time - 1; // 跳过冷却
    expect(tryLinkenBlock(w, holder, enemy.id)).toBe(true);
  });

  it('友方来源不格挡', () => {
    const { w, holder } = setup();
    const ally = spawnHero(w, HEROES[2], Team.Dawn, { x: 7400, y: 7520 });
    expect(tryLinkenBlock(w, holder, ally.id)).toBe(false);
  });

  it('无林肯者不格挡', () => {
    const { w, enemy } = setup();
    const bare = spawnHero(w, HEROES[3], Team.Dawn, { x: 7300, y: 7520 });
    expect(tryLinkenBlock(w, bare, enemy.id)).toBe(false);
  });

  it('敌方妖术法球(单体)被林肯格挡:无 hex 效果但已付蓝/CD', () => {
    const { w, holder, enemy } = setup();
    enemy.inventory[0] = makeItem('hex');
    afterInventoryChange(w, enemy);
    const mp0 = enemy.mp;
    const used = useItem(w, enemy, 0, undefined, holder);
    expect(used).toBe(true); // 物品已使用
    expect(hasModifier(holder, 'item_hex')).toBe(false); // 效果被格挡
    expect(enemy.inventory[0]!.cooldownUntil).toBeGreaterThan(w.time); // CD 已走
    expect(enemy.mp).toBeLessThan(mp0); // 蓝已扣
  });

  it('对无林肯目标妖术正常生效(正常路径未被误伤)', () => {
    const { w, enemy } = setup();
    const victim = spawnHero(w, HEROES[4], Team.Dawn, { x: 7560, y: 7520 });
    enemy.inventory[0] = makeItem('hex');
    afterInventoryChange(w, enemy);
    useItem(w, enemy, 0, undefined, victim);
    expect(hasModifier(victim, 'item_hex')).toBe(true);
  });
});
