import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { HEROES } from '../src/data/heroes';
import { applyModifier, hasModifier } from '../src/sim/modifiers';
import type { ModifierDef } from '../src/sim/modifiers';

// M1 回归:魔免 / 无敌 必须拦截敌方负面 modifier 的施加(此前只挡伤害,不挡控制/减益)。
function setup() {
  const w = createWorld(new GameMap(), { seed: 1, noBuildings: true });
  const dawn = spawnHero(w, HEROES[0], Team.Dawn, { x: 7400, y: 7520 });
  const night = spawnHero(w, HEROES[1], Team.Night, { x: 7640, y: 7520 });
  return { w, dawn, night };
}
const STUN: ModifierDef = { key: 'test_stun', duration: 2, states: { stunned: true } };
const PIERCE_STUN: ModifierDef = { key: 'test_pierce', duration: 2, states: { stunned: true }, data: { piercesSpellImmunity: 1 } };
const BUFF: ModifierDef = { key: 'test_buff', duration: 5, isBuff: true, stats: { bonusArmor: 5 } };
const MAGIC_IMMUNE: ModifierDef = { key: 'test_mi', duration: 5, isBuff: true, states: { magicImmune: true } };

describe('魔免/无敌挡 debuff 施加(M1)', () => {
  it('魔免单位免疫敌方眩晕', () => {
    const { w, dawn, night } = setup();
    applyModifier(w, night, MAGIC_IMMUNE, night.id); // 自施魔免 buff
    applyModifier(w, night, STUN, dawn.id); // 敌方眩晕
    expect(hasModifier(night, 'test_stun')).toBe(false);
  });

  it('无敌单位免疫敌方眩晕(无视穿透)', () => {
    const { w, dawn, night } = setup();
    night.invulnerable = true;
    applyModifier(w, night, PIERCE_STUN, dawn.id); // 即便穿魔免,无敌仍拦
    expect(hasModifier(night, 'test_pierce')).toBe(false);
  });

  it('穿魔免效果不被魔免拦截', () => {
    const { w, dawn, night } = setup();
    applyModifier(w, night, MAGIC_IMMUNE, night.id);
    applyModifier(w, night, PIERCE_STUN, dawn.id);
    expect(hasModifier(night, 'test_pierce')).toBe(true);
  });

  it('普通单位仍正常被敌方眩晕(未误伤正常路径)', () => {
    const { w, dawn, night } = setup();
    applyModifier(w, night, STUN, dawn.id);
    expect(hasModifier(night, 'test_stun')).toBe(true);
  });

  it('魔免不阻挡自身/友方 buff', () => {
    const { w, night } = setup();
    applyModifier(w, night, MAGIC_IMMUNE, night.id);
    applyModifier(w, night, BUFF, night.id); // 自施 buff
    expect(hasModifier(night, 'test_buff')).toBe(true);
  });

  it('魔免不阻挡友方对己的负面?——友方来源不拦(只拦敌方)', () => {
    const { w, dawn } = setup();
    const ally = spawnHero(w, HEROES[2], Team.Dawn, { x: 7300, y: 7520 });
    applyModifier(w, dawn, MAGIC_IMMUNE, dawn.id);
    // 友方来源的非 buff(罕见,如友方施加的标记)不被魔免拦
    applyModifier(w, dawn, STUN, ally.id);
    expect(hasModifier(dawn, 'test_stun')).toBe(true);
  });
});
