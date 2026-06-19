import type { World, WorldSystem } from './world';
import type { Unit } from './unit';
import { ITEMS } from '../data/items';
import { grantItem } from './items';

/** tier → 中立物品 key 池(从 ITEMS 的 neutral 标记派生)。 */
const NEUTRAL_BY_TIER: Record<number, string[]> = (() => {
  const m: Record<number, string[]> = {};
  for (const it of ITEMS) if (it.neutral) (m[it.neutral.tier] ??= []).push(it.key);
  return m;
})();
const NEUTRAL_KEYS = new Set(ITEMS.filter((i) => i.neutral).map((i) => i.key));

const DROP_CHANCE = 0.12; // 每次野怪被英雄击杀的掉落概率
const DROP_START = 5 * 60; // 开局 5min 内不掉(避免过早 power spike)

/** 当前游戏时间解锁的最高 tier(越晚越高;经典 DotA 分层节奏的简化)。 */
export function unlockedTier(time: number): number {
  if (time < 18 * 60) return 1;
  if (time < 33 * 60) return 2;
  return 3;
}

/** 英雄是否已持有中立物品(每英雄上限 1 件,DotA 忠实 + 限制 power)。 */
export function holdsNeutralItem(hero: Unit): boolean {
  const slots = [...hero.inventory, ...hero.backpack, ...hero.stash, hero.tpSlot];
  return slots.some((s) => !!s && NEUTRAL_KEYS.has(s.itemKey));
}

export function installNeutralItems(w: World): void {
  const system: WorldSystem = (world) => {
    if (world.time < DROP_START) return;
    for (const e of world.events) {
      if (e.kind !== 'unit_died') continue;
      const victim = world.getUnit(e.unitId);
      if (!victim || victim.kind !== 'neutral') continue;
      const killer = world.getUnit(e.killerId);
      if (!killer || !killer.isHero() || !killer.alive) continue;
      if (holdsNeutralItem(killer)) continue; // 已持有 → 不再掉
      if (!world.rng.chance(DROP_CHANCE)) continue;
      const pool = NEUTRAL_BY_TIER[unlockedTier(world.time)] ?? NEUTRAL_BY_TIER[1] ?? [];
      if (pool.length === 0) continue;
      grantItem(world, killer, world.rng.pick(pool));
    }
  };
  w.systems.push(system);
}
