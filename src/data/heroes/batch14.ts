/** 第十四批 6 名原创英雄:提尼/涅洛/史宾/萨克/卢恩/吉姆。 */
import { V, type Vec2 } from '../../core/vec2';
import type { AbilityDef, HeroDef } from './types';
import {
  damageArea, modifierArea, enemiesIn, spellDamage, blinkTo, summonUnit,
} from '../../sim/abilities';
import { applyModifier, hasModifier } from '../../sim/modifiers';
import type { Unit } from '../../sim/unit';
import type { World } from '../../sim/world';

// ============ 提尼·巨岩(力量投掷先手) ============

const AVAL_DMG = [100, 160, 220, 280];

const TIN_Q: AbilityDef = {
  key: 'tin_avalanche', name: '山崩', maxLevel: 4, targetMode: 'point',
  castRange: [600, 600, 600, 600], manaCost: [110, 120, 130, 140], cooldown: [11, 10, 9, 8],
  castPoint: 0.3, tags: ['stun', 'aoe', 'nuke'],
  description: '召落山崩,砸晕并重创目标区域的敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    damageArea(w, caster, pos, 350, AVAL_DMG[lvl - 1]);
    modifierArea(w, caster, pos, 350, { key: 'tin_avalanche_stun', duration: 1.4, states: { stunned: true } }, 'enemy');
    w.emit({ kind: 'fx', fx: 'avalanche', pos: V.clone(pos), radius: 350 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    return foes.length ? { score: 60, pos: V.clone(foes[0].pos) } : null;
  },
};

const TOSS_DMG = [110, 170, 230, 290];

const TIN_W: AbilityDef = {
  key: 'tin_toss', name: '投掷', maxLevel: 4, targetMode: 'point',
  castRange: [700, 700, 700, 700], manaCost: [90, 100, 110, 120], cooldown: [10, 9, 8, 7],
  castPoint: 0.2, tags: ['stun', 'nuke'],
  description: '抓起身边一个单位猛掷向目标点,落点处造成伤害与眩晕。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const near = w.queryRadius(caster.pos, 275, (t) => t.id !== caster.id && t.alive && !t.isBuilding() && t.kind !== 'ward');
    const tossed = near.find((t) => t.team !== caster.team) ?? near[0];
    if (!tossed) return;
    const land = w.map.nearestWalkable(pos);
    tossed.pos = land; tossed.prevPos = V.clone(land); tossed.path = []; tossed.pathGoal = null;
    for (const e of enemiesIn(w, caster, land, 275)) {
      spellDamage(w, caster, e, TOSS_DMG[lvl - 1]);
      applyModifier(w, e, { key: 'tin_toss_stun', duration: 1.2, states: { stunned: true } }, caster.id);
    }
    w.emit({ kind: 'fx', fx: 'toss', pos: V.clone(caster.pos), pos2: land });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 280).filter((t) => t.isHero());
    if (!foes.length) return null;
    const away = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero())[0] ?? foes[0];
    return { score: 56, pos: V.clone(away.pos) };
  },
};

const TIN_E: AbilityDef = {
  key: 'tin_grow', name: '长大', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '身躯膨胀:大幅提升攻击力与生命(攻击速度略降)。',
  passiveModifier: (lvl) => ({
    key: 'tin_grow_passive', isBuff: true,
    stats: { bonusDamage: lvl * 20, bonusHp: lvl * 90, bonusAttackSpeed: -lvl * 0.05 },
  }),
};

const RAGE_DMG = [60, 100, 140];

const TIN_R: AbilityDef = {
  key: 'tin_rage', name: '巨化狂怒', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [100, 125, 150], cooldown: [60, 55, 50],
  castPoint: 0.0, tags: ['buff', 'ultimate'],
  description: '进入巨化狂怒:攻击附带溅射并大幅提升攻击力 20 秒。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, {
      key: 'tin_rage_buff', duration: 20, isBuff: true,
      stats: { bonusDamage: RAGE_DMG[lvl - 1] }, data: { cleavePct: 0.3 + lvl * 0.1, cleaveRadius: 350 },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'tinyrage', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 500).filter((t) => t.isHero());
    return foes.length && !hasModifier(caster, 'tin_rage_buff') ? { score: 60 } : null;
  },
};

export const TIN: HeroDef = {
  key: 'tin', name: '提尼', title: '巨岩', primary: 'str',
  baseStr: 24, gainStr: 3.2, baseAgi: 9, gainAgi: 1.0, baseInt: 16, gainInt: 1.8,
  baseDamage: [28, 40], baseArmor: 2, baseMs: 285, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.5, color: '#78909c', glyph: '岩',
  abilities: [TIN_Q, TIN_W, TIN_E, TIN_R], aiRole: 'tank',
};

// ============ 涅洛·瘟疫使者(智力消耗/处决) ============

const PULSE_AMT = [90, 150, 210, 270];

const NEC_Q: AbilityDef = {
  key: 'nec_pulse', name: '死亡脉冲', maxLevel: 4, targetMode: 'none',
  manaCost: [90, 100, 110, 120], cooldown: [6, 6, 6, 6],
  castPoint: 0.2, tags: ['nuke', 'heal', 'aoe'],
  description: '释放死亡脉冲:治疗周围友军,同时伤害周围敌人。',
  onCast(w, caster, lvl) {
    for (const u of w.queryRadius(caster.pos, 500, (t) => t.alive && !t.isBuilding() && t.kind !== 'ward')) {
      if (u.team === caster.team) u.hp = Math.min(u.calc.maxHp, u.hp + PULSE_AMT[lvl - 1]);
      else spellDamage(w, caster, u, PULSE_AMT[lvl - 1]);
    }
    w.emit({ kind: 'fx', fx: 'deathpulse', pos: V.clone(caster.pos), radius: 500 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 480).filter((t) => t.isHero());
    const allies = w.queryRadius(caster.pos, 480, (t) => t.team === caster.team && t.isHero() && t.hp / t.calc.maxHp < 0.7);
    return (foes.length || allies.length) ? { score: 50 } : null;
  },
};

const HEART_PCT = [0.01, 0.018, 0.026, 0.034];

const NEC_W: AbilityDef = {
  key: 'nec_heart', name: '心脏停搏', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '凋零气息:按生命上限百分比持续伤害周围敌人(光环)。',
  passiveModifier: (lvl) => ({
    key: 'nec_heart_passive', isBuff: true, tickInterval: 1,
    onTick(world, u) {
      for (const e of enemiesIn(world, u, u.pos, 450)) spellDamage(world, u, e, e.calc.maxHp * HEART_PCT[lvl - 1]);
    },
  }),
};

const SHROUD_HEAL = [10, 16, 22, 28];

const NEC_E: AbilityDef = {
  key: 'nec_shroud', name: '幽灵护罩', maxLevel: 4, targetMode: 'none',
  manaCost: [40, 40, 40, 40], cooldown: [16, 14, 12, 10],
  castPoint: 0.0, tags: ['buff'],
  description: '披上幽灵护罩:加速回血与移动(但更易受魔法伤害)。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, {
      key: 'nec_shroud_buff', duration: 5, isBuff: true,
      stats: { bonusMoveSpeedPct: 0.15, bonusMagicResist: -0.2 }, tickInterval: 0.5,
      onTick: (_world, u) => { u.hp = Math.min(u.calc.maxHp, u.hp + SHROUD_HEAL[lvl - 1]); },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'ghostshroud', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    return caster.hp / caster.calc.maxHp < 0.4 ? { score: 44 } : null;
  },
};

const SCYTHE_PER_MISSING = [0.5, 0.65, 0.8];

const NEC_R: AbilityDef = {
  key: 'nec_scythe', name: '死神镰刀', maxLevel: 3, ultimate: true, targetMode: 'unit',
  castRange: [600, 600, 600], manaCost: [200, 350, 500], cooldown: [100, 85, 70],
  castPoint: 0.3, tags: ['nuke', 'stun', 'ultimate'],
  description: '挥下死神镰刀:目标生命越低伤害越高,并将其眩晕(可处决)。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    const missing = Math.max(0, target.calc.maxHp - target.hp);
    spellDamage(w, caster, target, 100 + missing * SCYTHE_PER_MISSING[lvl - 1]);
    applyModifier(w, target, { key: 'nec_scythe_stun', duration: 1.5, states: { stunned: true } }, caster.id);
    w.emit({ kind: 'fx', fx: 'reaperscythe', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    if (!foes.length) return null;
    foes.sort((a, b) => a.hp / a.calc.maxHp - b.hp / b.calc.maxHp);
    return { score: foes[0].hp / foes[0].calc.maxHp < 0.5 ? 86 : 60, targetId: foes[0].id };
  },
};

export const NEC: HeroDef = {
  key: 'nec', name: '涅洛', title: '瘟疫使者', primary: 'int',
  baseStr: 18, gainStr: 2.0, baseAgi: 12, gainAgi: 1.4, baseInt: 23, gainInt: 2.9,
  baseDamage: [22, 28], baseArmor: 2, baseMs: 290, attackRange: 550,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.45, color: '#558b2f', glyph: '疫',
  abilities: [NEC_Q, NEC_W, NEC_E, NEC_R], aiRole: 'support',
};

// ============ 史宾·星空裂兽(力量全球先手) ============

const CHARGE_DMG = [100, 150, 200, 250];

const SBR_Q: AbilityDef = {
  key: 'sbr_charge', name: '星体冲撞', maxLevel: 4, targetMode: 'unit',
  castRange: [3000, 3500, 4000, 4500], manaCost: [80, 80, 80, 80], cooldown: [16, 14, 12, 10],
  castPoint: 0.0, tags: ['stun', 'nuke'],
  description: '锁定目标向其飞速冲撞,抵达时造成伤害并击晕。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    blinkTo(w, caster, w.map.nearestWalkable(V.add(target.pos, V.scale(V.norm(V.sub(caster.pos, target.pos)), 120))));
    spellDamage(w, caster, target, CHARGE_DMG[lvl - 1]);
    applyModifier(w, target, { key: 'sbr_charge_stun', duration: 1.4 + lvl * 0.15, states: { stunned: true } }, caster.id);
    caster.issueOrder({ type: 'attack', targetId: target.id });
    w.emit({ kind: 'fx', fx: 'charge', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 2500).filter((t) => t.isHero() && t.hp / t.calc.maxHp < 0.6);
    return foes.length ? { score: 64, targetId: foes[0].id } : null;
  },
};

const SBASH_DMG = [40, 70, 100, 130];

const SBR_W: AbilityDef = {
  key: 'sbr_bash', name: '巨力挥舞', maxLevel: 4, targetMode: 'passive',
  tags: ['orb'],
  description: '攻击有概率重击,造成额外伤害并眩晕。',
  passiveModifier: () => ({ key: 'sbr_bash_passive', isBuff: true }),
  orbOnHit(w, attacker, target, lvl) {
    if (target.isBuilding() || !w.rng.chance(0.25)) return;
    spellDamage(w, attacker, target, SBASH_DMG[lvl - 1]);
    applyModifier(w, target, { key: 'sbr_bash_stun', duration: 0.9, states: { stunned: true } }, attacker.id);
  },
};

const SBR_E: AbilityDef = {
  key: 'sbr_bulldoze', name: '蛮牛冲撞', maxLevel: 4, targetMode: 'none',
  manaCost: [40, 40, 40, 40], cooldown: [16, 14, 12, 10],
  castPoint: 0.0, tags: ['buff', 'escape'],
  description: '进入蛮力状态:免疫减速、大幅提升移动速度。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, { key: 'sbr_bulldoze_buff', duration: 4 + lvl * 0.5, isBuff: true, stats: { bonusMoveSpeedPct: 0.2 + lvl * 0.06 } }, caster.id);
    w.emit({ kind: 'fx', fx: 'bulldoze', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    return enemiesIn(w, caster, caster.pos, 500).length ? { score: 36 } : null;
  },
};

const NETHER_DMG = [200, 300, 400];

const SBR_R: AbilityDef = {
  key: 'sbr_netherstrike', name: '星空裂击', maxLevel: 3, ultimate: true, targetMode: 'unit',
  castRange: [700, 700, 700], manaCost: [125, 150, 175], cooldown: [80, 60, 40],
  castPoint: 0.3, tags: ['nuke', 'stun', 'ultimate'],
  description: '瞬移到目标身后给予致命一击:重创并击晕目标。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    blinkTo(w, caster, w.map.nearestWalkable(V.add(target.pos, { x: 80, y: 60 })));
    spellDamage(w, caster, target, NETHER_DMG[lvl - 1]);
    applyModifier(w, target, { key: 'sbr_nether_stun', duration: 1.6, states: { stunned: true } }, caster.id);
    caster.issueOrder({ type: 'attack', targetId: target.id });
    w.emit({ kind: 'fx', fx: 'netherstrike', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length ? { score: 78, targetId: foes[0].id } : null;
  },
};

export const SBR: HeroDef = {
  key: 'sbr', name: '史宾', title: '星空裂兽', primary: 'str',
  baseStr: 23, gainStr: 2.9, baseAgi: 17, gainAgi: 1.7, baseInt: 15, gainInt: 1.5,
  baseDamage: [27, 33], baseArmor: 3, baseMs: 300, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.5, color: '#5e35b1', glyph: '裂',
  abilities: [SBR_Q, SBR_W, SBR_E, SBR_R], aiRole: 'ganker',
};

// ============ 萨克·深海猎手(敏捷吃属性核心) ============

const PACT_DMG = [70, 120, 170, 220];

const SLA_Q: AbilityDef = {
  key: 'sla_pact', name: '黑暗契约', maxLevel: 4, targetMode: 'none',
  manaCost: [60, 60, 60, 60], cooldown: [9, 8, 7, 6],
  castPoint: 0.0, tags: ['nuke', 'aoe', 'buff'],
  description: '蓄积黑暗能量后爆发:驱散自身减益,并伤害周围敌人。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, {
      key: `sla_pact_${w.tick}`, duration: 0.9, isBuff: true, tickInterval: 0.8,
      onTick(world, u, m) {
        // 净化自身可驱散减益
        u.modifiers = u.modifiers.filter((x) => x.key === m.key || x.def.isBuff || x.expiresAt === Infinity);
        damageArea(world, caster, u.pos, 350, PACT_DMG[lvl - 1]);
        world.emit({ kind: 'fx', fx: 'darkpact', pos: V.clone(u.pos), radius: 350 });
        m.expiresAt = -Infinity;
      },
    }, caster.id);
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 350).filter((t) => t.isHero());
    return foes.length ? { score: 48 } : null;
  },
};

const POUNCE_DMG = [80, 130, 180, 230];

const SLA_W: AbilityDef = {
  key: 'sla_pounce', name: '猛扑', maxLevel: 4, targetMode: 'point',
  castRange: [700, 700, 700, 700], manaCost: [50, 55, 60, 65], cooldown: [13, 11, 9, 7],
  castPoint: 0.0, tags: ['nuke', 'escape'],
  description: '猛扑一段距离,扑中的敌人被缠绕并受到伤害。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const dir = V.norm(V.sub(pos, caster.pos));
    const dist = Math.min(700, V.dist(caster.pos, pos));
    const end = w.map.nearestWalkable(V.add(caster.pos, V.scale(dir, dist)));
    blinkTo(w, caster, end);
    for (const e of enemiesIn(w, caster, end, 250)) {
      spellDamage(w, caster, e, POUNCE_DMG[lvl - 1]);
      applyModifier(w, e, { key: 'sla_pounce_leash', duration: 2, states: { rooted: true }, stats: { bonusMoveSpeedPct: -0.4 } }, caster.id);
    }
    w.emit({ kind: 'fx', fx: 'pounce', pos: V.clone(end) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length ? { score: 50, pos: V.clone(foes[0].pos) } : null;
  },
};

const ESS_DMG = [4, 7, 10, 13];

const SLA_E: AbilityDef = {
  key: 'sla_essence', name: '精华吸取', maxLevel: 4, targetMode: 'passive',
  tags: ['orb'],
  description: '攻击吸取目标精华:永久(短时)削弱目标并强化自身。',
  passiveModifier: () => ({ key: 'sla_essence_passive', isBuff: true }),
  orbOnHit(w, attacker, target, lvl) {
    if (target.isBuilding()) return;
    applyModifier(w, target, { key: 'sla_essence_drain', duration: 8, stackable: true, stats: { bonusArmor: -1 } }, attacker.id);
    applyModifier(w, attacker, { key: 'sla_essence_gain', duration: 8, isBuff: true, stackable: true, stats: { bonusDamage: ESS_DMG[lvl - 1] } }, attacker.id);
  },
};

const DANCE_DUR = [4, 5, 6];

const SLA_R: AbilityDef = {
  key: 'sla_dance', name: '暗影之舞', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [60, 60, 60], cooldown: [40, 32, 24],
  castPoint: 0.0, tags: ['buff', 'escape', 'ultimate'],
  description: '隐入暗影:隐身、加速并快速回复生命。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, {
      key: 'sla_dance_buff', duration: DANCE_DUR[lvl - 1], isBuff: true,
      states: { invisible: true }, stats: { bonusMoveSpeedPct: 0.25 + lvl * 0.05 }, tickInterval: 0.5,
      onTick: (_world, u) => { u.hp = Math.min(u.calc.maxHp, u.hp + 40 + lvl * 20); },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'shadowdance', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    return enemiesIn(w, caster, caster.pos, 500).length && !hasModifier(caster, 'sla_dance_buff') ? { score: 58 } : null;
  },
};

export const SLA: HeroDef = {
  key: 'sla', name: '萨克', title: '深海猎手', primary: 'agi',
  baseStr: 19, gainStr: 1.9, baseAgi: 21, gainAgi: 2.8, baseInt: 15, gainInt: 1.5,
  baseDamage: [24, 30], baseArmor: 2, baseMs: 305, attackRange: 128,
  projectileSpeed: 0, bat: 1.6, attackPoint: 0.4, color: '#0097a7', glyph: '猎',
  abilities: [SLA_Q, SLA_W, SLA_E, SLA_R], aiRole: 'carry',
};

// ============ 卢恩·兽人之王(力量召唤变形) ============

const WOLF_HP = [300, 420, 540, 660];

const LYC_Q: AbilityDef = {
  key: 'lyc_wolves', name: '召唤狼群', maxLevel: 4, targetMode: 'none',
  manaCost: [75, 85, 95, 105], cooldown: [28, 26, 24, 22],
  castPoint: 0.2, tags: ['buff'],
  description: '召唤两头迅捷战狼协同作战。',
  onCast(w, caster, lvl) {
    for (let i = 0; i < 2; i++) {
      summonUnit(w, caster, { name: '战狼', hp: WOLF_HP[lvl - 1], dmg: [22 + lvl * 5, 28 + lvl * 5], armor: 2, ms: 380, range: 100, duration: 60, magicResist: 0.2 }, V.add(caster.pos, { x: i === 0 ? -70 : 70, y: 60 }), true);
    }
    w.emit({ kind: 'fx', fx: 'summonwolves', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    return !hasModifier(caster, 'lyc_wolves_cd') ? { score: 44 } : null;
  },
};

const HOWL_DMG = [10, 16, 22, 28];

const LYC_W: AbilityDef = {
  key: 'lyc_howl', name: '嗥叫', maxLevel: 4, targetMode: 'none',
  manaCost: [40, 40, 40, 40], cooldown: [20, 18, 16, 14],
  castPoint: 0.2, tags: ['buff'],
  description: '发出战嗥,提升附近友军(含召唤物)的攻击力。',
  onCast(w, caster, lvl) {
    modifierArea(w, caster, caster.pos, 1500, { key: 'lyc_howl_buff', duration: 8, isBuff: true, stats: { bonusDamage: HOWL_DMG[lvl - 1] } }, 'ally');
    w.emit({ kind: 'fx', fx: 'howl', pos: V.clone(caster.pos), radius: 1500 });
  },
  aiScore(w, caster) {
    return enemiesIn(w, caster, caster.pos, 800).filter((t) => t.isHero()).length ? { score: 40 } : null;
  },
};

const LYC_E: AbilityDef = {
  key: 'lyc_feral', name: '野性冲动', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '野性本能:提升攻击速度与攻击力。',
  passiveModifier: (lvl) => ({
    key: 'lyc_feral_passive', isBuff: true,
    stats: { bonusAttackSpeed: 0.1 + lvl * 0.06, bonusDamage: lvl * 6 },
  }),
};

const SHIFT_DUR = [12, 15, 18];

const LYC_R: AbilityDef = {
  key: 'lyc_shift', name: '变形', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [75, 75, 75], cooldown: [80, 70, 60],
  castPoint: 0.0, tags: ['buff', 'ultimate'],
  description: '化身狼王:极速移动、暴击与额外生命,撕碎一切。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, {
      key: 'lyc_shift_buff', duration: SHIFT_DUR[lvl - 1], isBuff: true,
      stats: { bonusMoveSpeedPct: 0.4, critChance: 0.3, critMultiplier: 1.7 + lvl * 0.1, bonusHp: 150 + lvl * 100 },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'shapeshift', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    return foes.length && !hasModifier(caster, 'lyc_shift_buff') ? { score: 70 } : null;
  },
};

export const LYC: HeroDef = {
  key: 'lyc', name: '卢恩', title: '兽人之王', primary: 'str',
  baseStr: 23, gainStr: 2.9, baseAgi: 16, gainAgi: 1.6, baseInt: 18, gainInt: 1.8,
  baseDamage: [27, 33], baseArmor: 3, baseMs: 320, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.45, color: '#795548', glyph: '狼',
  abilities: [LYC_Q, LYC_W, LYC_E, LYC_R], aiRole: 'carry',
};

// ============ 吉姆·岩魂(力量机动控制) ============

const BOULDER_DMG = [90, 140, 190, 240];

const GEM_Q: AbilityDef = {
  key: 'gem_boulder', name: '巨石翻滚', maxLevel: 4, targetMode: 'point',
  castRange: [800, 800, 800, 800], manaCost: [80, 90, 100, 110], cooldown: [10, 9, 8, 7],
  castPoint: 0.2, tags: ['nuke', 'aoe', 'slow'],
  description: '化作巨石向目标方向滚去,碾压沿途敌人并减速。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const dir = V.norm(V.sub(pos, caster.pos));
    const dist = Math.min(800, Math.max(300, V.dist(caster.pos, pos)));
    const end = w.map.nearestWalkable(V.add(caster.pos, V.scale(dir, dist)));
    const hit = new Set<number>();
    for (let d = 100; d <= dist; d += 120) {
      for (const e of enemiesIn(w, caster, V.add(caster.pos, V.scale(dir, d)), 150)) {
        if (hit.has(e.id)) continue;
        hit.add(e.id);
        spellDamage(w, caster, e, BOULDER_DMG[lvl - 1]);
        applyModifier(w, e, { key: 'gem_boulder_slow', duration: 2, stats: { bonusMoveSpeedPct: -0.3 } }, caster.id);
      }
    }
    blinkTo(w, caster, end);
    w.emit({ kind: 'fx', fx: 'boulder', pos: V.clone(caster.pos), pos2: end });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length ? { score: 52, pos: V.clone(foes[0].pos) } : null;
  },
};

const GRIP_DMG = [60, 110, 160, 210];

const GEM_W: AbilityDef = {
  key: 'gem_grip', name: '磁化吸引', maxLevel: 4, targetMode: 'unit',
  castRange: [900, 900, 900, 900], manaCost: [70, 80, 90, 100], cooldown: [14, 12, 10, 8],
  castPoint: 0.2, tags: ['nuke', 'slow'],
  description: '磁力牵引将目标拽到身边,造成伤害并减速。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    const p = w.map.nearestWalkable(V.add(caster.pos, V.scale(V.norm(V.sub(target.pos, caster.pos)), 130)));
    target.pos = p; target.prevPos = V.clone(p); target.path = []; target.pathGoal = null;
    spellDamage(w, caster, target, GRIP_DMG[lvl - 1]);
    applyModifier(w, target, { key: 'gem_grip_slow', duration: 2, stats: { bonusMoveSpeedPct: -0.35 } }, caster.id);
    w.emit({ kind: 'fx', fx: 'grip', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 900).filter((t) => t.isHero() && t.hp / t.calc.maxHp < 0.5);
    return foes.length ? { score: 56, targetId: foes[0].id } : null;
  },
};

const GEM_E: AbilityDef = {
  key: 'gem_stone', name: '岩石之躯', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '坚岩之躯:提升护甲与魔抗。',
  passiveModifier: (lvl) => ({ key: 'gem_stone_passive', isBuff: true, stats: { bonusArmor: 1 + lvl, bonusMagicResist: 0.04 + lvl * 0.03 } }),
};

const MAGNETIZE_TICK = [50, 75, 100];

const GEM_R: AbilityDef = {
  key: 'gem_magnetize', name: '怒石迸发', maxLevel: 3, ultimate: true, targetMode: 'point',
  castRange: [700, 700, 700], manaCost: [125, 175, 225], cooldown: [90, 80, 70],
  castPoint: 0.3, tags: ['nuke', 'aoe', 'slow', 'ultimate'],
  description: '磁化一片区域:持续伤害并减速其中敌人 6 秒。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const at = V.clone(pos);
    applyModifier(w, caster, {
      key: `gem_magnetize_${w.tick}`, duration: 6, isBuff: true, tickInterval: 0.5,
      onTick(world) {
        for (const e of enemiesIn(world, caster, at, 450)) {
          spellDamage(world, caster, e, MAGNETIZE_TICK[lvl - 1]);
          applyModifier(world, e, { key: 'gem_magnetize_slow', duration: 0.7, stats: { bonusMoveSpeedPct: -0.3 } }, caster.id);
        }
        world.emit({ kind: 'fx', fx: 'magnetize', pos: at, radius: 450 });
      },
    }, caster.id);
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length ? { score: 62, pos: V.clone(foes[0].pos) } : null;
  },
};

export const GEM: HeroDef = {
  key: 'gem', name: '吉姆', title: '岩魂', primary: 'str',
  baseStr: 21, gainStr: 2.6, baseAgi: 16, gainAgi: 1.6, baseInt: 20, gainInt: 2.2,
  baseDamage: [24, 30], baseArmor: 3, baseMs: 300, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.4, color: '#a1887f', glyph: '磁',
  abilities: [GEM_Q, GEM_W, GEM_E, GEM_R], aiRole: 'ganker',
};

export const BATCH14 = [TIN, NEC, SBR, SLA, LYC, GEM];
