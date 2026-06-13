/**
 * 全技能施放冒烟(商用级运行时守卫):对全 112 英雄,逐个学习并施放每个非被动技能,
 * 步进数帧,断言无异常抛出、无 NaN 位置。捕捉跨 448 技能 onCast/channel 的运行时崩溃。
 */
import { describe, it, expect } from 'vitest';
import { Team } from '../src/sim/map';
import { spawnHero } from '../src/sim/hero';
import { learnAbility } from '../src/sim/abilities';
import { HEROES } from '../src/data/heroes';
import { newWorld, enemyDummy } from './scepterTestUtil';

describe('全英雄技能施放冒烟(448 技能)', () => {
  it('每个非被动技能可施放,无异常、无 NaN', () => {
    const errors: string[] = [];
    for (const def of HEROES) {
      try {
        const w = newWorld();
        const h = spawnHero(w, def, Team.Dawn, { x: 7520, y: 6500 });
        h.level = 6;
        if (h.heroMeta) h.heroMeta.skillPoints = 10;
        const dummy = enemyDummy(w, { x: 7720, y: 6500 });
        for (let i = 0; i < 4; i++) learnAbility(w, h, i);

        for (let i = 0; i < 4; i++) {
          const a = def.abilities[i];
          const passive = a.passiveModifier && !a.onCast && !a.channel;
          if (passive) continue;
          h.mp = 99999;
          if (!dummy.alive) { dummy.hp = 5000; dummy.alive = true; }
          h.issueOrder({ type: 'cast', abilityIndex: i, targetId: dummy.id, pos: { x: 7670, y: 6500 } });
          for (let s = 0; s < 16; s++) w.step();
        }

        for (const u of w.units.values()) {
          if (!Number.isFinite(u.pos.x) || !Number.isFinite(u.pos.y)) {
            errors.push(`${def.key}: 单位 ${u.name} 位置 NaN`);
            break;
          }
        }
      } catch (e) {
        errors.push(`${def.key}: ${(e as Error).message}`);
      }
    }
    if (errors.length) console.error('技能冒烟失败:\n' + errors.join('\n'));
    expect(errors).toEqual([]);
  }, 90000);
});
