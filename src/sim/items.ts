/**
 * 物品系统:购买(商店范围/储藏)、出售、使用、充能、数值折算、守卫维护。
 * 合成在 recipes.ts。
 */
import { V } from '../core/vec2';
import { SELL_REFUND, MAX_MOVE_SPEED } from '../data/balance';
import { itemDef, type ItemDef } from '../data/items';
import { Team } from './map';
import type { World } from './world';
import type { Unit } from './unit';
import { recalcExtensions, attackHitHooks } from './combat';
import { targetMatchesFilter } from './targeting';

export interface ItemInstance {
  itemKey: string;
  charges: number;
  cooldownUntil: number;
  /** 瓶装符文 */
  runeKey?: string;
  runeExpiresAt?: number;
}

export function makeItem(key: string): ItemInstance {
  const def = itemDef(key);
  return { itemKey: key, charges: def.charges ?? 0, cooldownUntil: -Infinity };
}

/** 单位当前所处商店:'home' 基地 | 'secret' 秘密 | null。 */
export function shopAt(w: World, u: Unit): 'home' | 'secret' | null {
  for (const s of w.map.shops) {
    if (s.team !== u.team) continue;
    if (V.dist(u.pos, s.pos) <= s.range) return s.secret ? 'secret' : 'home';
  }
  return null;
}

function freeSlot(arr: (ItemInstance | null)[]): number {
  return arr.findIndex((s) => s === null);
}

export type BuyResult = 'ok' | 'ok_stash' | 'no_gold' | 'no_shop' | 'full';

/**
 * 购买:必须处于对应商店范围(死亡时可购入储藏)。
 * 普通商店售非秘密品;秘密商店只售秘密品。满背包 → 储藏(仅基地)。
 */
export function buyItem(w: World, hero: Unit, key: string): BuyResult {
  const def = itemDef(key);
  const m = hero.heroMeta;
  if (!m) return 'no_shop';

  const at = hero.alive ? shopAt(w, hero) : 'home'; // 死亡时视为基地购买(进储藏)
  const allowed = def.secretShop ? at === 'secret' : at === 'home';
  if (!allowed) return 'no_shop';
  if (m.gold < def.cost) return 'no_gold';

  const intoInventory = hero.alive && at !== null;
  // 充能合并
  if (def.stackCharges) {
    const existing = (intoInventory ? hero.inventory : hero.stash).find((s) => s?.itemKey === key);
    if (existing) {
      existing.charges += def.charges ?? 1;
      m.gold -= def.cost;
      return intoInventory ? 'ok' : 'ok_stash';
    }
  }
  let slot = intoInventory ? freeSlot(hero.inventory) : -1;
  if (slot >= 0) {
    hero.inventory[slot] = makeItem(key);
    m.gold -= def.cost;
    afterInventoryChange(w, hero);
    return 'ok';
  }
  // 背包满或死亡 → 储藏(仅基地商店语义)
  if (def.secretShop && hero.alive) return 'full'; // 秘密商店不送储藏
  const stashSlot = freeSlot(hero.stash);
  if (stashSlot < 0) return 'full';
  hero.stash[stashSlot] = makeItem(key);
  m.gold -= def.cost;
  return 'ok_stash';
}

/** 出售:商店范围内,50% 返还。 */
export function sellItem(w: World, hero: Unit, slot: number, fromStash = false): boolean {
  const arr = fromStash ? hero.stash : hero.inventory;
  const inst = arr[slot];
  if (!inst || !hero.heroMeta) return false;
  if (!fromStash && shopAt(w, hero) === null) return false;
  const def = itemDef(inst.itemKey);
  hero.heroMeta.gold += Math.floor(def.cost * SELL_REFUND);
  arr[slot] = null;
  afterInventoryChange(w, hero);
  return true;
}

/** 储藏 → 背包(需在基地商店范围)。 */
export function takeFromStash(w: World, hero: Unit, stashSlot: number): boolean {
  const inst = hero.stash[stashSlot];
  if (!inst) return false;
  if (shopAt(w, hero) !== 'home') return false;
  const slot = freeSlot(hero.inventory);
  if (slot < 0) return false;
  hero.inventory[slot] = inst;
  hero.stash[stashSlot] = null;
  afterInventoryChange(w, hero);
  return true;
}

export type ItemUseReason = 'dead' | 'empty-slot' | 'no-active' | 'cooldown' | 'no-mana' | 'no-charges';

/**
 * 物品槽为何不能使用的细分原因(null = 可用)。UX 层(预拒绝文案)与 sim 共用此判断,
 * 避免 main.ts 自行复刻校验导致漂移。
 */
export function itemUseReason(w: World, hero: Unit, slot: number): ItemUseReason | null {
  if (!hero.alive) return 'dead';
  const inst = hero.inventory[slot];
  if (!inst) return 'empty-slot';
  const def = itemDef(inst.itemKey);
  if (!def.active) return 'no-active';
  if (w.time < inst.cooldownUntil) return 'cooldown';
  if (def.active.manaCost && hero.mp < def.active.manaCost) return 'no-mana';
  if (def.charges !== undefined && inst.charges <= 0) return 'no-charges';
  return null;
}

/** 使用物品。 */
export function useItem(w: World, hero: Unit, slot: number, pos?: { x: number; y: number }, target?: Unit): boolean {
  const inst = hero.inventory[slot];
  if (!inst || !hero.alive) return false;
  const def = itemDef(inst.itemKey);
  if (!def.active) return false;
  if (w.time < inst.cooldownUntil) return false;
  if (def.active.manaCost && hero.mp < def.active.manaCost) return false;
  // 可再充能物品(魔棒/药瓶)由 onUse 自管充能;一次性消耗品需有充能
  if (def.charges !== undefined && !def.rechargeable && inst.charges <= 0) return false;
  if (def.active.targetMode === 'point' && !pos) return false;
  if (def.active.targetMode === 'unit' && !target) return false;
  // 权威目标校验:单位目标须满足声明的队伍/种类过滤
  if (def.active.targetMode === 'unit' && target &&
      !targetMatchesFilter(hero, target, def.active.targetTeam, def.active.targetKind)) return false;
  if (def.active.castRange && pos && def.active.castRange < 90000) {
    if (V.dist(hero.pos, pos) > def.active.castRange) {
      pos = V.add(hero.pos, V.scale(V.norm(V.sub(pos, hero.pos)), def.active.castRange));
    }
  }

  const ok = def.active.onUse(w, hero, pos, target);
  if (!ok) return false;
  if (def.active.manaCost) hero.mp -= def.active.manaCost;
  inst.cooldownUntil = w.time + def.active.cooldown;
  if (def.charges !== undefined && !def.rechargeable) {
    inst.charges--;
    if (inst.charges <= 0) {
      hero.inventory[slot] = null;
      afterInventoryChange(w, hero);
    }
  }
  return true;
}

/** 持有型 modifier 同步(辉光/号角/战旗等)。 */
export function syncHolderModifiers(w: World, hero: Unit): void {
  const held = new Set<string>();
  for (const inst of hero.inventory) {
    if (!inst) continue;
    const def = itemDef(inst.itemKey);
    if (def.holderModifier) held.add(def.holderModifier.key);
  }
  // 移除失去的:凡本函数创建的持有型 modifier(标记 __holder),物品已不在背包即移除。
  // 用标记而非 def.aura 判定——否则无光环的持有型 modifier(如林肯法球的格挡标记)会永久泄漏(D1);
  // 同时用标记区别于带 item_ 前缀的限时主动 buff(item_bkb 等),避免误删。
  for (let i = hero.modifiers.length - 1; i >= 0; i--) {
    const m = hero.modifiers[i];
    if (m.data?.__holder === 1 && !held.has(m.key) && m.sourceId === hero.id) {
      hero.modifiers.splice(i, 1);
    }
  }
  // 补充新增的
  for (const inst of hero.inventory) {
    if (!inst) continue;
    const def = itemDef(inst.itemKey);
    if (!def.holderModifier) continue;
    if (!hero.modifiers.some((m) => m.key === def.holderModifier!.key && m.sourceId === hero.id)) {
      hero.modifiers.push({
        key: def.holderModifier.key,
        sourceId: hero.id,
        expiresAt: Infinity,
        def: def.holderModifier,
        data: { __holder: 1 },
      });
    }
  }
}

/** 背包变化后的钩子(合成检查由 recipes 注册)。 */
export const inventoryHooks: Array<(w: World, hero: Unit) => void> = [];
inventoryHooks.push(syncHolderModifiers);
export function afterInventoryChange(w: World, hero: Unit): void {
  for (const h of inventoryHooks) h(w, hero);
}

/** 物品数值折算进 calc(含背包,不含储藏)。 */
function itemFold(u: Unit): void {
  if (!u.isHero()) return;
  const c = u.calc;
  let msFlat = 0, msPct = 0, dmgPct = 0;
  for (const inst of u.inventory) {
    if (!inst) continue;
    const def = itemDef(inst.itemKey);
    const s = def.stats;
    if (!s) continue;
    c.maxHp += s.bonusHp ?? 0;
    c.maxMp += s.bonusMp ?? 0;
    c.dmgMin += s.bonusDamage ?? 0;
    c.dmgMax += s.bonusDamage ?? 0;
    dmgPct += s.bonusDamagePct ?? 0;
    c.armor += s.bonusArmor ?? 0;
    c.ias += s.bonusAttackSpeed ?? 0;
    msFlat += s.bonusMoveSpeed ?? 0;
    msPct += s.bonusMoveSpeedPct ?? 0;
    u.bonusAttr.str += s.bonusStr ?? 0;
    u.bonusAttr.agi += s.bonusAgi ?? 0;
    u.bonusAttr.int += s.bonusInt ?? 0;
    c.hpRegen += s.bonusHpRegen ?? 0;
    c.mpRegen += s.bonusMpRegen ?? 0;
    c.magicResist += s.bonusMagicResist ?? 0; // 累加,统一 clamp 见 combat.recalcUnit
    if (s.evasion) c.evasion = 1 - (1 - c.evasion) * (1 - s.evasion); // 独立概率叠加
    if (s.trueStrike) c.trueStrike = true;
    if ((s.critChance ?? 0) > c.critChance) {
      c.critChance = s.critChance!;
      c.critMultiplier = s.critMultiplier ?? 1.5;
    }
    c.lifesteal += s.lifesteal ?? 0;
    c.attackRange += s.bonusAttackRange ?? 0;
    c.trueSight = Math.max(c.trueSight, s.trueSightRadius ?? 0);
    c.spellAmp += s.spellAmp ?? 0;
    if (s.incomingDamageReduction) c.incomingDamageReduction = 1 - (1 - c.incomingDamageReduction) * (1 - s.incomingDamageReduction); // 独立乘算
  }
  if (dmgPct !== 0) { c.dmgMin *= 1 + dmgPct; c.dmgMax *= 1 + dmgPct; }
  if (msFlat !== 0 || msPct !== 0) {
    c.moveSpeed = c.moveSpeed <= 0 ? 0 : Math.min(MAX_MOVE_SPEED, (c.moveSpeed + msFlat) * (1 + msPct));
  }
}
recalcExtensions.unshift(itemFold); // 在英雄属性折算前(属性加成需先入 bonusAttr)

// 物品攻击触发(法球/特效):命中后遍历攻击者背包
attackHitHooks.push((w, attacker, target, dealt) => {
  if (dealt <= 0) return;
  for (const inst of attacker.inventory) {
    if (!inst) continue;
    itemDef(inst.itemKey).onAttack?.(w, attacker, target, dealt);
  }
});

const STICK_CAP: Record<string, number> = { magic_stick: 10, magic_wand: 17 };

export function installItems(w: World): void {
  w.systems.push((world) => {
    // 魔棒充能:敌方英雄在 1200 内施法完成 → +1
    for (const e of world.events) {
      if (e.kind !== 'cast_done') continue;
      const caster = world.getUnit(e.unitId);
      if (!caster?.isHero()) continue;
      for (const h of world.units.values()) {
        if (!h.isHero() || !h.alive || h.team === caster.team) continue;
        if (V.dist(h.pos, caster.pos) > 1200) continue;
        for (const inst of h.inventory) {
          if (!inst) continue;
          const cap = STICK_CAP[inst.itemKey];
          if (cap && inst.charges < cap) inst.charges++;
        }
      }
    }
    // 守卫到期由 modifier onExpire 处理;这里清理已死守卫;泉水续瓶
    if (world.tick % 30 === 0) {
      for (const u of [...world.units.values()]) {
        if (u.kind === 'ward' && !u.alive && world.time - u.diedAt > 2) world.removeUnit(u.id);
      }
      for (const f of world.units.values()) {
        if (!f.alive || f.buildingKind !== 'fountain') continue;
        for (const ally of world.queryRadius(f.pos, 1100, (x) => x.team === f.team && x.isHero())) {
          for (const inst of ally.inventory) {
            if (inst?.itemKey === 'bottle' && inst.charges < 3 && !inst.runeKey) inst.charges = 3;
          }
        }
      }
    }
  });
}
