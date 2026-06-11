import { describe, it, expect, beforeEach } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { makeItem, useItem, syncHolderModifiers } from '../src/sim/items';
import { hasModifier } from '../src/sim/modifiers';
import { REIN, LIYA } from '../src/data/heroes';
import { V } from '../src/core/vec2';
import type { World } from '../src/sim/world';
import type { Unit } from '../src/sim/unit';

const map = new GameMap();

let w: World;
let h: Unit;
beforeEach(() => {
  w = createWorld(map, { seed: 71, startTime: 0 });
  h = spawnHero(w, REIN, Team.Dawn, w.map.nearestWalkable({ x: 6000, y: 9000 }));
  h.heroMeta!.gold = 99999;
});

function give(u: Unit, key: string): number {
  const slot = u.inventory.findIndex((s) => s === null);
  u.inventory[slot] = makeItem(key);
  syncHolderModifiers(w, u);
  return slot;
}
function run(n: number) { for (let i = 0; i < n; i++) w.step(); }

describe('advanced items batch 2', () => {
  it('黯灭:攻击使目标减甲', () => {
    give(h, 'desolator');
    const t = w.spawnUnit({ kind: 'hero', team: Team.Night, pos: { x: 6150, y: 9000 }, name: 't',
      stats: { ...REIN_STATS() } });
    h.issueOrder({ type: 'attack', targetId: t.id });
    run(40);
    expect(hasModifier(t, 'item_desolator_armor')).toBe(true);
  });

  it('风暴之锤:攻击概率触发连锁闪电(多次攻击必中)', () => {
    give(h, 'maelstrom');
    const t = w.spawnUnit({ kind: 'hero', team: Team.Night, pos: { x: 6150, y: 9000 }, name: 't',
      stats: { ...REIN_STATS(), maxHp: 100000, magicResist: 0 } });
    const near = w.spawnUnit({ kind: 'hero', team: Team.Night, pos: { x: 6300, y: 9050 }, name: 'n',
      stats: { ...REIN_STATS(), maxHp: 100000, magicResist: 0 } });
    h.issueOrder({ type: 'attack', targetId: t.id });
    run(30 * 12); // 12 秒多次攻击,30% 概率应触发过
    // 连锁会溅到附近的 near
    expect(near.hp).toBeLessThan(100000);
  });

  it('原力法杖:推动目标', () => {
    const slot = give(h, 'force_staff');
    const t = w.spawnUnit({ kind: 'hero', team: Team.Night, pos: { x: 6400, y: 9000 }, name: 't',
      stats: { ...REIN_STATS() } });
    t.facing = 0; // 朝 +x
    const x0 = t.pos.x;
    useItem(w, h, slot, undefined, t);
    run(5);
    expect(t.pos.x).toBeGreaterThan(x0 + 300);
  });

  it('挽紧之杖:缠绕敌方', () => {
    const slot = give(h, 'atos');
    h.mp = 200;
    const t = w.spawnUnit({ kind: 'hero', team: Team.Night, pos: { x: 6500, y: 9000 }, name: 't',
      stats: { ...REIN_STATS() } });
    useItem(w, h, slot, undefined, t);
    run(5);
    expect(hasModifier(t, 'item_atos_root')).toBe(true);
  });

  it('影锋:主动隐身', () => {
    const slot = give(h, 'shadow_blade');
    useItem(w, h, slot);
    run(5);
    expect(hasModifier(h, 'item_shadowblade')).toBe(true);
  });

  it('亡者之书:召唤两个随从', () => {
    const slot = give(h, 'necronomicon');
    h.mp = 200;
    useItem(w, h, slot);
    run(10);
    const minions = [...w.units.values()].filter((u) => u.name === '亡者随从' && u.alive);
    expect(minions.length).toBe(2);
  });

  it('勇气勋章:对敌减甲', () => {
    const slot = give(h, 'medallion');
    const t = w.spawnUnit({ kind: 'hero', team: Team.Night, pos: { x: 6400, y: 9000 }, name: 't',
      stats: { ...REIN_STATS() } });
    w.step();
    const armor0 = t.calc.armor;
    useItem(w, h, slot, undefined, t);
    run(3);
    expect(t.calc.armor).toBeLessThan(armor0);
  });

  it('纷争面纱:沉默目标', () => {
    const slot = give(h, 'orchid');
    const t = spawnHero(w, LIYA, Team.Night, w.map.nearestWalkable({ x: 6500, y: 9000 }));
    useItem(w, h, slot, undefined, t);
    run(3);
    expect(hasModifier(t, 'item_orchid_silence')).toBe(true);
  });
});

function REIN_STATS() {
  return {
    maxHp: 2000, hpRegen: 0, maxMp: 300, mpRegen: 0, dmgMin: 0, dmgMax: 0,
    attackType: 'hero' as const, armorType: 'hero' as const, armor: 3, magicResist: 0.25,
    attackRange: 150, attackPoint: 0.3, bat: 1.7, projectileSpeed: 0,
    moveSpeed: 300, collisionRadius: 24, visionDay: 1800, visionNight: 800,
    acquireRange: 600, bountyMin: 0, bountyMax: 0, xpBounty: 0,
  };
}
