/**
 * 符文系统:0:00 起每 2 分钟在上/下河道随机一点刷新(另一点清空)。
 * 英雄走近自动拾取;持瓶(未满 3 充能)优先装瓶,2 分钟后自动生效。
 */
import { V, type Vec2 } from '../core/vec2';
import { RUNE_INTERVAL, RUNE_EFFECTS, RUNE_TYPES, type RuneType } from '../data/balance';
import type { World, WorldSystem } from './world';
import type { Unit } from './unit';
import { applyModifier, removeModifier } from './modifiers';
import { createIllusion } from './abilities';

/** 攻击/施法即破的隐身来源(符文 + 影锋/银刃/烟雾/微光);守卫隐身不在此列。 */
const INVIS_BREAK_ON_ACTION = ['rune_invis', 'item_shadowblade', 'item_silveredge', 'item_smoke', 'item_glimmer'];
/** 诡计之雾靠近敌方英雄/防御塔的失效半径。 */
const SMOKE_BREAK_RADIUS = 1025;

export interface RuneSpawn {
  type: RuneType;
  pos: Vec2;
}

export const RUNE_NAME: Record<RuneType, string> = {
  haste: '加速符文',
  doubledamage: '双倍伤害符文',
  regen: '恢复符文',
  invis: '隐身符文',
  illusion: '幻象符文',
};

const PICKUP_RANGE = 175;

export function applyRune(w: World, hero: Unit, type: RuneType): void {
  if (type === 'haste') {
    applyModifier(w, hero, {
      key: 'rune_haste', duration: RUNE_EFFECTS.haste.duration, isBuff: true,
      stats: { bonusMoveSpeed: 600 }, // 折算后顶到上限 522
    }, hero.id);
  } else if (type === 'doubledamage') {
    applyModifier(w, hero, {
      key: 'rune_dd', duration: RUNE_EFFECTS.doubledamage.duration, isBuff: true,
      stats: { bonusDamagePct: 1.0 },
    }, hero.id);
  } else if (type === 'regen') {
    applyModifier(w, hero, {
      key: 'rune_regen', duration: 6, isBuff: true,
      stats: { bonusHpRegen: 100 / 6, bonusMpRegen: 67 / 6 },
      tickInterval: 0.1,
      onTick(world, u, m) {
        m.data!.start ??= m.expiresAt - 6;
        if (u.lastDamagedAt > (m.data!.start as number) + 0.05) m.expiresAt = -Infinity;
        if (u.hp >= u.calc.maxHp && u.mp >= u.calc.maxMp) m.expiresAt = -Infinity;
      },
    }, hero.id);
  } else if (type === 'invis') {
    applyModifier(w, hero, {
      key: 'rune_invis', duration: RUNE_EFFECTS.invis.duration, isBuff: true,
      states: { invisible: true },
    }, hero.id);
  } else {
    // 幻象符:生成 N 个幻象(出伤打折、受伤翻倍)
    createIllusion(w, hero, RUNE_EFFECTS.illusion.count, 0.33, 2.0, RUNE_EFFECTS.illusion.duration);
    w.emit({ kind: 'fx', fx: 'images', pos: V.clone(hero.pos) });
  }
  w.emit({ kind: 'rune_taken', rune: type, unitId: hero.id });
}

export function installRunes(w: World): void {
  let nextSpawn = Math.max(0, w.time);

  const system: WorldSystem = (world) => {
    // 刷新:两个河道符文点**各刷一枚**(经典 DotA:双符文并存,玩家可争两个)
    if (world.time >= nextSpawn) {
      nextSpawn += RUNE_INTERVAL;
      world.runes = world.map.runeSpots.map((spot) => {
        const type = world.rng.pick(RUNE_TYPES);
        world.emit({ kind: 'rune_spawned', rune: type, pos: V.clone(spot) });
        return { type, pos: V.clone(spot) };
      });
    }

    // 隐身(符文 + 影锋/银刃/烟雾/微光等物品):攻击/施法即破(V3)。
    // 必须在下面的拾取节流早退之前,否则无符文时(world.runes 空)解除永不执行。
    for (const e of world.events) {
      if (e.kind === 'attack_launched' || e.kind === 'cast_done') {
        const u = world.getUnit(e.unitId);
        if (!u) continue;
        for (const key of INVIS_BREAK_ON_ACTION) {
          if (u.modifiers.some((m) => m.key === key)) removeModifier(world, u, key);
        }
      }
    }

    // 诡计之雾:靠近敌方英雄/防御塔即失效(V4)。每 6 tick 查一次。
    if (world.tick % 6 === 0) {
      for (const u of world.units.values()) {
        if (!u.alive || !u.modifiers.some((m) => m.key === 'item_smoke')) continue;
        const broken = [...world.units.values()].some((e) =>
          e.alive && e.team !== u.team && (e.isHero() || e.kind === 'tower') &&
          V.dist(u.pos, e.pos) <= SMOKE_BREAK_RADIUS);
        if (broken) removeModifier(world, u, 'item_smoke');
      }
    }

    // 拾取(每 5 tick 查一次)。多枚符文并存:各自独立拾取。
    if (world.tick % 5 !== 0 || world.runes.length === 0) return;
    for (const hero of world.units.values()) {
      if (!hero.isHero() || !hero.alive) continue;
      const idx = world.runes.findIndex((r) => V.dist(hero.pos, r.pos) <= PICKUP_RANGE);
      if (idx < 0) continue;
      const rune = world.runes[idx];
      // 持瓶优先装瓶
      const bottle = hero.inventory.find((i) => i?.itemKey === 'bottle' && !i.runeKey && i.charges < 3);
      if (bottle) {
        bottle.runeKey = rune.type;
        bottle.runeExpiresAt = world.time + 120;
      } else {
        applyRune(world, hero, rune.type);
      }
      world.runes.splice(idx, 1); // 仅移除被取走的那一枚
    }

    // 瓶中符 2 分钟自动生效
    for (const hero of world.units.values()) {
      if (!hero.isHero()) continue;
      for (const inst of hero.inventory) {
        if (!inst?.runeKey) continue;
        if (world.time >= (inst.runeExpiresAt ?? Infinity) && hero.alive) {
          applyRune(world, hero, inst.runeKey as RuneType);
          inst.runeKey = undefined;
          inst.runeExpiresAt = undefined;
        }
      }
    }
  };
  w.systems.push(system);
}
