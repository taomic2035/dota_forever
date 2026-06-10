/**
 * 符文系统:0:00 起每 2 分钟在上/下河道随机一点刷新(另一点清空)。
 * 英雄走近自动拾取;持瓶(未满 3 充能)优先装瓶,2 分钟后自动生效。
 */
import { V, type Vec2 } from '../core/vec2';
import { RUNE_INTERVAL, RUNE_EFFECTS, RUNE_TYPES, type RuneType } from '../data/balance';
import type { World, WorldSystem } from './world';
import type { Unit } from './unit';
import { applyModifier, removeModifier } from './modifiers';

export interface RuneSpawn {
  type: RuneType;
  pos: Vec2;
}

export const RUNE_NAME: Record<RuneType, string> = {
  haste: '加速符文',
  doubledamage: '双倍伤害符文',
  regen: '恢复符文',
  invis: '隐身符文',
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
  } else {
    applyModifier(w, hero, {
      key: 'rune_invis', duration: RUNE_EFFECTS.invis.duration, isBuff: true,
      states: { invisible: true },
    }, hero.id);
  }
  w.emit({ kind: 'rune_taken', rune: type, unitId: hero.id });
}

export function installRunes(w: World): void {
  let nextSpawn = Math.max(0, w.time);

  const system: WorldSystem = (world) => {
    // 刷新
    if (world.time >= nextSpawn) {
      nextSpawn += RUNE_INTERVAL;
      const spotIdx = world.rng.int(0, 1);
      const type = world.rng.pick(RUNE_TYPES);
      world.runes = [{ type, pos: V.clone(world.map.runeSpots[spotIdx]) }];
      world.emit({ kind: 'rune_spawned', rune: type, pos: V.clone(world.map.runeSpots[spotIdx]) });
    }

    // 拾取(每 5 tick 查一次)
    if (world.tick % 5 !== 0 || world.runes.length === 0) return;
    for (const hero of world.units.values()) {
      if (!hero.isHero() || !hero.alive) continue;
      const rune = world.runes[0];
      if (!rune || V.dist(hero.pos, rune.pos) > PICKUP_RANGE) continue;
      // 持瓶优先装瓶
      const bottle = hero.inventory.find((i) => i?.itemKey === 'bottle' && !i.runeKey && i.charges < 3);
      if (bottle) {
        bottle.runeKey = rune.type;
        bottle.runeExpiresAt = world.time + 120;
      } else {
        applyRune(world, hero, rune.type);
      }
      world.runes.length = 0;
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

    // 隐身符:攻击/施法即破
    for (const e of world.events) {
      if (e.kind === 'attack_launched' || e.kind === 'cast_done') {
        const u = world.getUnit(e.unitId);
        if (u && u.modifiers.some((m) => m.key === 'rune_invis')) {
          removeModifier(world, u, 'rune_invis');
        }
      }
    }
  };
  w.systems.push(system);
}
