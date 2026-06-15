import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { createIllusion } from '../src/sim/abilities';
import { applyModifier } from '../src/sim/modifiers';
import { recalcUnit } from '../src/sim/combat';
import { HEROES } from '../src/data/heroes';

const map = new GameMap();

describe('createIllusion 继承源英雄当前面板(calc 而非裸 base)', () => {
  it('幻象伤害/生命/护甲包含装备加成,而非裸 base', () => {
    const w = createWorld(map, { seed: 5, startTime: 0 });
    const hero = spawnHero(w, HEROES[0], Team.Dawn);
    const baseDmgMin = hero.base.dmgMin;
    // 模拟装备加成(攻击力 + 生命 + 护甲)
    applyModifier(w, hero, { key: 'test_gear', duration: 99, isBuff: true, stats: { bonusDamage: 80, bonusHp: 500, bonusArmor: 6 } }, hero.id);
    recalcUnit(hero);
    expect(hero.calc.dmgMin).toBeGreaterThan(baseDmgMin); // 加成确实进入 calc

    const [illu] = createIllusion(w, hero, 1, 0.33, 2, 10);

    // 幻象 base 取自源 calc(含加成),不是源 base
    expect(illu.base.dmgMin).toBe(hero.calc.dmgMin);
    expect(illu.base.dmgMax).toBe(hero.calc.dmgMax);
    expect(illu.base.maxHp).toBe(hero.calc.maxHp);
    expect(illu.base.armor).toBe(hero.calc.armor);
    expect(illu.base.dmgMin).toBeGreaterThan(baseDmgMin); // 关键:继承了加成而非裸 base
    expect(illu.illuOutgoing).toBe(0.33); // 出伤打折系数独立保留

    // recalc 后幻象自身 calc 镜像该面板(无双计:幻象非英雄、无装备)
    recalcUnit(illu);
    expect(illu.calc.dmgMin).toBe(hero.calc.dmgMin);
    expect(illu.calc.maxHp).toBe(hero.calc.maxHp);
  });
});
