/** 第十八批 6 名原创英雄:厄萨/纳吉/阿克/斯娜/哈斯/艾欧。 */
import { V, type Vec2 } from '../../core/vec2';
import type { AbilityDef, HeroDef } from './types';
import {
  damageArea, modifierArea, enemiesIn, alliesIn, spellDamage, blinkTo,
} from '../../sim/abilities';
import { applyModifier, hasModifier } from '../../sim/modifiers';
import type { Unit } from '../../sim/unit';
import type { World } from '../../sim/world';

// ============ 厄萨·怒熊(敏捷物理核心) ============

const SHOCK_DMG = [80, 130, 180, 230];

const URS_Q: AbilityDef = {
  key: 'urs_shock', name: '地震', maxLevel: 4, targetMode: 'none',
  manaCost: [80, 90, 100, 110], cooldown: [8, 7, 6, 5],
  castPoint: 0.1, tags: ['nuke', 'aoe', 'slow'],
  description: '猛踏地面,震伤并减速周围敌人。',
  onCast(w, caster, lvl) {
    damageArea(w, caster, caster.pos, 400, SHOCK_DMG[lvl - 1]);
    modifierArea(w, caster, caster.pos, 400, { key: 'urs_shock_slow', duration: 2, stats: { bonusMoveSpeedPct: -0.3 } }, 'enemy');
    w.emit({ kind: 'fx', fx: 'earthshock', pos: V.clone(caster.pos), radius: 400 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 400).filter((t) => t.isHero());
    return foes.length ? { score: 48 } : null;
  },
};

const URS_W: AbilityDef = {
  key: 'urs_overpower', name: '强袭', maxLevel: 4, targetMode: 'none',
  manaCost: [40, 45, 50, 55], cooldown: [10, 9, 8, 7],
  castPoint: 0.0, tags: ['buff'],
  description: '进入强袭状态:接下来数秒攻击速度爆表。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, { key: 'urs_overpower_buff', duration: 5, isBuff: true, stats: { bonusAttackSpeed: 1.5 + lvl * 0.3 } }, caster.id);
    w.emit({ kind: 'fx', fx: 'overpower', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 400).filter((t) => t.isHero());
    return foes.length && !hasModifier(caster, 'urs_overpower_buff') ? { score: 56 } : null;
  },
};

const SWIPE_DMG = [12, 20, 28, 36];

const URS_E: AbilityDef = {
  key: 'urs_swipes', name: '怒抓', maxLevel: 4, targetMode: 'passive',
  tags: ['orb'],
  description: '连续攻击同一目标时层层叠加额外伤害(换目标重置)。',
  passiveModifier: () => ({ key: 'urs_swipes_passive', isBuff: true }),
  orbOnHit(w, attacker, target, lvl) {
    if (target.isBuilding()) return;
    const cur = target.modifiers.find((m) => m.key === 'urs_swipes_stack' && m.sourceId === attacker.id);
    let n = 1;
    if (cur) { cur.data!.n = Math.min(8, (cur.data!.n ?? 1) + 1); cur.expiresAt = w.time + 5; n = cur.data!.n as number; }
    else { const m = applyModifier(w, target, { key: 'urs_swipes_stack', duration: 5, stackable: false }, attacker.id); m.data!.n = 1; }
    spellDamage(w, attacker, target, SWIPE_DMG[lvl - 1] * n);
  },
};

const URS_R: AbilityDef = {
  key: 'urs_enrage', name: '怒意', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [50, 50, 50], cooldown: [40, 34, 28],
  castPoint: 0.0, tags: ['buff', 'ultimate'],
  description: '陷入狂怒:大幅提升攻击力并减免所受伤害。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, { key: 'urs_enrage_buff', duration: 8, isBuff: true, stats: { bonusDamage: 40 + lvl * 25, incomingDamageReduction: 0.2 + lvl * 0.05 } }, caster.id);
    w.emit({ kind: 'fx', fx: 'enrage', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 500).filter((t) => t.isHero());
    return foes.length && !hasModifier(caster, 'urs_enrage_buff') ? { score: 68 } : null;
  },
};

export const URS: HeroDef = {
  key: 'urs', name: '厄萨', title: '怒熊', primary: 'agi',
  baseStr: 23, gainStr: 2.8, baseAgi: 18, gainAgi: 2.0, baseInt: 15, gainInt: 1.5,
  baseDamage: [26, 32], baseArmor: 2, baseMs: 305, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.4, color: '#8d6e63', glyph: '怒',
  abilities: [URS_Q, URS_W, URS_E, URS_R], aiRole: 'carry',
};

// ============ 纳吉·噬血者(力量吸血核心) ============

const RAGE_DUR = [3, 4, 5, 6];

const LIF_Q: AbilityDef = {
  key: 'lif_rage', name: '狂暴', maxLevel: 4, targetMode: 'none',
  manaCost: [50, 50, 50, 50], cooldown: [19, 16, 13, 10],
  castPoint: 0.0, tags: ['buff', 'escape'],
  description: '进入狂暴:免疫魔法并提升攻击与移动速度。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, { key: 'lif_rage_buff', duration: RAGE_DUR[lvl - 1], isBuff: true, states: { magicImmune: true }, stats: { bonusAttackSpeed: 0.4 + lvl * 0.15, bonusMoveSpeedPct: 0.12 } }, caster.id);
    w.emit({ kind: 'fx', fx: 'rage', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 500).filter((t) => t.isHero());
    return foes.length && !hasModifier(caster, 'lif_rage_buff') ? { score: 50 } : null;
  },
};

const FEAST_PCT = [0.04, 0.05, 0.06, 0.07];

const LIF_W: AbilityDef = {
  key: 'lif_feast', name: '盛宴', maxLevel: 4, targetMode: 'passive',
  tags: ['orb'],
  description: '攻击按目标当前生命百分比造成额外伤害,并吸取等量生命。',
  passiveModifier: () => ({ key: 'lif_feast_passive', isBuff: true }),
  orbOnHit(w, attacker, target, lvl) {
    if (target.isBuilding()) return;
    const d = spellDamage(w, attacker, target, target.hp * FEAST_PCT[lvl - 1]);
    attacker.hp = Math.min(attacker.calc.maxHp, attacker.hp + d * 0.6);
  },
};

const WOUNDS_DUR = [4, 5, 6, 7];

const LIF_E: AbilityDef = {
  key: 'lif_wounds', name: '撕裂伤口', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [500, 500, 500, 500], manaCost: [50, 55, 60, 65], cooldown: [14, 13, 12, 11],
  castPoint: 0.2, tags: ['slow'],
  description: '撕开目标伤口:大幅减速,且攻击它的友军获得吸血。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    applyModifier(w, target, { key: 'lif_wounds_debuff', duration: WOUNDS_DUR[lvl - 1], stats: { bonusMoveSpeedPct: -0.5 } }, caster.id);
    w.emit({ kind: 'fx', fx: 'openwounds', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 500).filter((t) => t.isHero());
    return foes.length ? { score: 50, targetId: foes[0].id } : null;
  },
};

const INFEST_DMG = [200, 325, 450];

const LIF_R: AbilityDef = {
  key: 'lif_infest', name: '猛扑寄生', maxLevel: 3, ultimate: true, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [600, 600, 600], manaCost: [100, 125, 150], cooldown: [60, 50, 40],
  castPoint: 0.2, tags: ['nuke', 'stun', 'ultimate'],
  description: '猛扑撕咬目标:瞬移贴身造成巨额伤害并将其击晕。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    blinkTo(w, caster, w.map.nearestWalkable(V.add(target.pos, V.scale(V.norm(V.sub(caster.pos, target.pos)), 120))));
    spellDamage(w, caster, target, INFEST_DMG[lvl - 1]);
    applyModifier(w, target, { key: 'lif_infest_stun', duration: 1.4, states: { stunned: true } }, caster.id);
    caster.issueOrder({ type: 'attack', targetId: target.id });
    w.emit({ kind: 'fx', fx: 'infest', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    return foes.length ? { score: 72, targetId: foes[0].id } : null;
  },
};

export const LIF: HeroDef = {
  key: 'lif', name: '纳吉', title: '噬血者', primary: 'str',
  baseStr: 24, gainStr: 2.9, baseAgi: 18, gainAgi: 2.0, baseInt: 14, gainInt: 1.4,
  baseDamage: [27, 33], baseArmor: 2, baseMs: 320, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.4, color: '#c62828', glyph: '噬',
  abilities: [LIF_Q, LIF_W, LIF_E, LIF_R], aiRole: 'carry',
};

// ============ 阿克·弧光守卫(智力分推法核) ============

const ARC_Q: AbilityDef = {
  key: 'arc_field', name: '磁场', maxLevel: 4, targetMode: 'point',
  castRange: [800, 800, 800, 800], manaCost: [80, 90, 100, 110], cooldown: [16, 15, 14, 13],
  castPoint: 0.2, tags: ['buff', 'aoe'],
  description: '布下磁力场:其中的友军获得高额闪避与攻速。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const at = V.clone(pos);
    applyModifier(w, caster, {
      key: `arc_field_${w.tick}`, duration: 5, isBuff: true, tickInterval: 0.5,
      onTick(world) {
        for (const a of alliesIn(world, caster, at, 350)) applyModifier(world, a, { key: 'arc_field_buff', duration: 0.7, isBuff: true, stats: { evasion: 0.4 + lvl * 0.08, bonusAttackSpeed: 0.4 + lvl * 0.1 } }, caster.id);
        world.emit({ kind: 'fx', fx: 'magneticfield', pos: at, radius: 350 });
      },
    }, caster.id);
  },
  aiScore(w, caster) {
    const allies = alliesIn(w, caster, caster.pos, 400).filter((t) => t.isHero());
    return allies.length && enemiesIn(w, caster, caster.pos, 700).length ? { score: 44, pos: V.clone(caster.pos) } : null;
  },
};

const SPARK_DMG = [120, 200, 280, 360];

const ARC_W: AbilityDef = {
  key: 'arc_spark', name: '火花亡魂', maxLevel: 4, targetMode: 'point',
  castRange: [900, 900, 900, 900], manaCost: [90, 100, 110, 120], cooldown: [4, 4, 4, 4],
  castPoint: 0.2, tags: ['nuke'],
  description: '布置一缕火花亡魂,短暂后扑向最近的敌人造成伤害与减速。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const at = V.clone(pos);
    applyModifier(w, caster, {
      key: `arc_spark_${w.tick}`, duration: 1.2, isBuff: true, tickInterval: 1.0,
      onTick(world, _u, m) {
        const e = enemiesIn(world, caster, at, 500).filter((t) => t.isHero())[0] ?? enemiesIn(world, caster, at, 500)[0];
        if (e) {
          spellDamage(world, caster, e, SPARK_DMG[lvl - 1]);
          applyModifier(world, e, { key: 'arc_spark_slow', duration: 2, stats: { bonusMoveSpeedPct: -0.3 } }, caster.id);
        }
        world.emit({ kind: 'fx', fx: 'sparkwraith', pos: e ? V.clone(e.pos) : at });
        m.expiresAt = -Infinity;
      },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'sparkwraith_place', pos: at });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 900).filter((t) => t.isHero());
    return foes.length ? { score: 50, pos: V.clone(foes[0].pos) } : null;
  },
};

const FLUX_DPS = [50, 75, 100, 125];

const ARC_E: AbilityDef = {
  key: 'arc_flux', name: '通量', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [700, 700, 700, 700], manaCost: [70, 80, 90, 100], cooldown: [10, 9, 8, 7],
  castPoint: 0.2, tags: ['nuke', 'slow'],
  description: '使目标承受持续电流伤害并减速 6 秒。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    applyModifier(w, target, {
      key: 'arc_flux_dot', duration: 6, stats: { bonusMoveSpeedPct: -0.3 }, tickInterval: 0.5,
      onTick: (world, u) => spellDamage(world, caster, u, FLUX_DPS[lvl - 1] / 2),
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'flux', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length ? { score: 46, targetId: foes[0].id } : null;
  },
};

const TEMPEST_DUR = [16, 20, 24];

const ARC_R: AbilityDef = {
  key: 'arc_tempest', name: '风暴双子', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [75, 75, 75], cooldown: [60, 50, 40],
  castPoint: 0.0, tags: ['buff', 'ultimate'],
  description: '召唤风暴之力附体:大幅提升攻击速度、攻击力与移动速度。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, { key: 'arc_tempest_buff', duration: TEMPEST_DUR[lvl - 1], isBuff: true, stats: { bonusAttackSpeed: 0.5 + lvl * 0.2, bonusDamage: 20 + lvl * 20, bonusMoveSpeedPct: 0.15 } }, caster.id);
    w.emit({ kind: 'fx', fx: 'tempestdouble', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length && !hasModifier(caster, 'arc_tempest_buff') ? { score: 62 } : null;
  },
};

export const ARC: HeroDef = {
  key: 'arc', name: '阿克', title: '弧光守卫', primary: 'int',
  baseStr: 18, gainStr: 2.0, baseAgi: 22, gainAgi: 1.9, baseInt: 22, gainInt: 2.6,
  baseDamage: [22, 28], baseArmor: 2, baseMs: 295, attackRange: 625,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.4, color: '#26c6da', glyph: '弧',
  abilities: [ARC_Q, ARC_W, ARC_E, ARC_R], aiRole: 'carry',
};

// ============ 斯娜·炎爆双煞(敏捷爆发) ============

const SCATTER_DMG = [90, 150, 210, 270];

const SNP_Q: AbilityDef = {
  key: 'snp_scatter', name: '散射', maxLevel: 4, targetMode: 'point',
  castRange: [600, 600, 600, 600], manaCost: [80, 90, 100, 110], cooldown: [9, 8, 7, 6],
  castPoint: 0.3, tags: ['nuke', 'aoe', 'slow'],
  description: '朝目标方向散射霰弹,灼伤并减速锥形区域内敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const dir = V.norm(V.sub(pos, caster.pos));
    const hit = new Set<number>();
    for (let d = 100; d <= 600; d += 120) {
      for (const e of enemiesIn(w, caster, V.add(caster.pos, V.scale(dir, d)), 120 + d * 0.18)) {
        if (hit.has(e.id)) continue;
        hit.add(e.id);
        spellDamage(w, caster, e, SCATTER_DMG[lvl - 1]);
        applyModifier(w, e, { key: 'snp_scatter_slow', duration: 2, stats: { bonusMoveSpeedPct: -0.3 } }, caster.id);
      }
    }
    w.emit({ kind: 'fx', fx: 'scatterblast', pos: V.clone(caster.pos), pos2: V.add(caster.pos, V.scale(dir, 600)) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    return foes.length ? { score: 50, pos: V.clone(foes[0].pos) } : null;
  },
};

const COOKIE_DMG = [80, 120, 160, 200];

const SNP_W: AbilityDef = {
  key: 'snp_cookie', name: '烤饼', maxLevel: 4, targetMode: 'point',
  castRange: [700, 700, 700, 700], manaCost: [70, 75, 80, 85], cooldown: [16, 14, 12, 10],
  castPoint: 0.1, tags: ['stun', 'escape'],
  description: '吃下烤饼弹跳到目标方向,落地震晕周围敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const dir = V.norm(V.sub(pos, caster.pos));
    const dist = Math.min(700, V.dist(caster.pos, pos));
    const end = w.map.nearestWalkable(V.add(caster.pos, V.scale(dir, dist)));
    blinkTo(w, caster, end);
    for (const e of enemiesIn(w, caster, end, 300)) {
      spellDamage(w, caster, e, COOKIE_DMG[lvl - 1]);
      applyModifier(w, e, { key: 'snp_cookie_stun', duration: 1.2, states: { stunned: true } }, caster.id);
    }
    w.emit({ kind: 'fx', fx: 'cookie', pos: V.clone(end), radius: 300 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length ? { score: 52, pos: V.clone(foes[0].pos) } : null;
  },
};

const SHRED_DUR = [4, 4.5, 5, 5.5];

const SNP_E: AbilityDef = {
  key: 'snp_shred', name: '连射', maxLevel: 4, targetMode: 'none',
  manaCost: [40, 40, 40, 40], cooldown: [12, 11, 10, 9],
  castPoint: 0.0, tags: ['buff'],
  description: '切换到连射模式:大幅提升攻击速度与攻击距离。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, { key: 'snp_shred_buff', duration: SHRED_DUR[lvl - 1], isBuff: true, stats: { bonusAttackSpeed: 0.6 + lvl * 0.15, bonusAttackRange: 150 } }, caster.id);
    w.emit({ kind: 'fx', fx: 'lilshredder', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    return foes.length && !hasModifier(caster, 'snp_shred_buff') ? { score: 42 } : null;
  },
};

const KISS_DMG = [80, 120, 160];

const SNP_R: AbilityDef = {
  key: 'snp_kisses', name: '飞弹之吻', maxLevel: 3, ultimate: true, targetMode: 'point',
  castRange: [1400, 1400, 1400], manaCost: [150, 200, 250], cooldown: [60, 55, 50],
  castPoint: 0.3, tags: ['nuke', 'aoe', 'ultimate'],
  description: '向远处倾泻一连串爆炸飞弹,持续轰炸该区域 3 秒。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const at = V.clone(pos);
    applyModifier(w, caster, {
      key: `snp_kisses_${w.tick}`, duration: 3, isBuff: true, tickInterval: 0.4,
      onTick(world) {
        damageArea(world, caster, at, 350, KISS_DMG[lvl - 1]);
        modifierArea(world, caster, at, 350, { key: 'snp_kisses_slow', duration: 0.6, stats: { bonusMoveSpeedPct: -0.3 } }, 'enemy');
        world.emit({ kind: 'fx', fx: 'mortimerkisses', pos: at, radius: 350 });
      },
    }, caster.id);
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 1200).filter((t) => t.isHero());
    return foes.length ? { score: 64, pos: V.clone(foes[0].pos) } : null;
  },
};

export const SNP: HeroDef = {
  key: 'snp', name: '斯娜', title: '炎爆双煞', primary: 'agi',
  baseStr: 19, gainStr: 2.0, baseAgi: 18, gainAgi: 2.2, baseInt: 18, gainInt: 2.0,
  baseDamage: [23, 29], baseArmor: 2, baseMs: 300, attackRange: 450,
  projectileSpeed: 1000, bat: 1.7, attackPoint: 0.4, color: '#ff7043', glyph: '爆',
  abilities: [SNP_Q, SNP_W, SNP_E, SNP_R], aiRole: 'ganker',
};

// ============ 哈斯·灼炎武士(力量低血斗士) ============

const SPEAR_DPS = [30, 45, 60, 75];

const HSK_Q: AbilityDef = {
  key: 'hsk_spears', name: '燃烧之矛', maxLevel: 4, targetMode: 'passive',
  tags: ['orb'],
  description: '攻击附带燃烧之矛,持续灼烧目标(消耗少量自身生命)。',
  passiveModifier: () => ({ key: 'hsk_spears_passive', isBuff: true }),
  orbOnHit(w, attacker, target, lvl) {
    if (target.isBuilding()) return;
    attacker.hp = Math.max(1, attacker.hp - 12);
    applyModifier(w, target, {
      key: 'hsk_spears_burn', duration: 5, stackable: true, tickInterval: 0.5,
      onTick: (world, u) => spellDamage(world, attacker, u, SPEAR_DPS[lvl - 1] / 2),
    }, attacker.id);
  },
};

const HSK_W: AbilityDef = {
  key: 'hsk_berserk', name: '狂热', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '生命越低,攻击速度越快;并提升生命回复。',
  passiveModifier: (lvl) => ({
    key: 'hsk_berserk_passive', isBuff: true, stats: { bonusHpRegen: 2 + lvl * 2 }, tickInterval: 0.5,
    onTick(world, u) {
      const missing = 1 - u.hp / u.calc.maxHp;
      applyModifier(world, u, { key: 'hsk_berserk_as', duration: 0.7, isBuff: true, stats: { bonusAttackSpeed: missing * (0.4 + lvl * 0.2) } }, u.id);
    },
  }),
};

const FIRE_DMG = [90, 150, 210, 270];

const HSK_E: AbilityDef = {
  key: 'hsk_innerfire', name: '内火', maxLevel: 4, targetMode: 'none',
  manaCost: [90, 100, 110, 120], cooldown: [13, 12, 11, 10],
  castPoint: 0.2, tags: ['nuke', 'aoe', 'slow'],
  description: '爆发内火,震退并灼伤周围敌人(短暂缴械)。',
  onCast(w, caster, lvl) {
    for (const e of enemiesIn(w, caster, caster.pos, 400)) {
      spellDamage(w, caster, e, FIRE_DMG[lvl - 1]);
      applyModifier(w, e, { key: 'hsk_innerfire_disarm', duration: 2, states: { disarmed: true }, stats: { bonusMoveSpeedPct: -0.2 } }, caster.id);
      const kb = w.map.nearestWalkable(V.add(e.pos, V.scale(V.norm(V.sub(e.pos, caster.pos)), 200)));
      e.pos = kb; e.prevPos = V.clone(kb); e.path = []; e.pathGoal = null;
    }
    w.emit({ kind: 'fx', fx: 'innerfire', pos: V.clone(caster.pos), radius: 400 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 400).filter((t) => t.isHero());
    return foes.length ? { score: 50 } : null;
  },
};

const BREAK_PCT = [0.3, 0.4, 0.5];

const HSK_R: AbilityDef = {
  key: 'hsk_lifebreak', name: '生命燃烧', maxLevel: 3, ultimate: true, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [550, 575, 600], manaCost: [75, 75, 75], cooldown: [50, 40, 30],
  castPoint: 0.1, tags: ['nuke', 'ultimate'],
  description: '燃烧生命扑向目标:按目标当前生命百分比造成巨额伤害并减速。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    blinkTo(w, caster, w.map.nearestWalkable(V.add(target.pos, V.scale(V.norm(V.sub(caster.pos, target.pos)), 120))));
    caster.hp = Math.max(1, caster.hp - caster.calc.maxHp * 0.1);
    spellDamage(w, caster, target, target.hp * BREAK_PCT[lvl - 1]);
    applyModifier(w, target, { key: 'hsk_lifebreak_slow', duration: 4, stats: { bonusMoveSpeedPct: -0.4 } }, caster.id);
    w.emit({ kind: 'fx', fx: 'lifebreak', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 550).filter((t) => t.isHero());
    return foes.length ? { score: 70, targetId: foes[0].id } : null;
  },
};

export const HSK: HeroDef = {
  key: 'hsk', name: '哈斯', title: '灼炎武士', primary: 'str',
  baseStr: 23, gainStr: 2.8, baseAgi: 15, gainAgi: 1.5, baseInt: 17, gainInt: 1.8,
  baseDamage: [24, 30], baseArmor: 2, baseMs: 295, attackRange: 400,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.4, color: '#e64a19', glyph: '炎',
  abilities: [HSK_Q, HSK_W, HSK_E, HSK_R], aiRole: 'carry',
};

// ============ 艾欧·微光精灵(智力系连辅助) ============

const TETHER_HEAL = [20, 30, 40, 50];

const IO_Q: AbilityDef = {
  key: 'io_tether', name: '系连', maxLevel: 4, targetMode: 'unit', targetTeam: 'allyOrSelf',
  castRange: [700, 700, 700, 700], manaCost: [40, 40, 40, 40], cooldown: [6, 5, 4, 3],
  castPoint: 0.1, tags: ['buff', 'heal'],
  description: '与友军建立能量链接:持续为其回血并提升双方移速。',
  onCast(w, caster, lvl, _pos, target) {
    const t = target && target.team === caster.team ? target : caster;
    applyModifier(w, t, {
      key: 'io_tether_buff', duration: 8, isBuff: true, stats: { bonusMoveSpeedPct: 0.15 }, tickInterval: 0.5,
      onTick: (_world, u) => { u.hp = Math.min(u.calc.maxHp, u.hp + TETHER_HEAL[lvl - 1]); },
    }, caster.id);
    applyModifier(w, caster, { key: 'io_tether_self', duration: 8, isBuff: true, stats: { bonusMoveSpeedPct: 0.15 } }, caster.id);
    w.emit({ kind: 'fx', fx: 'tether', pos: V.clone(t.pos) });
  },
  aiScore(w, caster) {
    const allies = alliesIn(w, caster, caster.pos, 700).filter((t) => t.isHero() && t.id !== caster.id);
    return allies.length ? { score: 38, targetId: allies[0].id } : null;
  },
};

const SPIRITS_DPS = [30, 45, 60, 75];

const IO_W: AbilityDef = {
  key: 'io_spirits', name: '精魂', maxLevel: 4, targetMode: 'none',
  manaCost: [80, 90, 100, 110], cooldown: [16, 15, 14, 13],
  castPoint: 0.0, tags: ['nuke', 'aoe'],
  description: '召出环绕的精魂,持续灼烧周身一圈的敌人 6 秒。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, {
      key: 'io_spirits_buff', duration: 6, isBuff: true, tickInterval: 0.5,
      onTick(world, u) { for (const e of enemiesIn(world, u, u.pos, 400)) spellDamage(world, u, e, SPIRITS_DPS[lvl - 1] / 2); },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'spirits', pos: V.clone(caster.pos), radius: 400 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 400).filter((t) => t.isHero());
    return foes.length ? { score: 46 } : null;
  },
};

const IO_E: AbilityDef = {
  key: 'io_overcharge', name: '超负荷', maxLevel: 4, targetMode: 'none',
  manaCost: [30, 30, 30, 30], cooldown: [10, 9, 8, 7],
  castPoint: 0.0, tags: ['buff'],
  description: '过载能量:大幅提升攻击速度与攻击力(持续消耗生命与法力)。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, {
      key: 'io_overcharge_buff', duration: 6, isBuff: true, stats: { bonusAttackSpeed: 0.4 + lvl * 0.15, bonusDamage: 15 + lvl * 10 }, tickInterval: 0.5,
      onTick(_world, u) { u.hp = Math.max(1, u.hp - u.calc.maxHp * 0.015); },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'overcharge', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 500).filter((t) => t.isHero());
    return foes.length && !hasModifier(caster, 'io_overcharge_buff') ? { score: 40 } : null;
  },
};

const IO_R: AbilityDef = {
  key: 'io_relocate', name: '转移', maxLevel: 3, ultimate: true, targetMode: 'point',
  castRange: [99999, 99999, 99999], manaCost: [100, 100, 100], cooldown: [70, 55, 40],
  castPoint: 0.4, tags: ['escape', 'ultimate'],
  description: '将自己与系连友军一同传送到全图任意位置(团队转移/驰援/逃生)。',
  onCast(w, caster, _lvl, pos) {
    if (!pos) return;
    const dest = w.map.nearestWalkable(pos);
    blinkTo(w, caster, dest);
    const tethered = [...w.units.values()].find((u) => u.alive && u.team === caster.team && u.id !== caster.id && hasModifier(u, 'io_tether_buff'));
    if (tethered) blinkTo(w, tethered, w.map.nearestWalkable(V.add(dest, { x: 80, y: 0 })));
    w.emit({ kind: 'fx', fx: 'relocate', pos: V.clone(dest) });
  },
  aiScore() { return null; },
};

export const IO: HeroDef = {
  key: 'io', name: '艾欧', title: '微光精灵', primary: 'int',
  baseStr: 18, gainStr: 2.2, baseAgi: 14, gainAgi: 1.4, baseInt: 18, gainInt: 2.2,
  baseDamage: [20, 26], baseArmor: 1, baseMs: 290, attackRange: 500,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.4, color: '#80deea', glyph: '欧',
  abilities: [IO_Q, IO_W, IO_E, IO_R], aiRole: 'support',
};

export const BATCH18 = [URS, LIF, ARC, SNP, HSK, IO];
