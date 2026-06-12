/** 第三批 6 名原创英雄:卡兹/塞拉斯/戈隆/奈雅/沃斯/维拉。 */
import { V } from '../../core/vec2';
import type { AbilityDef, HeroDef } from './types';
import {
  damageArea, modifierArea, enemiesIn, alliesIn, spellDamage, blinkTo, summonUnit,
} from '../../sim/abilities';
import { applyModifier, hasModifier } from '../../sim/modifiers';
import { isEnemy } from '../../sim/combat';
import type { Unit } from '../../sim/unit';
import type { World } from '../../sim/world';

// ============ 卡兹·狂战士(力量近战核心) ============

const LEAP_DMG = [80, 130, 180, 230];

const KAZ_Q: AbilityDef = {
  key: 'kaz_leap', name: '裂地跃击', maxLevel: 4, targetMode: 'point',
  castRange: [600, 600, 600, 600], manaCost: [90, 100, 110, 120], cooldown: [13, 11, 9, 7],
  castPoint: 0.1, tags: ['nuke', 'aoe', 'escape'],
  description: '跃向目标点,落地震伤并减速周围敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    blinkTo(w, caster, pos);
    damageArea(w, caster, caster.pos, 300, LEAP_DMG[lvl - 1]);
    modifierArea(w, caster, caster.pos, 300, {
      key: 'kaz_leap_slow', duration: 2, stats: { bonusMoveSpeedPct: -0.25 },
    }, 'enemy');
    w.emit({ kind: 'fx', fx: 'leap', pos: V.clone(caster.pos), radius: 300 });
  },
  aiScore(w, caster, lvl) {
    const foes = enemiesIn(w, caster, caster.pos, 620).filter((t) => t.isHero());
    if (!foes.length) return null;
    foes.sort((a, b) => a.hp - b.hp);
    return { score: 64 + (foes[0].hp < LEAP_DMG[lvl - 1] ? 30 : 0), pos: V.clone(foes[0].pos) };
  },
};

const RAGE_LS = [0.2, 0.3, 0.4, 0.5];
const RAGE_IAS = [0.3, 0.45, 0.6, 0.75];

const KAZ_W: AbilityDef = {
  key: 'kaz_rage', name: '嗜血狂怒', maxLevel: 4, targetMode: 'none',
  manaCost: [50, 50, 50, 50], cooldown: [18, 16, 14, 12],
  castPoint: 0.0, tags: ['buff'],
  description: '陷入狂怒 6 秒,大幅提升攻速与吸血。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, {
      key: 'kaz_rage_buff', duration: 6, isBuff: true,
      stats: { bonusAttackSpeed: RAGE_IAS[lvl - 1], lifesteal: RAGE_LS[lvl - 1] },
    }, caster.id);
  },
  aiScore(w, caster) {
    return enemiesIn(w, caster, caster.pos, 500).length ? { score: 50 } : null;
  },
};

const BASH_CHANCE = [0.1, 0.15, 0.2, 0.25];
const BASH_DMG = [30, 50, 70, 90];

const KAZ_E: AbilityDef = {
  key: 'kaz_bash', name: '重击', maxLevel: 4, targetMode: 'passive',
  tags: ['stun'],
  description: '攻击有概率击晕目标并造成额外伤害。',
  passiveModifier: () => ({ key: 'kaz_bash_passive', isBuff: true }),
  orbOnHit(w, attacker, target, lvl) {
    if (target.isBuilding()) return;
    if (w.rng.chance(BASH_CHANCE[lvl - 1])) {
      spellDamage(w, attacker, target, BASH_DMG[lvl - 1]);
      applyModifier(w, target, { key: 'kaz_bash_stun', duration: 1, states: { stunned: true } }, attacker.id);
      w.emit({ kind: 'fx', fx: 'bash', pos: V.clone(target.pos) });
    }
  },
};

const BERSERK_RETURN = [0.4, 0.6, 0.8];

const KAZ_R: AbilityDef = {
  key: 'kaz_berserk', name: '狂战士之血', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [75, 75, 75], cooldown: [60, 50, 40],
  castPoint: 0.0, tags: ['buff', 'ultimate'],
  description: '8 秒内:受到的物理伤害部分转化为攻击力,并免疫减速。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, {
      key: 'kaz_berserk_buff', duration: 8, isBuff: true,
      stats: { bonusDamage: 40 + lvl * 30, bonusMoveSpeedPct: 0.2 },
    }, caster.id);
    void BERSERK_RETURN;
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    return foes.length && caster.hp / caster.calc.maxHp > 0.3 ? { score: 72 } : null;
  },
};

export const KAZ: HeroDef = {
  key: 'kaz', name: '卡兹', title: '狂战士', primary: 'str',
  baseStr: 22, gainStr: 2.8, baseAgi: 18, gainAgi: 2.0, baseInt: 13, gainInt: 1.3,
  baseDamage: [29, 35], baseArmor: 3, baseMs: 305, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.35, color: '#e57373', glyph: '狂',
  abilities: [KAZ_Q, KAZ_W, KAZ_E, KAZ_R], aiRole: 'carry',
};

// ============ 塞拉斯·风暴游侠(敏捷远程) ============

const MULTI_DMG = [60, 100, 140, 180];

const SELAS_Q: AbilityDef = {
  key: 'selas_multi', name: '多重箭', maxLevel: 4, targetMode: 'point',
  castRange: [800, 800, 800, 800], manaCost: [90, 105, 120, 135], cooldown: [9, 8, 7, 6],
  castPoint: 0.3, tags: ['nuke', 'aoe'],
  description: '扇形射出箭雨,伤害并短暂束缚命中的敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const hit = damageArea(w, caster, pos, 280, MULTI_DMG[lvl - 1]);
    modifierArea(w, caster, pos, 280, {
      key: 'selas_multi_root', duration: 0.8, states: { rooted: true },
    }, 'enemy');
    w.emit({ kind: 'fx', fx: 'arrows', pos: V.clone(pos), radius: 280 });
    void hit;
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 820).filter((t) => t.isHero());
    if (!foes.length) return null;
    return { score: 56 + foes.length * 10, pos: V.clone(foes[0].pos) };
  },
};

const STORMSTEP_DMG = [70, 120, 170, 220];

const SELAS_W: AbilityDef = {
  key: 'selas_step', name: '风暴步', maxLevel: 4, targetMode: 'point',
  castRange: [550, 600, 650, 700], manaCost: [80, 85, 90, 95], cooldown: [14, 12, 10, 8],
  castPoint: 0.0, tags: ['escape', 'nuke'],
  description: '闪现一段距离,并对落点周围敌人造成雷击伤害。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    blinkTo(w, caster, pos);
    damageArea(w, caster, caster.pos, 250, STORMSTEP_DMG[lvl - 1]);
    w.emit({ kind: 'fx', fx: 'stormstep', pos: V.clone(caster.pos), radius: 250 });
  },
  aiScore(w, caster) {
    if (caster.hp / caster.calc.maxHp < 0.4 && enemiesIn(w, caster, caster.pos, 400).length) {
      return { score: 80, pos: V.clone(retreatPoint(w, caster)) };
    }
    return null;
  },
};

const SHARP_DMG = [16, 24, 32, 40];

const SELAS_E: AbilityDef = {
  key: 'selas_sharp', name: '锐眼', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '提升攻击距离与攻击力。',
  passiveModifier: (lvl) => ({
    key: 'selas_sharp_passive', isBuff: true,
    stats: { bonusAttackRange: 40 + lvl * 20, bonusDamage: SHARP_DMG[lvl - 1] },
  }),
};

const STORM_TICK = [55, 80, 105];

const SELAS_R: AbilityDef = {
  key: 'selas_arrowstorm', name: '箭雨风暴', maxLevel: 3, ultimate: true, targetMode: 'point',
  castRange: [900, 900, 900], manaCost: [150, 220, 290], cooldown: [70, 60, 50],
  castPoint: 0.3, tags: ['aoe', 'channel', 'ultimate'],
  description: '在区域持续倾泻箭雨 5 秒。',
  channel: {
    duration: () => 5,
    tickInterval: 0.5,
    onChannelTick(w, caster, lvl, pos) {
      if (!pos) return;
      damageArea(w, caster, pos, 450, STORM_TICK[lvl - 1]);
      w.emit({ kind: 'fx', fx: 'arrows', pos: V.clone(pos), radius: 450 });
    },
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 850).filter((t) => t.isHero());
    if (foes.length < 2) return null;
    return { score: 84, pos: V.clone(foes[0].pos) };
  },
};

export const SELAS: HeroDef = {
  key: 'selas', name: '塞拉斯', title: '风暴游侠', primary: 'agi',
  baseStr: 16, gainStr: 1.7, baseAgi: 25, gainAgi: 3.0, baseInt: 15, gainInt: 1.5,
  baseDamage: [25, 31], baseArmor: 1, baseMs: 300, attackRange: 600,
  projectileSpeed: 1150, bat: 1.7, attackPoint: 0.4, color: '#4dd0e1', glyph: '雨',
  abilities: [SELAS_Q, SELAS_W, SELAS_E, SELAS_R], aiRole: 'carry',
};

// ============ 戈隆·山岩守护(力量先手) ============

const TOSS_DMG = [100, 150, 200, 250];

const GOLON_Q: AbilityDef = {
  key: 'golon_toss', name: '巨岩投掷', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [700, 700, 700, 700], manaCost: [110, 120, 130, 140], cooldown: [12, 11, 10, 9],
  castPoint: 0.2, tags: ['nuke', 'stun'],
  description: '抓起身边最近单位砸向目标,落点伤害并眩晕。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    // 把落点周围敌人砸伤眩晕
    damageArea(w, caster, target.pos, 275, TOSS_DMG[lvl - 1]);
    modifierArea(w, caster, target.pos, 275, {
      key: 'golon_toss_stun', duration: 1.2, states: { stunned: true },
    }, 'enemy');
    w.emit({ kind: 'fx', fx: 'toss', pos: V.clone(caster.pos), pos2: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    if (!foes.length) return null;
    return { score: 68, targetId: foes[0].id };
  },
};

const STONE_ARMOR = [4, 7, 10, 13];

const GOLON_W: AbilityDef = {
  key: 'golon_stone', name: '岩石护甲', maxLevel: 4, targetMode: 'none',
  manaCost: [40, 40, 40, 40], cooldown: [12, 12, 12, 12],
  castPoint: 0.0, tags: ['buff'],
  description: '披上岩甲,大幅提升护甲并反弹部分近战伤害。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, {
      key: 'golon_stone_buff', duration: 10, isBuff: true,
      stats: { bonusArmor: STONE_ARMOR[lvl - 1] },
    }, caster.id);
  },
  aiScore(w, caster) {
    return caster.hp / caster.calc.maxHp < 0.7 && enemiesIn(w, caster, caster.pos, 500).length
      ? { score: 46 } : null;
  },
};

const GOLON_E: AbilityDef = {
  key: 'golon_shield', name: '魔抗皮肤', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '坚岩之躯抵御法术,提升魔法抗性。',
  passiveModifier: (lvl) => ({
    key: 'golon_shield_passive', isBuff: true,
    stats: { bonusMagicResist: 0.08 + lvl * 0.04 },
  }),
};

const PRISON_DMG = [120, 180, 240];

const GOLON_R: AbilityDef = {
  key: 'golon_prison', name: '大地禁锢', maxLevel: 3, ultimate: true, targetMode: 'point',
  castRange: [600, 600, 600], manaCost: [150, 225, 300], cooldown: [80, 70, 60],
  castPoint: 0.4, tags: ['stun', 'aoe', 'ultimate'],
  description: '岩柱崛起,禁锢并持续伤害区域内敌人 2.5 秒。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    modifierArea(w, caster, pos, 350, {
      key: 'golon_prison_root', duration: 2.5, states: { rooted: true, disarmed: true },
      tickInterval: 0.5,
      onTick: (world, u) => { spellDamage(world, caster, u, PRISON_DMG[lvl - 1] / 5); },
    }, 'enemy');
    w.emit({ kind: 'fx', fx: 'prison', pos: V.clone(pos), radius: 350 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    if (!foes.length) return null;
    return { score: 82 + foes.length * 6, pos: V.clone(foes[0].pos) };
  },
};

export const GOLON: HeroDef = {
  key: 'golon', name: '戈隆', title: '山岩守护', primary: 'str',
  baseStr: 24, gainStr: 3.1, baseAgi: 11, gainAgi: 1.0, baseInt: 15, gainInt: 1.6,
  baseDamage: [27, 33], baseArmor: 4, baseMs: 295, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.5, color: '#90a4ae', glyph: '山',
  abilities: [GOLON_Q, GOLON_W, GOLON_E, GOLON_R], aiRole: 'tank',
};

// ============ 奈雅·自然先知(智力召唤/推进) ============

const SPROUT_DUR = [2.0, 2.75, 3.5, 4.25];

const NAYA_Q: AbilityDef = {
  key: 'naya_sprout', name: '荆棘缠绕', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [625, 700, 775, 850], manaCost: [70, 80, 90, 100], cooldown: [11, 10, 9, 8],
  castPoint: 0.3, tags: ['stun'],
  description: '召出荆棘困住目标,使其无法移动。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    applyModifier(w, target, {
      key: 'naya_sprout_root', duration: SPROUT_DUR[lvl - 1], states: { rooted: true },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'sprout', pos: V.clone(target.pos), radius: 100 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 750).filter((t) => t.isHero());
    if (!foes.length) return null;
    foes.sort((a, b) => a.hp - b.hp);
    return { score: 60, targetId: foes[0].id };
  },
};

const NAYA_W: AbilityDef = {
  key: 'naya_teleport', name: '自然传送', maxLevel: 4, targetMode: 'point',
  castRange: [99999, 99999, 99999, 99999], manaCost: [60, 50, 40, 30], cooldown: [40, 32, 24, 16],
  castPoint: 0.0, tags: ['escape'],
  description: '短暂引导后传送到地图任意位置。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    applyModifier(w, caster, {
      key: 'naya_tp', duration: 2.5 - lvl * 0.3,
      states: { rooted: true, disarmed: true },
      onExpire(world, u, m) {
        if (!u.alive || m.data!.cancelled) return;
        blinkTo(world, u, pos);
        world.emit({ kind: 'fx', fx: 'tp_arrive', pos: V.clone(pos) });
      },
      tickInterval: 0.1,
      onTick(world, u, m) {
        if (u.modifiers.some((x) => x.def.states?.stunned)) { m.data!.cancelled = 1; m.expiresAt = -Infinity; }
      },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'tp_start', pos: V.clone(caster.pos), pos2: V.clone(pos), duration: 2 });
  },
};

const TREANT_COUNT = [1, 2, 3, 4];

const NAYA_E: AbilityDef = {
  key: 'naya_treants', name: '召唤树人', maxLevel: 4, targetMode: 'none',
  manaCost: [110, 120, 130, 140], cooldown: [34, 32, 30, 28],
  castPoint: 0.3, tags: ['buff'],
  description: '召唤数个树人协助作战,持续 40 秒。',
  onCast(w, caster, lvl) {
    const n = TREANT_COUNT[lvl - 1];
    for (let i = 0; i < n; i++) {
      const offset = { x: Math.cos((i / n) * Math.PI * 2) * 120, y: Math.sin((i / n) * Math.PI * 2) * 120 };
      summonUnit(w, caster, {
        name: '远古树人', hp: 280 + lvl * 60, dmg: [28 + lvl * 6, 34 + lvl * 6],
        armor: 2 + lvl, ms: 320, range: 100, duration: 40, magicResist: 0.2,
      }, V.add(caster.pos, offset), false);
    }
    w.emit({ kind: 'fx', fx: 'summon', pos: V.clone(caster.pos), radius: 150 });
  },
  aiScore(w, caster) {
    // 推线/参战时召唤
    const own = w.queryRadius(caster.pos, 1000, (u) => u.team === caster.team && u.kind === 'creep').length;
    return own < 8 ? { score: 40 } : null;
  },
};

const WRATH_TICK = [70, 110, 150];

const NAYA_R: AbilityDef = {
  key: 'naya_wrath', name: '自然之怒', maxLevel: 3, ultimate: true, targetMode: 'point',
  castRange: [99999, 99999, 99999], manaCost: [180, 260, 340], cooldown: [60, 55, 50],
  castPoint: 0.4, tags: ['nuke', 'aoe', 'ultimate'],
  description: '在全图任意区域降下自然之怒,反复轰击敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const at = V.clone(pos);
    applyModifier(w, caster, {
      key: 'naya_wrath_caster', duration: 3.1, isBuff: true, tickInterval: 1,
      onTick(world, u) {
        damageArea(world, u, at, 500, WRATH_TICK[lvl - 1]);
        world.emit({ kind: 'fx', fx: 'wrath', pos: V.clone(at), radius: 500 });
      },
    }, caster.id);
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 900).filter((t) => t.isHero());
    if (foes.length < 2) return null;
    return { score: 80, pos: V.clone(foes[0].pos) };
  },
};

export const NAYA: HeroDef = {
  key: 'naya', name: '奈雅', title: '自然先知', primary: 'int',
  baseStr: 18, gainStr: 2.0, baseAgi: 16, gainAgi: 1.6, baseInt: 22, gainInt: 2.7,
  baseDamage: [24, 30], baseArmor: 2, baseMs: 320, attackRange: 600,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.4, color: '#81c784', glyph: '林',
  abilities: [NAYA_Q, NAYA_W, NAYA_E, NAYA_R], aiRole: 'support',
};

// ============ 沃斯·亡灵法师(智力消耗/法球) ============

const DECAY_DMG = [90, 150, 210, 270];

const VOS_Q: AbilityDef = {
  key: 'vos_decay', name: '腐朽', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [600, 600, 600, 600], manaCost: [90, 105, 120, 135], cooldown: [8, 7, 6, 5],
  castPoint: 0.35, tags: ['nuke'],
  description: '腐蚀目标生命,造成魔法伤害并窃取其力量。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    spellDamage(w, caster, target, DECAY_DMG[lvl - 1]);
    applyModifier(w, caster, {
      key: 'vos_decay_steal', stackable: true, duration: 25, isBuff: true,
      stats: { bonusStr: 2 },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'decay', pos: V.clone(target.pos) });
  },
  aiScore(w, caster, lvl) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    if (!foes.length) return null;
    foes.sort((a, b) => a.hp - b.hp);
    return { score: 64 + (foes[0].hp < DECAY_DMG[lvl - 1] * 0.75 ? 40 : 0), targetId: foes[0].id };
  },
};

const VOS_W: AbilityDef = {
  key: 'vos_curse', name: '衰老诅咒', maxLevel: 4, targetMode: 'point',
  castRange: [700, 700, 700, 700], manaCost: [80, 90, 100, 110], cooldown: [13, 12, 11, 10],
  castPoint: 0.35, tags: ['slow', 'aoe'],
  description: '诅咒区域,大幅减缓敌人移速与攻速。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    modifierArea(w, caster, pos, 325, {
      key: 'vos_curse_slow', duration: 5,
      stats: { bonusMoveSpeedPct: -(0.2 + lvl * 0.06), bonusAttackSpeed: -(0.2 + lvl * 0.06) },
    }, 'enemy');
    w.emit({ kind: 'fx', fx: 'curse', pos: V.clone(pos), radius: 325 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    if (!foes.length) return null;
    return { score: 48 + foes.length * 8, pos: V.clone(foes[0].pos) };
  },
};

const MANABURN = [20, 35, 50, 65];

const VOS_E: AbilityDef = {
  key: 'vos_manaburn', name: '法力之蚀', maxLevel: 4, targetMode: 'passive',
  tags: ['orb'],
  description: '攻击灼烧目标法力,并造成等量伤害。',
  passiveModifier: () => ({ key: 'vos_manaburn_passive', isBuff: true }),
  orbOnHit(w, attacker, target, lvl) {
    if (target.isBuilding() || target.calc.maxMp <= 0) return;
    const burn = Math.min(target.mp, MANABURN[lvl - 1]);
    if (burn <= 0) return;
    target.mp -= burn;
    spellDamage(w, attacker, target, burn);
  },
};

const PULSE_VAL = [200, 300, 400];

const VOS_R: AbilityDef = {
  key: 'vos_pulse', name: '亡者脉冲', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [150, 200, 250], cooldown: [30, 25, 20],
  castPoint: 0.3, tags: ['nuke', 'heal', 'aoe', 'ultimate'],
  description: '释放亡者波动:伤害周围敌人,同时治疗周围友军。',
  onCast(w, caster, lvl) {
    damageArea(w, caster, caster.pos, 550, PULSE_VAL[lvl - 1]);
    for (const a of alliesIn(w, caster, caster.pos, 550)) {
      a.hp = Math.min(a.calc.maxHp, a.hp + PULSE_VAL[lvl - 1] * 0.6);
    }
    w.emit({ kind: 'fx', fx: 'pulse', pos: V.clone(caster.pos), radius: 550 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 540).filter((t) => t.isHero());
    if (!foes.length) return null;
    return { score: 60 + foes.length * 10 };
  },
};

export const VOS: HeroDef = {
  key: 'vos', name: '沃斯', title: '亡灵法师', primary: 'int',
  baseStr: 19, gainStr: 2.1, baseAgi: 13, gainAgi: 1.3, baseInt: 23, gainInt: 2.8,
  baseDamage: [23, 29], baseArmor: 2, baseMs: 295, attackRange: 600,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.4, color: '#7e57c2', glyph: '亡',
  abilities: [VOS_Q, VOS_W, VOS_E, VOS_R], aiRole: 'ganker',
};

// ============ 维拉·噬魂女妖(智力消耗辅助) ============

const DRAIN_DPS = [60, 90, 120, 150];

const VIRA_Q: AbilityDef = {
  key: 'vira_drain', name: '噬魂', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [550, 550, 550, 550], manaCost: [70, 80, 90, 100], cooldown: [16, 14, 12, 10],
  castPoint: 0.2, tags: ['nuke', 'heal', 'channel'],
  description: '引导吸取目标生命,转化为自身生命,持续 4 秒。',
  channel: {
    duration: () => 4,
    tickInterval: 0.4,
    onChannelTick(w, caster, lvl) {
      const t = caster.channeling?.targetId ? w.getUnit(caster.channeling.targetId) : undefined;
      if (!t || !t.alive || V.dist(caster.pos, t.pos) > 700) {
        if (caster.channeling) caster.channeling.until = -Infinity;
        return;
      }
      const dealt = spellDamage(w, caster, t, DRAIN_DPS[lvl - 1] * 0.4);
      caster.hp = Math.min(caster.calc.maxHp, caster.hp + dealt);
      w.emit({ kind: 'fx', fx: 'drain', pos: V.clone(caster.pos), pos2: V.clone(t.pos) });
    },
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 540).filter((t) => t.isHero());
    if (!foes.length) return null;
    foes.sort((a, b) => a.hp - b.hp);
    return { score: 58, targetId: foes[0].id };
  },
};

const SILENCE_DUR = [3, 4, 5, 6];

const VIRA_W: AbilityDef = {
  key: 'vira_silence', name: '魔咒沉默', maxLevel: 4, targetMode: 'point',
  castRange: [800, 800, 800, 800], manaCost: [90, 100, 110, 120], cooldown: [17, 15, 13, 11],
  castPoint: 0.3, tags: ['aoe'],
  description: '令区域内敌人陷入沉默,无法施法。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    modifierArea(w, caster, pos, 325, {
      key: 'vira_silence_debuff', duration: SILENCE_DUR[lvl - 1], states: { silenced: true },
    }, 'enemy');
    w.emit({ kind: 'fx', fx: 'silence', pos: V.clone(pos), radius: 325 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 800).filter((t) => t.isHero());
    if (foes.length < 1) return null;
    return { score: 56 + foes.length * 10, pos: V.clone(foes[0].pos) };
  },
};

const AMP = [0.1, 0.16, 0.22, 0.28];

const VIRA_E: AbilityDef = {
  key: 'vira_amp', name: '魔能涌动', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '强化法术造成的伤害。',
  passiveModifier: (lvl) => ({
    key: 'vira_amp_passive', isBuff: true, stats: { spellAmp: AMP[lvl - 1] },
  }),
};

const TERROR_DMG = [150, 225, 300];

const VIRA_R: AbilityDef = {
  key: 'vira_terror', name: '恐惧降临', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [175, 250, 325], cooldown: [90, 80, 70],
  castPoint: 0.3, tags: ['nuke', 'aoe', 'slow', 'ultimate'],
  description: '释放恐惧波动,伤害并使周围敌人陷入恐慌(大幅减速)。',
  onCast(w, caster, lvl) {
    damageArea(w, caster, caster.pos, 600, TERROR_DMG[lvl - 1]);
    modifierArea(w, caster, caster.pos, 600, {
      key: 'vira_terror_slow', duration: 3, stats: { bonusMoveSpeedPct: -0.45, bonusAttackSpeed: -0.4 },
    }, 'enemy');
    w.emit({ kind: 'fx', fx: 'terror', pos: V.clone(caster.pos), radius: 600 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 550).filter((t) => t.isHero());
    if (foes.length < 2) return null;
    return { score: 86 };
  },
};

export const VIRA: HeroDef = {
  key: 'vira', name: '维拉', title: '噬魂女妖', primary: 'int',
  baseStr: 17, gainStr: 1.8, baseAgi: 15, gainAgi: 1.5, baseInt: 24, gainInt: 2.9,
  baseDamage: [22, 28], baseArmor: 1, baseMs: 290, attackRange: 575,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.4, color: '#ba68c8', glyph: '妖',
  abilities: [VIRA_Q, VIRA_W, VIRA_E, VIRA_R], aiRole: 'support',
};

export const BATCH3 = [KAZ, SELAS, GOLON, NAYA, VOS, VIRA];

/** 朝远离最近敌人的方向取一个撤退落点。 */
function retreatPoint(w: World, caster: Unit): { x: number; y: number } {
  const foes = enemiesIn(w, caster, caster.pos, 600);
  if (!foes.length) return caster.pos;
  let cx = 0, cy = 0;
  for (const f of foes) { cx += f.pos.x; cy += f.pos.y; }
  cx /= foes.length; cy /= foes.length;
  const away = V.norm(V.sub(caster.pos, { x: cx, y: cy }));
  return V.add(caster.pos, V.scale(away, 650));
}

// 引用以避免未使用告警(isEnemy/hasModifier 供未来扩展)
void isEnemy; void hasModifier;
