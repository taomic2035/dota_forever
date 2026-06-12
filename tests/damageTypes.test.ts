import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { HEROES } from '../src/data/heroes';
import { applyModifier } from '../src/sim/modifiers';
import { applyDamage, recalcUnit } from '../src/sim/combat';
import { DAMAGE_MATRIX } from '../src/data/balance';
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

describe('幽灵/以太 +40% 魔法承伤(M12)', () => {
  it('physImmune 单位受到的魔法伤害 +40%', () => {
    const w = createWorld(new GameMap(), { seed: 1, noBuildings: true });
    const h = spawnHero(w, HEROES[0], Team.Night, { x: 7520, y: 7520 });
    recalcUnit(h);
    const base = h.hp;
    // 普通魔法伤害(英雄 25% 魔抗,spell×hero 矩阵 1.0):100 → 75
    const normal = applyDamage(w, h, { source: 0, attackType: 'hero', amount: 100, flags: { spell: true } });
    expect(normal).toBeCloseTo(75, 1);
    h.hp = base;
    // 幽灵态:再 ×1.4 → 105
    applyModifier(w, h, { key: 'ghost', duration: 9, isBuff: true, states: { physImmune: true } }, h.id);
    recalcUnit(h);
    const ghosted = applyDamage(w, h, { source: 0, attackType: 'hero', amount: 100, flags: { spell: true } });
    expect(ghosted).toBeCloseTo(105, 1);
  });
});

describe('chaos 攻击类型(M12)', () => {
  it('矩阵:chaos 对所有护甲类型 100%(含要塞)', () => {
    for (const armor of Object.keys(DAMAGE_MATRIX.chaos) as Array<keyof typeof DAMAGE_MATRIX.chaos>) {
      expect(DAMAGE_MATRIX.chaos[armor]).toBe(1.0);
    }
  });

  it('chaos 对要塞护甲全额,而 hero 攻击仅 50%', () => {
    const w = createWorld(new GameMap(), { seed: 1, noBuildings: true });
    const fort = w.spawnUnit({ kind: 'building', team: Team.Night, pos: { x: 7520, y: 7520 }, name: '靶', stats: rawStats({ armorType: 'fortified', armor: 0 }) });
    recalcUnit(fort);
    const hp0 = fort.hp;
    const chaos = applyDamage(w, fort, { source: 0, attackType: 'chaos', amount: 100, flags: {} });
    expect(chaos).toBeCloseTo(100, 1);
    fort.hp = hp0;
    const hero = applyDamage(w, fort, { source: 0, attackType: 'hero', amount: 100, flags: {} });
    expect(hero).toBeCloseTo(50, 1);
  });
});
