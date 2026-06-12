import { describe, it, expect, beforeEach } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { applyModifier, removeModifier, hasModifier } from '../src/sim/modifiers';
import type { World } from '../src/sim/world';
import type { Unit, UnitStats } from '../src/sim/unit';

const map = new GameMap();

function stats(over: Partial<UnitStats> = {}): UnitStats {
  return {
    maxHp: 500, hpRegen: 0, maxMp: 200, mpRegen: 0,
    dmgMin: 50, dmgMax: 50, attackType: 'hero', armorType: 'hero',
    armor: 0, magicResist: 0.25, attackRange: 128, attackPoint: 0.45,
    bat: 1.7, projectileSpeed: 0, moveSpeed: 300, collisionRadius: 24,
    visionDay: 1800, visionNight: 800, acquireRange: 500,
    bountyMin: 0, bountyMax: 0, xpBounty: 0,
    ...over,
  };
}

let w: World;
beforeEach(() => {
  w = createWorld(map, { seed: 13, noBuildings: true, startTime: 0 });
});

function mk(team: Team, x = 7000, y = 8000): Unit {
  return w.spawnUnit({ kind: 'hero', team, pos: { x, y }, name: 't', stats: stats() });
}

describe('modifiers', () => {
  it('stat bonuses fold into calc and expire', () => {
    const u = mk(Team.Dawn);
    applyModifier(w, u, { key: 'buff_dmg', duration: 2, stats: { bonusDamage: 30, bonusMoveSpeedPct: 0.1 } }, u.id);
    w.step();
    expect(u.calc.dmgMin).toBe(80);
    expect(u.calc.moveSpeed).toBeCloseTo(330, 5);
    for (let i = 0; i < 70; i++) w.step(); // >2 秒
    expect(u.calc.dmgMin).toBe(50);
    expect(hasModifier(u, 'buff_dmg')).toBe(false);
  });

  it('same key same source refreshes; different sources stack when stackable', () => {
    const u = mk(Team.Dawn);
    const src1 = mk(Team.Dawn, 7100, 8000);
    const src2 = mk(Team.Dawn, 7200, 8000);
    applyModifier(w, u, { key: 'k', duration: 1, stats: { bonusArmor: 2 } }, src1.id);
    applyModifier(w, u, { key: 'k', duration: 1, stats: { bonusArmor: 2 } }, src1.id);
    expect(u.modifiers.filter((m) => m.key === 'k').length).toBe(1); // 刷新
    applyModifier(w, u, { key: 'k2', duration: 1, stackable: true, stats: { bonusArmor: 1 } }, src1.id);
    applyModifier(w, u, { key: 'k2', duration: 1, stackable: true, stats: { bonusArmor: 1 } }, src2.id);
    w.step();
    expect(u.modifiers.filter((m) => m.key === 'k2').length).toBe(2);
    expect(u.calc.armor).toBeCloseTo(4, 5); // 2 + 1 + 1
  });

  it('stun blocks attacking and movement', () => {
    const a = mk(Team.Dawn);
    const b = w.spawnUnit({ kind: 'hero', team: Team.Night, pos: { x: 7080, y: 8000 }, name: 'b', stats: stats({ dmgMin: 0, dmgMax: 0 }) });
    applyModifier(w, a, { key: 'stun', duration: 5, states: { stunned: true } }, b.id);
    a.issueOrder({ type: 'attack', targetId: b.id });
    const pos0 = { ...a.pos };
    for (let i = 0; i < 60; i++) w.step(); // 2 秒
    expect(b.hp).toBe(500); // 没被打
    expect(a.pos).toEqual(pos0); // 没动
    for (let i = 0; i < 120; i++) w.step(); // 眩晕结束后
    expect(b.hp).toBeLessThan(500);
  });

  it('DoT ticks damage on interval', () => {
    const u = mk(Team.Night);
    applyModifier(w, u, {
      key: 'burn', duration: 3.05, tickInterval: 1,
      onTick: (world, unit) => { unit.hp -= 40; },
    }, u.id);
    for (let i = 0; i < 100; i++) w.step(); // 3.3 秒
    expect(u.hp).toBeCloseTo(500 - 120, 0); // 3 跳
  });

  it('aura grants within radius and decays after leaving', () => {
    const holder = mk(Team.Dawn, 7000, 8000);
    const ally = mk(Team.Dawn, 7300, 8000);
    applyModifier(w, holder, {
      key: 'cmd_aura',
      aura: { radius: 600, affects: 'ally', grant: { key: 'cmd_aura_buff', stats: { bonusDamage: 10 } } },
    }, holder.id);
    for (let i = 0; i < 20; i++) w.step();
    expect(hasModifier(ally, 'cmd_aura_buff')).toBe(true);
    expect(ally.calc.dmgMin).toBe(60);
    // 离开半径
    ally.pos = { x: 8200, y: 8000 };
    for (let i = 0; i < 40; i++) w.step(); // > 授予时效
    expect(hasModifier(ally, 'cmd_aura_buff')).toBe(false);
    expect(ally.calc.dmgMin).toBe(50);
  });

  it('attribute bonus modifiers feed hero attribute fold', () => {
    const u = mk(Team.Dawn);
    // 无 heroDef 的单位忽略属性;给它一个最小定义
    u.heroDef = {
      key: 'x', name: 'x', title: '', primary: 'str',
      baseStr: 20, gainStr: 2, baseAgi: 10, gainAgi: 1, baseInt: 10, gainInt: 1,
      baseDamage: [30, 36], baseArmor: 0, baseMs: 300, attackRange: 128,
      projectileSpeed: 0, bat: 1.7, attackPoint: 0.4, color: '#fff', glyph: 'x',
      abilities: [], aiRole: 'tank',
    };
    applyModifier(w, u, { key: 'item_str', stats: { bonusStr: 10 } }, u.id);
    w.step();
    // str = 20 + 10 → maxHp = 500(基础 base 不是英雄公式;此处验证 dmg 主属性 30+30)
    expect(u.calc.dmgMin).toBe(50 + 30); // base.dmgMin(50) + str(30)
    removeModifier(w, u, 'item_str');
    w.step();
    expect(u.calc.dmgMin).toBe(50 + 20);
  });

  it('magic resist folds additively with one clamp (order-independent)', () => {
    // 升抗 + 减抗:0.25 + 0.7 - 0.3 = 0.65,不应被中途 clamp 丢抗
    const a = mk(Team.Dawn);
    applyModifier(w, a, { key: 'mr_up', stats: { bonusMagicResist: 0.7 } }, a.id);
    applyModifier(w, a, { key: 'mr_down', stats: { bonusMagicResist: -0.3 } }, a.id);
    w.step();
    expect(a.calc.magicResist).toBeCloseTo(0.65, 5);

    // 反序施加,结果相同(聚合顺序无关 → 确定性)
    const b = mk(Team.Night);
    applyModifier(w, b, { key: 'mr_down', stats: { bonusMagicResist: -0.3 } }, b.id);
    applyModifier(w, b, { key: 'mr_up', stats: { bonusMagicResist: 0.7 } }, b.id);
    w.step();
    expect(b.calc.magicResist).toBeCloseTo(0.65, 5);

    // 上限只在最后 clamp 一次
    const c = mk(Team.Dawn, 7400, 8000);
    applyModifier(w, c, { key: 'mr_huge', stats: { bonusMagicResist: 1.0 } }, c.id);
    w.step();
    expect(c.calc.magicResist).toBeCloseTo(0.85, 5);
  });
});
