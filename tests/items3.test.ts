import { describe, it, expect, beforeEach } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { makeItem, useItem, syncHolderModifiers } from '../src/sim/items';
import { hasModifier } from '../src/sim/modifiers';
import { applyDamage } from '../src/sim/combat';
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

describe('advanced items batch 3', () => {
  function enemyAt(dx: number, over: Record<string, unknown> = {}): Unit {
    return w.spawnUnit({ kind: 'hero', team: Team.Night, pos: w.map.nearestWalkable(V.add(h.pos, { x: dx, y: 0 })), name: 't', stats: { ...REIN_STATS(), ...over } });
  }

  it('先锋之盾:被动减伤', () => {
    give(h, 'vanguard'); w.step();
    expect(h.calc.incomingDamageReduction).toBeGreaterThan(0.1);
  });

  it('蝶舞之翼:提供闪避', () => {
    give(h, 'butterfly'); w.step();
    expect(h.calc.evasion).toBeGreaterThanOrEqual(0.35);
  });

  it('圣剑:巨额攻击加成', () => {
    give(h, 'rapier'); w.step();
    expect(h.calc.dmgMax).toBeGreaterThan(300);
  });

  it('寒霜之心:攻击施加冰冷减速', () => {
    give(h, 'skadi');
    const t = enemyAt(110, { magicResist: 0 });
    h.issueOrder({ type: 'attack', targetId: t.id });
    run(40);
    expect(hasModifier(t, 'item_skadi_cold')).toBe(true);
  });

  it('雷神之锤:连锁闪电波及附近敌人', () => {
    give(h, 'mjollnir');
    const t = enemyAt(110, { maxHp: 200000, magicResist: 0 });
    const near = w.spawnUnit({ kind: 'hero', team: Team.Night, pos: w.map.nearestWalkable(V.add(h.pos, { x: 260, y: 60 })), name: 'n', stats: { ...REIN_STATS(), maxHp: 200000, magicResist: 0 } });
    h.issueOrder({ type: 'attack', targetId: t.id });
    run(30 * 12);
    expect(near.hp).toBeLessThan(200000);
  });

  it('雷神之锤:主动静电护盾', () => {
    const slot = give(h, 'mjollnir');
    useItem(w, h, slot);
    run(2);
    expect(hasModifier(h, 'item_mjollnir_shield')).toBe(true);
  });

  it('净魂之刃:攻击燃烧法力', () => {
    give(h, 'diffusal');
    const t = enemyAt(110, { magicResist: 0 });
    t.mp = 200;
    h.issueOrder({ type: 'attack', targetId: t.id });
    run(40);
    expect(t.mp).toBeLessThan(200);
  });

  it('深渊之刃:主动眩晕', () => {
    const slot = give(h, 'abyssal');
    const t = enemyAt(300);
    useItem(w, h, slot, undefined, t);
    run(3);
    expect(hasModifier(t, 'item_abyssal_stun')).toBe(true);
  });

  it('幽魂权杖:虚化免疫物理', () => {
    const slot = give(h, 'ghost');
    useItem(w, h, slot);
    run(1);
    expect(hasModifier(h, 'item_ghost')).toBe(true);
    const dealt = applyDamage(w, h, { source: 0, attackType: 'hero', amount: 300 });
    expect(dealt).toBe(0); // 物理免疫
  });

  it('飓风之杖:旋风禁锢敌方', () => {
    const slot = give(h, 'eul');
    h.mp = 9999;
    const t = enemyAt(300);
    useItem(w, h, slot, undefined, t);
    run(3);
    expect(hasModifier(t, 'item_eul_cyclone')).toBe(true);
  });

  it('妖术法球:变形硬控', () => {
    const slot = give(h, 'hex');
    h.mp = 9999;
    const t = enemyAt(300);
    useItem(w, h, slot, undefined, t);
    run(3);
    expect(hasModifier(t, 'item_hex')).toBe(true);
  });

  it('神灭之球:爆发魔法伤害', () => {
    const slot = give(h, 'dagon');
    h.mp = 9999;
    const t = enemyAt(300, { magicResist: 0 });
    const hp0 = t.hp;
    useItem(w, h, slot, undefined, t);
    run(2);
    expect(hp0 - t.hp).toBeGreaterThan(300);
  });

  it('虚空面纱:削减敌方魔抗', () => {
    const slot = give(h, 'veil');
    h.mp = 9999;
    const t = enemyAt(300);
    const mr0 = t.calc.magicResist;
    useItem(w, h, slot, t.pos);
    run(2);
    expect(hasModifier(t, 'item_veil')).toBe(true);
    expect(t.calc.magicResist).toBeLessThan(mr0);
  });

  it('洞察烟斗:友军护盾吸收伤害', () => {
    const slot = give(h, 'pipe');
    useItem(w, h, slot);
    run(1);
    expect(hasModifier(h, 'item_pipe_shield')).toBe(true);
    const hp0 = h.hp;
    applyDamage(w, h, { source: 0, attackType: 'hero', amount: 300, flags: { pure: true } });
    expect(h.hp).toBe(hp0); // 被护盾完全吸收
  });

  it('刷新之球:重置技能冷却', () => {
    const slot = give(h, 'refresher');
    h.mp = 9999;
    h.abilities[0].cooldownUntil = w.time + 100;
    useItem(w, h, slot);
    expect(h.abilities[0].cooldownUntil).toBeLessThan(w.time);
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
