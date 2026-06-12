import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { HEROES } from '../src/data/heroes';
import { applyModifier } from '../src/sim/modifiers';
import { applyDamage, recalcUnit } from '../src/sim/combat';
import type { UnitStats } from '../src/sim/unit';

function rawStats(over: Partial<UnitStats>): UnitStats {
  return {
    maxHp: 100000, hpRegen: 0, maxMp: 0, mpRegen: 0, dmgMin: 0, dmgMax: 0,
    attackType: 'normal', armorType: 'medium', armor: 0, magicResist: 0,
    attackRange: 100, attackPoint: 0.3, bat: 1, projectileSpeed: 0, moveSpeed: 0,
    collisionRadius: 24, visionDay: 0, visionNight: 0, acquireRange: 0,
    bountyMin: 0, bountyMax: 0, xpBounty: 0, ...over,
  };
}

// A2/A3:chaos 攻击类型无视护甲减伤,且穿以太(physImmune)。
describe('chaos 攻击类型(A2/A3)', () => {
  it('无视护甲且穿 physImmune(以太)', () => {
    const w = createWorld(new GameMap(), { seed: 1, noBuildings: true });
    const u = w.spawnUnit({ kind: 'creep', team: Team.Night, pos: { x: 7520, y: 7520 }, name: 't', stats: rawStats({ armor: 20, armorType: 'heavy' }) });
    recalcUnit(u);
    applyModifier(w, u, { key: 'ethereal', duration: 99, isBuff: true, states: { physImmune: true } }, u.id);
    // 普通物理被 physImmune 拦
    expect(applyDamage(w, u, { source: 0, attackType: 'hero', amount: 100 })).toBe(0);
    // chaos:穿以太 + 无视 20 护甲(矩阵 chaos×heavy=1.0)→ 满额
    expect(applyDamage(w, u, { source: 0, attackType: 'chaos', amount: 100 })).toBeCloseTo(100, 1);
  });
});

// MKB(必中)免疫低打高(上坡)落空。
describe('必中免疫上坡 miss(MKB)', () => {
  it('低打高:无必中有落空,必中则全中', () => {
    const w = createWorld(new GameMap(), { seed: 5, noBuildings: true });
    const atk = spawnHero(w, HEROES[0], Team.Dawn, { x: 7520, y: 7520 }); // 低地 h=0
    const tgt = spawnHero(w, HEROES[1], Team.Night, { x: 7800, y: 7200 }); // 高地 h=1
    expect(w.map.heightAt(atk.pos) < w.map.heightAt(tgt.pos)).toBe(true); // 确认上坡成立
    tgt.hp = 1e9; // 防止循环中被打死(死亡单位 applyDamage 返回 0,会污染落空计数)

    let misses = 0;
    for (let i = 0; i < 40; i++) if (applyDamage(w, tgt, { source: atk.id, attackType: 'hero', amount: 50 }) === 0) misses++;
    expect(misses).toBeGreaterThan(0); // 上坡 25% 落空

    applyModifier(w, atk, { key: 'ts', duration: 99, isBuff: true, stats: { trueStrike: true } }, atk.id);
    recalcUnit(atk);
    let missesTS = 0;
    for (let i = 0; i < 40; i++) if (applyDamage(w, tgt, { source: atk.id, attackType: 'hero', amount: 50 }) === 0) missesTS++;
    expect(missesTS).toBe(0); // 必中:上坡也全中
  });
});
