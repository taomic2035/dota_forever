import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { learnAbility } from '../src/sim/abilities';
import { applyModifier, hasModifier } from '../src/sim/modifiers';
import { REIN } from '../src/data/heroes';
import { NEC } from '../src/data/heroes/batch14';
import type { World } from '../src/sim/world';
import type { Unit, UnitStats } from '../src/sim/unit';

function creep(w: World, team: Team, x: number, y: number): Unit {
  const stats: UnitStats = {
    maxHp: 3000, hpRegen: 0, maxMp: 0, mpRegen: 0, dmgMin: 0, dmgMax: 0,
    attackType: 'normal', armorType: 'medium', armor: 0, magicResist: 0,
    attackRange: 100, attackPoint: 0.3, bat: 1.0, projectileSpeed: 0, moveSpeed: 0,
    collisionRadius: 22, visionDay: 800, visionNight: 800, acquireRange: 0,
    bountyMin: 0, bountyMax: 0, xpBounty: 0,
  };
  return w.spawnUnit({ kind: 'creep', team, pos: { x, y }, name: 'c', stats });
}

// 三轮审计 Wave3:技能侧无敌预筛(A3)+ 隐身物品攻击解除(V3)。
describe('无敌敌方单体不可被指向施法(A3)', () => {
  it('对无敌敌人施死神镰刀:不扣蓝;非无敌则正常扣蓝', () => {
    const w = createWorld(new GameMap(), { seed: 1, noBuildings: true });
    const nec = spawnHero(w, NEC, Team.Dawn, { x: 7000, y: 8000 });
    nec.level = 6; nec.heroMeta!.skillPoints = 1; nec.mp = 9999; // 将被 clamp 到 maxMp
    learnAbility(w, nec, 3); // 死神镰刀(单体敌方大招)
    const enemy = spawnHero(w, REIN, Team.Night, { x: 7300, y: 8000 });
    w.step();
    const mp0 = nec.mp; // 满蓝(=maxMp,regen 不再增长,便于断言)

    enemy.invulnerable = true;
    nec.issueOrder({ type: 'cast', abilityIndex: 3, targetId: enemy.id });
    for (let i = 0; i < 15; i++) w.step();
    expect(nec.mp).toBe(mp0); // 无敌 → 拒绝,不扣蓝

    enemy.invulnerable = false;
    nec.issueOrder({ type: 'cast', abilityIndex: 3, targetId: enemy.id });
    for (let i = 0; i < 15; i++) w.step();
    expect(nec.mp).toBeLessThan(mp0); // 非无敌 → 正常施放扣蓝
  });
});

describe('隐身物品攻击后解除(V3)', () => {
  it('影锋隐身攻击后立即解除', () => {
    const w = createWorld(new GameMap(), { seed: 1, noBuildings: true });
    const h = spawnHero(w, REIN, Team.Dawn, { x: 7000, y: 8000 });
    applyModifier(w, h, { key: 'item_shadowblade', duration: 14, isBuff: true, states: { invisible: true } }, h.id);
    const enemy = creep(w, Team.Night, 7100, 8000);
    expect(hasModifier(h, 'item_shadowblade')).toBe(true);
    h.issueOrder({ type: 'attack', targetId: enemy.id });
    for (let i = 0; i < 60 && hasModifier(h, 'item_shadowblade'); i++) w.step();
    expect(hasModifier(h, 'item_shadowblade')).toBe(false); // 攻击 → 隐身解除
  });
});
