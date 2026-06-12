import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { HEROES } from '../src/data/heroes';
import { makeItem, useItem } from '../src/sim/items';
import { applyModifier, hasModifier } from '../src/sim/modifiers';
import type { ModifierDef } from '../src/sim/modifiers';

// M11:对敌方单体使用指向性物品时,无敌目标一律不可施法;魔免目标除非物品声明穿透,
// 否则提前拒绝——不扣蓝、不进 CD(此前会「付代价但无效」:M1 在下游挡住效果,代价却已付)。
const MAGIC_IMMUNE: ModifierDef = { key: 'test_mi', duration: 5, isBuff: true, states: { magicImmune: true } };

function setup() {
  const w = createWorld(new GameMap(), { seed: 1, noBuildings: true });
  const caster = spawnHero(w, HEROES[0], Team.Dawn, { x: 7400, y: 7520 });
  const enemy = spawnHero(w, HEROES[1], Team.Night, { x: 7640, y: 7520 });
  caster.mp = 500;
  return { w, caster, enemy };
}

describe('魔免/无敌单体施法预筛(M11)', () => {
  it('对魔免敌人施妖术被拒,不扣蓝/不进 CD', () => {
    const { w, caster, enemy } = setup();
    caster.inventory[0] = makeItem('hex');
    applyModifier(w, enemy, MAGIC_IMMUNE, enemy.id); // 自施魔免 buff
    const ok = useItem(w, caster, 0, undefined, enemy);
    expect(ok).toBe(false);
    expect(caster.mp).toBe(500);                       // 未扣蓝
    expect(caster.inventory[0]!.cooldownUntil).toBe(-Infinity); // 未进 CD
    expect(hasModifier(enemy, 'item_hex')).toBe(false);
  });

  it('对无敌敌人施妖术被拒(无视穿透声明)', () => {
    const { w, caster, enemy } = setup();
    caster.inventory[0] = makeItem('hex');
    enemy.invulnerable = true;
    const ok = useItem(w, caster, 0, undefined, enemy);
    expect(ok).toBe(false);
    expect(caster.mp).toBe(500);
    expect(caster.inventory[0]!.cooldownUntil).toBe(-Infinity);
  });

  it('对普通敌人施妖术正常(未误伤正常路径)', () => {
    const { w, caster, enemy } = setup();
    caster.inventory[0] = makeItem('hex');
    const ok = useItem(w, caster, 0, undefined, enemy);
    expect(ok).toBe(true);
    expect(caster.mp).toBe(400);                       // 扣 100
    expect(caster.inventory[0]!.cooldownUntil).toBeGreaterThan(w.time);
    expect(hasModifier(enemy, 'item_hex')).toBe(true);
  });

  it('否决坠饰穿魔免:对魔免敌人仍可施且效果落地', () => {
    const { w, caster, enemy } = setup();
    caster.inventory[0] = makeItem('nullifier');
    applyModifier(w, enemy, MAGIC_IMMUNE, enemy.id);
    const ok = useItem(w, caster, 0, undefined, enemy);
    expect(ok).toBe(true);                             // 声明穿透 → 不被预筛拦
    expect(caster.mp).toBe(425);                       // 扣 75
    expect(hasModifier(enemy, 'item_nullifier_mute')).toBe(true); // 沉默效果穿魔免落地
  });
});
