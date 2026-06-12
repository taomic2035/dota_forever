import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { HEROES } from '../src/data/heroes';
import { applyModifier, hasModifier } from '../src/sim/modifiers';
import { applyDamage, recalcUnit } from '../src/sim/combat';
import { modifierArea } from '../src/sim/abilities';
import { makeItem, useItem } from '../src/sim/items';
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

// A4:折光(Refraction)只挡物理;尖刺甲壳(Spiked Carapace)挡所有类型。
describe('实例格挡分物理/全类型(A4)', () => {
  function dummy() {
    const w = createWorld(new GameMap(), { seed: 1, noBuildings: true });
    const u = w.spawnUnit({ kind: 'creep', team: Team.Night, pos: { x: 7520, y: 7520 }, name: 't', stats: rawStats({}) });
    recalcUnit(u);
    return { w, u };
  }
  it('blockPhysicalOnly:仅格挡物理,法术/纯粹穿透', () => {
    const { w, u } = dummy();
    const m = applyModifier(w, u, { key: 'refract', duration: 99, isBuff: true }, u.id);
    m.data = { ...(m.data ?? {}), blockInstances: 5, blockPhysicalOnly: 1 };
    expect(applyDamage(w, u, { source: 0, attackType: 'hero', amount: 100 })).toBe(0);          // 物理被挡
    expect(applyDamage(w, u, { source: 0, attackType: 'hero', amount: 100, flags: { spell: true } })).toBeGreaterThan(0); // 法术穿透
    expect(applyDamage(w, u, { source: 0, attackType: 'hero', amount: 100, flags: { pure: true } })).toBeGreaterThan(0);  // 纯粹穿透
  });
  it('无 blockPhysicalOnly(甲壳):格挡所有类型', () => {
    const { w, u } = dummy();
    const m = applyModifier(w, u, { key: 'carapace', duration: 99, isBuff: true }, u.id);
    m.data = { ...(m.data ?? {}), blockInstances: 5 };
    expect(applyDamage(w, u, { source: 0, attackType: 'hero', amount: 100 })).toBe(0);                       // 物理被挡
    expect(applyDamage(w, u, { source: 0, attackType: 'hero', amount: 100, flags: { spell: true } })).toBe(0); // 法术亦被挡
  });
});

// B1:被眩晕/妖术(mute)的单位不能使用物品;沉默不禁物品(BKB 反沉默)。
describe('被控单位禁用物品(B1)', () => {
  function setup() {
    const w = createWorld(new GameMap(), { seed: 1, noBuildings: true });
    const caster = spawnHero(w, HEROES[0], Team.Dawn, { x: 7400, y: 7520 });
    const enemy = spawnHero(w, HEROES[1], Team.Night, { x: 7640, y: 7520 });
    caster.mp = 500;
    caster.inventory[0] = makeItem('hex');
    return { w, caster, enemy };
  }
  it('眩晕时不能使用物品(不扣蓝)', () => {
    const { w, caster, enemy } = setup();
    applyModifier(w, caster, { key: 'stun', duration: 99, states: { stunned: true } }, caster.id);
    expect(useItem(w, caster, 0, undefined, enemy)).toBe(false);
    expect(caster.mp).toBe(500);
  });
  it('妖术(muted)时不能使用物品', () => {
    const { w, caster, enemy } = setup();
    applyModifier(w, caster, { key: 'mute', duration: 99, states: { muted: true } }, caster.id);
    expect(useItem(w, caster, 0, undefined, enemy)).toBe(false);
    expect(caster.mp).toBe(500);
  });
  it('仅沉默仍可使用物品(BKB 用以反沉默)', () => {
    const { w, caster, enemy } = setup();
    applyModifier(w, caster, { key: 'sil', duration: 99, states: { silenced: true } }, caster.id);
    expect(useItem(w, caster, 0, undefined, enemy)).toBe(true);
  });
});

// B2:modifierArea 对魔免目标应委托 applyModifier 判定,从而尊重 piercesSpellImmunity。
describe('AoE modifier 尊重穿魔免(B2)', () => {
  function setup() {
    const w = createWorld(new GameMap(), { seed: 1, noBuildings: true });
    const caster = spawnHero(w, HEROES[0], Team.Dawn, { x: 7500, y: 7520 });
    const enemy = spawnHero(w, HEROES[1], Team.Night, { x: 7560, y: 7520 });
    applyModifier(w, enemy, { key: 'mi', duration: 99, isBuff: true, states: { magicImmune: true } }, enemy.id);
    return { w, caster, enemy };
  }
  it('非穿透 AoE:魔免目标不中', () => {
    const { w, caster, enemy } = setup();
    modifierArea(w, caster, enemy.pos, 400, { key: 'aoe_root', duration: 5, states: { rooted: true } }, 'enemy');
    expect(hasModifier(enemy, 'aoe_root')).toBe(false);
  });
  it('穿透 AoE:魔免目标命中', () => {
    const { w, caster, enemy } = setup();
    modifierArea(w, caster, enemy.pos, 400, { key: 'aoe_pierce', duration: 5, states: { rooted: true }, data: { piercesSpellImmunity: 1 } }, 'enemy');
    expect(hasModifier(enemy, 'aoe_pierce')).toBe(true);
  });
});
