/** 第十六批 6 名原创英雄:安博/维普/艾莎/墨菲/萨德/灵狲。 */
import { V, type Vec2 } from '../../core/vec2';
import type { AbilityDef, HeroDef } from './types';
import {
  damageArea, modifierArea, enemiesIn, spellDamage, blinkTo, createIllusion, hasScepter,
} from '../../sim/abilities';
import { applyModifier, hasModifier } from '../../sim/modifiers';
import * as Combat from '../../sim/combat';
import type { Unit } from '../../sim/unit';
import type { World } from '../../sim/world';

// ============ 安博·余烬之灵(敏捷突进) ============

const FIST_DMG = [60, 100, 140, 180];

const EMB_Q: AbilityDef = {
  key: 'emb_fist', name: '拳拳到肉', maxLevel: 4, targetMode: 'point',
  aoeRadius: [400], // 预览半径(=onCast 实际 AoE 半径)
  castRange: [700, 700, 700, 700], manaCost: [60, 70, 80, 90], cooldown: [8, 7, 6, 5],
  castPoint: 0.1, tags: ['nuke', 'aoe'],
  description: '瞬身突进到目标区域,迅疾打击其中所有敌人后归位。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const origin = V.clone(caster.pos);
    for (const e of enemiesIn(w, caster, pos, 400)) {
      Combat.dealAttackDamage(w, caster, e);
      spellDamage(w, caster, e, FIST_DMG[lvl - 1]);
    }
    blinkTo(w, caster, origin); // 归位
    w.emit({ kind: 'fx', fx: 'sleightoffist', pos: V.clone(pos), radius: 400 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length ? { score: 56, pos: V.clone(foes[0].pos) } : null;
  },
};

const GUARD_DPS = [20, 32, 44, 56];

const EMB_W: AbilityDef = {
  key: 'emb_guard', name: '烈焰护罩', maxLevel: 4, targetMode: 'none',
  manaCost: [80, 90, 100, 110], cooldown: [16, 15, 14, 13],
  castPoint: 0.0, tags: ['buff', 'aoe'],
  description: '燃起烈焰护罩:吸收伤害并灼烧周围敌人 6 秒。',
  onCast(w, caster, lvl) {
    const m = applyModifier(w, caster, {
      key: 'emb_guard_buff', duration: 6, isBuff: true, tickInterval: 0.5,
      onTick(world, u) { for (const e of enemiesIn(world, u, u.pos, 350)) spellDamage(world, u, e, GUARD_DPS[lvl - 1]); },
    }, caster.id);
    m.data!.shield = 80 + lvl * 50;
    w.emit({ kind: 'fx', fx: 'flameguard', pos: V.clone(caster.pos), radius: 350 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 400).filter((t) => t.isHero());
    return foes.length && !hasModifier(caster, 'emb_guard_buff') ? { score: 50 } : null;
  },
};

const CHAINS_DPS = [40, 60, 80, 100];

const EMB_E: AbilityDef = {
  key: 'emb_chains', name: '灼热之链', maxLevel: 4, targetMode: 'none',
  manaCost: [90, 100, 110, 120], cooldown: [14, 13, 12, 11],
  castPoint: 0.2, tags: ['stun', 'aoe', 'nuke'],
  description: '甩出灼热锁链,缠住并灼烧周围敌人。',
  onCast(w, caster, lvl) {
    for (const e of enemiesIn(w, caster, caster.pos, 450)) {
      applyModifier(w, e, {
        key: 'emb_chains_root', duration: 1.5 + lvl * 0.2, states: { rooted: true }, tickInterval: 0.5,
        onTick: (world, u) => spellDamage(world, caster, u, CHAINS_DPS[lvl - 1] / 2),
      }, caster.id);
    }
    w.emit({ kind: 'fx', fx: 'searingchains', pos: V.clone(caster.pos), radius: 450 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 450).filter((t) => t.isHero());
    return foes.length ? { score: 58 } : null;
  },
};

const REMNANT_DMG = [150, 250, 350];

const EMB_R: AbilityDef = {
  key: 'emb_remnant', name: '残焰', maxLevel: 3, ultimate: true, targetMode: 'point',
  castRange: [1200, 1200, 1200], manaCost: [100, 100, 100], cooldown: [30, 24, 18],
  scepter: { cooldown: [20, 16, 12], desc: '神杖:冷却降低;爆裂半径从 400 扩大至 600,爆裂同时眩晕范围内敌人 1 秒。' },
  castPoint: 0.1, tags: ['nuke', 'aoe', 'escape', 'ultimate'],
  description: '化作残焰高速冲向目标位置,抵达时爆裂灼伤周围敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    blinkTo(w, caster, pos);
    const sc = hasScepter(caster);
    const r = sc ? 600 : 400;
    for (const e of enemiesIn(w, caster, caster.pos, r)) {
      spellDamage(w, caster, e, REMNANT_DMG[lvl - 1]);
      applyModifier(w, e, { key: 'emb_remnant_slow', duration: 2, stats: { bonusMoveSpeedPct: -0.3 } }, caster.id);
      if (sc) applyModifier(w, e, { key: 'emb_remnant_stun', duration: 1, states: { stunned: true } }, caster.id);
    }
    w.emit({ kind: 'fx', fx: 'fireremnant', pos: V.clone(caster.pos), radius: r });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 1100).filter((t) => t.isHero());
    return foes.length ? { score: 60, pos: V.clone(foes[0].pos) } : null;
  },
};

export const EMB: HeroDef = {
  key: 'emb', name: '安博', title: '余烬之灵', primary: 'agi',
  baseStr: 19, gainStr: 2.0, baseAgi: 21, gainAgi: 2.6, baseInt: 18, gainInt: 2.0,
  baseDamage: [24, 30], baseArmor: 2, baseMs: 305, attackRange: 150,
  projectileSpeed: 0, bat: 1.6, attackPoint: 0.35, color: '#ff7043', glyph: '烬',
  abilities: [EMB_Q, EMB_W, EMB_E, EMB_R], aiRole: 'ganker',
};

// ============ 维普·冥毒亚龙(敏捷毒系核心) ============

const VIP_Q: AbilityDef = {
  key: 'vip_corrosive', name: '腐蚀皮肤', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '腐蚀的鳞甲:提升魔抗,反弹部分受到的物理伤害并冻缓攻击者。',
  passiveModifier: (lvl) => ({
    key: 'vip_corrosive_passive', isBuff: true,
    stats: { bonusMagicResist: 0.06 + lvl * 0.04 },
    data: { retaliate: 0.15 + lvl * 0.05, retaliateSlowPct: 0.2, retaliateSlowAs: 0.3, retaliateSlowDur: 2 },
  }),
};

const NETHER_DMG = [120, 200, 280, 360];

const VIP_W: AbilityDef = {
  key: 'vip_nether', name: '致命剧毒', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [600, 600, 600, 600], manaCost: [90, 100, 110, 120], cooldown: [9, 8, 7, 6],
  castPoint: 0.3, tags: ['nuke', 'slow'],
  description: '注入剧毒:目标生命越低伤害越高,并大幅降低其攻速。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    const lowBonus = 1 + (1 - target.hp / target.calc.maxHp) * 0.8;
    spellDamage(w, caster, target, NETHER_DMG[lvl - 1] * lowBonus);
    applyModifier(w, target, { key: 'vip_nether_slow', duration: 4, stats: { bonusAttackSpeed: -0.4, bonusMoveSpeedPct: -0.2 } }, caster.id);
    w.emit({ kind: 'fx', fx: 'nethertoxin', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    if (!foes.length) return null;
    foes.sort((a, b) => a.hp / a.calc.maxHp - b.hp / b.calc.maxHp);
    return { score: 56, targetId: foes[0].id };
  },
};

const POISON_DPS = [16, 26, 36, 46];

const VIP_E: AbilityDef = {
  key: 'vip_poison', name: '毒性攻击', maxLevel: 4, targetMode: 'passive',
  tags: ['orb'],
  description: '攻击附带毒素,持续伤害并减速(可叠加)。',
  passiveModifier: () => ({ key: 'vip_poison_passive', isBuff: true }),
  orbOnHit(w, attacker, target, lvl) {
    if (target.isBuilding()) return;
    applyModifier(w, target, {
      key: 'vip_poison_dot', duration: 4, stackable: true, stats: { bonusMoveSpeedPct: -0.06 }, tickInterval: 0.5,
      onTick: (world, u) => spellDamage(world, attacker, u, POISON_DPS[lvl - 1] / 2),
    }, attacker.id);
  },
};

const STRIKE_DPS = [60, 90, 120];

const VIP_R: AbilityDef = {
  key: 'vip_strike', name: '毒裔', maxLevel: 3, ultimate: true, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [700, 700, 700], manaCost: [125, 175, 225], cooldown: [40, 30, 20],
  scepter: { cooldown: [28, 20, 14], desc: '神杖:冷却降低;毒液蔓延至目标周围 350 内的其他敌人(剂量为主目标的 50%),并使所有中毒目标的减速加深至 70%。' },
  castPoint: 0.3, tags: ['nuke', 'slow', 'ultimate'],
  description: '剧毒终结:重创目标并施加致命剧毒——大幅减速并持续掉血 5 秒。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    const sc = hasScepter(caster);
    const slow = sc ? -0.7 : -0.5;
    spellDamage(w, caster, target, 100 + lvl * 40);
    applyModifier(w, target, {
      key: 'vip_strike_dot', duration: 5, stats: { bonusMoveSpeedPct: slow, bonusAttackSpeed: -0.4 }, tickInterval: 0.5,
      onTick: (world, u) => spellDamage(world, caster, u, STRIKE_DPS[lvl - 1] / 2),
    }, caster.id);
    // 神杖:毒液蔓延
    if (sc) {
      for (const nearby of enemiesIn(w, caster, target.pos, 350)) {
        if (nearby.id === target.id) continue;
        applyModifier(w, nearby, {
          key: 'vip_strike_spread', duration: 5, stats: { bonusMoveSpeedPct: slow, bonusAttackSpeed: -0.3 }, tickInterval: 0.5,
          onTick: (world, u) => spellDamage(world, caster, u, STRIKE_DPS[lvl - 1] / 4),
        }, caster.id);
      }
    }
    w.emit({ kind: 'fx', fx: 'viperstrike', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length ? { score: 70, targetId: foes[0].id } : null;
  },
};

export const VIP: HeroDef = {
  key: 'vip', name: '维普', title: '冥毒亚龙', primary: 'agi',
  baseStr: 19, gainStr: 2.2, baseAgi: 19, gainAgi: 2.4, baseInt: 18, gainInt: 2.0,
  baseDamage: [22, 28], baseArmor: 2, baseMs: 295, attackRange: 575,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.4, color: '#558b2f', glyph: '毒',
  abilities: [VIP_Q, VIP_W, VIP_E, VIP_R], aiRole: 'carry',
};

// ============ 艾莎·远古冰魂(智力寒冰控制) ============

const COLDFEET_DMG = [60, 100, 140, 180];

const AA_Q: AbilityDef = {
  key: 'aa_coldfeet', name: '寒霜冻足', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [700, 700, 700, 700], manaCost: [90, 100, 110, 120], cooldown: [9, 8, 7, 6],
  castPoint: 0.3, tags: ['stun', 'nuke'],
  description: '冻结目标双足:若 2.5 秒内未远离施法位置,则被冻住眩晕并受伤。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    const at = V.clone(target.pos);
    applyModifier(w, target, {
      key: 'aa_coldfeet_mark', duration: 2.5, stats: { bonusMoveSpeedPct: -0.1 },
      data: { mx: at.x, my: at.y },
      onExpire(world, u, m) {
        if (V.dist(u.pos, { x: m.def.data!.mx, y: m.def.data!.my }) < 450) {
          spellDamage(world, caster, u, COLDFEET_DMG[lvl - 1]);
          applyModifier(world, u, { key: 'aa_coldfeet_stun', duration: 1.5, states: { stunned: true } }, caster.id);
        }
      },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'coldfeet', pos: at });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length ? { score: 50, targetId: foes[0].id } : null;
  },
};

const VORTEX_DMG = [60, 100, 140, 180];

const AA_W: AbilityDef = {
  key: 'aa_vortex', name: '急冻领域', maxLevel: 4, targetMode: 'point',
  aoeRadius: [350], // 预览半径(=onCast 实际 AoE 半径)
  castRange: [800, 800, 800, 800], manaCost: [70, 80, 90, 100], cooldown: [8, 7, 6, 5],
  castPoint: 0.2, tags: ['slow', 'aoe', 'nuke'],
  description: '制造急冻漩涡:减速并放大区域内敌人所受的魔法伤害。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    damageArea(w, caster, pos, 350, VORTEX_DMG[lvl - 1]);
    modifierArea(w, caster, pos, 350, { key: 'aa_vortex_debuff', duration: 6, stats: { bonusMoveSpeedPct: -0.3, bonusMagicResist: -0.2 } }, 'enemy');
    w.emit({ kind: 'fx', fx: 'icevortex', pos: V.clone(pos), radius: 350 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 800).filter((t) => t.isHero());
    return foes.length ? { score: 48, pos: V.clone(foes[0].pos) } : null;
  },
};

const CHILL_DMG = [25, 40, 55, 70];

const AA_E: AbilityDef = {
  key: 'aa_chill', name: '冰晶剑刃', maxLevel: 4, targetMode: 'passive',
  tags: ['orb'],
  description: '攻击附带寒霜,造成额外魔法伤害并减速。',
  passiveModifier: () => ({ key: 'aa_chill_passive', isBuff: true }),
  orbOnHit(w, attacker, target, lvl) {
    if (target.isBuilding()) return;
    spellDamage(w, attacker, target, CHILL_DMG[lvl - 1]);
    applyModifier(w, target, { key: 'aa_chill_slow', duration: 1.5, stats: { bonusMoveSpeedPct: -0.15 } }, attacker.id);
  },
};

const BLAST_DMG = [200, 300, 400];

const AA_R: AbilityDef = {
  key: 'aa_iceblast', name: '极寒之触', maxLevel: 3, ultimate: true, targetMode: 'point',
  aoeRadius: [350], // 预览半径(=onCast 实际 AoE 半径)
  castRange: [3000, 3500, 4000], manaCost: [150, 200, 250], cooldown: [60, 50, 40],
  scepter: { cooldown: [45, 38, 30], desc: '神杖:冷却降低;冰封区域内的敌人额外被眩晕 1.5 秒并无法回春(驱散冻创效果)。' },
  castPoint: 0.3, tags: ['nuke', 'aoe', 'slow', 'ultimate'],
  description: '向全图任意处投下极寒冰球:重创并长时间冰封该区域的敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const sc = hasScepter(caster);
    damageArea(w, caster, pos, 350, BLAST_DMG[lvl - 1]);
    modifierArea(w, caster, pos, 350, { key: 'aa_iceblast_debuff', duration: 5, stats: { bonusMoveSpeedPct: -0.5, bonusAttackSpeed: -0.4 } }, 'enemy');
    if (sc) {
      modifierArea(w, caster, pos, 350, { key: 'aa_iceblast_stun', duration: 1.5, states: { stunned: true } }, 'enemy');
    }
    w.emit({ kind: 'fx', fx: 'iceblast', pos: V.clone(pos), radius: 350 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 2500).filter((t) => t.isHero());
    return foes.length ? { score: 72, pos: V.clone(foes[0].pos) } : null;
  },
};

export const AA: HeroDef = {
  key: 'aa', name: '艾莎', title: '远古冰魂', primary: 'int',
  baseStr: 18, gainStr: 1.9, baseAgi: 14, gainAgi: 1.4, baseInt: 23, gainInt: 2.9,
  baseDamage: [21, 27], baseArmor: 1, baseMs: 290, attackRange: 675,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.45, color: '#80deea', glyph: '霜',
  abilities: [AA_Q, AA_W, AA_E, AA_R], aiRole: 'support',
};

// ============ 墨菲·流溯之灵(敏捷形态核心) ============

const WAVE_DMG = [90, 150, 210, 270];

const MPH_Q: AbilityDef = {
  key: 'mph_wave', name: '波形', maxLevel: 4, targetMode: 'point',
  castRange: [800, 800, 800, 800], manaCost: [90, 100, 110, 120], cooldown: [10, 9, 8, 7],
  castPoint: 0.0, tags: ['nuke', 'aoe', 'escape'],
  description: '化作水流冲向目标方向,贯穿伤害沿途敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const dir = V.norm(V.sub(pos, caster.pos));
    const dist = Math.min(800, V.dist(caster.pos, pos));
    const hit = new Set<number>();
    for (let d = 100; d <= dist; d += 130) {
      for (const e of enemiesIn(w, caster, V.add(caster.pos, V.scale(dir, d)), 160)) {
        if (hit.has(e.id)) continue;
        hit.add(e.id);
        spellDamage(w, caster, e, WAVE_DMG[lvl - 1]);
      }
    }
    blinkTo(w, caster, w.map.nearestWalkable(V.add(caster.pos, V.scale(dir, dist))));
    w.emit({ kind: 'fx', fx: 'waveform', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 800).filter((t) => t.isHero());
    return foes.length ? { score: 54, pos: V.clone(foes[0].pos) } : null;
  },
};

const ADAPT_DMG = [100, 160, 220, 280];

const MPH_W: AbilityDef = {
  key: 'mph_adaptive', name: '适应打击', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [600, 600, 600, 600], manaCost: [80, 90, 100, 110], cooldown: [8, 7, 6, 5],
  castPoint: 0.2, tags: ['nuke', 'stun'],
  description: '凝聚水之力打击目标,造成伤害并短暂击晕。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    spellDamage(w, caster, target, ADAPT_DMG[lvl - 1]);
    applyModifier(w, target, { key: 'mph_adaptive_stun', duration: 0.8 + lvl * 0.15, states: { stunned: true } }, caster.id);
    w.emit({ kind: 'fx', fx: 'adaptivestrike', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    return foes.length ? { score: 54, targetId: foes[0].id } : null;
  },
};

const MPH_E: AbilityDef = {
  key: 'mph_shift', name: '形态转换', maxLevel: 4, targetMode: 'none',
  manaCost: [30, 30, 30, 30], cooldown: [2, 2, 2, 2],
  castPoint: 0.0, tags: ['buff'],
  description: '在敏捷形态(高攻)与力量形态(高生命)间切换。',
  onCast(w, caster, lvl) {
    if (hasModifier(caster, 'mph_str_form')) {
      caster.modifiers = caster.modifiers.filter((m) => m.key !== 'mph_str_form');
      applyModifier(w, caster, { key: 'mph_agi_form', duration: 9999, isBuff: true, stats: { bonusAgi: 8 + lvl * 6, bonusAttackSpeed: 0.1 + lvl * 0.05 } }, caster.id);
    } else {
      caster.modifiers = caster.modifiers.filter((m) => m.key !== 'mph_agi_form');
      applyModifier(w, caster, { key: 'mph_str_form', duration: 9999, isBuff: true, stats: { bonusStr: 8 + lvl * 6, bonusHp: lvl * 80 } }, caster.id);
    }
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    const close = foes.some((f) => V.dist(caster.pos, f.pos) < 300);
    const wantStr = caster.hp / caster.calc.maxHp < 0.4 || close;
    const isStr = hasModifier(caster, 'mph_str_form');
    return foes.length && wantStr !== isStr ? { score: 30 } : null;
  },
};

const REPLICATE_DUR = [20, 24, 28];

const MPH_R: AbilityDef = {
  key: 'mph_replicate', name: '复制', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [100, 100, 100], cooldown: [60, 50, 40],
  scepter: { cooldown: [45, 36, 28], desc: '神杖:冷却降低;复制体数量增加至 2 个,且每个复制体伤害输出提升至 120%(原 80%)。' },
  castPoint: 0.2, tags: ['ultimate'],
  description: '凝聚一个出伤强力的水之复制体协同作战。',
  onCast(w, caster, lvl) {
    const sc = hasScepter(caster);
    const count = sc ? 2 : 1;
    const damagePct = sc ? 1.2 : 0.8;
    createIllusion(w, caster, count, damagePct, 1.5, REPLICATE_DUR[lvl - 1]);
    w.emit({ kind: 'fx', fx: 'replicate', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length && caster.kind === 'hero' ? { score: 58 } : null;
  },
};

export const MPH: HeroDef = {
  key: 'mph', name: '墨菲', title: '流溯之灵', primary: 'agi',
  baseStr: 19, gainStr: 2.0, baseAgi: 20, gainAgi: 3.0, baseInt: 16, gainInt: 1.6,
  baseDamage: [23, 29], baseArmor: 2, baseMs: 300, attackRange: 350,
  projectileSpeed: 1000, bat: 1.6, attackPoint: 0.35, color: '#4dd0e1', glyph: '溯',
  abilities: [MPH_Q, MPH_W, MPH_E, MPH_R], aiRole: 'carry',
};

// ============ 萨德·暗影魔(智力消耗控制) ============

const DISRUPT_DUR = [2.0, 2.5, 3.0, 3.5];

const SDM_Q: AbilityDef = {
  key: 'sdm_disrupt', name: '崩裂禁锢', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [550, 550, 550, 550], manaCost: [90, 100, 110, 120], cooldown: [15, 14, 13, 12],
  castPoint: 0.3, tags: ['stun'],
  description: '将目标禁锢于虚空(无敌但无法行动);若为敌方,挣脱后被减速。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    // 先挂禁锢 modifier 再置无敌,否则 M1 会用刚置的无敌拦掉本技能自己的 banish。
    applyModifier(w, target, {
      key: 'sdm_disrupt_banish', duration: DISRUPT_DUR[lvl - 1], states: { stunned: true, invisible: true },
      onExpire(world, u) {
        u.invulnerable = false;
        if (u.team !== caster.team) applyModifier(world, u, { key: 'sdm_disrupt_slow', duration: 3, stats: { bonusMoveSpeedPct: -0.4 } }, caster.id);
      },
    }, caster.id);
    target.invulnerable = true; // 置于最后:禁锢期间外部敌方 debuff 由 M1 正确拦截
    w.emit({ kind: 'fx', fx: 'disruption', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 550).filter((t) => t.isHero());
    return foes.length ? { score: 52, targetId: foes[0].id } : null;
  },
};

const SPOISON_DPS = [20, 32, 44, 56];

const SDM_W: AbilityDef = {
  key: 'sdm_poison', name: '暗影毒素', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [600, 600, 600, 600], manaCost: [40, 45, 50, 55], cooldown: [3, 3, 3, 3],
  castPoint: 0.2, tags: ['nuke', 'slow'],
  description: '施加可叠加的暗影毒素,持续伤害并减速(层数越多越痛)。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    applyModifier(w, target, {
      key: 'sdm_poison_dot', duration: 5, stackable: true, stats: { bonusMoveSpeedPct: -0.08 }, tickInterval: 0.5,
      onTick: (world, u) => spellDamage(world, caster, u, SPOISON_DPS[lvl - 1] / 2),
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'shadowpoison', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    return foes.length ? { score: 46, targetId: foes[0].id } : null;
  },
};

const CATCH_AMP = [0.2, 0.3, 0.4, 0.5];

const SDM_E: AbilityDef = {
  key: 'sdm_catch', name: '灵魂逮捕', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [700, 700, 700, 700], manaCost: [50, 55, 60, 65], cooldown: [12, 11, 10, 9],
  castPoint: 0.2, tags: ['nuke'],
  description: '标记目标灵魂,使其在数秒内受到的伤害被放大。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    applyModifier(w, target, { key: 'sdm_catch_debuff', duration: 6, stats: { bonusMagicResist: -CATCH_AMP[lvl - 1] } }, caster.id);
    w.emit({ kind: 'fx', fx: 'soulcatcher', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length ? { score: 48, targetId: foes[0].id } : null;
  },
};

const PURGE_DMG = [150, 225, 300];

const SDM_R: AbilityDef = {
  key: 'sdm_purge', name: '恶魔清算', maxLevel: 3, ultimate: true, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [700, 700, 700], manaCost: [125, 150, 175], cooldown: [70, 60, 50],
  scepter: { cooldown: [50, 42, 35], desc: '神杖:冷却降低;清算时向目标周围 400 范围蔓延暗影腐蚀——周围敌人受到 150 伤害并被减速 50% 持续 3 秒。' },
  castPoint: 0.3, tags: ['nuke', 'slow', 'ultimate'],
  description: '恶魔清算:驱散目标增益、造成伤害并使其极度减速、缓慢流失生命。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    spellDamage(w, caster, target, PURGE_DMG[lvl - 1]);
    applyModifier(w, target, {
      key: 'sdm_purge_slow', duration: 5, stats: { bonusMoveSpeedPct: -0.7 }, tickInterval: 1,
      onTick: (world, u) => spellDamage(world, caster, u, 40 + lvl * 20),
    }, caster.id);
    // 神杖:暗影腐蚀蔓延
    if (hasScepter(caster)) {
      for (const nearby of enemiesIn(w, caster, target.pos, 400)) {
        if (nearby.id === target.id) continue;
        spellDamage(w, caster, nearby, 150);
        applyModifier(w, nearby, { key: 'sdm_purge_spread', duration: 3, stats: { bonusMoveSpeedPct: -0.5 } }, caster.id);
      }
      w.emit({ kind: 'fx', fx: 'demonicpurge', pos: V.clone(target.pos), radius: 400 });
    }
    w.emit({ kind: 'fx', fx: 'demonicpurge', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length ? { score: 66, targetId: foes[0].id } : null;
  },
};

export const SDM: HeroDef = {
  key: 'sdm', name: '萨德', title: '暗影魔', primary: 'int',
  baseStr: 18, gainStr: 2.0, baseAgi: 15, gainAgi: 1.5, baseInt: 22, gainInt: 2.8,
  baseDamage: [22, 28], baseArmor: 2, baseMs: 295, attackRange: 500,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.4, color: '#5e35b1', glyph: '影',
  abilities: [SDM_Q, SDM_W, SDM_E, SDM_R], aiRole: 'support',
};

// ============ 灵狲·齐天灵猴(敏捷物理核心) ============

const STAFF_DMG = [100, 160, 220, 280];

const MKY_Q: AbilityDef = {
  key: 'mky_staff', name: '棒击大地', maxLevel: 4, targetMode: 'point',
  lineWidth: 150, // 线形预览半宽(=onCast 沿线 enemiesIn 半径)
  castRange: [600, 600, 600, 600], manaCost: [90, 100, 110, 120], cooldown: [10, 9, 8, 7],
  castPoint: 0.3, tags: ['stun', 'aoe', 'nuke'],
  description: '挥棒猛击一条直线,造成暴击式伤害并击晕。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const dir = V.norm(V.sub(pos, caster.pos));
    const hit = new Set<number>();
    for (let d = 120; d <= 600; d += 130) {
      for (const e of enemiesIn(w, caster, V.add(caster.pos, V.scale(dir, d)), 150)) {
        if (hit.has(e.id)) continue;
        hit.add(e.id);
        spellDamage(w, caster, e, STAFF_DMG[lvl - 1]);
        applyModifier(w, e, { key: 'mky_staff_stun', duration: 1.2, states: { stunned: true } }, caster.id);
      }
    }
    w.emit({ kind: 'fx', fx: 'boundlessstrike', pos: V.clone(caster.pos), pos2: V.add(caster.pos, V.scale(dir, 600)) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    return foes.length ? { score: 56, pos: V.clone(foes[0].pos) } : null;
  },
};

const JINGU_DMG = [40, 70, 100, 130];

const MKY_W: AbilityDef = {
  key: 'mky_jingu', name: '金箍戏法', maxLevel: 4, targetMode: 'passive',
  tags: ['orb'],
  description: '连续命中同一目标 4 次后,接下来的攻击附带额外伤害与吸血。',
  passiveModifier: () => ({ key: 'mky_jingu_passive', isBuff: true }),
  orbOnHit(w, attacker, target, lvl) {
    if (target.isBuilding()) return;
    const cur = attacker.modifiers.find((m) => m.key === 'mky_jingu_count');
    if (cur && cur.data!.target === target.id) {
      cur.data!.n = (cur.data!.n ?? 0) + 1;
      cur.expiresAt = w.time + 5;
      if ((cur.data!.n as number) >= 4 && !hasModifier(attacker, 'mky_jingu_charged')) {
        applyModifier(w, attacker, { key: 'mky_jingu_charged', duration: 8, isBuff: true, stats: { bonusDamage: JINGU_DMG[lvl - 1], lifesteal: 0.3 } }, attacker.id);
      }
    } else {
      const m = applyModifier(w, attacker, { key: 'mky_jingu_count', duration: 5, isBuff: true }, attacker.id);
      m.data!.target = target.id; m.data!.n = 1;
    }
  },
};

const MKY_E: AbilityDef = {
  key: 'mky_agility', name: '灵敏', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '猴王的灵巧:提升攻击速度与闪避。',
  passiveModifier: (lvl) => ({
    key: 'mky_agility_passive', isBuff: true,
    stats: { bonusAttackSpeed: 0.1 + lvl * 0.05, evasion: 0.1 + lvl * 0.03 },
  }),
};

const COMMAND_DPS = [60, 90, 120];

const MKY_R: AbilityDef = {
  key: 'mky_command', name: '大圣天兵', maxLevel: 3, ultimate: true, targetMode: 'point',
  castRange: [700, 700, 700], manaCost: [150, 175, 200], cooldown: [90, 80, 70],
  scepter: { cooldown: [65, 58, 50], desc: '神杖:冷却降低;天兵持续时间从 6 秒延长至 9 秒,范围从 450 扩大至 600,且每次 tick 还对区域敌人施加 0.4 秒眩晕。' },
  castPoint: 0.3, tags: ['nuke', 'aoe', 'ultimate'],
  description: '召出毫毛天兵布满一片区域,持续猛击其中的敌人并将其困在场内。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const at = V.clone(pos);
    const sc = hasScepter(caster);
    const dur = sc ? 9 : 6;
    const r = sc ? 600 : 450;
    applyModifier(w, caster, {
      key: `mky_command_${w.tick}`, duration: dur, isBuff: true, tickInterval: 0.5,
      onTick(world) {
        for (const e of enemiesIn(world, caster, at, r)) {
          spellDamage(world, caster, e, COMMAND_DPS[lvl - 1]);
          applyModifier(world, e, { key: 'mky_command_slow', duration: 0.7, stats: { bonusMoveSpeedPct: -0.4 } }, caster.id);
          if (sc) applyModifier(world, e, { key: 'mky_command_stun', duration: 0.4, states: { stunned: true } }, caster.id);
        }
        world.emit({ kind: 'fx', fx: 'wukongcommand', pos: at, radius: r });
      },
    }, caster.id);
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length ? { score: 68, pos: V.clone(foes[0].pos) } : null;
  },
};

export const MKY: HeroDef = {
  key: 'mky', name: '灵狲', title: '齐天灵猴', primary: 'agi',
  baseStr: 20, gainStr: 2.4, baseAgi: 22, gainAgi: 3.0, baseInt: 15, gainInt: 1.5,
  baseDamage: [25, 31], baseArmor: 3, baseMs: 305, attackRange: 300,
  projectileSpeed: 0, bat: 1.6, attackPoint: 0.35, color: '#ffa726', glyph: '猴',
  abilities: [MKY_Q, MKY_W, MKY_E, MKY_R], aiRole: 'carry',
};

export const BATCH16 = [EMB, VIP, AA, MPH, SDM, MKY];
