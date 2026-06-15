/** 第九批 6 名原创英雄:维恩/里昂/卡奥斯/科格/恩尼/西奥。 */
import { V, type Vec2 } from '../../core/vec2';
import type { AbilityDef, HeroDef } from './types';
import {
  damageArea, modifierArea, enemiesIn, alliesIn, spellDamage, blinkTo, summonUnit, createIllusion, hasScepter,
} from '../../sim/abilities';
import { applyModifier, hasModifier, purge, type Modifier } from '../../sim/modifiers';
import type { Unit } from '../../sim/unit';
import type { World } from '../../sim/world';

// ============ 维恩·噬法者(敏捷反法核心) ============

const VYN_Q: AbilityDef = {
  key: 'vyn_blink', name: '闪掠', maxLevel: 4, targetMode: 'point',
  castRange: [600, 720, 840, 960], manaCost: [50, 50, 50, 50], cooldown: [9, 7, 5, 3],
  castPoint: 0.0, tags: ['escape'],
  description: '短距瞬移,用于切入与逃生。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const max = [600, 720, 840, 960][lvl - 1];
    const p = V.dist(caster.pos, pos) > max ? V.add(caster.pos, V.scale(V.norm(V.sub(pos, caster.pos)), max)) : pos;
    blinkTo(w, caster, p);
    w.emit({ kind: 'fx', fx: 'blink', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    if (caster.hp / caster.calc.maxHp >= 0.35) return null;
    return enemiesIn(w, caster, caster.pos, 450).length ? { score: 76, pos: V.clone(retreat(w, caster)) } : null;
  },
};

const MB_BURN = [28, 40, 52, 64];

const VYN_W: AbilityDef = {
  key: 'vyn_break', name: '法力击碎', maxLevel: 4, targetMode: 'passive',
  tags: ['orb'],
  description: '攻击燃烧目标法力,并造成等量于所烧法力的额外伤害。',
  passiveModifier: () => ({ key: 'vyn_break_passive', isBuff: true }),
  orbOnHit(w, attacker, target, lvl) {
    if (target.isBuilding() || target.calc.maxMp <= 0) return;
    const burn = Math.min(target.mp, MB_BURN[lvl - 1]);
    if (burn <= 0) return;
    target.mp -= burn;
    spellDamage(w, attacker, target, burn * 0.6);
  },
};

const VYN_E: AbilityDef = {
  key: 'vyn_ward', name: '法术结界', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '体内流转的反魔法力提升魔抗与闪避。',
  passiveModifier: (lvl) => ({
    key: 'vyn_ward_passive', isBuff: true,
    stats: { bonusMagicResist: 0.06 + lvl * 0.04, evasion: 0.05 + lvl * 0.03 },
  }),
};

const VOID_K = [0.8, 1.0, 1.2];

const VYN_R: AbilityDef = {
  key: 'vyn_void', name: '法力虚空', maxLevel: 3, ultimate: true, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [600, 600, 600], manaCost: [125, 200, 275], cooldown: [80, 70, 60],
  scepter: { cooldown: [55, 47, 40], desc: '神杖:冷却降低;主目标眩晕延长至 1.2 秒,周围溅射伤害从 55% 提升至 75%。' },
  castPoint: 0.3, tags: ['nuke', 'aoe', 'stun', 'ultimate'],
  description: '依据目标已损失的法力造成爆发伤害,并波及其周围敌人、短暂眩晕。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    const sc = hasScepter(caster);
    const missing = Math.max(0, target.calc.maxMp - target.mp);
    const dmg = missing * VOID_K[lvl - 1];
    spellDamage(w, caster, target, dmg);
    applyModifier(w, target, { key: 'vyn_void_stun', duration: sc ? 1.2 : 0.3, states: { stunned: true } }, caster.id);
    const splashPct = sc ? 0.75 : 0.55;
    for (const e of enemiesIn(w, caster, target.pos, 400)) {
      if (e.id === target.id) continue;
      spellDamage(w, caster, e, dmg * splashPct);
    }
    w.emit({ kind: 'fx', fx: 'manavoid', pos: V.clone(target.pos), radius: 400 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    if (!foes.length) return null;
    foes.sort((a, b) => (b.calc.maxMp - b.mp) - (a.calc.maxMp - a.mp));
    return { score: 70, targetId: foes[0].id };
  },
};

export const VYN: HeroDef = {
  key: 'vyn', name: '维恩', title: '噬法者', primary: 'agi',
  baseStr: 17, gainStr: 1.6, baseAgi: 24, gainAgi: 2.8, baseInt: 15, gainInt: 1.6,
  baseDamage: [24, 30], baseArmor: 2, baseMs: 300, attackRange: 128,
  projectileSpeed: 0, bat: 1.5, attackPoint: 0.3, color: '#42a5f5', glyph: '噬',
  abilities: [VYN_Q, VYN_W, VYN_E, VYN_R], aiRole: 'carry',
};

// ============ 里昂·决斗将军(力量决斗者) ============

const OVER_BASE = [40, 60, 80, 100];
const OVER_PER = [16, 24, 32, 40];

const LEON_Q: AbilityDef = {
  key: 'leon_odds', name: '强压', maxLevel: 4, targetMode: 'point',
  aoeRadius: [400], // 预览半径(=onCast 实际 AoE 半径)
  castRange: [700, 700, 700, 700], manaCost: [90, 100, 110, 120], cooldown: [9, 8, 7, 6],
  castPoint: 0.3, tags: ['nuke', 'aoe'],
  description: '震慑一片敌人:敌人越多每个所受伤害越高,并提升自身攻速。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const foes = enemiesIn(w, caster, pos, 400);
    const per = OVER_BASE[lvl - 1] + foes.length * OVER_PER[lvl - 1];
    for (const e of foes) spellDamage(w, caster, e, per);
    applyModifier(w, caster, { key: 'leon_odds_as', duration: 6, isBuff: true, stats: { bonusAttackSpeed: 0.1 * Math.max(1, foes.length) } }, caster.id);
    w.emit({ kind: 'fx', fx: 'odds', pos: V.clone(pos), radius: 400 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length ? { score: 50 + foes.length * 8, pos: V.clone(foes[0].pos) } : null;
  },
};

const PTA_HEAL = [90, 140, 190, 240];

const LEON_W: AbilityDef = {
  key: 'leon_pta', name: '鼓舞冲锋', maxLevel: 4, targetMode: 'unit', targetTeam: 'allyOrSelf',
  castRange: [600, 600, 600, 600], manaCost: [60, 65, 70, 75], cooldown: [16, 14, 12, 10],
  castPoint: 0.1, tags: ['buff', 'heal'],
  description: '驱散友军身上的减益,治疗并大幅提升其攻击速度。',
  onCast(w, caster, lvl, _pos, target) {
    const t = target && target.team === caster.team ? target : caster;
    purge(w, t, false);
    t.hp = Math.min(t.calc.maxHp, t.hp + PTA_HEAL[lvl - 1]);
    applyModifier(w, t, { key: 'leon_pta_buff', duration: 4, isBuff: true, stats: { bonusAttackSpeed: 0.6 + lvl * 0.15 } }, caster.id);
    w.emit({ kind: 'fx', fx: 'rally', pos: V.clone(t.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 800).filter((t) => t.isHero());
    if (!foes.length) return null;
    const allies = alliesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    const tgt = allies.sort((a, b) => b.calc.dmgMax - a.calc.dmgMax)[0] ?? caster;
    return { score: 40, targetId: tgt.id };
  },
};

const LEON_E: AbilityDef = {
  key: 'leon_courage', name: '勇气', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '战意凛然:获得吸血与额外攻击力。',
  passiveModifier: (lvl) => ({
    key: 'leon_courage_passive', isBuff: true,
    stats: { lifesteal: 0.08 + lvl * 0.05, bonusDamage: lvl * 5 },
  }),
};

const DUEL_DUR = [4, 4.5, 5];
const DUEL_BONUS = 16;

function duelEnd(world: World, u: Unit, m: Modifier): void {
  const foe = world.getUnit(m.data!.foe as number);
  if (u.alive && (!foe || !foe.alive)) {
    const buff = u.modifiers.find((x) => x.key === 'leon_duel_victory')
      ?? applyModifier(world, u, { key: 'leon_duel_victory', isBuff: true, stats: { bonusDamage: 0 } }, u.id);
    buff.data!.n = (buff.data!.n ?? 0) + 1;
    buff.def = { ...buff.def, stats: { bonusDamage: (buff.data!.n as number) * DUEL_BONUS } };
  }
}

const LEON_R: AbilityDef = {
  key: 'leon_duel', name: '决斗', maxLevel: 3, ultimate: true, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [150, 150, 150], manaCost: [75, 75, 75], cooldown: [50, 40, 30],
  scepter: { cooldown: [35, 28, 20], desc: '神杖:冷却降低;决斗结束胜者立即获得 50% 攻速 buff 持续 8 秒。' },
  castPoint: 0.3, tags: ['stun', 'ultimate'],
  description: '与目标展开决斗:双方被缚原地强制互殴,胜者永久获得攻击力。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target || target.team === caster.team) return;
    const sc = hasScepter(caster);
    const dur = DUEL_DUR[lvl - 1];
    // wrap duelEnd to add scepter attack speed bonus to winner
    const duelEndSc: typeof duelEnd = (world, u, m) => {
      duelEnd(world, u, m);
      if (sc) {
        const foe = world.getUnit(m.data!.foe as number);
        if (u.alive && (!foe || !foe.alive)) {
          applyModifier(world, u, { key: 'leon_duel_sc_as', duration: 8, isBuff: true, stats: { bonusAttackSpeed: 0.5 } }, u.id);
        }
      }
    };
    for (const [a, b] of [[caster, target], [target, caster]] as Array<[Unit, Unit]>) {
      applyModifier(w, a, {
        key: 'leon_duel', duration: dur, states: { rooted: true }, data: { foe: b.id },
        tickInterval: 0.2,
        onTick(world, u, m) { const f = world.getUnit(m.data!.foe as number); if (!f || !f.alive) m.expiresAt = -Infinity; },
        onExpire: duelEndSc,
      }, caster.id);
      a.issueOrder({ type: 'attack', targetId: b.id });
    }
    w.emit({ kind: 'fx', fx: 'duel', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 200).filter((t) => t.isHero() && t.hp < caster.hp);
    return foes.length ? { score: 84, targetId: foes[0].id } : null;
  },
};

export const LEON: HeroDef = {
  key: 'leon', name: '里昂', title: '决斗将军', primary: 'str',
  baseStr: 24, gainStr: 2.9, baseAgi: 18, gainAgi: 1.9, baseInt: 16, gainInt: 1.6,
  baseDamage: [28, 34], baseArmor: 3, baseMs: 305, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.45, color: '#ef9a9a', glyph: '决',
  abilities: [LEON_Q, LEON_W, LEON_E, LEON_R], aiRole: 'carry',
};

// ============ 卡奥斯·混沌骑士(力量幻象核心) ============

const CB_STUN = [[1, 2.4], [1.2, 2.8], [1.4, 3.2], [1.6, 3.6]];
const CB_DMG = [[90, 160], [120, 200], [150, 240], [180, 280]];

const KAOS_Q: AbilityDef = {
  key: 'kaos_bolt', name: '混沌之箭', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [600, 600, 600, 600], manaCost: [110, 120, 130, 140], cooldown: [10, 9, 8, 7],
  castPoint: 0.3, tags: ['stun', 'nuke'],
  description: '掷出混沌之箭,造成随机伤害与随机时长的眩晕。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    const [smin, smax] = CB_STUN[lvl - 1];
    const [dmin, dmax] = CB_DMG[lvl - 1];
    spellDamage(w, caster, target, w.rng.range(dmin, dmax));
    applyModifier(w, target, { key: 'kaos_bolt_stun', duration: w.rng.range(smin, smax), states: { stunned: true } }, caster.id);
    w.emit({ kind: 'fx', fx: 'chaosbolt', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    return foes.length ? { score: 64, targetId: foes[0].id } : null;
  },
};

const RIFT_ARMOR = [4, 6, 8, 10];

const KAOS_W: AbilityDef = {
  key: 'kaos_rift', name: '实相裂隙', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [550, 600, 650, 700], manaCost: [70, 75, 80, 85], cooldown: [16, 14, 12, 10],
  castPoint: 0.2, tags: ['nuke'],
  description: '撕裂空间将自己与目标拉到中点,削减目标护甲并发起追击。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    const mid = { x: (caster.pos.x + target.pos.x) / 2, y: (caster.pos.y + target.pos.y) / 2 };
    blinkTo(w, caster, mid);
    const tp = w.map.nearestWalkable(V.add(mid, { x: 60, y: 0 }));
    target.pos = tp; target.prevPos = V.clone(tp); target.path = []; target.pathGoal = null;
    applyModifier(w, target, { key: 'kaos_rift_armor', duration: 6, stats: { bonusArmor: -RIFT_ARMOR[lvl - 1] } }, caster.id);
    caster.issueOrder({ type: 'attack', targetId: target.id });
    w.emit({ kind: 'fx', fx: 'rift', pos: V.clone(mid) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length ? { score: 58, targetId: foes[0].id } : null;
  },
};

const KAOS_E: AbilityDef = {
  key: 'kaos_strike', name: '混沌强击', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '攻击有概率造成致命暴击并吸取生命。',
  passiveModifier: (lvl) => ({
    key: 'kaos_strike_passive', isBuff: true,
    stats: { critChance: 0.2 + lvl * 0.04, critMultiplier: 1.6 + lvl * 0.1, lifesteal: 0.1 },
  }),
};

const PHANTASM_COUNT = [2, 3, 4];

const KAOS_R: AbilityDef = {
  key: 'kaos_phantasm', name: '混沌幻象', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [125, 150, 175], cooldown: [120, 110, 100],
  scepter: { cooldown: [85, 78, 70], desc: '神杖:冷却降低;额外召唤 1 个幻象,所有幻象持续时间延长至 30 秒。' },
  castPoint: 0.2, tags: ['ultimate'],
  description: '召唤数个出伤强力的混沌幻象,持续 24 秒。',
  onCast(w, caster, lvl) {
    const sc = hasScepter(caster);
    const count = sc ? PHANTASM_COUNT[lvl - 1] + 1 : PHANTASM_COUNT[lvl - 1];
    const dur = sc ? 30 : 24;
    createIllusion(w, caster, count, 0.6, 2, dur);
    w.emit({ kind: 'fx', fx: 'phantasm', pos: V.clone(caster.pos), radius: 150 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length && caster.kind === 'hero' ? { score: 72 } : null;
  },
};

export const KAOS: HeroDef = {
  key: 'kaos', name: '卡奥斯', title: '混沌骑士', primary: 'str',
  baseStr: 22, gainStr: 2.8, baseAgi: 16, gainAgi: 1.8, baseInt: 16, gainInt: 1.7,
  baseDamage: [30, 42], baseArmor: 3, baseMs: 305, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.5, color: '#ab47bc', glyph: '混',
  abilities: [KAOS_Q, KAOS_W, KAOS_E, KAOS_R], aiRole: 'carry',
};

// ============ 科格·钟表匠(力量先手/陷阱) ============

const HOOK_DMG = [100, 150, 200, 250];
const HOOK_STUN = [1.0, 1.3, 1.6, 1.9];

const KOG_Q: AbilityDef = {
  key: 'kog_hook', name: '齿轮钩索', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [1000, 1100, 1200, 1300], manaCost: [100, 110, 120, 130], cooldown: [14, 12, 10, 8],
  castPoint: 0.3, tags: ['stun', 'nuke'],
  description: '射出钩索拉近自己冲向目标,造成伤害并击晕。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    const land = w.map.nearestWalkable(V.add(target.pos, V.scale(V.norm(V.sub(caster.pos, target.pos)), 130)));
    blinkTo(w, caster, land);
    spellDamage(w, caster, target, HOOK_DMG[lvl - 1]);
    applyModifier(w, target, { key: 'kog_hook_stun', duration: HOOK_STUN[lvl - 1], states: { stunned: true } }, caster.id);
    w.emit({ kind: 'fx', fx: 'hookshot', pos: V.clone(caster.pos), pos2: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 1100).filter((t) => t.isHero());
    return foes.length ? { score: 66, targetId: foes[0].id } : null;
  },
};

const BATT_DMG = [40, 60, 80, 100];

const KOG_W: AbilityDef = {
  key: 'kog_battery', name: '弹幕冲击', maxLevel: 4, targetMode: 'none',
  manaCost: [80, 90, 100, 110], cooldown: [22, 20, 18, 16],
  castPoint: 0.0, tags: ['nuke'],
  description: '开启弹幕 8 秒:不断弹射攻击附近随机敌人并造成微眩。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, {
      key: 'kog_battery_buff', duration: 8, isBuff: true, tickInterval: 0.4,
      onTick(world, u) {
        const foes = enemiesIn(world, u, u.pos, 500);
        if (!foes.length) return;
        const e = foes[world.rng.int(0, foes.length - 1)];
        spellDamage(world, u, e, BATT_DMG[lvl - 1]);
        applyModifier(world, e, { key: 'kog_battery_ministun', duration: 0.1, states: { stunned: true } }, u.id);
      },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'battery', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 450).filter((t) => t.isHero());
    return foes.length ? { score: 48 } : null;
  },
};

const ROCKET_DMG = [120, 190, 260, 330];

const KOG_E: AbilityDef = {
  key: 'kog_rocket', name: '火箭信标', maxLevel: 4, targetMode: 'point',
  aoeRadius: [450], // 预览半径(=onCast 实际 AoE 半径)
  castRange: [99999, 99999, 99999, 99999], manaCost: [50, 50, 50, 50], cooldown: [20, 17, 14, 11],
  castPoint: 0.3, tags: ['nuke', 'aoe'],
  description: '向全图任意位置发射火箭,造成范围伤害并短暂照亮该处。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    damageArea(w, caster, pos, 450, ROCKET_DMG[lvl - 1]);
    w.emit({ kind: 'fx', fx: 'rocketflare', pos: V.clone(pos), radius: 450 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 1600).filter((t) => t.isHero() && t.hp / t.calc.maxHp < 0.4);
    return foes.length ? { score: 52, pos: V.clone(foes[0].pos) } : null;
  },
};

const CAGE_DUR = [2.0, 2.5, 3.0];
const CAGE_DMG = [120, 180, 240];

const KOG_R: AbilityDef = {
  key: 'kog_cage', name: '能量牢笼', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [100, 125, 150], cooldown: [70, 60, 50],
  scepter: { cooldown: [50, 42, 35], desc: '神杖:冷却降低;牢笼范围扩大至 550,根限时间延长 1 秒。' },
  castPoint: 0.2, tags: ['stun', 'aoe', 'ultimate'],
  description: '展开能量牢笼:禁锢周围敌人并持续放电,同时强化自身护甲。',
  onCast(w, caster, lvl) {
    const sc = hasScepter(caster);
    const radius = sc ? 550 : 400;
    const rootDur = sc ? CAGE_DUR[lvl - 1] + 1 : CAGE_DUR[lvl - 1];
    modifierArea(w, caster, caster.pos, radius, { key: 'kog_cage_root', duration: rootDur, states: { rooted: true }, stats: { bonusMoveSpeedPct: -0.5 } }, 'enemy');
    damageArea(w, caster, caster.pos, radius, CAGE_DMG[lvl - 1]);
    applyModifier(w, caster, { key: 'kog_cage_armor', duration: rootDur + 1, isBuff: true, stats: { bonusArmor: 10 } }, caster.id);
    w.emit({ kind: 'fx', fx: 'powercogs', pos: V.clone(caster.pos), radius });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 380).filter((t) => t.isHero());
    return foes.length ? { score: 70 } : null;
  },
};

export const KOG: HeroDef = {
  key: 'kog', name: '科格', title: '钟表匠', primary: 'str',
  baseStr: 24, gainStr: 2.6, baseAgi: 13, gainAgi: 1.4, baseInt: 20, gainInt: 1.9,
  baseDamage: [26, 32], baseArmor: 4, baseMs: 305, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.4, color: '#ffa726', glyph: '钟',
  abilities: [KOG_Q, KOG_W, KOG_E, KOG_R], aiRole: 'tank',
};

// ============ 恩尼·虚空使者(智力召唤/控制) ============

const MAL_DMG = [50, 80, 110, 140];

const ENI_Q: AbilityDef = {
  key: 'eni_malefice', name: '噩咒', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [600, 600, 600, 600], manaCost: [95, 105, 115, 125], cooldown: [12, 11, 10, 9],
  castPoint: 0.3, tags: ['stun', 'nuke'],
  description: '诅咒目标:在 4 秒内反复造成伤害与短暂眩晕。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    applyModifier(w, target, {
      key: 'eni_malefice', duration: 4, stats: { bonusMoveSpeedPct: -0.2 }, tickInterval: 1,
      onTick(world, u) {
        spellDamage(world, caster, u, MAL_DMG[lvl - 1]);
        applyModifier(world, u, { key: 'eni_malefice_stun', duration: 0.4, states: { stunned: true } }, caster.id);
      },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'malefice', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    return foes.length ? { score: 58, targetId: foes[0].id } : null;
  },
};

const EIDO_HP = [320, 440, 560, 680];
const EIDO_DMG = [22, 30, 38, 46];

const ENI_W: AbilityDef = {
  key: 'eni_eidolons', name: '亡魂召唤', maxLevel: 4, targetMode: 'none',
  manaCost: [75, 85, 95, 105], cooldown: [34, 32, 30, 28],
  castPoint: 0.2, tags: ['buff'],
  description: '召唤三个亡魂随从作战 35 秒。',
  onCast(w, caster, lvl) {
    for (let i = 0; i < 3; i++) {
      summonUnit(w, caster, {
        name: '亡魂', hp: EIDO_HP[lvl - 1], dmg: [EIDO_DMG[lvl - 1], EIDO_DMG[lvl - 1] + 6],
        armor: 1, ms: 320, range: 100, duration: 35, magicResist: 0.33,
      }, V.add(caster.pos, { x: (i - 1) * 70, y: 60 }), true);
    }
    w.emit({ kind: 'fx', fx: 'eidolons', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    return enemiesIn(w, caster, caster.pos, 900).filter((t) => t.isHero()).length ? { score: 50 } : { score: 24 };
  },
};

const PULSE_PCT = [0.04, 0.055, 0.07, 0.085];

const ENI_E: AbilityDef = {
  key: 'eni_pulse', name: '午夜煞', maxLevel: 4, targetMode: 'point',
  castRange: [700, 700, 700, 700], manaCost: [90, 105, 120, 135], cooldown: [14, 13, 12, 11],
  castPoint: 0.3, tags: ['nuke', 'aoe'],
  description: '在地面铺开虚空之力 9 秒,按生命上限百分比持续灼烧其中敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const at = V.clone(pos);
    applyModifier(w, caster, {
      key: `eni_pulse_${w.tick}`, duration: 9, isBuff: true, tickInterval: 0.5,
      onTick(world) {
        for (const e of enemiesIn(world, caster, at, 500)) spellDamage(world, caster, e, e.calc.maxHp * PULSE_PCT[lvl - 1]);
        world.emit({ kind: 'fx', fx: 'midnight', pos: at, radius: 500 });
      },
    }, caster.id);
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length ? { score: 52, pos: V.clone(foes[0].pos) } : null;
  },
};

const BH_DUR = [3, 3.5, 4];
const BH_TICK = [80, 110, 140];

const ENI_R: AbilityDef = {
  key: 'eni_blackhole', name: '黑洞', maxLevel: 3, ultimate: true, targetMode: 'point',
  castRange: [375, 375, 375], manaCost: [200, 300, 400], cooldown: [180, 160, 140],
  scepter: { cooldown: [130, 115, 100], desc: '神杖:冷却降低;黑洞引力半径扩大至 550,每 tick 伤害提升 50%。' },
  castPoint: 0.3, tags: ['stun', 'aoe', 'channel', 'ultimate'],
  description: '引导黑洞:持续将范围内敌人吸向中心并眩晕、造成伤害。',
  onCast(w, caster, _lvl, pos) {
    w.emit({ kind: 'fx', fx: 'blackhole', pos: V.clone(pos ?? caster.pos), radius: 420 });
  },
  channel: {
    duration: (lvl) => BH_DUR[lvl - 1],
    tickInterval: 0.5,
    onChannelTick(w, caster, lvl, pos) {
      if (!pos) return;
      const sc = hasScepter(caster);
      const radius = sc ? 550 : 420;
      const tickDmg = sc ? BH_TICK[lvl - 1] * 1.5 : BH_TICK[lvl - 1];
      for (const e of enemiesIn(w, caster, pos, radius)) {
        const np = w.map.nearestWalkable(V.add(e.pos, V.scale(V.norm(V.sub(pos, e.pos)), 70)));
        e.pos = np; e.prevPos = V.clone(np); e.path = []; e.pathGoal = null;
        applyModifier(w, e, { key: 'eni_blackhole_stun', duration: 0.6, states: { stunned: true } }, caster.id);
        spellDamage(w, caster, e, tickDmg);
      }
      w.emit({ kind: 'fx', fx: 'blackhole', pos: V.clone(pos), radius });
    },
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 375).filter((t) => t.isHero());
    return foes.length >= 2 ? { score: 90, pos: V.clone(centroid(foes)) } : null;
  },
};

export const ENI: HeroDef = {
  key: 'eni', name: '恩尼', title: '虚空使者', primary: 'int',
  baseStr: 16, gainStr: 1.6, baseAgi: 14, gainAgi: 1.4, baseInt: 24, gainInt: 3.1,
  baseDamage: [22, 30], baseArmor: 1, baseMs: 295, attackRange: 550,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.45, color: '#5c6bc0', glyph: '虚',
  abilities: [ENI_Q, ENI_W, ENI_E, ENI_R], aiRole: 'support',
};

// ============ 西奥·圣光守护(智力守护辅助) ============

const PURI_HEAL = [120, 200, 280, 360];
const PURI_DMG = [80, 130, 180, 230];

const THEO_Q: AbilityDef = {
  key: 'theo_purify', name: '净化', maxLevel: 4, targetMode: 'unit', targetTeam: 'allyOrSelf',
  castRange: [550, 550, 550, 550], manaCost: [90, 105, 120, 135], cooldown: [9, 8, 7, 6],
  castPoint: 0.3, tags: ['heal', 'nuke', 'aoe'],
  description: '一道圣光治疗友军,同时灼伤其周围的敌人。',
  onCast(w, caster, lvl, _pos, target) {
    const t = target && target.team === caster.team ? target : caster;
    t.hp = Math.min(t.calc.maxHp, t.hp + PURI_HEAL[lvl - 1]);
    damageArea(w, caster, t.pos, 300, PURI_DMG[lvl - 1]);
    w.emit({ kind: 'fx', fx: 'purify', pos: V.clone(t.pos), radius: 300 });
  },
  aiScore(w, caster) {
    const allies = alliesIn(w, caster, caster.pos, 550).filter((t) => t.isHero() && t.hp / t.calc.maxHp < 0.6);
    if (!allies.length) return null;
    allies.sort((a, b) => a.hp / a.calc.maxHp - b.hp / b.calc.maxHp);
    return { score: 56, targetId: allies[0].id };
  },
};

const REPEL_DUR = [4, 5, 6, 7];

const THEO_W: AbilityDef = {
  key: 'theo_repel', name: '守护结界', maxLevel: 4, targetMode: 'unit', targetTeam: 'allyOrSelf',
  castRange: [600, 600, 600, 600], manaCost: [50, 55, 60, 65], cooldown: [16, 15, 14, 13],
  castPoint: 0.2, tags: ['buff'],
  description: '为友军赋予魔法免疫,免疫大多数法术效果。',
  onCast(w, caster, lvl, _pos, target) {
    const t = target && target.team === caster.team ? target : caster;
    applyModifier(w, t, { key: 'theo_repel_buff', duration: REPEL_DUR[lvl - 1], isBuff: true, states: { magicImmune: true }, stats: { bonusMagicResist: 0.4 } }, caster.id);
    w.emit({ kind: 'fx', fx: 'repel', pos: V.clone(t.pos) });
  },
  aiScore(w, caster) {
    const allies = alliesIn(w, caster, caster.pos, 600).filter((t) => t.isHero() && enemiesIn(w, caster, t.pos, 500).length > 0 && !hasModifier(t, 'theo_repel_buff'));
    return allies.length ? { score: 46, targetId: allies[0].id } : null;
  },
};

const THEO_E: AbilityDef = {
  key: 'theo_degen', name: '退化光环', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '圣光退化附近敌人的移动与攻击速度(光环)。',
  passiveModifier: (lvl) => ({
    key: 'theo_degen_aura', isBuff: true,
    aura: {
      radius: 350, affects: 'enemy',
      grant: { key: 'theo_degen', stats: { bonusMoveSpeedPct: -(0.08 + lvl * 0.03), bonusAttackSpeed: -(0.1 + lvl * 0.03) } },
    },
  }),
};

const GA_DUR = [5, 6, 7];

const THEO_R: AbilityDef = {
  key: 'theo_guardian', name: '守护天使', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [200, 250, 300], cooldown: [120, 110, 100],
  scepter: { cooldown: [85, 78, 70], desc: '神杖:冷却降低;范围扩大至 1200,施放时同时驱散周围友军的所有负面效果。' },
  castPoint: 0.3, tags: ['buff', 'ultimate'],
  description: '召唤守护天使,使附近全体友军免疫物理伤害数秒。',
  onCast(w, caster, lvl) {
    const sc = hasScepter(caster);
    const radius = sc ? 1200 : 900;
    modifierArea(w, caster, caster.pos, radius, { key: 'theo_guardian_buff', duration: GA_DUR[lvl - 1], isBuff: true, states: { physImmune: true } }, 'ally');
    if (sc) {
      for (const ally of alliesIn(w, caster, caster.pos, radius)) purge(w, ally, false);
    }
    w.emit({ kind: 'fx', fx: 'guardian', pos: V.clone(caster.pos), radius });
  },
  aiScore(w, caster) {
    const allies = alliesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return allies.length >= 2 && foes.length >= 2 ? { score: 80 } : null;
  },
};

export const THEO: HeroDef = {
  key: 'theo', name: '西奥', title: '圣光守护', primary: 'int',
  baseStr: 19, gainStr: 2.0, baseAgi: 14, gainAgi: 1.4, baseInt: 22, gainInt: 2.7,
  baseDamage: [21, 27], baseArmor: 2, baseMs: 305, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.4, color: '#fff176', glyph: '佑',
  abilities: [THEO_Q, THEO_W, THEO_E, THEO_R], aiRole: 'support',
};

export const BATCH9 = [VYN, LEON, KAOS, KOG, ENI, THEO];

function retreat(w: World, caster: Unit): Vec2 {
  const foes = enemiesIn(w, caster, caster.pos, 600);
  if (!foes.length) return caster.pos;
  let cx = 0, cy = 0;
  for (const f of foes) { cx += f.pos.x; cy += f.pos.y; }
  const away = V.norm(V.sub(caster.pos, { x: cx / foes.length, y: cy / foes.length }));
  return V.add(caster.pos, V.scale(away, 650));
}

function centroid(us: Unit[]): Vec2 {
  let cx = 0, cy = 0;
  for (const u of us) { cx += u.pos.x; cy += u.pos.y; }
  return { x: cx / us.length, y: cy / us.length };
}
