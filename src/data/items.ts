/**
 * 物品定义(全部原创命名)。基础件给数值,主动件带 onUse,合成件带 recipe。
 * 价格与数值为经典量级的原创配置,集中可调。
 */
import { V, type Vec2 } from '../core/vec2';
import type { TargetKindFilter, TargetTeamFilter } from '../sim/targeting';
import type { StatMods } from '../sim/modifiers';
import type { World } from '../sim/world';
import type { Unit } from '../sim/unit';
import { applyModifier, hasModifier } from '../sim/modifiers';
import { blinkTo } from '../sim/abilities';
import { addXp } from '../sim/economy';

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
    targetTeam?: TargetTeamFilter;
    targetKind?: TargetKindFilter;
    castRange?: number;
    /** 穿魔免:对魔免敌方单体仍可施(否则 useItem 预筛拒绝,见 M11)。无敌仍一律拦。 */
    piercesSpellImmunity?: boolean;
    /** 返回 false 表示未生效(不消耗) */
    onUse(w: World, user: Unit, pos?: Vec2, target?: Unit): boolean;
  };
  /** 攻击命中触发(法球/特效类:漩涡链电、黯灭减甲等) */
  onAttack?(w: World, attacker: Unit, target: Unit, dealt: number): void;
  /** 充能可再生(魔棒类):使用不删除物品 */
  rechargeable?: boolean;
  /** 持有期间常驻 modifier(光环/灼烧等),背包同步管理 */
  holderModifier?: import('../sim/modifiers').ModifierDef;
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
  let def = ITEM_BY_KEY.get(key);
  if (!def) {
    // 索引自愈:文件尾部追加的物品在索引构建后注册
    def = ITEMS.find((i) => i.key === key);
    if (def) ITEM_BY_KEY.set(key, def);
  }
  if (!def) throw new Error(`unknown item ${key}`);
  return def;
}

/** 显影标记查询(vision 使用)。 */
export function isDusted(u: Unit): boolean {
  return hasModifier(u, 'item_dusted');
}

// ---------- 基础补充(合成原料) ----------
ITEMS.push(
  { key: 'magic_stick', name: '魔力短杖', cost: 200, category: 'arcane', charges: 0, rechargeable: true,
    active: {
      name: '能量释放', cooldown: 13, targetMode: 'none',
      onUse(w, user) {
        const inst = user.inventory.find((i) => i?.itemKey === 'magic_stick');
        if (!inst || inst.charges <= 0) return false;
        const restore = inst.charges * 15;
        user.hp = Math.min(user.calc.maxHp, user.hp + restore);
        user.mp = Math.min(user.calc.maxMp, user.mp + restore);
        inst.charges = 0;
        return true;
      },
    },
    description: '周围敌人施法时获得充能(上限 10);使用时每充能恢复 15 生命/法力。' },
  { key: 'morbid_mask', name: '噬血面具', cost: 900, category: 'weapon',
    stats: { lifesteal: 0.10 }, description: '攻击吸取 10% 伤害为生命。' },
);

// ---------- 合成件(数值型;主动型效果在 advancedItems 中注入) ----------
ITEMS.push(
  { key: 'bracer', name: '坚韧护腕', cost: 525, category: 'combined',
    stats: { bonusStr: 6, bonusAgi: 2, bonusInt: 2 },
    recipe: { components: ['gauntlet', 'circlet'], recipeCost: 190 },
    description: '+6 力量 +2 敏捷 +2 智力。' },
  { key: 'wraith_band', name: '灵巧之环', cost: 525, category: 'combined',
    stats: { bonusAgi: 6, bonusStr: 2, bonusInt: 2 },
    recipe: { components: ['slippers', 'circlet'], recipeCost: 190 },
    description: '+6 敏捷 +2 力量 +2 智力。' },
  { key: 'null_talisman', name: '智慧坠饰', cost: 525, category: 'combined',
    stats: { bonusInt: 6, bonusStr: 2, bonusAgi: 2 },
    recipe: { components: ['mantle', 'circlet'], recipeCost: 190 },
    description: '+6 智力 +2 力量 +2 敏捷。' },
  { key: 'power_treads', name: '动力之靴', cost: 1450, category: 'combined',
    stats: { bonusMoveSpeed: 60, bonusAttackSpeed: 0.20, bonusStr: 6 },
    recipe: { components: ['boots', 'gloves_haste', 'belt'], recipeCost: 0 },
    description: '+60 移速 +20% 攻速 +6 力量。' },
  { key: 'buriza', name: '风暴重炮', cost: 4200, category: 'combined',
    stats: { bonusDamage: 56, critChance: 0.2, critMultiplier: 2.2 },
    recipe: { components: ['demon_edge', 'broadsword'], recipeCost: 800 },
    description: '+56 攻击,20% 概率 2.2 倍暴击。' },
  { key: 'heart', name: '巨人之心', cost: 5300, category: 'combined',
    stats: { bonusStr: 30, bonusHp: 300, bonusHpRegen: 10 },
    recipe: { components: ['reaver', 'vitality_booster'], recipeCost: 1200 },
    description: '+30 力量 +300 生命 +10 生命回复。' },
  { key: 'hood', name: '隐者兜帽', cost: 1100, category: 'combined',
    stats: { bonusMagicResist: 0.30, bonusHpRegen: 4 },
    recipe: { components: ['cloak', 'ring_regen'], recipeCost: 200 },
    description: '+30% 魔抗 +4 生命回复。' },
);

// ---------- 高级主动/光环装备 ----------
import { spellDamage } from '../sim/abilities';
import { applyRune } from '../sim/runes';
import { purge } from '../sim/modifiers';

ITEMS.push(
  { key: 'magic_wand', name: '强化魔杖', cost: 509, category: 'combined', charges: 0, rechargeable: true,
    stats: { bonusStr: 3, bonusAgi: 3, bonusInt: 3 },
    recipe: { components: ['magic_stick', 'branch', 'branch', 'branch'], recipeCost: 150 },
    active: {
      name: '能量释放', cooldown: 13, targetMode: 'none',
      onUse(w, user) {
        const inst = user.inventory.find((i) => i?.itemKey === 'magic_wand');
        if (!inst || inst.charges <= 0) return false;
        const restore = inst.charges * 15;
        user.hp = Math.min(user.calc.maxHp, user.hp + restore);
        user.mp = Math.min(user.calc.maxMp, user.mp + restore);
        inst.charges = 0;
        return true;
      },
    },
    description: '+3 全属性;周围敌人施法时积攒充能(上限 17),使用时每充能恢复 15 生命/法力。' },

  { key: 'blink', name: '闪烁短刃', cost: 2150, category: 'arcane',
    active: {
      name: '闪烁', cooldown: 14, targetMode: 'point', castRange: 99999,
      onUse(w, user, pos) {
        if (!pos) return false;
        if (w.time < user.blinkLockedUntil) return false;
        const d = V.dist(user.pos, pos);
        const MAX = 1200;
        const dest = d <= MAX ? pos : V.add(user.pos, V.scale(V.norm(V.sub(pos, user.pos)), MAX * 0.8));
        blinkTo(w, user, dest);
        w.emit({ kind: 'fx', fx: 'blink', pos: V.clone(user.pos) });
        return true;
      },
    },
    description: '闪烁至目标点(最远 1200);受到英雄伤害后 3 秒内不可使用。' },

  { key: 'bkb', name: '永恒壁垒', cost: 3900, category: 'combined',
    stats: { bonusDamage: 24, bonusStr: 10 },
    recipe: { components: ['mithril_hammer', 'ogre_axe'], recipeCost: 1300 },
    active: {
      name: '魔法免疫', cooldown: 75, targetMode: 'none',
      onUse(w, user) {
        purge(w, user, false, true); // 强驱散:解除含硬控的减益
        applyModifier(w, user, {
          key: 'item_bkb', duration: 6, isBuff: true,
          states: { magicImmune: true },
        }, user.id);
        w.emit({ kind: 'fx', fx: 'bkb', pos: V.clone(user.pos), radius: 120 });
        return true;
      },
    },
    description: '+24 攻击 +10 力量;主动:魔法免疫 6 秒。' },

  { key: 'radiance', name: '辉光战甲', cost: 5150, category: 'combined',
    stats: { bonusDamage: 60 },
    recipe: { components: ['sacred_relic'], recipeCost: 1350 },
    holderModifier: {
      key: 'item_radiance_aura',
      aura: {
        radius: 700, affects: 'enemy',
        grant: {
          key: 'item_radiance_burn', tickInterval: 0.5,
          onTick(w, u, m) {
            const src = w.getUnit(m.sourceId);
            if (src) spellDamage(w, src, u, 17.5); // 35 dps
          },
        },
      },
    },
    description: '+60 攻击;灼烧周围 700 内敌人,每秒 35 点魔法伤害。' },

  { key: 'satanic', name: '噬血魔刃', cost: 5000, category: 'combined',
    stats: { bonusStr: 25, lifesteal: 0.20 },
    recipe: { components: ['reaver', 'morbid_mask'], recipeCost: 1100 },
    active: {
      name: '不洁狂热', cooldown: 35, targetMode: 'none',
      onUse(w, user) {
        applyModifier(w, user, {
          key: 'item_satanic_active', duration: 4, isBuff: true,
          stats: { lifesteal: 1.0 },
        }, user.id);
        return true;
      },
    },
    description: '+25 力量,攻击吸血 20%;主动:4 秒内吸血提升至 120%。' },

  { key: 'assault', name: '战争号角', cost: 5350, category: 'combined',
    stats: { bonusArmor: 10, bonusAttackSpeed: 0.55 },
    recipe: { components: ['platemail', 'hyperstone', 'chainmail'], recipeCost: 1300 },
    holderModifier: {
      key: 'item_assault_aura',
      aura: [
        { radius: 900, affects: 'ally', grant: { key: 'item_assault_buff', isBuff: true, stats: { bonusAttackSpeed: 0.30, bonusArmor: 5 } } },
        { radius: 900, affects: 'enemy', grant: { key: 'item_assault_neg', stats: { bonusArmor: -5 } } },
      ],
    },
    description: '+10 护甲 +55% 攻速;光环:友军 +30% 攻速、+5 护甲;敌军 -5 护甲。' },

  { key: 'shiva', name: '寒冰守卫', cost: 4700, category: 'combined',
    stats: { bonusArmor: 15, bonusInt: 25 },
    recipe: { components: ['platemail', 'mystic_staff'], recipeCost: 600 },
    active: {
      name: '寒霜冲击', manaCost: 100, cooldown: 30, targetMode: 'none',
      onUse(w, user) {
        for (const e of w.queryRadius(user.pos, 700, (t) => t.team !== user.team && !t.isBuilding() && t.kind !== 'ward')) {
          spellDamage(w, user, e, 200);
          applyModifier(w, e, { key: 'item_shiva_slow', duration: 3, stats: { bonusMoveSpeedPct: -0.4 } }, user.id);
        }
        w.emit({ kind: 'fx', fx: 'frostnova', pos: V.clone(user.pos), radius: 700 });
        return true;
      },
    },
    description: '+15 护甲 +25 智力;主动:冰环爆发 200 伤害并减速 40%。' },

  { key: 'arcane_boots', name: '秘法之靴', cost: 1500, category: 'combined',
    stats: { bonusMoveSpeed: 55, bonusMp: 250 }, // 含能量之球 +250 法力
    recipe: { components: ['boots', 'energy_booster'], recipeCost: 0 },
    active: {
      name: '法力涌动', cooldown: 45, targetMode: 'none',
      onUse(w, user) {
        for (const a of w.queryRadius(user.pos, 600, (t) => t.team === user.team && t.isHero())) {
          a.mp = Math.min(a.calc.maxMp, a.mp + 135);
        }
        return true;
      },
    },
    description: '+55 移速 +250 法力;主动:为周围英雄恢复 135 法力。' },

  { key: 'vladmir', name: '吸血战旗', cost: 2275, category: 'combined',
    recipe: { components: ['morbid_mask', 'ring_regen', 'sobi_mask'], recipeCost: 700 },
    holderModifier: {
      key: 'item_vladmir_aura',
      aura: {
        radius: 900, affects: 'ally',
        grant: { key: 'item_vladmir_buff', isBuff: true, stats: { lifesteal: 0.15, bonusDamagePct: 0.12, bonusArmor: 5 } },
      },
    },
    description: '光环:周围友军 +15% 吸血、+12% 攻击力、+5 护甲。' },
);

// ---------- 魔法药瓶 ----------
ITEMS.push(
  { key: 'bottle', name: '魔法药瓶', cost: 600, category: 'consumable', charges: 3, rechargeable: true,
    active: {
      name: '畅饮', cooldown: 0.5, targetMode: 'none',
      onUse(w, user) {
        const inst = user.inventory.find((i) => i?.itemKey === 'bottle');
        if (!inst) return false;
        // 瓶中有符优先释放
        if (inst.runeKey) {
          applyRune(w, user, inst.runeKey as import('./balance').RuneType);
          inst.runeKey = undefined;
          inst.runeExpiresAt = undefined;
          return true;
        }
        if (inst.charges <= 0) return false;
        if (user.hp >= user.calc.maxHp && user.mp >= user.calc.maxMp) return false;
        applyModifier(w, user, {
          key: 'item_bottle_regen', duration: 3, isBuff: true,
          stats: { bonusHpRegen: 45, bonusMpRegen: 23 },
          tickInterval: 0.1,
          onTick(world, u, m) {
            m.data!.start ??= m.expiresAt - 3;
            if (u.lastDamagedAt > (m.data!.start as number) + 0.05) m.expiresAt = -Infinity;
          },
        }, user.id);
        inst.charges--;
        return true;
      },
    },
    description: '3 充能;每次 3 秒内恢复 135 生命 70 法力,受击中断;泉水自动续满;可储存符文。' },
);

// ---------- 进阶物品批次 2(法球/控制/位移/召唤) ----------
import { summonUnit } from '../sim/abilities';
import { spellDamage as _spellDamage } from '../sim/abilities';

ITEMS.push(
  // 远行鞋:全图传送 + 高额移速
  { key: 'travel_boots', name: '远行之靴', cost: 2200, category: 'combined',
    stats: { bonusMoveSpeed: 100 },
    recipe: { components: ['boots'], recipeCost: 1700 },
    active: {
      name: '远行传送', manaCost: 50, cooldown: 50, targetMode: 'point', castRange: 99999,
      onUse(w, user, pos) {
        if (!pos) return false;
        let best: Unit | null = null, bestD = Infinity;
        for (const b of w.units.values()) {
          if (!b.alive || b.team !== user.team || !(b.isBuilding() || b.kind === 'creep')) continue;
          const d = V.dist(b.pos, pos); if (d < bestD) { bestD = d; best = b; }
        }
        const dest = best ? best.pos : pos;
        applyModifier(w, user, {
          key: 'item_travel', duration: 3, states: { rooted: true, disarmed: true, silenced: true },
          onExpire(world, u, m) {
            if (m.data!.cancelled || !u.alive) return;
            blinkTo(world, u, world.map.nearestWalkable(V.add(dest, { x: 100, y: 100 })));
            world.emit({ kind: 'fx', fx: 'tp_arrive', pos: V.clone(dest) });
          },
          tickInterval: 0.1,
          onTick(world, u, m) { if (u.modifiers.some((x) => x.def.states?.stunned)) { m.data!.cancelled = 1; m.expiresAt = -Infinity; } },
        }, user.id);
        return true;
      },
    },
    description: '+100 移速;主动:传送到任意己方单位附近(全图)。' },

  // 诡计之雾:小队隐身
  { key: 'smoke', name: '诡计之雾', cost: 100, category: 'consumable', charges: 1,
    active: {
      name: '隐匿', cooldown: 0, targetMode: 'none',
      onUse(w, user) {
        for (const a of w.queryRadius(user.pos, 1200, (t) => t.team === user.team && t.isHero())) {
          applyModifier(w, a, { key: 'item_smoke', duration: 35, isBuff: true, states: { invisible: true }, stats: { bonusMoveSpeed: 15 } }, user.id);
        }
        return true;
      },
    },
    description: '使附近友方英雄隐身(攻击或靠近敌方建筑则失效),便于游走。' },

  // 影刃:隐身突袭
  { key: 'shadow_blade', name: '影锋', cost: 3000, category: 'combined',
    stats: { bonusDamage: 30, bonusAttackSpeed: 0.3 },
    recipe: { components: ['claymore', 'gloves_haste'], recipeCost: 1100 },
    active: {
      name: '隐匿突袭', cooldown: 16, targetMode: 'none',
      onUse(w, user) {
        applyModifier(w, user, { key: 'item_shadowblade', duration: 14, isBuff: true, states: { invisible: true }, stats: { bonusMoveSpeed: 30 } }, user.id);
        return true;
      },
    },
    description: '+30 攻击 +30% 攻速;主动:隐身并加速,下次攻击附带爆发(脱离即现身)。' },

  // 散夜对剑:敏捷/攻速/移速
  { key: 'yasha', name: '散叶之刃', cost: 2050, category: 'combined',
    stats: { bonusAgi: 16, bonusAttackSpeed: 0.15, bonusMoveSpeedPct: 0.1 },
    recipe: { components: ['blade_alacrity', 'band'], recipeCost: 600 },
    description: '+16 敏捷 +15% 攻速 +10% 移速。' },

  // 漩涡:攻击触发连锁闪电
  { key: 'maelstrom', name: '风暴之锤', cost: 3100, category: 'combined',
    stats: { bonusDamage: 24, bonusAttackSpeed: 0.25 },
    recipe: { components: ['mithril_hammer', 'gloves_haste', 'broadsword'], recipeCost: 0 },
    onAttack(w, attacker, target) {
      if (target.isBuilding()) return;
      if (!w.rng.chance(0.3)) return;
      // 连锁闪电:跳跃 4 次
      const visited = new Set<number>();
      let cur: Unit | undefined = target; let prev = attacker.pos;
      for (let i = 0; i < 4 && cur; i++) {
        visited.add(cur.id);
        _spellDamage(w, attacker, cur, 130);
        w.emit({ kind: 'fx', fx: 'lightning', pos: V.clone(prev), pos2: V.clone(cur.pos) });
        prev = cur.pos;
        cur = w.queryRadius(cur.pos, 500, (t) => t.team !== attacker.team && !t.isBuilding() && !visited.has(t.id) && t.kind !== 'ward')[0];
      }
    },
    description: '+24 攻击 +25% 攻速;攻击有 30% 概率触发连锁闪电(造成魔法伤害)。' },

  // 黯灭:攻击附带破甲
  { key: 'desolator', name: '湮灭之刃', cost: 3500, category: 'combined',
    stats: { bonusDamage: 50 },
    recipe: { components: ['mithril_hammer', 'mithril_hammer'], recipeCost: 300 },
    onAttack(w, attacker, target) {
      if (target.isBuilding()) return;
      applyModifier(w, target, { key: 'item_desolator_armor', duration: 7, stats: { bonusArmor: -6 } }, attacker.id);
    },
    description: '+50 攻击;攻击使目标护甲降低 6 点,持续 7 秒。' },

  // 林肯法球:格挡指向性法术(被动,每 13 秒一次)
  { key: 'linken', name: '守护宝珠', cost: 4800, category: 'combined',
    stats: { bonusDamage: 15, bonusStr: 10, bonusAgi: 10, bonusInt: 10, bonusHpRegen: 6, bonusMpRegen: 1.5 },
    recipe: { components: ['mystic_staff', 'vitality_booster'], recipeCost: 1000 },
    holderModifier: {
      key: 'item_linken_aura',
      // 法术屏障标记:格挡逻辑见 modifiers.tryLinkenBlock(在 abilities.executeCast / items.useItem 单体敌对路径检查)
    },
    description: '+15 攻击 +10 全属性 +生命/法力回复;每 13 秒格挡一次敌方单体指向技能/物品。' },

  // 飓风长戟:推动
  { key: 'force_staff', name: '原力法杖', cost: 2200, category: 'combined',
    stats: { bonusInt: 10, bonusHpRegen: 4 },
    recipe: { components: ['staff_wizardry', 'ring_regen', 'sobi_mask'], recipeCost: 525 },
    active: {
      name: '原力', cooldown: 15, targetMode: 'unit', targetTeam: 'any', castRange: 800,
      onUse(w, user, _pos, target) {
        const t = target ?? user;
        const dir = { x: Math.cos(t.facing), y: Math.sin(t.facing) };
        blinkTo(w, t, V.add(t.pos, V.scale(dir, 600)));
        w.emit({ kind: 'fx', fx: 'force', pos: V.clone(t.pos) });
        return true;
      },
    },
    description: '+10 智力 +4 生命回复;主动:将目标(可己可敌)朝其面向推开 600。' },

  // 阿托斯之棍:缠绕
  { key: 'atos', name: '挽紧之杖', cost: 2750, category: 'combined',
    stats: { bonusInt: 20, bonusHp: 250 },
    recipe: { components: ['staff_wizardry', 'vitality_booster'], recipeCost: 650 },
    active: {
      name: '缠绕', manaCost: 50, cooldown: 18, targetMode: 'unit', targetTeam: 'enemy', castRange: 800,
      onUse(w, user, _pos, target) {
        if (!target || target.team === user.team) return false;
        applyModifier(w, target, { key: 'item_atos_root', duration: 2.5, states: { rooted: true }, stats: { bonusMoveSpeedPct: -0.4 } }, user.id);
        return true;
      },
    },
    description: '+20 智力 +250 生命;主动:缠绕敌方目标 2.5 秒(无法移动)。' },

  // 微光披风:友军隐身保护
  { key: 'glimmer', name: '微光披风', cost: 1950, category: 'combined',
    stats: { bonusMagicResist: 0.16, bonusMpRegen: 1.5 },
    recipe: { components: ['cloak', 'sobi_mask'], recipeCost: 1075 },
    active: {
      name: '微光', cooldown: 15, targetMode: 'unit', targetTeam: 'allyOrSelf', castRange: 800,
      onUse(w, user, _pos, target) {
        const t = target && target.team === user.team ? target : user;
        applyModifier(w, t, { key: 'item_glimmer', duration: 5, isBuff: true, states: { invisible: true }, stats: { bonusMagicResist: 0.45, bonusMoveSpeedPct: 0.15 } }, user.id);
        return true;
      },
    },
    description: '+16% 魔抗;主动:使友军隐身并大幅提升魔抗 5 秒。' },

  // 慧光:破甲(主动,对目标与自身)
  { key: 'medallion', name: '勇气勋章', cost: 1075, category: 'combined',
    stats: { bonusArmor: 6, bonusMpRegen: 1.5 },
    recipe: { components: ['chainmail', 'sobi_mask'], recipeCost: 200 },
    active: {
      name: '强化勇气', cooldown: 8, targetMode: 'unit', targetTeam: 'any', castRange: 800,
      onUse(w, user, _pos, target) {
        if (!target) return false;
        applyModifier(w, target, { key: 'item_medallion_armor', duration: 7, stats: { bonusArmor: target.team === user.team ? 7 : -7 } }, user.id);
        return true;
      },
    },
    description: '+6 护甲;主动:削减敌方(或强化友方)7 点护甲,持续 7 秒。' },

  // 死灵书:召唤一对亡灵
  { key: 'necronomicon', name: '亡者之书', cost: 2660, category: 'combined',
    stats: { bonusInt: 12, bonusDamage: 18, bonusMpRegen: 2 },
    recipe: { components: ['staff_wizardry', 'belt'], recipeCost: 1210 },
    active: {
      name: '召唤亡者', manaCost: 50, cooldown: 80, targetMode: 'none',
      onUse(w, user) {
        for (let i = 0; i < 2; i++) {
          summonUnit(w, user, {
            name: '亡者随从', hp: 600, dmg: [40, 50], armor: 4, ms: 340,
            range: i === 0 ? 100 : 500, duration: 40, magicResist: 0.3,
            attackType: i === 0 ? 'normal' : 'pierce',
          }, V.add(user.pos, { x: i === 0 ? -80 : 80, y: 60 }), true);
        }
        return true;
      },
    },
    description: '+12 智力 +18 攻击;主动:召唤一近一远两个亡者随从作战 40 秒。' },

  // 血精石:生存核心
  { key: 'bloodstone', name: '血石', cost: 4400, category: 'combined',
    stats: { bonusHp: 500, bonusMp: 400, bonusHpRegen: 12, bonusMpRegen: 4 },
    recipe: { components: ['vitality_booster', 'energy_booster', 'point_booster'], recipeCost: 1100 },
    description: '+500 生命 +400 法力 +高额双回复:法师与前排的生存核心。' },

  // 银月纷争:沉默 + 法术增强
  { key: 'orchid', name: '纷争面纱', cost: 4800, category: 'combined',
    stats: { bonusInt: 25, bonusAttackSpeed: 0.3, bonusMpRegen: 2, spellAmp: 0.1 },
    recipe: { components: ['mystic_staff', 'hyperstone'], recipeCost: 0 },
    active: {
      name: '禁锢', manaCost: 0, cooldown: 18, targetMode: 'unit', targetTeam: 'enemy', castRange: 900,
      onUse(w, user, _pos, target) {
        if (!target || target.team === user.team) return false;
        applyModifier(w, target, { key: 'item_orchid_silence', duration: 5, states: { silenced: true } }, user.id);
        return true;
      },
    },
    description: '+25 智力 +30% 攻速 +10% 法术增强;主动:沉默目标 5 秒。' },

  // 卫士胫甲:回复与移速
  { key: 'tranquil', name: '静谧之鞋', cost: 925, category: 'combined',
    stats: { bonusMoveSpeed: 70, bonusArmor: 5, bonusHpRegen: 10 },
    recipe: { components: ['boots', 'ring_regen'], recipeCost: 75 },
    description: '+70 移速 +5 护甲 +10 生命回复:经济友好的续航之鞋。' },

  // 大根(通用神杖):全属性强化
  { key: 'scepter', name: '魔晶神杖', cost: 4200, category: 'combined',
    stats: { bonusStr: 10, bonusAgi: 10, bonusInt: 10, bonusHp: 175, bonusMp: 175 },
    recipe: { components: ['point_booster', 'staff_wizardry', 'ogre_axe', 'blade_alacrity'], recipeCost: 0 },
    description: '+10 全属性 +175 生命/法力:强化英雄综合能力的标志性神杖,并升级部分英雄的终极技能。' },
);

// ---------- 进阶物品批次 3(团战控制/法核/生存) ----------
import { modifierArea, alliesIn, damageArea, enemiesIn } from '../sim/abilities';

ITEMS.push(
  // 先锋盾:前排减伤
  { key: 'vanguard', name: '先锋之盾', cost: 2150, category: 'combined',
    stats: { bonusHp: 250, bonusHpRegen: 6, incomingDamageReduction: 0.12 },
    recipe: { components: ['vitality_booster', 'ring_regen'], recipeCost: 700 },
    description: '+250 生命 +6 生命回复;受到的所有伤害减免 12%(前排核心)。' },

  // 蝶舞之翼:敏捷核心终极
  { key: 'butterfly', name: '蝶舞之翼', cost: 5800, category: 'combined',
    stats: { bonusAgi: 30, bonusDamage: 30, bonusAttackSpeed: 0.3, evasion: 0.35 },
    recipe: { components: ['eaglehorn', 'blade_alacrity', 'blade_alacrity'], recipeCost: 500 },
    description: '+30 敏捷 +30 攻击 +30% 攻速 +35% 闪避:敏捷核心的标志性装备。' },

  // 寒霜之心:巨量属性 + 冰冷攻击减速
  { key: 'skadi', name: '寒霜之心', cost: 7500, category: 'combined',
    stats: { bonusStr: 16, bonusAgi: 16, bonusInt: 16, bonusHp: 200, bonusMp: 200 },
    recipe: { components: ['eaglehorn', 'reaver', 'point_booster'], recipeCost: 0 },
    onAttack(w, attacker, target) {
      if (target.isBuilding()) return;
      applyModifier(w, target, { key: 'item_skadi_cold', duration: 3, stats: { bonusMoveSpeedPct: -0.3, bonusAttackSpeed: -0.3 } }, attacker.id);
    },
    description: '+16 全属性 +200 生命/法力;攻击附带冰冷,使目标减速 3 秒(近战更强)。' },

  // 雷神之锤:漩涡升级,连锁更强 + 静电护盾
  { key: 'mjollnir', name: '雷神之锤', cost: 5200, category: 'combined',
    stats: { bonusDamage: 24, bonusAttackSpeed: 0.5 },
    recipe: { components: ['maelstrom', 'hyperstone'], recipeCost: 0 },
    onAttack(w, attacker, target) {
      if (target.isBuilding() || !w.rng.chance(0.35)) return;
      const visited = new Set<number>();
      let cur: Unit | undefined = target; let prev = attacker.pos;
      for (let i = 0; i < 5 && cur; i++) {
        visited.add(cur.id);
        _spellDamage(w, attacker, cur, 180);
        w.emit({ kind: 'fx', fx: 'lightning', pos: V.clone(prev), pos2: V.clone(cur.pos) });
        prev = cur.pos;
        cur = w.queryRadius(cur.pos, 550, (t) => t.team !== attacker.team && !t.isBuilding() && !visited.has(t.id) && t.kind !== 'ward')[0];
      }
    },
    active: {
      name: '静电护盾', cooldown: 25, targetMode: 'none',
      onUse(w, user) {
        applyModifier(w, user, { key: 'item_mjollnir_shield', duration: 15, isBuff: true, data: { retaliate: 0.35 } }, user.id);
        return true;
      },
    },
    description: '+24 攻击 +50% 攻速;攻击 35% 触发连锁闪电;主动:静电护盾,15 秒内反弹所受物理伤害。' },

  // 净魂之刃:法力燃烧 + 驱散
  { key: 'diffusal', name: '净魂之刃', cost: 2000, category: 'combined',
    stats: { bonusAgi: 22, bonusInt: 6 },
    recipe: { components: ['blade_alacrity', 'robe'], recipeCost: 550 },
    onAttack(w, attacker, target) {
      if (target.isBuilding() || target.calc.maxMp <= 0) return;
      const burn = Math.min(target.mp, 40);
      if (burn <= 0) return;
      target.mp -= burn;
      _spellDamage(w, attacker, target, burn * 0.8);
    },
    active: {
      name: '净魂', cooldown: 12, targetMode: 'unit', targetTeam: 'any', castRange: 600,
      onUse(w, user, _pos, target) {
        const t = target ?? user;
        if (t.team === user.team) { purge(w, t, false); return true; }
        purge(w, t, true);
        applyModifier(w, t, { key: 'item_diffusal_slow', duration: 4, stats: { bonusMoveSpeedPct: -0.4 } }, user.id);
        return true;
      },
    },
    description: '+22 敏捷 +6 智力;攻击燃烧目标法力并造成伤害;主动:驱散目标(敌减速/友净化)。' },

  // 深渊之刃:强力点控 + 概率晕
  { key: 'abyssal', name: '深渊之刃', cost: 5400, category: 'combined',
    stats: { bonusStr: 10, bonusDamage: 30 },
    recipe: { components: ['reaver', 'claymore'], recipeCost: 1000 },
    onAttack(w, attacker, target) {
      if (target.isBuilding()) return;
      const chance = attacker.calc.attackRange > 200 ? 0.10 : 0.25; // 经典:近战 25% / 远程 10%
      if (!w.rng.chance(chance)) return;
      applyModifier(w, target, { key: 'item_abyssal_bash', duration: 0.6, states: { stunned: true }, data: { piercesSpellImmunity: 1 } }, attacker.id);
    },
    active: {
      name: '深渊禁锢', cooldown: 30, targetMode: 'unit', targetTeam: 'enemy', castRange: 600,
      onUse(w, user, _pos, target) {
        if (!target || target.team === user.team) return false;
        applyModifier(w, target, { key: 'item_abyssal_stun', duration: 2, states: { stunned: true } }, user.id);
        _spellDamage(w, user, target, 100);
        return true;
      },
    },
    description: '+10 力量 +30 攻击;攻击 20% 概率短晕;主动:无视魔免眩晕目标 2 秒。' },

  // 幽魂权杖:相位规避(免疫物理,无法攻击)
  { key: 'ghost', name: '幽魂权杖', cost: 1600, category: 'arcane', secretShop: true,
    stats: { bonusStr: 6, bonusAgi: 6, bonusInt: 6 },
    active: {
      name: '虚化', cooldown: 25, targetMode: 'none',
      onUse(w, user) {
        applyModifier(w, user, { key: 'item_ghost', duration: 4, isBuff: true, states: { physImmune: true, disarmed: true } }, user.id);
        return true;
      },
    },
    description: '+6 全属性;主动:虚化 4 秒,免疫物理伤害但无法普攻(逃生/反手核心)。' },

  // 飓风之杖:旋风控制/自救
  { key: 'eul', name: '飓风之杖', cost: 2050, category: 'combined',
    stats: { bonusInt: 10, bonusMpRegen: 4, bonusMoveSpeed: 40 },
    recipe: { components: ['staff_wizardry', 'sobi_mask'], recipeCost: 725 },
    active: {
      name: '旋风', manaCost: 100, cooldown: 16, targetMode: 'unit', targetTeam: 'any', castRange: 700,
      onUse(w, user, _pos, target) {
        const t = target ?? user;
        if (t.team !== user.team) {
          applyModifier(w, t, { key: 'item_eul_cyclone', duration: 2.5, states: { rooted: true, silenced: true, disarmed: true, untargetable: true }, stats: { bonusMoveSpeedPct: -0.95 } }, user.id);
        } else {
          purge(w, t, false, true); // 强驱散:旋风自救可解除硬控
          applyModifier(w, t, { key: 'item_eul_self', duration: 1.2, isBuff: true, stats: { bonusMoveSpeedPct: 0.2 } }, user.id);
        }
        return true;
      },
    },
    description: '+10 智力 +4 法力回复 +40 移速;主动:卷起目标 2.5 秒(敌方禁锢/己方净化)。' },

  // 妖术法球:硬控变形
  { key: 'hex', name: '妖术法球', cost: 4400, category: 'combined',
    stats: { bonusInt: 30, bonusMp: 150, bonusMpRegen: 3 },
    recipe: { components: ['mystic_staff', 'ogre_axe'], recipeCost: 700 },
    active: {
      name: '妖术', manaCost: 100, cooldown: 20, targetMode: 'unit', targetTeam: 'enemy', castRange: 600,
      onUse(w, user, _pos, target) {
        if (!target || target.team === user.team) return false;
        applyModifier(w, target, { key: 'item_hex', duration: 2, states: { silenced: true, disarmed: true, muted: true }, stats: { setMoveSpeed: 100 } }, user.id);
        return true;
      },
    },
    description: '+30 智力 +150 法力;主动:将目标变为无害形态 2 秒(沉默+缴械+重度减速)。' },

  // 神灭之球:法术爆发
  { key: 'dagon', name: '神灭之球', cost: 2700, category: 'combined',
    stats: { bonusInt: 13, bonusStr: 5, bonusAgi: 3, bonusDamage: 9 },
    recipe: { components: ['null_talisman', 'staff_wizardry'], recipeCost: 1175 },
    active: {
      name: '神灭', manaCost: 120, cooldown: 35, targetMode: 'unit', targetTeam: 'enemy', castRange: 700,
      onUse(w, user, _pos, target) {
        if (!target || target.team === user.team) return false;
        _spellDamage(w, user, target, 400);
        w.emit({ kind: 'fx', fx: 'dagon', pos: V.clone(target.pos) });
        return true;
      },
    },
    description: '+13 智力 +少量属性;主动:对目标造成 400 点爆发魔法伤害。' },

  // 虚空面纱:范围魔抗削弱(法术增伤)
  { key: 'veil', name: '虚空面纱', cost: 1850, category: 'combined',
    stats: { bonusMagicResist: 0.2, bonusInt: 6, bonusHpRegen: 3, bonusMpRegen: 2 },
    recipe: { components: ['sobi_mask', 'ring_regen', 'cloak'], recipeCost: 625 },
    active: {
      name: '裂法', manaCost: 75, cooldown: 22, targetMode: 'point', castRange: 800,
      onUse(w, user, pos) {
        const at = pos ?? user.pos;
        modifierArea(w, user, at, 600, { key: 'item_veil', duration: 12, stats: { bonusMagicResist: -0.25, bonusMoveSpeedPct: -0.1 } }, 'enemy');
        w.emit({ kind: 'fx', fx: 'veil', pos: V.clone(at), radius: 600 });
        return true;
      },
    },
    description: '+20% 魔抗 +回复;主动:区域内敌人魔抗降低 25%(放大全队法术伤害)。' },

  // 洞察烟斗:全队魔法护盾
  { key: 'pipe', name: '洞察烟斗', cost: 2100, category: 'combined',
    stats: { bonusHp: 200, bonusMagicResist: 0.3, bonusHpRegen: 8 },
    recipe: { components: ['hood', 'ring_regen'], recipeCost: 650 },
    active: {
      name: '洞察', cooldown: 35, targetMode: 'none',
      onUse(w, user) {
        for (const a of alliesIn(w, user, user.pos, 900)) {
          const m = applyModifier(w, a, { key: 'item_pipe_shield', duration: 10, isBuff: true }, user.id);
          m.data!.shield = 400;
          m.data!.shieldMagicOnly = 1; // 洞察护盾仅吸魔法伤害(经典)
        }
        return true;
      },
    },
    description: '+200 生命 +30% 魔抗 +8 生命回复;主动:为附近友军提供 400 点魔法护盾 10 秒。' },

  // 刷新之球:重置冷却
  { key: 'refresher', name: '刷新之球', cost: 5500, category: 'combined',
    stats: { bonusInt: 12, bonusHp: 250, bonusMp: 250, bonusHpRegen: 4, bonusMpRegen: 4 },
    recipe: { components: ['mystic_staff', 'vitality_booster', 'energy_booster'], recipeCost: 700 },
    active: {
      name: '刷新', manaCost: 375, cooldown: 180, targetMode: 'none',
      onUse(w, user) {
        for (const ab of user.abilities) ab.cooldownUntil = -Infinity;
        for (const inst of user.inventory) {
          if (inst && inst.itemKey !== 'refresher') inst.cooldownUntil = -Infinity;
        }
        return true;
      },
    },
    description: '+12 智力 +250 生命/法力;主动:刷新所有技能与物品的冷却时间。' },

  // 圣剑:极致攻击(高风险高回报)
  { key: 'rapier', name: '圣剑', cost: 6800, category: 'combined',
    stats: { bonusDamage: 330 },
    recipe: { components: ['demon_edge', 'sacred_relic'], recipeCost: 600 },
    description: '+330 攻击:全游戏最高的纯攻击加成,孤注一掷的逆转利器。' },
);

// ---------- 进阶物品批次 4(团队增益/合成线/控制) ----------
import { createIllusion } from '../sim/abilities';

ITEMS.push(
  // 梅肯斯姆:团队治疗
  { key: 'mekansm', name: '梅肯斯姆', cost: 2100, category: 'combined',
    stats: { bonusArmor: 5, bonusHpRegen: 4, bonusMpRegen: 2 },
    recipe: { components: ['chainmail', 'sobi_mask', 'ring_regen'], recipeCost: 875 },
    active: {
      name: '回春术', manaCost: 75, cooldown: 45, targetMode: 'none',
      onUse(w, user) {
        for (const a of alliesIn(w, user, user.pos, 600)) {
          a.hp = Math.min(a.calc.maxHp, a.hp + 250);
          applyModifier(w, a, { key: 'item_mek_armor', duration: 20, isBuff: true, stats: { bonusArmor: 5 } }, user.id);
        }
        w.emit({ kind: 'fx', fx: 'mekansm', pos: V.clone(user.pos), radius: 600 });
        return true;
      },
    },
    description: '+5 护甲 +回复;主动:治疗附近全体友军 250 并提供护甲(团队保命核心)。' },

  // 远古战鼓:团队加速(充能)
  { key: 'drum', name: '远古战鼓', cost: 1850, category: 'combined',
    stats: { bonusStr: 9, bonusAgi: 9, bonusInt: 9 }, charges: 5, rechargeable: true,
    recipe: { components: ['belt', 'band', 'robe'], recipeCost: 500 },
    active: {
      name: '战意', cooldown: 30, targetMode: 'none',
      onUse(w, user) {
        const inst = user.inventory.find((i) => i?.itemKey === 'drum');
        if (!inst || inst.charges <= 0) return false;
        inst.charges--;
        for (const a of alliesIn(w, user, user.pos, 900)) {
          applyModifier(w, a, { key: 'item_drum_buff', duration: 6, isBuff: true, stats: { bonusAttackSpeed: 0.25, bonusMoveSpeed: 25 } }, user.id);
        }
        return true;
      },
    },
    description: '+9 全属性;主动(5 充能):提升附近友军攻速与移速 6 秒。' },

  // 点金手:转化单位为金钱
  { key: 'midas', name: '点金手', cost: 2050, category: 'combined',
    stats: { bonusAttackSpeed: 0.3 },
    recipe: { components: ['gloves_haste'], recipeCost: 1550 },
    active: {
      name: '点金', cooldown: 100, targetMode: 'unit', targetTeam: 'enemy', targetKind: 'nonHeroNonBuilding', castRange: 600,
      onUse(w, user, _pos, target) {
        if (!target || target.isHero() || target.isBuilding()) return false;
        if (user.heroMeta) user.heroMeta.gold += 160;
        addXp(w, user, target.base.xpBounty); // 点化也吸收该单位经验(经典 Midas 给经验,此前漏给)
        target.hp = 0; target.alive = false; target.diedAt = w.time;
        w.emit({ kind: 'fx', fx: 'midas', pos: V.clone(target.pos) });
        return true;
      },
    },
    description: '+30% 攻速;主动:点化一个非英雄单位,立即获得额外金钱与经验(发育核心)。' },

  // 祭品之瓶:萃取治疗/伤害(充能)
  { key: 'urn', name: '萃取之瓶', cost: 875, category: 'combined',
    stats: { bonusStr: 6, bonusMpRegen: 2 }, charges: 3, rechargeable: true,
    recipe: { components: ['gauntlet', 'gauntlet', 'sobi_mask'], recipeCost: 250 },
    active: {
      name: '萃取', cooldown: 8, targetMode: 'unit', targetTeam: 'any', castRange: 600,
      onUse(w, user, _pos, target) {
        const inst = user.inventory.find((i) => i?.itemKey === 'urn');
        if (!inst || inst.charges <= 0) return false;
        const t = target ?? user;
        inst.charges--;
        if (t.team === user.team) {
          applyModifier(w, t, { key: 'item_urn_heal', duration: 6, isBuff: true, stats: { bonusHpRegen: 50 } }, user.id);
        } else {
          applyModifier(w, t, { key: 'item_urn_dmg', duration: 8, tickInterval: 1, onTick: (world, u) => _spellDamage(world, user, u, 40) }, user.id);
        }
        return true;
      },
    },
    description: '+6 力量 +回复;主动(3 充能):治疗友军或持续灼伤敌人。' },

  // 萨格之刃:致残(减速法球)
  { key: 'sange', name: '萨格之刃', cost: 2000, category: 'combined',
    stats: { bonusStr: 16, bonusHpRegen: 5 },
    recipe: { components: ['ogre_axe', 'belt'], recipeCost: 550 },
    onAttack(w, attacker, target) {
      if (target.isBuilding() || !w.rng.chance(0.5)) return;
      applyModifier(w, target, { key: 'item_maim', duration: 4, stats: { bonusMoveSpeedPct: -0.3, bonusAttackSpeed: -0.2 } }, attacker.id);
    },
    description: '+16 力量 +5 生命回复;攻击有概率致残目标(减速+降攻速)。' },

  // 赤红甲:萨格+散叶合成
  { key: 'sange_yasha', name: '赤红甲', cost: 4850, category: 'combined',
    stats: { bonusStr: 16, bonusAgi: 16, bonusAttackSpeed: 0.1, bonusMoveSpeedPct: 0.12 },
    recipe: { components: ['sange', 'yasha'], recipeCost: 800 },
    onAttack(w, attacker, target) {
      if (target.isBuilding() || !w.rng.chance(0.5)) return;
      applyModifier(w, target, { key: 'item_maim', duration: 4, stats: { bonusMoveSpeedPct: -0.35, bonusAttackSpeed: -0.25 } }, attacker.id);
    },
    description: '+16 力量 +16 敏捷 +攻速/移速;攻击致残:全能向的核心合成。' },

  // 幻影斧:分身 + 自净
  { key: 'manta', name: '幻影斧', cost: 4710, category: 'combined',
    stats: { bonusAgi: 26, bonusStr: 10, bonusAttackSpeed: 0.1, bonusMoveSpeedPct: 0.1 },
    recipe: { components: ['yasha', 'ogre_axe', 'blade_alacrity'], recipeCost: 660 },
    active: {
      name: '幻象分身', manaCost: 100, cooldown: 30, targetMode: 'none',
      onUse(w, user) {
        purge(w, user, false, true); // 强驱散:幻影斧可解除含硬控的减益
        createIllusion(w, user, 2, 0.33, 3, 20);
        return true;
      },
    },
    description: '+26 敏捷 +10 力量 +攻速/移速;主动:分裂出 2 个幻象并驱散自身减益。' },

  // 金箍棒:必中 + 重击
  { key: 'mkb', name: '金箍棒', cost: 5100, category: 'combined',
    stats: { bonusDamage: 40, bonusAttackSpeed: 0.45, trueStrike: true },
    recipe: { components: ['demon_edge', 'hyperstone'], recipeCost: 600 },
    onAttack(w, attacker, target) {
      if (target.isBuilding() || !w.rng.chance(0.35)) return;
      _spellDamage(w, attacker, target, 100);
      applyModifier(w, target, { key: 'item_mkb_bash', duration: 0.4, states: { stunned: true }, data: { piercesSpellImmunity: 1 } }, attacker.id);
    },
    description: '+40 攻击 +45% 攻速;攻击 35% 触发重击(额外魔法伤害+短眩)。' },

  // 缚足锤:概率眩晕
  { key: 'basher', name: '缚足锤', cost: 2500, category: 'combined',
    stats: { bonusDamage: 24, bonusStr: 10 },
    recipe: { components: ['mithril_hammer', 'belt'], recipeCost: 450 },
    onAttack(w, attacker, target) {
      if (target.isBuilding()) return;
      const chance = attacker.calc.attackRange > 200 ? 0.10 : 0.25; // 经典:近战 25% / 远程 10%
      if (!w.rng.chance(chance)) return;
      applyModifier(w, target, { key: 'item_basher_bash', duration: 0.8, states: { stunned: true }, data: { piercesSpellImmunity: 1 } }, attacker.id);
    },
    description: '+24 攻击 +10 力量;攻击眩晕目标(近战 25% / 远程 10%)。' },

  // 莲花宝珠:护盾 + 自净
  { key: 'lotus', name: '莲花宝珠', cost: 2750, category: 'combined',
    stats: { bonusArmor: 10, bonusMp: 250, bonusMpRegen: 3 },
    recipe: { components: ['platemail', 'energy_booster'], recipeCost: 350 },
    active: {
      name: '法力莲花', cooldown: 20, targetMode: 'none',
      onUse(w, user) {
        purge(w, user, false);
        const m = applyModifier(w, user, { key: 'item_lotus_shield', duration: 6, isBuff: true }, user.id);
        m.data!.shield = 300;
        return true;
      },
    },
    description: '+10 护甲 +250 法力;主动:驱散自身减益并获得 300 点护盾。' },

  // 天鹰之戟:攻击距离
  { key: 'dragon_lance', name: '天鹰之戟', cost: 1450, category: 'combined',
    stats: { bonusStr: 13, bonusAgi: 13, bonusAttackRange: 140 },
    recipe: { components: ['ogre_axe', 'band'], recipeCost: 0 },
    description: '+13 力量 +13 敏捷 +140 攻击距离:远程核心的拉开身位之选。' },

  // 法术之刃:法术增强
  { key: 'kaya', name: '法术之刃', cost: 1600, category: 'combined',
    stats: { bonusInt: 14, spellAmp: 0.15, bonusMpRegen: 3 },
    recipe: { components: ['staff_wizardry', 'robe'], recipeCost: 150 },
    description: '+14 智力 +15% 法术增强 +法力回复:法核的早期增伤件。' },
);

// ---------- 进阶物品批次 5(升级线/团队/控制) ----------
ITEMS.push(
  // 天堂之戟:致残 + 缴械
  { key: 'heavens_halberd', name: '天堂之戟', cost: 4000, category: 'combined',
    stats: { bonusStr: 20, bonusDamage: 25, bonusHpRegen: 5 },
    recipe: { components: ['sange', 'platemail'], recipeCost: 600 },
    onAttack(w, attacker, target) {
      if (target.isBuilding() || !w.rng.chance(0.5)) return;
      applyModifier(w, target, { key: 'item_maim', duration: 4, stats: { bonusMoveSpeedPct: -0.3, bonusAttackSpeed: -0.2 } }, attacker.id);
    },
    active: {
      name: '缴械', cooldown: 22, targetMode: 'unit', targetTeam: 'enemy', castRange: 600,
      onUse(w, user, _pos, target) {
        if (!target || target.team === user.team) return false;
        applyModifier(w, target, { key: 'item_halberd_disarm', duration: 3.5, states: { disarmed: true } }, user.id);
        return true;
      },
    },
    description: '+20 力量 +25 攻击;攻击致残;主动:缴械目标 3.5 秒(无法普攻)。' },

  // 雷神枷锁:范围缠绕 + 连锁闪电
  { key: 'gleipnir', name: '雷神枷锁', cost: 5850, category: 'combined',
    stats: { bonusInt: 25, bonusDamage: 24, bonusHp: 200, bonusMp: 150 },
    recipe: { components: ['atos', 'maelstrom'], recipeCost: 0 },
    active: {
      name: '万雷', manaCost: 50, cooldown: 22, targetMode: 'point', castRange: 1000,
      onUse(w, user, pos) {
        if (!pos) return false;
        damageArea(w, user, pos, 350, 200);
        modifierArea(w, user, pos, 350, { key: 'item_gleipnir_root', duration: 2.5, states: { rooted: true }, stats: { bonusMoveSpeedPct: -0.4 } }, 'enemy');
        // 连锁闪电
        const visited = new Set<number>();
        let cur: Unit | undefined = enemiesIn(w, user, pos, 350)[0]; let prev = pos;
        for (let i = 0; i < 4 && cur; i++) {
          visited.add(cur.id);
          _spellDamage(w, user, cur, 120);
          w.emit({ kind: 'fx', fx: 'lightning', pos: V.clone(prev), pos2: V.clone(cur.pos) });
          prev = cur.pos;
          cur = w.queryRadius(cur.pos, 500, (t) => t.team !== user.team && !t.isBuilding() && !visited.has(t.id) && t.kind !== 'ward')[0];
        }
        w.emit({ kind: 'fx', fx: 'gleipnir', pos: V.clone(pos), radius: 350 });
        return true;
      },
    },
    description: '+25 智力 +24 攻击 +生命/法力;主动:范围缠绕 2.5 秒并触发连锁闪电。' },

  // 静默之刃:隐身突袭升级
  { key: 'silver_edge', name: '静默之刃', cost: 4600, category: 'combined',
    stats: { bonusDamage: 40, bonusAttackSpeed: 0.3, bonusStr: 10 },
    recipe: { components: ['shadow_blade', 'ogre_axe'], recipeCost: 600 },
    active: {
      name: '潜行突袭', cooldown: 14, targetMode: 'none',
      onUse(w, user) {
        applyModifier(w, user, { key: 'item_silveredge', duration: 14, isBuff: true, states: { invisible: true }, stats: { bonusMoveSpeedPct: 0.2 } }, user.id);
        return true;
      },
    },
    description: '+40 攻击 +30% 攻速 +10 力量;主动:隐身加速,下次攻击爆发(脱离即现身)。' },

  // 以太之镜:法术增强 + 法力
  { key: 'aether_lens', name: '以太之镜', cost: 2100, category: 'combined',
    stats: { bonusMp: 250, spellAmp: 0.12, bonusMpRegen: 3, bonusAttackRange: 75 },
    recipe: { components: ['energy_booster', 'robe'], recipeCost: 650 },
    description: '+250 法力 +12% 法术增强 +75 攻击距离:法系的增程增伤件。' },

  // 奥术核心:法核终极属性
  { key: 'octarine', name: '奥术核心', cost: 5500, category: 'combined',
    stats: { bonusInt: 25, bonusHp: 350, bonusMp: 350, spellAmp: 0.2, bonusHpRegen: 6, bonusMpRegen: 4 },
    recipe: { components: ['mystic_staff', 'vitality_booster', 'energy_booster'], recipeCost: 700 },
    description: '+25 智力 +350 生命/法力 +20% 法术增强:法核的综合终极装。' },

  // 深红甲盾:团队减伤
  { key: 'crimson_guard', name: '深红甲盾', cost: 3300, category: 'combined',
    stats: { bonusHp: 250, bonusArmor: 6, bonusHpRegen: 6, incomingDamageReduction: 0.12 },
    recipe: { components: ['vanguard', 'chainmail'], recipeCost: 600 },
    active: {
      name: '深红卫盾', manaCost: 50, cooldown: 40, targetMode: 'none',
      onUse(w, user) {
        for (const a of alliesIn(w, user, user.pos, 750)) {
          applyModifier(w, a, { key: 'item_crimson_buff', duration: 8, isBuff: true, stats: { incomingDamageReduction: 0.3, bonusArmor: 5 } }, user.id);
        }
        return true;
      },
    },
    description: '+250 生命 +6 护甲 +12% 减伤;主动:为附近友军大幅减伤 8 秒(团战开盾)。' },

  // 卫士胫甲:团队治疗 + 驱散
  { key: 'guardian_greaves', name: '卫士胫甲', cost: 4200, category: 'combined',
    stats: { bonusArmor: 5, bonusHpRegen: 6, bonusMpRegen: 4, bonusMoveSpeed: 65 },
    recipe: { components: ['mekansm', 'arcane_boots'], recipeCost: 600 },
    active: {
      name: '机械神力', manaCost: 50, cooldown: 35, targetMode: 'none',
      onUse(w, user) {
        for (const a of alliesIn(w, user, user.pos, 650)) {
          a.hp = Math.min(a.calc.maxHp, a.hp + 350);
          purge(w, a, false); // 驱散友军减益
        }
        return true;
      },
    },
    description: '+5 护甲 +回复 +65 移速;主动:大范围治疗 350 并驱散友军身上的减益。' },

  // 银月之冠:破甲/强化
  { key: 'solar_crest', name: '银月之冠', cost: 2200, category: 'combined',
    stats: { bonusArmor: 6, bonusAttackSpeed: 0.2, evasion: 0.1, bonusMpRegen: 2 },
    recipe: { components: ['medallion', 'gloves_haste'], recipeCost: 625 },
    active: {
      name: '银月', cooldown: 9, targetMode: 'unit', targetTeam: 'any', castRange: 800,
      onUse(w, user, _pos, target) {
        if (!target) return false;
        if (target.team === user.team) {
          applyModifier(w, target, { key: 'item_solar_buff', duration: 10, isBuff: true, stats: { bonusArmor: 8, evasion: 0.2, bonusAttackSpeed: 0.2 } }, user.id);
        } else {
          applyModifier(w, target, { key: 'item_solar_debuff', duration: 10, stats: { bonusArmor: -8, bonusMoveSpeedPct: -0.15 } }, user.id);
        }
        return true;
      },
    },
    description: '+6 护甲 +攻速 +闪避;主动:强化友军(护甲/闪避/攻速)或削弱敌人(破甲/减速)。' },

  // 飓风长戟:推开 + 远程
  { key: 'hurricane_pike', name: '飓风长戟', cost: 3650, category: 'combined',
    stats: { bonusStr: 20, bonusAgi: 20, bonusAttackRange: 140, bonusHpRegen: 4 },
    recipe: { components: ['dragon_lance', 'force_staff'], recipeCost: 0 },
    active: {
      name: '飓风', cooldown: 15, targetMode: 'unit', targetTeam: 'any', castRange: 800,
      onUse(w, user, _pos, target) {
        const t = target ?? user;
        const dir = { x: Math.cos(t.facing), y: Math.sin(t.facing) };
        blinkTo(w, t, V.add(t.pos, V.scale(dir, 600)));
        applyModifier(w, user, { key: 'item_pike_range', duration: 4, isBuff: true, stats: { bonusAttackRange: 250, bonusAttackSpeed: 0.4 } }, user.id);
        return true;
      },
    },
    description: '+20 力量 +20 敏捷 +140 攻击距离;主动:推开目标并短暂获得超远攻击距离。' },

  // 阴邪之罐:萃取升级(充能)
  { key: 'spirit_vessel', name: '阴邪之罐', cost: 2200, category: 'combined',
    stats: { bonusStr: 8, bonusHpRegen: 4, bonusMpRegen: 3 }, charges: 4, rechargeable: true,
    recipe: { components: ['urn', 'ring_regen', 'sobi_mask'], recipeCost: 650 },
    active: {
      name: '阴邪萃取', cooldown: 8, targetMode: 'unit', targetTeam: 'enemy', castRange: 600,
      onUse(w, user, _pos, target) {
        const inst = user.inventory.find((i) => i?.itemKey === 'spirit_vessel');
        if (!inst || inst.charges <= 0) return false;
        const t = target ?? user;
        inst.charges--;
        if (t.team === user.team) {
          applyModifier(w, t, { key: 'item_vessel_heal', duration: 8, isBuff: true, stats: { bonusHpRegen: 60 } }, user.id);
        } else {
          applyModifier(w, t, { key: 'item_vessel_dmg', duration: 8, stats: { bonusMoveSpeedPct: -0.15 }, tickInterval: 1, onTick: (world, u) => _spellDamage(world, user, u, 50) }, user.id);
        }
        return true;
      },
    },
    description: '+8 力量 +回复;主动(4 充能):强力治疗友军或持续灼伤敌人。' },

  // 月之碎片:极致攻速
  { key: 'moon_shard', name: '月之碎片', cost: 4000, category: 'weapon', secretShop: true,
    stats: { bonusAttackSpeed: 1.2 },
    description: '+120% 攻击速度:后期物理核心的攻速终极件。' },

  // 血棘:沉默 + 暴击
  { key: 'bloodthorn', name: '血棘', cost: 7200, category: 'combined',
    stats: { bonusInt: 30, bonusAttackSpeed: 0.35, bonusDamage: 30, critChance: 0.3, critMultiplier: 1.8, spellAmp: 0.1 },
    recipe: { components: ['orchid', 'demon_edge'], recipeCost: 0 },
    active: {
      name: '血棘禁锢', manaCost: 0, cooldown: 18, targetMode: 'unit', targetTeam: 'enemy', castRange: 900,
      onUse(w, user, _pos, target) {
        if (!target || target.team === user.team) return false;
        applyModifier(w, target, { key: 'item_bloodthorn_silence', duration: 5, states: { silenced: true }, stats: { bonusMoveSpeedPct: -0.2 } }, user.id);
        return true;
      },
    },
    description: '+30 智力 +攻速/暴击 +法术增强;主动:沉默并削弱目标 5 秒。' },
);

// ---------- 进阶物品批次 6(剩余经典/升级线) ----------
ITEMS.push(
  // 疾风之纹:廉价移速
  { key: 'wind_lace', name: '疾风之纹', cost: 250, category: 'armor',
    stats: { bonusMoveSpeed: 30 },
    description: '+30 移动速度:最廉价的提速小件。' },

  // 以太之刃:虚化目标 + 法术爆发
  { key: 'ethereal_blade', name: '以太之刃', cost: 3200, category: 'combined',
    stats: { bonusAgi: 10, bonusInt: 10, bonusMp: 150 },
    recipe: { components: ['ghost', 'energy_booster'], recipeCost: 600 },
    active: {
      name: '以太冲击', manaCost: 75, cooldown: 20, targetMode: 'unit', targetTeam: 'any', castRange: 700,
      onUse(w, user, _pos, target) {
        if (!target) return false;
        applyModifier(w, target, { key: 'item_ethereal', duration: 3, states: { physImmune: true, disarmed: true }, stats: { bonusMoveSpeedPct: -0.4 } }, user.id);
        if (target.team !== user.team) _spellDamage(w, user, target, 250);
        w.emit({ kind: 'fx', fx: 'ethereal', pos: V.clone(target.pos) });
        return true;
      },
    },
    description: '+10 敏/智 +150 法力;主动:使目标虚化(免疫物理/无法普攻)并造成法术爆发。' },

  // 流星锤:延迟范围砸落
  { key: 'meteor_hammer', name: '流星锤', cost: 2200, category: 'combined',
    stats: { bonusInt: 10, bonusHpRegen: 6, bonusArmor: 3 },
    recipe: { components: ['staff_wizardry', 'chainmail'], recipeCost: 650 },
    active: {
      name: '流星', manaCost: 100, cooldown: 30, targetMode: 'point', castRange: 700,
      onUse(w, user, pos) {
        if (!pos) return false;
        const at = V.clone(pos);
        applyModifier(w, user, {
          key: `item_meteor_${w.tick}`, duration: 1.7, isBuff: true, tickInterval: 1.5,
          onTick(world, _u, m) {
            damageArea(world, user, at, 350, 250);
            modifierArea(world, user, at, 350, { key: 'item_meteor_stun', duration: 1.6, states: { stunned: true } }, 'enemy');
            world.emit({ kind: 'fx', fx: 'meteor', pos: at, radius: 350 });
            m.expiresAt = -Infinity;
          },
        }, user.id);
        w.emit({ kind: 'fx', fx: 'meteor_warn', pos: at, radius: 350 });
        return true;
      },
    },
    description: '+10 智力 +回复/护甲;主动:1.5 秒后召落流星,眩晕并重创区域内敌人。' },

  // 否决坠饰:驱散 + 禁锢
  { key: 'nullifier', name: '否决坠饰', cost: 2000, category: 'combined',
    stats: { bonusMagicResist: 0.12, bonusDamage: 25 },
    recipe: { components: ['cloak', 'sobi_mask', 'robe'], recipeCost: 675 },
    active: {
      name: '否决', manaCost: 75, cooldown: 13, targetMode: 'unit', targetTeam: 'enemy', castRange: 750,
      piercesSpellImmunity: true, // 反魔免专精:可对魔免敌人施放(M11)
      onUse(w, user, _pos, target) {
        if (!target || target.team === user.team) return false;
        purge(w, target, true); // 强驱散:移除其增益
        // 沉默/减速效果同样穿魔免落地(否则 M1 在下游拦掉,与「穿透」语义矛盾)。
        applyModifier(w, target, { key: 'item_nullifier_mute', duration: 4, states: { silenced: true }, stats: { bonusMoveSpeedPct: -0.3 }, data: { piercesSpellImmunity: 1 } }, user.id);
        return true;
      },
    },
    description: '+12% 魔抗 +25 攻击;主动:驱散目标增益并禁用其施法、减速 4 秒(可穿魔免)。' },

  // 永恒之纱:法术屏障
  { key: 'eternal_shroud', name: '永恒之纱', cost: 2800, category: 'combined',
    stats: { bonusHp: 250, bonusMagicResist: 0.2, bonusHpRegen: 5 },
    recipe: { components: ['hood', 'vitality_booster'], recipeCost: 600 },
    active: {
      name: '法术屏障', cooldown: 30, targetMode: 'none',
      onUse(w, user) {
        const m = applyModifier(w, user, { key: 'item_eternal_barrier', duration: 12, isBuff: true }, user.id);
        m.data!.shield = 400;
        return true;
      },
    },
    description: '+250 生命 +20% 魔抗;主动:获得 400 点护盾抵御伤害(抗法核心)。' },

  // 散华:净魂之刃升级
  { key: 'disperser', name: '散华', cost: 3600, category: 'combined',
    stats: { bonusAgi: 30 },
    recipe: { components: ['diffusal', 'blade_alacrity'], recipeCost: 600 },
    onAttack(w, attacker, target) {
      if (target.isBuilding() || target.calc.maxMp <= 0) return;
      const burn = Math.min(target.mp, 60);
      if (burn <= 0) return;
      target.mp -= burn;
      _spellDamage(w, attacker, target, burn);
    },
    active: {
      name: '消散', cooldown: 10, targetMode: 'unit', targetTeam: 'any', castRange: 600,
      onUse(w, user, _pos, target) {
        const t = target ?? user;
        if (t.team === user.team) { purge(w, t, false); applyModifier(w, t, { key: 'item_disperser_haste', duration: 4, isBuff: true, stats: { bonusMoveSpeedPct: 0.25 } }, user.id); }
        else applyModifier(w, t, { key: 'item_disperser_slow', duration: 4, stats: { bonusMoveSpeedPct: -0.45 } }, user.id);
        return true;
      },
    },
    description: '+30 敏捷;攻击燃烧更多法力;主动:净化友军并加速 / 重度减速敌人。' },

  // 渔叉:拉近自身
  { key: 'harpoon', name: '渔叉', cost: 2600, category: 'combined',
    stats: { bonusStr: 12, bonusAgi: 12, bonusAttackSpeed: 0.2 },
    recipe: { components: ['ogre_axe', 'blade_alacrity'], recipeCost: 600 },
    active: {
      name: '抛叉', cooldown: 16, targetMode: 'unit', targetTeam: 'enemy', castRange: 1000,
      onUse(w, user, _pos, target) {
        if (!target) return false;
        blinkTo(w, user, w.map.nearestWalkable(V.add(target.pos, V.scale(V.norm(V.sub(user.pos, target.pos)), 150))));
        applyModifier(w, target, { key: 'item_harpoon_slow', duration: 3, stats: { bonusMoveSpeedPct: -0.3 } }, user.id);
        user.issueOrder({ type: 'attack', targetId: target.id });
        return true;
      },
    },
    description: '+12 力/敏 +20% 攻速;主动:抛叉将自己拉到目标身边并减速之(追杀利器)。' },

  // 支配头盔:吸血光环
  { key: 'helm_dominator', name: '支配头盔', cost: 2000, category: 'combined',
    stats: { bonusDamage: 20, bonusArmor: 5, lifesteal: 0.18 },
    recipe: { components: ['morbid_mask', 'chainmail'], recipeCost: 550 },
    holderModifier: {
      key: 'item_helm_aura', isBuff: true,
      aura: { radius: 900, affects: 'ally', grant: { key: 'item_helm_lifesteal', isBuff: true, stats: { lifesteal: 0.15 } } },
    },
    description: '+20 攻击 +5 护甲 +18% 吸血;为附近友军提供吸血光环。' },

  // 风之波荡:自救旋风
  { key: 'wind_waker', name: '风之波荡', cost: 3200, category: 'combined',
    stats: { bonusInt: 20, bonusMoveSpeed: 40, bonusMpRegen: 4 },
    recipe: { components: ['eul', 'cloak'], recipeCost: 600 },
    active: {
      name: '自旋', manaCost: 100, cooldown: 26, targetMode: 'none',
      onUse(w, user) {
        user.invulnerable = true;
        applyModifier(w, user, {
          key: 'item_windwaker', duration: 2.5, isBuff: true, states: { rooted: true, disarmed: true, silenced: true },
          onExpire(_w, u) { u.invulnerable = false; },
        }, user.id);
        user.hp = Math.min(user.calc.maxHp, user.hp + 200);
        return true;
      },
    },
    description: '+20 智力 +40 移速;主动:将自己卷入旋风(无敌但无法行动 2.5 秒)并回复生命。' },

  // 永世法衣:法术之刃+萨格
  { key: 'kaya_sange', name: '永世法衣', cost: 3600, category: 'combined',
    stats: { bonusStr: 16, bonusInt: 16, spellAmp: 0.12, bonusHpRegen: 5 },
    recipe: { components: ['kaya', 'sange'], recipeCost: 0 },
    onAttack(w, attacker, target) {
      if (target.isBuilding() || !w.rng.chance(0.5)) return;
      applyModifier(w, target, { key: 'item_maim', duration: 4, stats: { bonusMoveSpeedPct: -0.3, bonusAttackSpeed: -0.2 } }, attacker.id);
    },
    description: '+16 力/智 +12% 法术增强 +回复;攻击致残:力法两用的全能核心。' },
);

// ---------- 进阶物品批次 7(消耗品/散件/剩余进阶) ----------
ITEMS.push(
  // 仙灵之火:即时小回复
  { key: 'faerie_fire', name: '仙灵之火', cost: 70, category: 'consumable', charges: 1,
    stats: { bonusDamage: 2 },
    active: {
      name: '饮用', cooldown: 0, targetMode: 'none',
      onUse(w, user) { user.hp = Math.min(user.calc.maxHp, user.hp + 85); return true; },
    },
    description: '+2 攻击;主动:立即回复 85 点生命(救命散件)。' },

  // 魔法芒果:即时回蓝
  { key: 'mango', name: '魔法芒果', cost: 70, category: 'consumable', charges: 1,
    stats: { bonusHpRegen: 1 },
    active: {
      name: '食用', cooldown: 0, targetMode: 'none',
      onUse(w, user) { user.mp = Math.min(user.calc.maxMp, user.mp + 110); return true; },
    },
    description: '+1 生命回复;主动:立即回复 110 点法力。' },

  // 王冠:全属性散件
  { key: 'crown', name: '王冠', cost: 450, category: 'attribute',
    stats: { bonusStr: 4, bonusAgi: 4, bonusInt: 4 },
    description: '+4 全属性:廉价的全能属性散件。' },

  // 隼之锋刃:法力 + 攻速
  { key: 'falcon_blade', name: '隼之锋刃', cost: 1200, category: 'combined',
    stats: { bonusDamage: 10, bonusAttackSpeed: 0.15, bonusMp: 150, bonusMpRegen: 2 },
    recipe: { components: ['band', 'sobi_mask'], recipeCost: 425 },
    description: '+10 攻击 +15% 攻速 +150 法力 +法力回复:前期续航小核。' },

  // 相位鞋:穿越 + 提速
  { key: 'phase_boots', name: '相位鞋', cost: 1500, category: 'combined',
    stats: { bonusMoveSpeed: 45, bonusDamage: 24 },
    recipe: { components: ['boots', 'broadsword'], recipeCost: 0 },
    active: {
      name: '相位', cooldown: 8, targetMode: 'none',
      onUse(w, user) {
        applyModifier(w, user, { key: 'item_phase', duration: 4, isBuff: true, states: { phased: true }, stats: { bonusMoveSpeedPct: 0.24 } }, user.id);
        return true;
      },
    },
    description: '+45 移速 +24 攻击;主动:相位穿行(穿越单位并加速 4 秒)。' },

  // 真知宝石:持有真视
  { key: 'gem_truesight', name: '真知宝石', cost: 700, category: 'armor',
    stats: { trueSightRadius: 900 },
    description: '持有时获得 900 范围真视,可看见隐身单位(阵亡掉落)。' },

  // 神圣链锭:爆发治疗
  { key: 'holy_locket', name: '神圣链锭', cost: 1900, category: 'combined',
    stats: { bonusHp: 150, bonusMp: 150, bonusHpRegen: 4, bonusMpRegen: 2 },
    recipe: { components: ['ring_regen', 'sobi_mask', 'chainmail'], recipeCost: 675 },
    active: {
      name: '神圣涌动', manaCost: 50, cooldown: 16, targetMode: 'unit', targetTeam: 'allyOrSelf', castRange: 600,
      onUse(w, user, _pos, target) {
        const t = target && target.team === user.team ? target : user;
        t.hp = Math.min(t.calc.maxHp, t.hp + 250);
        return true;
      },
    },
    description: '+生命/法力/回复;主动:为友军即时治疗 250 点。' },

  // 阴邪契约:破甲削抗光环式主动
  { key: 'wraith_pact', name: '阴邪契约', cost: 3000, category: 'combined',
    stats: { bonusHp: 300, bonusMagicResist: 0.16, bonusArmor: 5 },
    recipe: { components: ['cloak', 'ring_regen', 'platemail'], recipeCost: 700 },
    active: {
      name: '阴邪领域', manaCost: 50, cooldown: 30, targetMode: 'point', castRange: 700,
      onUse(w, user, pos) {
        const at = pos ?? user.pos;
        modifierArea(w, user, at, 500, { key: 'item_wraith_pact', duration: 12, stats: { bonusMagicResist: -0.18, bonusArmor: -4 } }, 'enemy');
        return true;
      },
    },
    description: '+300 生命 +魔抗/护甲;主动:区域内敌人削减护甲与魔抗(放大全队输出)。' },

  // 亡者之牙:虚灵攻击
  { key: 'revenant_brooch', name: '亡者之牙', cost: 4000, category: 'combined',
    stats: { bonusDamage: 40, bonusMp: 200, spellAmp: 0.1 },
    recipe: { components: ['demon_edge', 'energy_booster'], recipeCost: 600 },
    onAttack(w, attacker, target) {
      if (target.isBuilding() || !hasModifier(attacker, 'item_revenant_active')) return;
      _spellDamage(w, attacker, target, 70);
    },
    active: {
      name: '虚灵之触', cooldown: 18, targetMode: 'none',
      onUse(w, user) {
        applyModifier(w, user, { key: 'item_revenant_active', duration: 6, isBuff: true, stats: { bonusAttackRange: 250 } }, user.id);
        return true;
      },
    },
    description: '+40 攻击 +200 法力 +法术增强;主动:6 秒内攻击附带大量魔法伤害并增程。' },

  // 永恒之碟:保命屏障
  { key: 'aeon_disk', name: '永恒之碟', cost: 2800, category: 'combined',
    stats: { bonusHp: 250, bonusMp: 250, bonusHpRegen: 5 },
    recipe: { components: ['vitality_booster', 'energy_booster'], recipeCost: 700 },
    active: {
      name: '时光之碟', cooldown: 60, targetMode: 'none',
      onUse(w, user) {
        purge(w, user, false); // 驱散自身减益
        applyModifier(w, user, { key: 'item_aeon_barrier', duration: 5, isBuff: true, stats: { incomingDamageReduction: 0.55 } }, user.id);
        return true;
      },
    },
    description: '+250 生命/法力;主动:驱散自身减益并在 5 秒内大幅减伤(保命神器)。' },
);

// ---------- 进阶物品批次 8(散件/光环/续航,补齐物品库) ----------
ITEMS.push(
  // 砍伐之斧:对非英雄额外伤害(补刀)
  { key: 'quelling_blade', name: '砍伐之斧', cost: 200, category: 'weapon',
    stats: { bonusDamage: 6 },
    onAttack(w, attacker, target) {
      if (target.isHero() || target.isBuilding()) return;
      _spellDamage(w, attacker, target, 36);
    },
    description: '+6 攻击;对非英雄单位的攻击附带额外伤害(补刀利器)。' },

  // 灵魂之戒:献祭生命换取法力
  { key: 'soul_ring', name: '灵魂之戒', cost: 800, category: 'combined',
    stats: { bonusArmor: 2, bonusHpRegen: 3 },
    recipe: { components: ['sobi_mask', 'ring_regen'], recipeCost: 125 },
    active: {
      name: '献祭', cooldown: 25, targetMode: 'none',
      onUse(w, user) { user.hp = Math.max(1, user.hp - 150); user.mp = Math.min(user.calc.maxMp, user.mp + 150); return true; },
    },
    description: '+2 护甲 +回复;主动:消耗 150 生命换取 150 法力(法力续航)。' },

  // 树肢:持续回血消耗品
  { key: 'tango', name: '树肢', cost: 90, category: 'consumable', charges: 4,
    active: {
      name: '食用', cooldown: 0, targetMode: 'none',
      onUse(w, user) {
        applyModifier(w, user, { key: 'item_tango_regen', duration: 8, isBuff: true, stats: { bonusHpRegen: 14 } }, user.id);
        return true;
      },
    },
    description: '4 充能;主动:8 秒内持续回复生命(前期续航)。' },

  // 坚韧球:生命法力回复
  { key: 'perseverance', name: '坚韧球', cost: 950, category: 'combined',
    stats: { bonusDamage: 10, bonusHpRegen: 6, bonusMpRegen: 3 },
    recipe: { components: ['robe', 'ring_regen'], recipeCost: 150 },
    description: '+10 攻击 +生命/法力回复:核心英雄的续航组件。' },

  // 遗忘法杖:攻击/法力组件
  { key: 'oblivion_staff', name: '遗忘法杖', cost: 1275, category: 'combined',
    stats: { bonusDamage: 15, bonusAttackSpeed: 0.1, bonusMpRegen: 4 },
    recipe: { components: ['robe', 'sobi_mask', 'gloves_haste'], recipeCost: 0 },
    description: '+15 攻击 +10% 攻速 +法力回复:法系战士的过渡组件。' },

  // 疯狂面具:嗜血狂暴
  { key: 'mask_of_madness', name: '疯狂面具', cost: 1800, category: 'combined',
    stats: { lifesteal: 0.2, bonusDamage: 10 },
    recipe: { components: ['morbid_mask'], recipeCost: 900 },
    active: {
      name: '狂暴', cooldown: 18, targetMode: 'none',
      onUse(w, user) {
        // 狂暴期间自身被沉默(经典核心代价,不可施法);buff 不可驱散直到到期
        applyModifier(w, user, { key: 'item_madness_buff', duration: 8, isBuff: true, states: { silenced: true }, stats: { bonusAttackSpeed: 1.0, bonusMoveSpeedPct: 0.2 } }, user.id);
        return true;
      },
    },
    description: '+20% 吸血 +10 攻击;主动:狂暴 8 秒(极大攻速与移速)。' },

  // 圆环:护甲 + 法力光环
  { key: 'ring_basilius', name: '圆环', cost: 500, category: 'combined',
    stats: { bonusArmor: 3, bonusDamage: 6 },
    recipe: { components: ['ring_regen', 'gauntlet'], recipeCost: 0 },
    holderModifier: {
      key: 'item_basilius_aura', isBuff: true,
      aura: { radius: 900, affects: 'ally', grant: { key: 'item_basilius_mana', isBuff: true, stats: { bonusMpRegen: 1 } } },
    },
    description: '+3 护甲 +6 攻击;为附近友军提供法力回复光环。' },

  // 护额:生命回复光环
  { key: 'headdress', name: '护额', cost: 550, category: 'combined',
    stats: { bonusStr: 2, bonusAgi: 2, bonusInt: 2 },
    recipe: { components: ['sobi_mask', 'branch', 'branch'], recipeCost: 119 },
    holderModifier: {
      key: 'item_headdress_aura', isBuff: true,
      aura: { radius: 900, affects: 'ally', grant: { key: 'item_headdress_regen', isBuff: true, stats: { bonusHpRegen: 3 } } },
    },
    description: '+2 全属性;为附近友军提供生命回复光环(团队续航)。' },

  // 虚无宝石:法力回复散件
  { key: 'void_stone', name: '虚无宝石', cost: 850, category: 'arcane',
    stats: { bonusMpRegen: 4 },
    description: '+4 法力回复:法系英雄的法力续航散件。' },

  // 法师克星:魔抗 + 攻击削减法术增强
  { key: 'mage_slayer', name: '法师克星', cost: 2400, category: 'combined',
    stats: { bonusMagicResist: 0.2, bonusAttackSpeed: 0.15, bonusMpRegen: 3 },
    recipe: { components: ['oblivion_staff', 'cloak'], recipeCost: 575 },
    onAttack(w, attacker, target) {
      if (target.isBuilding()) return;
      applyModifier(w, target, { key: 'item_mageslayer_debuff', duration: 4, stats: { spellAmp: -0.35 } }, attacker.id);
    },
    description: '+20% 魔抗 +15% 攻速;攻击削减目标的法术增强(克制法核)。' },
);

// ---------- 进阶物品批次 9(基础组件补全,达经典物品规模) ----------
ITEMS.push(
  // 守护指环:廉价护甲散件
  { key: 'ring_protection', name: '守护指环', cost: 175, category: 'armor',
    stats: { bonusArmor: 2 },
    description: '+2 护甲:最廉价的护甲散件。' },

  // 攻击之刃:廉价攻击散件
  { key: 'blades_of_attack', name: '攻击之刃', cost: 450, category: 'weapon',
    stats: { bonusDamage: 9 },
    description: '+9 攻击力:廉价的攻击散件。' },

  // 短棍:攻速散件
  { key: 'quarterstaff', name: '短棍', cost: 875, category: 'weapon',
    stats: { bonusAttackSpeed: 0.25 },
    description: '+25% 攻击速度。' },

  // 闪避护符:闪避散件(蝶翼前置)
  { key: 'talisman_evasion', name: '闪避护符', cost: 1300, category: 'armor',
    stats: { evasion: 0.2 },
    description: '+20% 闪避:蝶舞之翼等闪避装的前置组件。' },

  // 终极法球:全属性组件
  { key: 'ultimate_orb', name: '终极法球', cost: 2050, category: 'attribute', secretShop: true,
    stats: { bonusStr: 10, bonusAgi: 10, bonusInt: 10 },
    description: '+10 全属性:寒霜之心等高阶装的核心组件。' },

  // 灵魂之协:生命法力组件
  { key: 'soul_booster', name: '灵魂之协', cost: 3300, category: 'combined',
    stats: { bonusHp: 250, bonusMp: 250, bonusHpRegen: 6, bonusMpRegen: 3 },
    recipe: { components: ['vitality_booster', 'energy_booster', 'point_booster'], recipeCost: 0 },
    description: '+250 生命/法力 +回复:血石等装的生命法力核心(注:与升级件协同定价)。' },

  // 标枪:概率穿刺
  { key: 'javelin', name: '标枪', cost: 1100, category: 'weapon',
    stats: { bonusDamage: 19 },
    onAttack(w, attacker, target) {
      if (target.isBuilding() || !w.rng.chance(0.2)) return;
      _spellDamage(w, attacker, target, 40);
    },
    description: '+19 攻击;攻击有 20% 概率附带额外穿刺伤害(金箍棒前置)。' },

  // 枯萎石:破甲散件
  { key: 'blight_stone', name: '枯萎石', cost: 300, category: 'weapon',
    stats: { bonusDamage: 4 },
    onAttack(w, attacker, target) {
      if (target.isBuilding()) return;
      applyModifier(w, target, { key: 'item_blight_armor', duration: 4, stackable: false, stats: { bonusArmor: -2 } }, attacker.id);
    },
    description: '+4 攻击;攻击使目标护甲降低(湮灭之刃前置)。' },
);
