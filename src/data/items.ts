/**
 * 物品定义(全部原创命名)。基础件给数值,主动件带 onUse,合成件带 recipe。
 * 价格与数值为经典量级的原创配置,集中可调。
 */
import { V, type Vec2 } from '../core/vec2';
import type { StatMods } from '../sim/modifiers';
import type { World } from '../sim/world';
import type { Unit } from '../sim/unit';
import { applyModifier, hasModifier } from '../sim/modifiers';
import { blinkTo } from '../sim/abilities';

export type ItemCategory = 'consumable' | 'attribute' | 'weapon' | 'armor' | 'arcane' | 'combined';

export interface ItemDef {
  key: string;
  name: string;
  cost: number;
  category: ItemCategory;
  secretShop?: boolean;
  stats?: Partial<StatMods>;
  /** 初始充能;0/undefined = 非充能品 */
  charges?: number;
  /** 同类购买合并充能 */
  stackCharges?: boolean;
  active?: {
    name: string;
    manaCost?: number;
    cooldown: number;
    targetMode: 'none' | 'point' | 'unit';
    castRange?: number;
    /** 返回 false 表示未生效(不消耗) */
    onUse(w: World, user: Unit, pos?: Vec2, target?: Unit): boolean;
  };
  recipe?: { components: string[]; recipeCost: number };
  description: string;
}

// ---------- 主动效果实现 ----------

/** 药膏/净化:受到玩家单位伤害即断。 */
function regenBuff(key: string, hpPerSec: number, mpPerSec: number, duration: number) {
  return (w: World, user: Unit): boolean => {
    if (user.hp >= user.calc.maxHp && hpPerSec > 0 && mpPerSec === 0) return false;
    applyModifier(w, user, {
      key, duration, isBuff: true,
      stats: { bonusHpRegen: hpPerSec, bonusMpRegen: mpPerSec },
      tickInterval: 0.1,
      onTick(world, u, m) {
        m.data!.start ??= m.expiresAt - duration;
        if (u.lastDamagedAt > (m.data!.start as number) + 0.05) {
          m.expiresAt = -Infinity; // 受击中断
        }
      },
    }, user.id);
    return true;
  };
}

/** TP:3 秒引导后传送到目标点附近最近的己方建筑旁。 */
function tpUse(w: World, user: Unit, pos?: Vec2): boolean {
  if (!pos) return false;
  let best: Unit | null = null;
  let bestD = Infinity;
  for (const b of w.units.values()) {
    if (!b.alive || !b.isBuilding() || b.team !== user.team) continue;
    const d = V.dist(b.pos, pos);
    if (d < bestD) { bestD = d; best = b; }
  }
  if (!best) return false;
  const dest = best.pos;
  w.emit({ kind: 'fx', fx: 'tp_start', pos: V.clone(user.pos), pos2: V.clone(dest), duration: 3 });
  applyModifier(w, user, {
    key: 'item_tp', duration: 3,
    states: { rooted: true, disarmed: true, silenced: true },
    tickInterval: 0.1,
    onTick(world, u, m) {
      // 被眩晕则取消
      if (u.modifiers.some((x) => x.def.states?.stunned)) {
        m.data!.cancelled = 1;
        m.expiresAt = -Infinity;
      }
    },
    onExpire(world, u, m) {
      if (m.data!.cancelled || !u.alive) return;
      const target = world.map.nearestWalkable(V.add(dest, { x: 120, y: 120 }));
      blinkTo(world, u, target);
      world.emit({ kind: 'fx', fx: 'tp_arrive', pos: V.clone(target) });
    },
  }, user.id);
  return true;
}

/** 守卫放置。 */
function placeWard(trueSight: boolean) {
  return (w: World, user: Unit, pos?: Vec2): boolean => {
    if (!pos) return false;
    const at = w.map.nearestWalkable(pos);
    const ward = w.spawnUnit({
      kind: 'ward', team: user.team, pos: at,
      name: trueSight ? '岗哨守卫' : '视域守卫',
      stats: {
        maxHp: 200, hpRegen: 0, maxMp: 0, mpRegen: 0, dmgMin: 0, dmgMax: 0,
        attackType: 'normal', armorType: 'unarmored', armor: 0, magicResist: 0,
        attackRange: 0, attackPoint: 0, bat: 1, projectileSpeed: 0,
        moveSpeed: 0, collisionRadius: 12,
        visionDay: trueSight ? 200 : 1600, visionNight: trueSight ? 200 : 1600,
        acquireRange: 0, bountyMin: 25, bountyMax: 25, xpBounty: 25,
      },
    });
    applyModifier(w, ward, { key: 'ward_invis', states: { invisible: true } }, ward.id);
    if (trueSight) applyModifier(w, ward, { key: 'ward_truesight', stats: { trueSightRadius: 900 } }, ward.id);
    applyModifier(w, ward, {
      key: 'ward_life', duration: 360,
      onExpire(world, u) { if (u.alive) { u.alive = false; u.diedAt = world.time; } },
    }, ward.id);
    return true;
  };
}

/** 显影之尘:周围敌人被标记显形。 */
function dustUse(w: World, user: Unit): boolean {
  let hit = 0;
  for (const e of w.queryRadius(user.pos, 1050, (t) => t.team !== user.team && !t.isBuilding())) {
    applyModifier(w, e, { key: 'item_dusted', duration: 12 }, user.id);
    hit++;
  }
  w.emit({ kind: 'fx', fx: 'dust', pos: V.clone(user.pos), radius: 1050 });
  return hit >= 0;
}

// ---------- 物品表 ----------

export const ITEMS: ItemDef[] = [
  // 消耗品
  { key: 'salve', name: '治疗药膏', cost: 115, category: 'consumable', charges: 1,
    active: { name: '治疗', cooldown: 0, targetMode: 'none', onUse: regenBuff('item_salve', 40, 0, 10) },
    description: '10 秒内恢复 400 生命,受击中断。' },
  { key: 'clarity', name: '净化药水', cost: 50, category: 'consumable', charges: 1,
    active: { name: '回蓝', cooldown: 0, targetMode: 'none', onUse: regenBuff('item_clarity', 0, 4.5, 30) },
    description: '30 秒内恢复 135 法力,受击中断。' },
  { key: 'tp', name: '回城卷轴', cost: 135, category: 'consumable', charges: 1, stackCharges: true,
    active: { name: '传送', manaCost: 75, cooldown: 0, targetMode: 'point', castRange: 99999, onUse: tpUse },
    description: '引导 3 秒后传送至目标点附近的己方建筑。' },
  { key: 'ward_obs', name: '视域守卫', cost: 150, category: 'consumable', charges: 2, stackCharges: true,
    active: { name: '插眼', cooldown: 1, targetMode: 'point', castRange: 500, onUse: placeWard(false) },
    description: '放置隐形守卫,提供 1600 视野,持续 6 分钟。' },
  { key: 'ward_sentry', name: '岗哨守卫', cost: 200, category: 'consumable', charges: 2, stackCharges: true,
    active: { name: '插真眼', cooldown: 1, targetMode: 'point', castRange: 500, onUse: placeWard(true) },
    description: '放置隐形守卫,提供 900 真视,持续 6 分钟。' },
  { key: 'dust', name: '显影之尘', cost: 180, category: 'consumable', charges: 2, stackCharges: true,
    active: { name: '显影', cooldown: 60, targetMode: 'none', onUse: dustUse },
    description: '显形周围 1050 内的隐形敌人,持续 12 秒。' },

  // 属性散件
  { key: 'branch', name: '铁树枝', cost: 53, category: 'attribute',
    stats: { bonusStr: 1, bonusAgi: 1, bonusInt: 1 }, description: '+1 全属性。' },
  { key: 'circlet', name: '全能圆环', cost: 185, category: 'attribute',
    stats: { bonusStr: 2, bonusAgi: 2, bonusInt: 2 }, description: '+2 全属性。' },
  { key: 'gauntlet', name: '力量手套', cost: 150, category: 'attribute',
    stats: { bonusStr: 3 }, description: '+3 力量。' },
  { key: 'slippers', name: '敏捷便鞋', cost: 150, category: 'attribute',
    stats: { bonusAgi: 3 }, description: '+3 敏捷。' },
  { key: 'mantle', name: '智慧斗篷', cost: 150, category: 'attribute',
    stats: { bonusInt: 3 }, description: '+3 智力。' },
  { key: 'belt', name: '巨人腰带', cost: 450, category: 'attribute',
    stats: { bonusStr: 6 }, description: '+6 力量。' },
  { key: 'band', name: '疾风束带', cost: 450, category: 'attribute',
    stats: { bonusAgi: 6 }, description: '+6 敏捷。' },
  { key: 'robe', name: '贤者长袍', cost: 450, category: 'attribute',
    stats: { bonusInt: 6 }, description: '+6 智力。' },
  { key: 'ogre_axe', name: '巨力之斧', cost: 1000, category: 'attribute',
    stats: { bonusStr: 10 }, description: '+10 力量。' },
  { key: 'blade_alacrity', name: '灵风之刃', cost: 1000, category: 'attribute',
    stats: { bonusAgi: 10 }, description: '+10 敏捷。' },
  { key: 'staff_wizardry', name: '贤者法杖', cost: 1000, category: 'attribute',
    stats: { bonusInt: 10 }, description: '+10 智力。' },

  // 武器
  { key: 'broadsword', name: '铁阔剑', cost: 1000, category: 'weapon',
    stats: { bonusDamage: 10 }, description: '+10 攻击力。' },
  { key: 'claymore', name: '玄铁巨剑', cost: 1400, category: 'weapon',
    stats: { bonusDamage: 16 }, description: '+16 攻击力。' },
  { key: 'mithril_hammer', name: '秘银战锤', cost: 1600, category: 'weapon',
    stats: { bonusDamage: 24 }, description: '+24 攻击力。' },
  { key: 'demon_edge', name: '恶魔之锋', cost: 2400, category: 'weapon', secretShop: true,
    stats: { bonusDamage: 46 }, description: '+46 攻击力。' },
  { key: 'sacred_relic', name: '圣者遗物', cost: 3800, category: 'weapon', secretShop: true,
    stats: { bonusDamage: 60 }, description: '+60 攻击力。' },
  { key: 'eaglehorn', name: '巨鹰长弓', cost: 3300, category: 'weapon', secretShop: true,
    stats: { bonusAgi: 25 }, description: '+25 敏捷。' },
  { key: 'reaver', name: '屠戮之刃', cost: 3000, category: 'weapon', secretShop: true,
    stats: { bonusStr: 25 }, description: '+25 力量。' },
  { key: 'mystic_staff', name: '神秘法环', cost: 2700, category: 'weapon', secretShop: true,
    stats: { bonusInt: 25 }, description: '+25 智力。' },
  { key: 'gloves_haste', name: '攻击手套', cost: 500, category: 'weapon',
    stats: { bonusAttackSpeed: 0.15 }, description: '+15% 攻击速度。' },
  { key: 'hyperstone', name: '极速宝石', cost: 2100, category: 'weapon',
    stats: { bonusAttackSpeed: 0.55 }, description: '+55% 攻击速度。' },

  // 防具与回复
  { key: 'chainmail', name: '锁子甲', cost: 550, category: 'armor',
    stats: { bonusArmor: 5 }, description: '+5 护甲。' },
  { key: 'platemail', name: '骑士板甲', cost: 1400, category: 'armor',
    stats: { bonusArmor: 10 }, description: '+10 护甲。' },
  { key: 'cloak', name: '抗魔斗篷', cost: 550, category: 'armor',
    stats: { bonusMagicResist: 0.15 }, description: '+15% 魔法抗性。' },
  { key: 'ring_regen', name: '恢复指环', cost: 350, category: 'armor',
    stats: { bonusHpRegen: 2 }, description: '+2 生命回复。' },
  { key: 'sobi_mask', name: '冥思面纱', cost: 325, category: 'arcane',
    stats: { bonusMpRegen: 0.65 }, description: '+0.65 法力回复。' },
  { key: 'vitality_booster', name: '生命宝珠', cost: 1100, category: 'armor', secretShop: true,
    stats: { bonusHp: 250 }, description: '+250 生命上限。' },
  { key: 'energy_booster', name: '法力宝珠', cost: 1000, category: 'arcane', secretShop: true,
    stats: { bonusMp: 250 }, description: '+250 法力上限。' },
  { key: 'point_booster', name: '聚能宝珠', cost: 1200, category: 'arcane', secretShop: true,
    stats: { bonusHp: 175, bonusMp: 175 }, description: '+175 生命与法力上限。' },

  // 鞋
  { key: 'boots', name: '速度之靴', cost: 500, category: 'armor',
    stats: { bonusMoveSpeed: 55 }, description: '+55 移动速度。' },
];

export const ITEM_BY_KEY = new Map(ITEMS.map((i) => [i.key, i]));

export function itemDef(key: string): ItemDef {
  const def = ITEM_BY_KEY.get(key);
  if (!def) throw new Error(`unknown item ${key}`);
  return def;
}

/** 显影标记查询(vision 使用)。 */
export function isDusted(u: Unit): boolean {
  return hasModifier(u, 'item_dusted');
}
