import { describe, it, expect, beforeEach } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { buyItem, useItem, makeItem, syncHolderModifiers } from '../src/sim/items';
import { learnAbility } from '../src/sim/abilities';
import { applyDamage } from '../src/sim/combat';
import { applyModifier, hasModifier } from '../src/sim/modifiers';
import { REIN, LIYA } from '../src/data/heroes';
import { V } from '../src/core/vec2';
import type { World } from '../src/sim/world';
import type { Unit } from '../src/sim/unit';

const map = new GameMap();

let w: World;
let h: Unit;
beforeEach(() => {
  w = createWorld(map, { seed: 21, startTime: 0 });
  h = spawnHero(w, REIN, Team.Dawn);
  h.heroMeta!.gold = 99999;
});

/** 直接塞物品(绕过商店范围)。 */
function give(u: Unit, key: string): number {
  const slot = u.inventory.findIndex((s) => s === null);
  u.inventory[slot] = makeItem(key);
  syncHolderModifiers(w, u);
  return slot;
}

describe('advanced items', () => {
  it('magic wand charges on enemy casts and restores on use', () => {
    const slot = give(h, 'magic_wand');
    h.pos = w.map.nearestWalkable({ x: 5790, y: 9530 });
    const enemy = spawnHero(w, LIYA, Team.Night, w.map.nearestWalkable({ x: 6200, y: 9100 }));
    learnAbility(w, enemy, 0);
    enemy.mp = 999;
    enemy.issueOrder({ type: 'cast', abilityIndex: 0, pos: V.clone(enemy.pos) });
    for (let i = 0; i < 40; i++) w.step();
    const inst = h.inventory[slot]!;
    expect(inst.charges).toBeGreaterThanOrEqual(1);
    h.hp = 100;
    const before = h.hp;
    expect(useItem(w, h, slot)).toBe(true);
    expect(h.hp).toBeGreaterThanOrEqual(before + 15 - 1);
    expect(h.inventory[slot]).not.toBeNull(); // 可再充能,不消失
    expect(h.inventory[slot]!.charges).toBe(0);
  });

  it('blink teleports and is locked after hero damage', () => {
    const slot = give(h, 'blink');
    h.pos = w.map.nearestWalkable({ x: 5790, y: 9530 });
    const from = V.clone(h.pos);
    expect(useItem(w, h, slot, { x: from.x + 800, y: from.y - 800 })).toBe(true);
    expect(V.dist(h.pos, from)).toBeGreaterThan(700);
    // 受到敌方英雄伤害 → 锁定(伤害源放远,避免持续自动攻击刷新锁定)
    const enemy = spawnHero(w, LIYA, Team.Night, w.map.nearestWalkable({ x: 12000, y: 3000 }));
    applyDamage(w, h, { source: enemy.id, attackType: 'hero', amount: 10 });
    h.inventory[slot]!.cooldownUntil = -Infinity; // 排除冷却因素
    expect(useItem(w, h, slot, { x: h.pos.x + 500, y: h.pos.y })).toBe(false);
    for (let i = 0; i < 30 * 4; i++) w.step(); // 4 秒后解锁
    expect(useItem(w, h, slot, { x: h.pos.x + 500, y: h.pos.y })).toBe(true);
  });

  it('bkb grants magic immunity and purges debuffs', () => {
    const slot = give(h, 'bkb');
    applyModifier(w, h, { key: 'test_slow', duration: 10, stats: { bonusMoveSpeedPct: -0.4 } }, 0);
    expect(useItem(w, h, slot)).toBe(true);
    expect(hasModifier(h, 'test_slow')).toBe(false); // 被驱散
    const dealt = applyDamage(w, h, { source: 0, attackType: 'spell', amount: 300, flags: { spell: true } });
    expect(dealt).toBe(0); // 魔免
    // 物理仍然有效
    const phys = applyDamage(w, h, { source: 0, attackType: 'hero', amount: 50 });
    expect(phys).toBeGreaterThan(0);
  });

  it('radiance burns nearby enemies over time', () => {
    give(h, 'radiance');
    h.pos = w.map.nearestWalkable({ x: 5790, y: 9530 });
    const enemy = spawnHero(w, LIYA, Team.Night, w.map.nearestWalkable({ x: h.pos.x + 400, y: h.pos.y }));
    enemy.issueOrder({ type: 'hold' });
    const hp0 = enemy.hp;
    for (let i = 0; i < 90; i++) w.step(); // 3 秒 ≈ 105 × 0.75 魔抗
    expect(hp0 - enemy.hp).toBeGreaterThan(50);
  });

  it('assault aura grants attack speed to nearby allies', () => {
    give(h, 'assault');
    const ally = spawnHero(w, LIYA, Team.Dawn, w.map.nearestWalkable({ x: h.pos.x + 300, y: h.pos.y }));
    for (let i = 0; i < 30; i++) w.step();
    expect(hasModifier(ally, 'item_assault_buff')).toBe(true);
    expect(ally.calc.ias).toBeGreaterThanOrEqual(0.15);
  });
});
