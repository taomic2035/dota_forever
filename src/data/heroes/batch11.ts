/** 第十一批 6 名原创英雄:默罗/迪斯/泰可/维萨/布蕾/班恩。 */
import { V, type Vec2 } from '../../core/vec2';
import type { AbilityDef, HeroDef } from './types';
import {
  damageArea, enemiesIn, spellDamage, summonUnit,
} from '../../sim/abilities';
import { applyModifier, hasModifier } from '../../sim/modifiers';
import type { Unit } from '../../sim/unit';
import type { World } from '../../sim/world';

// ============ 默罗·殁世巫师(智力法核·禁锢) ============

const ORB_DMG = [25, 40, 55, 70];

const MOR_Q: AbilityDef = {
  key: 'mor_orb', name: '奥术天球', maxLevel: 4, targetMode: 'passive',
  tags: ['orb'],
  description: '攻击附带奥术能量,造成额外魔法伤害。',
  passiveModifier: () => ({ key: 'mor_orb_passive', isBuff: true }),
  orbOnHit(w, attacker, target, lvl) {
    if (target.isBuilding()) return;
    spellDamage(w, attacker, target, ORB_DMG[lvl - 1]);
  },
};

const BANISH_DUR = [2.0, 2.5, 3.0, 3.5];
const INT_STEAL = [4, 6, 8, 10];

const MOR_W: AbilityDef = {
  key: 'mor_astral', name: '星体禁锢', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [550, 550, 550, 550], manaCost: [100, 110, 120, 130], cooldown: [14, 13, 12, 11],
  castPoint: 0.3, tags: ['stun'],
  description: '将目标放逐到星界:暂时移出战场无法行动,并窃取其智力。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    // 先挂本技能自身的 debuff,再置无敌(放逐本质)。否则 M1 会用刚置的无敌拦掉本技能自己的 modifier。
    applyModifier(w, target, {
      key: 'mor_astral_banish', duration: BANISH_DUR[lvl - 1], states: { stunned: true, invisible: true },
      onExpire(_world, u) { u.invulnerable = false; },
    }, caster.id);
    if (target.isHero()) {
      applyModifier(w, caster, { key: 'mor_astral_int', duration: 30, isBuff: true, stats: { bonusInt: INT_STEAL[lvl - 1] } }, caster.id);
      applyModifier(w, target, { key: 'mor_astral_intloss', duration: 30, stats: { bonusInt: -INT_STEAL[lvl - 1] } }, caster.id);
    }
    target.invulnerable = true; // 置于最后:放逐期间外部敌方 debuff 由 M1 正确拦截
    w.emit({ kind: 'fx', fx: 'astral', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 550).filter((t) => t.isHero());
    return foes.length ? { score: 58, targetId: foes[0].id } : null;
  },
};

const MOR_E: AbilityDef = {
  key: 'mor_flux', name: '精华涌动', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '充盈的奥术精华提升法力回复与法术增强。',
  passiveModifier: (lvl) => ({
    key: 'mor_flux_passive', isBuff: true,
    stats: { bonusMpRegen: 1 + lvl, spellAmp: 0.04 + lvl * 0.03, bonusMp: lvl * 60 },
  }),
};

const ECLIPSE_DMG = [180, 280, 380];

const MOR_R: AbilityDef = {
  key: 'mor_eclipse', name: '精神虚妄', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [150, 225, 300], cooldown: [120, 110, 100],
  castPoint: 0.3, tags: ['nuke', 'aoe', 'ultimate'],
  description: '释放精神冲击,重创周围所有敌人(智力越高伤害越高)。',
  onCast(w, caster, lvl) {
    const amp = 1 + caster.calc.maxMp / 4000; // 法力(智力)越高伤害越高
    for (const e of enemiesIn(w, caster, caster.pos, 700)) spellDamage(w, caster, e, ECLIPSE_DMG[lvl - 1] * amp);
    w.emit({ kind: 'fx', fx: 'eclipse', pos: V.clone(caster.pos), radius: 700 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 680).filter((t) => t.isHero());
    return foes.length ? { score: 72 + foes.length * 4 } : null;
  },
};

export const MOR: HeroDef = {
  key: 'mor', name: '默罗', title: '殁世巫师', primary: 'int',
  baseStr: 19, gainStr: 1.9, baseAgi: 17, gainAgi: 1.7, baseInt: 24, gainInt: 3.2,
  baseDamage: [24, 30], baseArmor: 2, baseMs: 300, attackRange: 550,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.4, color: '#9575cd', glyph: '殁',
  abilities: [MOR_Q, MOR_W, MOR_E, MOR_R], aiRole: 'carry',
};

// ============ 迪斯·雷霆术士(智力控制辅助) ============

const THUNDER_DMG = [30, 45, 60, 75];

const DIS_Q: AbilityDef = {
  key: 'dis_thunder', name: '雷击', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [800, 800, 800, 800], manaCost: [90, 100, 110, 120], cooldown: [9, 8, 7, 6],
  castPoint: 0.3, tags: ['nuke', 'aoe'],
  description: '雷云笼罩目标,每秒劈下闪电,伤害其与周围敌人。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    applyModifier(w, target, {
      key: 'dis_thunder_dot', duration: 4, tickInterval: 1,
      onTick(world, u) { damageArea(world, caster, u.pos, 250, THUNDER_DMG[lvl - 1]); },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'thunder', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 800).filter((t) => t.isHero());
    return foes.length ? { score: 52, targetId: foes[0].id } : null;
  },
};

const GLIMPSE_PULL = [600, 800, 1000, 1200];

const DIS_W: AbilityDef = {
  key: 'dis_glimpse', name: '闪回', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [1500, 1500, 1500, 1500], manaCost: [70, 70, 70, 70], cooldown: [22, 18, 14, 10],
  castPoint: 0.2, tags: ['slow'],
  description: '将目标强行拉回一段距离并减速(打断逃跑或追击)。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    const back = w.map.nearestWalkable(V.add(target.pos, V.scale(V.norm(V.sub(caster.pos, target.pos)), GLIMPSE_PULL[lvl - 1])));
    target.pos = back; target.prevPos = V.clone(back); target.path = []; target.pathGoal = null;
    applyModifier(w, target, { key: 'dis_glimpse_slow', duration: 2, stats: { bonusMoveSpeedPct: -0.35 } }, caster.id);
    w.emit({ kind: 'fx', fx: 'glimpse', pos: V.clone(back) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 1200).filter((t) => t.isHero() && t.hp / t.calc.maxHp < 0.4);
    return foes.length ? { score: 54, targetId: foes[0].id } : null;
  },
};

const KIN_DUR = [3.0, 3.5, 4.0, 4.5];

const DIS_E: AbilityDef = {
  key: 'dis_field', name: '动能力场', maxLevel: 4, targetMode: 'point',
  castRange: [700, 700, 700, 700], manaCost: [70, 75, 80, 85], cooldown: [16, 14, 12, 10],
  castPoint: 0.2, tags: ['stun', 'aoe'],
  description: '布下动能力场,持续禁锢场中敌人使其无法移动。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const at = V.clone(pos);
    applyModifier(w, caster, {
      key: `dis_field_${w.tick}`, duration: KIN_DUR[lvl - 1], isBuff: true, tickInterval: 0.3,
      onTick(world) {
        for (const e of enemiesIn(world, caster, at, 350)) applyModifier(world, e, { key: 'dis_kinetic_root', duration: 0.4, states: { rooted: true } }, caster.id);
        world.emit({ kind: 'fx', fx: 'kineticfield', pos: at, radius: 350 });
      },
    }, caster.id);
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length ? { score: 50, pos: V.clone(foes[0].pos) } : null;
  },
};

const STORM_DUR = [4, 5, 6];
const STORM_TICK = [60, 90, 120];

const DIS_R: AbilityDef = {
  key: 'dis_storm', name: '静电风暴', maxLevel: 3, ultimate: true, targetMode: 'point',
  castRange: [600, 600, 600], manaCost: [125, 175, 225], cooldown: [80, 70, 60],
  castPoint: 0.3, tags: ['nuke', 'aoe', 'ultimate'],
  description: '掀起静电风暴穹顶:持续伤害并沉默其中的所有敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const at = V.clone(pos);
    applyModifier(w, caster, {
      key: `dis_storm_${w.tick}`, duration: STORM_DUR[lvl - 1], isBuff: true, tickInterval: 0.5,
      onTick(world) {
        for (const e of enemiesIn(world, caster, at, 450)) {
          spellDamage(world, caster, e, STORM_TICK[lvl - 1]);
          applyModifier(world, e, { key: 'dis_storm_silence', duration: 0.7, states: { silenced: true } }, caster.id);
        }
        world.emit({ kind: 'fx', fx: 'staticstorm', pos: at, radius: 450 });
      },
    }, caster.id);
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 550).filter((t) => t.isHero());
    return foes.length >= 2 ? { score: 80, pos: V.clone(centroid(foes)) } : null;
  },
};

export const DIS: HeroDef = {
  key: 'dis', name: '迪斯', title: '雷霆术士', primary: 'int',
  baseStr: 18, gainStr: 1.8, baseAgi: 15, gainAgi: 1.5, baseInt: 23, gainInt: 2.9,
  baseDamage: [21, 27], baseArmor: 1, baseMs: 295, attackRange: 550,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.45, color: '#7986cb', glyph: '霆',
  abilities: [DIS_Q, DIS_W, DIS_E, DIS_R], aiRole: 'support',
};

// ============ 泰可·机械奇才(智力法术爆发) ============

const LASER_DMG = [80, 160, 240, 320];

const TIK_Q: AbilityDef = {
  key: 'tik_laser', name: '激光', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [650, 650, 650, 650], manaCost: [95, 110, 125, 140], cooldown: [11, 10, 9, 8],
  castPoint: 0.2, tags: ['nuke'],
  description: '发射高能激光灼烧目标,并致盲使其短暂无法普攻。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    spellDamage(w, caster, target, LASER_DMG[lvl - 1]);
    applyModifier(w, target, { key: 'tik_laser_blind', duration: 2 + lvl * 0.3, states: { disarmed: true } }, caster.id);
    w.emit({ kind: 'fx', fx: 'laser', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 650).filter((t) => t.isHero());
    return foes.length ? { score: 58, targetId: foes[0].id } : null;
  },
};

const MISSILE_DMG = [90, 150, 210, 270];

const TIK_W: AbilityDef = {
  key: 'tik_missile', name: '追踪导弹', maxLevel: 4, targetMode: 'none',
  manaCost: [100, 110, 120, 130], cooldown: [13, 12, 11, 10],
  castPoint: 0.3, tags: ['nuke'],
  description: '发射两枚追踪导弹,击中最近的两名敌人。',
  onCast(w, caster, lvl) {
    const foes = enemiesIn(w, caster, caster.pos, 900).sort((a, b) => V.dist(caster.pos, a.pos) - V.dist(caster.pos, b.pos));
    for (let i = 0; i < Math.min(2, foes.length); i++) {
      spellDamage(w, caster, foes[i], MISSILE_DMG[lvl - 1]);
      applyModifier(w, foes[i], { key: 'tik_missile_slow', duration: 1.5, stats: { bonusMoveSpeedPct: -0.25 } }, caster.id);
    }
    w.emit({ kind: 'fx', fx: 'missiles', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 900).filter((t) => t.isHero());
    return foes.length ? { score: 50 } : null;
  },
};

const MARCH_DMG = [22, 32, 42, 52];

const TIK_E: AbilityDef = {
  key: 'tik_march', name: '机械洪流', maxLevel: 4, targetMode: 'point',
  castRange: [600, 600, 600, 600], manaCost: [110, 120, 130, 140], cooldown: [20, 19, 18, 17],
  castPoint: 0.3, tags: ['nuke', 'aoe'],
  description: '召来一群微型机械,持续碾压区域内的敌人 5 秒。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const at = V.clone(pos);
    applyModifier(w, caster, {
      key: `tik_march_${w.tick}`, duration: 5, isBuff: true, tickInterval: 0.5,
      onTick(world) {
        for (const e of enemiesIn(world, caster, at, 400)) spellDamage(world, caster, e, MARCH_DMG[lvl - 1]);
        world.emit({ kind: 'fx', fx: 'march', pos: at, radius: 400 });
      },
    }, caster.id);
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    return foes.length ? { score: 48, pos: V.clone(foes[0].pos) } : null;
  },
};

const TIK_R: AbilityDef = {
  key: 'tik_rearm', name: '重新装填', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [120, 175, 230], cooldown: [0, 0, 0],
  castPoint: 0.6, tags: ['buff', 'ultimate'],
  description: '重新装填:刷新自身其它技能的冷却时间(法力消耗高昂)。',
  onCast(w, caster) {
    caster.abilities.forEach((ab, i) => { if (i !== 3) ab.cooldownUntil = -Infinity; });
    w.emit({ kind: 'fx', fx: 'rearm', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 800).filter((t) => t.isHero());
    const onCd = caster.abilities.slice(0, 3).some((ab, i) => ab.level > 0 && w.time < ab.cooldownUntil);
    return foes.length && onCd && caster.mp > 250 ? { score: 56 } : null;
  },
};

export const TIK: HeroDef = {
  key: 'tik', name: '泰可', title: '机械奇才', primary: 'int',
  baseStr: 17, gainStr: 1.6, baseAgi: 15, gainAgi: 1.5, baseInt: 24, gainInt: 3.0,
  baseDamage: [20, 26], baseArmor: 1, baseMs: 290, attackRange: 550,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.4, color: '#ff7043', glyph: '械',
  abilities: [TIK_Q, TIK_W, TIK_E, TIK_R], aiRole: 'ganker',
};

// ============ 维萨·灵魂收割(智力召唤辅助) ============

const SOUL_DMG = [110, 180, 250, 320];

const VIS_Q: AbilityDef = {
  key: 'vis_soul', name: '灵魂强袭', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [700, 700, 700, 700], manaCost: [100, 115, 130, 145], cooldown: [8, 7, 6, 5],
  castPoint: 0.3, tags: ['nuke'],
  description: '汲取游荡的亡魂凝聚成弹,重创目标。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    spellDamage(w, caster, target, SOUL_DMG[lvl - 1]);
    w.emit({ kind: 'fx', fx: 'soulassumption', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length ? { score: 54, targetId: foes[0].id } : null;
  },
};

const CHILL_AS = [0.3, 0.45, 0.6, 0.75];

const VIS_W: AbilityDef = {
  key: 'vis_chill', name: '冢中冷', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [600, 600, 600, 600], manaCost: [80, 85, 90, 95], cooldown: [12, 11, 10, 9],
  castPoint: 0.2, tags: ['slow'],
  description: '剥夺目标的速度据为己有:降低其攻速移速、强化自身。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    applyModifier(w, target, { key: 'vis_chill_debuff', duration: 6, stats: { bonusAttackSpeed: -CHILL_AS[lvl - 1], bonusMoveSpeedPct: -0.25 } }, caster.id);
    applyModifier(w, caster, { key: 'vis_chill_buff', duration: 6, isBuff: true, stats: { bonusAttackSpeed: CHILL_AS[lvl - 1], bonusMoveSpeedPct: 0.2 } }, caster.id);
    w.emit({ kind: 'fx', fx: 'gravechill', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    return foes.length ? { score: 46, targetId: foes[0].id } : null;
  },
};

const GARG_HEAL = [25, 40, 55, 70];
const GARG_DUR = [2.5, 3.0, 3.5, 4.0];

const VIS_E: AbilityDef = {
  key: 'vis_gargoyle', name: '石像形态', maxLevel: 4, targetMode: 'none',
  manaCost: [40, 40, 40, 40], cooldown: [18, 16, 14, 12],
  castPoint: 0.0, tags: ['buff', 'escape'],
  description: '化为石像:免疫一切伤害并快速回血,期间无法行动。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, {
      key: 'vis_gargoyle_buff', duration: GARG_DUR[lvl - 1], isBuff: true,
      states: { physImmune: true, magicImmune: true, disarmed: true, rooted: true }, tickInterval: 0.5,
      onTick(world, u) { u.hp = Math.min(u.calc.maxHp, u.hp + GARG_HEAL[lvl - 1]); },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'gargoyle', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    return caster.hp / caster.calc.maxHp < 0.3 && enemiesIn(w, caster, caster.pos, 500).length ? { score: 64 } : null;
  },
};

const FAMILIAR_HP = [400, 550, 700];

const VIS_R: AbilityDef = {
  key: 'vis_familiars', name: '石像鬼', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [50, 75, 100], cooldown: [120, 110, 100],
  castPoint: 0.3, tags: ['ultimate'],
  description: '召唤两只石像鬼协同作战 50 秒。',
  onCast(w, caster, lvl) {
    for (let i = 0; i < 2; i++) {
      summonUnit(w, caster, {
        name: '石像鬼', hp: FAMILIAR_HP[lvl - 1], dmg: [30 + lvl * 6, 38 + lvl * 6],
        armor: 2, ms: 360, range: 100, duration: 50, magicResist: 0.4,
      }, V.add(caster.pos, { x: i === 0 ? -70 : 70, y: 60 }), true);
    }
    w.emit({ kind: 'fx', fx: 'familiars', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    return !hasModifier(caster, 'vis_familiars_cd') ? { score: 40 } : null;
  },
};

export const VIS: HeroDef = {
  key: 'vis', name: '维萨', title: '灵魂收割', primary: 'int',
  baseStr: 19, gainStr: 2.0, baseAgi: 15, gainAgi: 1.5, baseInt: 22, gainInt: 2.7,
  baseDamage: [22, 28], baseArmor: 2, baseMs: 300, attackRange: 550,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.4, color: '#78909c', glyph: '魂',
  abilities: [VIS_Q, VIS_W, VIS_E, VIS_R], aiRole: 'support',
};

// ============ 布蕾·织网蛛母(敏捷分推核心) ============

const BRO_Q: AbilityDef = {
  key: 'bro_web', name: '蛛网', maxLevel: 4, targetMode: 'none',
  manaCost: [40, 40, 40, 40], cooldown: [10, 9, 8, 7],
  castPoint: 0.0, tags: ['buff', 'escape'],
  description: '织起蛛网潜行:隐身并大幅提升移速与回复。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, {
      key: 'bro_web_buff', duration: 6, isBuff: true, states: { invisible: true },
      stats: { bonusMoveSpeedPct: 0.2 + lvl * 0.05, bonusHpRegen: 10 + lvl * 4 },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'spinweb', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    return caster.hp / caster.calc.maxHp < 0.4 && enemiesIn(w, caster, caster.pos, 450).length ? { score: 58 } : null;
  },
};

const BITE_DMG = [20, 35, 50, 65];

const BRO_W: AbilityDef = {
  key: 'bro_bite', name: '麻痹啮咬', maxLevel: 4, targetMode: 'passive',
  tags: ['orb'],
  description: '毒牙撕咬:攻击造成额外伤害并减速目标。',
  passiveModifier: () => ({ key: 'bro_bite_passive', isBuff: true }),
  orbOnHit(w, attacker, target, lvl) {
    if (target.isBuilding()) return;
    spellDamage(w, attacker, target, BITE_DMG[lvl - 1]);
    applyModifier(w, target, { key: 'bro_bite_slow', duration: 2, stats: { bonusMoveSpeedPct: -0.2, bonusAttackSpeed: -0.2 } }, attacker.id);
  },
};

const HUNGER_DMG = [30, 50, 70, 90];

const BRO_E: AbilityDef = {
  key: 'bro_hunger', name: '噬魂之饥', maxLevel: 4, targetMode: 'none',
  manaCost: [50, 50, 50, 50], cooldown: [30, 26, 22, 18],
  castPoint: 0.0, tags: ['buff'],
  description: '陷入嗜血狂热:大幅提升攻击力与吸血一段时间。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, { key: 'bro_hunger_buff', duration: 12, isBuff: true, stats: { bonusDamage: HUNGER_DMG[lvl - 1], lifesteal: 0.25 + lvl * 0.05 } }, caster.id);
    w.emit({ kind: 'fx', fx: 'hunger', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 500).filter((t) => t.isHero());
    return foes.length && !hasModifier(caster, 'bro_hunger_buff') ? { score: 50 } : null;
  },
};

const SPIDER_COUNT = [3, 4, 5];

const BRO_R: AbilityDef = {
  key: 'bro_spawn', name: '蛛群', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [100, 130, 160], cooldown: [40, 36, 32],
  castPoint: 0.3, tags: ['ultimate'],
  description: '产下一窝蜘蛛随从,撕咬撕碎敌人。',
  onCast(w, caster, lvl) {
    for (let i = 0; i < SPIDER_COUNT[lvl - 1]; i++) {
      summonUnit(w, caster, {
        name: '蛛子', hp: 300, dmg: [22, 28], armor: 1, ms: 350, range: 100, duration: 45, magicResist: 0.2,
      }, V.add(caster.pos, { x: (i - 2) * 50, y: 50 }), true);
    }
    w.emit({ kind: 'fx', fx: 'spiderlings', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    return { score: 38 };
  },
};

export const BRO: HeroDef = {
  key: 'bro', name: '布蕾', title: '织网蛛母', primary: 'agi',
  baseStr: 19, gainStr: 2.2, baseAgi: 20, gainAgi: 2.4, baseInt: 16, gainInt: 1.6,
  baseDamage: [24, 32], baseArmor: 2, baseMs: 300, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.35, color: '#8d6e63', glyph: '蛛',
  abilities: [BRO_Q, BRO_W, BRO_E, BRO_R], aiRole: 'carry',
};

// ============ 班恩·噩梦祭司(智力单体控制) ============

const BAN_Q: AbilityDef = {
  key: 'ban_enfeeble', name: '弱化', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [700, 700, 700, 700], manaCost: [60, 70, 80, 90], cooldown: [10, 9, 8, 7],
  castPoint: 0.2, tags: ['slow'],
  description: '弱化目标,大幅削减其攻击力与攻速。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    applyModifier(w, target, { key: 'ban_enfeeble_debuff', duration: 10, stats: { bonusDamagePct: -(0.2 + lvl * 0.08), bonusAttackSpeed: -(0.1 + lvl * 0.05) } }, caster.id);
    w.emit({ kind: 'fx', fx: 'enfeeble', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero() && t.calc.dmgMax > 60);
    return foes.length ? { score: 42, targetId: foes[0].id } : null;
  },
};

const SAP_DMG = [90, 150, 210, 270];

const BAN_W: AbilityDef = {
  key: 'ban_sap', name: '吸脑', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [550, 550, 550, 550], manaCost: [95, 110, 125, 140], cooldown: [9, 8, 7, 6],
  castPoint: 0.3, tags: ['nuke', 'heal'],
  description: '汲取目标的精神,造成伤害并治疗自身等量生命。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    const dealt = spellDamage(w, caster, target, SAP_DMG[lvl - 1]);
    caster.hp = Math.min(caster.calc.maxHp, caster.hp + dealt);
    w.emit({ kind: 'fx', fx: 'brainsap', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 550).filter((t) => t.isHero());
    return foes.length ? { score: 56, targetId: foes[0].id } : null;
  },
};

const NIGHT_DUR = [4, 4.75, 5.5, 6.25];

const BAN_E: AbilityDef = {
  key: 'ban_nightmare', name: '噩梦', maxLevel: 4, targetMode: 'unit', targetTeam: 'any',
  castRange: [550, 550, 550, 550], manaCost: [100, 110, 120, 130], cooldown: [21, 20, 19, 18],
  castPoint: 0.3, tags: ['stun'],
  description: '使目标陷入噩梦沉睡:无法行动(受到伤害会被唤醒)。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    applyModifier(w, target, { key: 'ban_nightmare_sleep', duration: NIGHT_DUR[lvl - 1], states: { stunned: true, disarmed: true, silenced: true } }, caster.id);
    w.emit({ kind: 'fx', fx: 'nightmare', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 550).filter((t) => t.isHero());
    return foes.length ? { score: 50, targetId: foes[0].id } : null;
  },
};

const GRIP_TICK = [70, 100, 130];

const BAN_R: AbilityDef = {
  key: 'ban_grip', name: '末日缠绕', maxLevel: 3, ultimate: true, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [500, 525, 550], manaCost: [150, 200, 250], cooldown: [110, 100, 90],
  castPoint: 0.3, tags: ['stun', 'channel', 'ultimate'],
  description: '引导噩梦缠绕:持续束缚目标使其无法行动并不断造成伤害。',
  onCast(w, caster, _lvl, _pos, target) {
    if (target) w.emit({ kind: 'fx', fx: 'fiendsgrip', pos: V.clone(target.pos) });
  },
  channel: {
    duration: (lvl) => 3 + lvl * 0.5,
    tickInterval: 0.5,
    onChannelTick(w, caster, lvl) {
      const t = caster.channeling?.targetId ? w.getUnit(caster.channeling.targetId) : undefined;
      if (!t || !t.alive || V.dist(caster.pos, t.pos) > 800) {
        if (caster.channeling) caster.channeling.until = -Infinity;
        return;
      }
      spellDamage(w, caster, t, GRIP_TICK[lvl - 1]);
      applyModifier(w, t, { key: 'ban_grip_disable', duration: 0.7, states: { stunned: true, silenced: true } }, caster.id);
    },
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 500).filter((t) => t.isHero());
    return foes.length ? { score: 76, targetId: foes[0].id } : null;
  },
};

export const BAN: HeroDef = {
  key: 'ban', name: '班恩', title: '噩梦祭司', primary: 'int',
  baseStr: 18, gainStr: 1.9, baseAgi: 17, gainAgi: 1.7, baseInt: 23, gainInt: 2.8,
  baseDamage: [22, 30], baseArmor: 2, baseMs: 295, attackRange: 550,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.45, color: '#7e57c2', glyph: '祭',
  abilities: [BAN_Q, BAN_W, BAN_E, BAN_R], aiRole: 'ganker',
};

export const BATCH11 = [MOR, DIS, TIK, VIS, BRO, BAN];

function centroid(us: Unit[]): Vec2 {
  let cx = 0, cy = 0;
  for (const u of us) { cx += u.pos.x; cy += u.pos.y; }
  return { x: cx / us.length, y: cy / us.length };
}
