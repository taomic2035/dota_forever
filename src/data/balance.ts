/**
 * 全部游戏数值的单一真相源。
 * 数值取"经典 DotA 1 时代近似值"——目标是手感与节奏忠实,允许为可玩性微调;
 * 调平衡只改本文件。
 */

// ---------- 时间 ----------
export const TICK_RATE = 30;
export const DT = 1 / TICK_RATE;

// ---------- 攻击类型 × 护甲类型 ----------
export type AttackType = 'hero' | 'normal' | 'pierce' | 'siege' | 'spell' | 'chaos';
export type ArmorType = 'hero' | 'unarmored' | 'light' | 'medium' | 'heavy' | 'fortified';

/** 克制矩阵:行=攻击类型,列=护甲类型。建筑(fortified)免疫法术;chaos 对所有护甲 100%。 */
export const DAMAGE_MATRIX: Record<AttackType, Record<ArmorType, number>> = {
  hero:   { hero: 1.0, unarmored: 1.0,  light: 1.0,  medium: 1.0, heavy: 1.0,  fortified: 0.5 },
  normal: { hero: 0.75, unarmored: 1.0, light: 1.0,  medium: 1.5, heavy: 1.0,  fortified: 0.7 },
  pierce: { hero: 0.5, unarmored: 1.5,  light: 1.5,  medium: 0.75, heavy: 1.0, fortified: 0.35 },
  siege:  { hero: 0.5, unarmored: 1.0,  light: 1.0,  medium: 0.5, heavy: 1.0,  fortified: 1.5 },
  spell:  { hero: 1.0, unarmored: 1.0,  light: 1.0,  medium: 1.0, heavy: 1.0,  fortified: 0.0 },
  chaos:  { hero: 1.0, unarmored: 1.0,  light: 1.0,  medium: 1.0, heavy: 1.0,  fortified: 1.0 },
};

/** WC3 护甲减伤公式;负甲为增伤(返回负数表示额外承伤)。 */
export function armorReduction(armor: number): number {
  if (armor >= 0) return (0.06 * armor) / (1 + 0.06 * armor);
  return -(2 - Math.pow(0.94, -armor)) + 1; // = 1 - (2 - 0.94^|a|),结果为负
}

// ---------- 英雄属性 ----------
export const HP_PER_STR = 19;
export const HP_REGEN_PER_STR = 0.03;
export const MP_PER_INT = 13;
export const MP_REGEN_PER_INT = 0.04;
export const ARMOR_PER_AGI = 1 / 7;
export const IAS_PER_AGI = 0.01; // 1 敏 = +1% 攻速
export const BASE_HP = 150;
export const BASE_MP = 0;
export const BASE_HP_REGEN = 0.25;
export const BASE_MP_REGEN = 0.01;
export const HERO_BASE_MAGIC_RESIST = 0.25;
export const MAGIC_RESIST_CAP = 0.85; // 魔抗上限;聚合时只在最终统一 clamp 一次(见 combat.recalcUnit)
export const DEFAULT_BAT = 1.7;
export const MAX_IAS_BONUS = 4.0;   // +400%
export const MIN_ATTACK_INTERVAL_FACTOR = 1 / 5;
export const MAX_MOVE_SPEED = 522;
export const MIN_MOVE_SPEED = 100;
export const TURN_RATE = Math.PI * 4; // 弧度/秒,简化统一

// ---------- 等级与经验 ----------
export const MAX_LEVEL = 25;
/** XP_TABLE[n] = 升到 n+2 级所需累计 XP(index 0 → 2 级)。校准至经典 DotA 1(M10):每级增量 ≈ 200+100·(n-1)。 */
export const XP_TABLE: number[] = (() => {
  const t: number[] = [];
  let acc = 0;
  for (let lvl = 2; lvl <= 25; lvl++) {
    acc += 200 + (lvl - 2) * 100; // 200, 500, 900, ... 经典升级曲线
    t.push(acc);
  }
  return t;
})();
/** 技能升点规则:普通技能上限随等级 (lvl+1)/2,大招 6/11/16。 */
export const ULT_LEVELS = [6, 11, 16];
export const STAT_BONUS_MAX = 10; // 黄点
export const STAT_BONUS_PER_LEVEL = 2; // 每点黄点 +2 全属性

export function xpForKillLevel(victimLevel: number): number {
  return 100 + victimLevel * 36; // 英雄击杀经验,校准至经典(M10)
}
export const XP_SHARE_RADIUS = 1000; // 经典经验共享圈(M10:1300→1000)
export const DENY_XP_FACTOR = 0.5;

// ---------- 经济 ----------
export const STARTING_GOLD = 603;
export const PERIODIC_GOLD = 1;
export const PERIODIC_GOLD_INTERVAL = 0.6; // 秒(M10:0.8→0.6,经典约 100 金/分)
export function heroKillBounty(victimLevel: number, streak: number): number {
  let g = 100 + 11 * victimLevel; // 校准至经典(M10):前期赏金更低、后期更高
  // 终结连杀额外赏金:经典阶梯 3→50 4→100 5→200 6→300 7→400 8+→500
  if (streak >= 3) {
    const ladder = [50, 100, 200, 300, 400, 500];
    g += ladder[Math.min(streak - 3, ladder.length - 1)];
  }
  return g;
}
export const ASSIST_RADIUS = 1000; // 经典助攻圈(M10:1300→1000)
export function deathGoldLoss(level: number): number {
  return 30 * level;
}
export function buybackCost(level: number): number {
  return Math.floor(100 + level * level * 2); // 经典 100 + lvl²×2
}
/** 买活冷却(秒):防止同一英雄短时间反复买活,后期博弈核心。 */
export const BUYBACK_COOLDOWN = 300;
export const SELL_REFUND = 0.5;

// ---------- 复活 ----------
export function respawnTime(level: number): number {
  return Math.min(4 * level + 2, 110);
}

// ---------- 兵线 ----------
export const FIRST_WAVE_TIME = 90;       // 比赛开始(0:00)后 90s 第一波
export const WAVE_INTERVAL = 30;
export const MELEE_PER_WAVE = 3;
export const RANGED_PER_WAVE = 1;
export const SIEGE_EVERY_N_WAVES = 7;
export const CREEP_UPGRADE_INTERVAL = 450; // 7.5min 一次成长
export const CREEP_UPGRADE_HP = { melee: 19, ranged: 18, siege: 28 };
export const CREEP_UPGRADE_DMG = { melee: 1, ranged: 2, siege: 3 };
export const CREEP_LEASH_RANGE = 600;
export const CREEP_AGGRO_RANGE = 500;

export const CREEP_STATS = {
  melee:  { hp: 550, dmg: [19, 23] as [number, number], armor: 2, armorType: 'medium' as ArmorType, attackType: 'normal' as AttackType, range: 100, ms: 325, bat: 1.0, bounty: [38, 48] as [number, number], xp: 62 },
  ranged: { hp: 300, dmg: [21, 26] as [number, number], armor: 0, armorType: 'light' as ArmorType, attackType: 'pierce' as AttackType, range: 500, ms: 325, bat: 2.0, bounty: [43, 52] as [number, number], xp: 41 },
  siege:  { hp: 500, dmg: [35, 46] as [number, number], armor: 0, armorType: 'fortified' as ArmorType, attackType: 'siege' as AttackType, range: 690, ms: 325, bat: 3.0, bounty: [66, 80] as [number, number], xp: 88 },
  /** 超级兵 = 对应基础兵 × 倍率 */
  superFactor: { hp: 2.0, dmg: 1.8, bounty: 0.5, xp: 0.7 },
  megaFactor: { hp: 3.2, dmg: 2.6, bounty: 0.35, xp: 0.6 },
};

// ---------- 建筑 ----------
export const TOWER_STATS = {
  t1: { hp: 1300, dmg: [100, 120] as [number, number], armor: 12, range: 700, bat: 1.0, bounty: 264, teamGold: 200 },
  t2: { hp: 1600, dmg: [120, 140] as [number, number], armor: 14, range: 700, bat: 1.0, bounty: 312, teamGold: 200 },
  t3: { hp: 1600, dmg: [140, 160] as [number, number], armor: 15, range: 700, bat: 1.0, bounty: 358, teamGold: 200 },
  t4: { hp: 1600, dmg: [140, 160] as [number, number], armor: 16, range: 700, bat: 1.0, bounty: 405, teamGold: 200 },
};
export const TOWER_VISION = 1900;
export const TOWER_TRUE_SIGHT = 900;
// 注:摧毁兵营不直接给金(经典设计:奖励是该路超级兵),故无 teamGold 字段(D10)。
export const RAX_STATS = {
  melee:  { hp: 1500, armor: 12 },
  ranged: { hp: 1200, armor: 9 },
};
export const ANCIENT_STATS = { hp: 4250, armor: 13, regen: 3 };
export const FOUNTAIN_STATS = { dmg: [230, 290] as [number, number], range: 1100, bat: 0.35, hpRegenPct: 0.04, mpRegenPct: 0.06 };
export const FOUNTAIN_AURA_RADIUS = 1100;

// ---------- 视野与昼夜 ----------
export const DAY_LENGTH = 300;  // 5 分钟
export const NIGHT_LENGTH = 300;
export const HERO_VISION_DAY = 1800;
export const HERO_VISION_NIGHT = 800;
export const CREEP_VISION_DAY = 850;
export const CREEP_VISION_NIGHT = 800;
export const UPHILL_MISS_CHANCE = 0.25;

// ---------- 符文 ----------
export const RUNE_INTERVAL = 120;
export const RUNE_TYPES = ['haste', 'doubledamage', 'regen', 'invis', 'illusion'] as const;
export type RuneType = (typeof RUNE_TYPES)[number];
export const RUNE_EFFECTS = {
  haste: { duration: 25, moveSpeed: 522 },
  doubledamage: { duration: 45, factor: 2 },
  regen: { duration: 30, hp: 100, mp: 67 }, // 受伤/施法即停
  invis: { duration: 36 },
  illusion: { duration: 75, count: 2 }, // 拾取生成 2 个幻象
};

// ---------- 野区 ----------
export const NEUTRAL_RESPAWN_CHECK = 60; // 每整分钟检查刷新
export const NEUTRAL_LEASH = 800;

// ---------- 深渊领主(Boss) ----------
export const PITLORD_BASE = { hp: 7500, dmg: [60, 80] as [number, number], armor: 20, ms: 300, bat: 2.0, range: 150 };
export const PITLORD_GROWTH_INTERVAL = 240; // 每 4 分钟成长
export const PITLORD_GROWTH = { hp: 500, dmg: 10, armor: 1 };
export const PITLORD_BOUNTY = { gold: [200, 290] as [number, number], teamXp: 0, killerXp: 800 };
export const PITLORD_RESPAWN = [480, 660] as [number, number]; // 8–11 分钟
export const AEGIS_REVIVE_DELAY = 5;

// ---------- 商店/物品通用 ----------
export const SHOP_RANGE = 900;
export const TP_CHANNEL_TIME = 3;
export const TP_COOLDOWN = 0;
export const BLINK_DAMAGE_LOCKOUT = 3;

// ---------- 单位碰撞 ----------
export const UNIT_RADIUS = { hero: 24, melee: 22, ranged: 22, siege: 26, tower: 72, building: 96, ancient: 130 };

// ---------- 攻击获取 ----------
export const ACQUIRE_RANGE_MELEE = 500;
export const ACQUIRE_RANGE_RANGED = 600;
export const TOWER_HERO_DEFENSE_RADIUS = 500; // 本方英雄在此范围被敌英雄攻击→塔转火
