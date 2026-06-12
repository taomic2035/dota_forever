/** 第八批 6 名原创英雄:欧格/昆恩/泰德/玛格/莱赫/杜姆。 */
import { V, type Vec2 } from '../../core/vec2';
import type { AbilityDef, HeroDef } from './types';
import {
  damageArea, modifierArea, enemiesIn, alliesIn, spellDamage, blinkTo,
} from '../../sim/abilities';
import { applyModifier, hasModifier, purge } from '../../sim/modifiers';
import * as Combat from '../../sim/combat';
import type { Unit } from '../../sim/unit';
import type { World } from '../../sim/world';

// ============ 欧格·雷霆双头(力量多重施法) ============

const FIREBLAST_DMG = [110, 180, 250, 320];
const FIREBLAST_STUN = [1.4, 1.6, 1.8, 2.0];
// 多重施法概率 [触发任意, 触发三连];三连区间 [0,c3),双发区间 [c3,c2)
const MULTI_CHANCE: Array<[number, number]> = [[0.30, 0.08], [0.45, 0.16], [0.60, 0.26], [0.75, 0.38]];

/** 多重施法:基础结算一次,再按 E 等级概率额外重复 1~2 次。 */
function ogreMulticast(w: World, caster: Unit, effect: () => void): void {
  effect();
  const lvl = caster.abilities[2]?.level ?? 0;
  if (lvl <= 0) return;
  const [c2, c3] = MULTI_CHANCE[lvl - 1];
  const r = w.rng.next();
  const extra = r < c3 ? 2 : r < c2 ? 1 : 0;
  for (let i = 0; i < extra; i++) effect();
  if (extra) w.emit({ kind: 'fx', fx: 'multicast', pos: V.clone(caster.pos) });
}

const OGRE_Q: AbilityDef = {
  key: 'ogre_fireblast', name: '火焰冲击', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [575, 575, 575, 575], manaCost: [95, 110, 125, 140], cooldown: [9, 8, 7, 6],
  castPoint: 0.3, tags: ['stun', 'nuke'],
  description: '猛击目标造成伤害并眩晕,可被多重施法连发。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    ogreMulticast(w, caster, () => {
      spellDamage(w, caster, target, FIREBLAST_DMG[lvl - 1]);
      applyModifier(w, target, { key: 'ogre_fireblast_stun', duration: FIREBLAST_STUN[lvl - 1], states: { stunned: true } }, caster.id);
    });
    w.emit({ kind: 'fx', fx: 'fireblast', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 575).filter((t) => t.isHero());
    return foes.length ? { score: 66, targetId: foes[0].id } : null;
  },
};

const OGRE_W: AbilityDef = {
  key: 'ogre_bloodlust', name: '嗜血渴望', maxLevel: 4, targetMode: 'unit', targetTeam: 'allyOrSelf',
  castRange: [600, 600, 600, 600], manaCost: [50, 60, 70, 80], cooldown: [15, 14, 13, 12],
  castPoint: 0.2, tags: ['buff'],
  description: '激发友军斗志,提升其攻击速度与移动速度 30 秒。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target || target.team !== caster.team) return;
    applyModifier(w, target, {
      key: 'ogre_bloodlust', duration: 30, isBuff: true,
      stats: { bonusAttackSpeed: 0.2 + lvl * 0.1, bonusMoveSpeedPct: 0.08 + lvl * 0.04 },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'bloodlust', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 900).filter((t) => t.isHero());
    if (!foes.length) return null;
    const allies = alliesIn(w, caster, caster.pos, 800).filter((t) => t.isHero());
    const tgt = allies.sort((a, b) => b.calc.dmgMax - a.calc.dmgMax)[0] ?? caster;
    return hasModifier(tgt, 'ogre_bloodlust') ? null : { score: 44, targetId: tgt.id };
  },
};

const OGRE_E: AbilityDef = {
  key: 'ogre_multicast', name: '多重施法', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '两颗头颅同时吟唱:火焰冲击与点燃有概率连发 2~3 次。',
  passiveModifier: () => ({ key: 'ogre_multicast_passive', isBuff: true }),
};

const IGNITE_BURST = [80, 140, 200];
const IGNITE_DPS = [40, 60, 80];

const OGRE_R: AbilityDef = {
  key: 'ogre_ignite', name: '点燃', maxLevel: 3, ultimate: true, targetMode: 'point',
  castRange: [700, 700, 700], manaCost: [120, 160, 200], cooldown: [14, 12, 10],
  castPoint: 0.3, tags: ['nuke', 'aoe', 'slow', 'ultimate'],
  description: '点燃一片区域:灼烧并减速其中敌人,可被多重施法叠加。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const at = V.clone(pos);
    ogreMulticast(w, caster, () => {
      for (const e of enemiesIn(w, caster, at, 300)) {
        spellDamage(w, caster, e, IGNITE_BURST[lvl - 1]);
        applyModifier(w, e, {
          key: 'ogre_ignite', duration: 5, stackable: true,
          stats: { bonusMoveSpeedPct: -0.3 }, tickInterval: 0.5,
          onTick: (world, u) => spellDamage(world, caster, u, IGNITE_DPS[lvl - 1] / 2),
        }, caster.id);
      }
    });
    w.emit({ kind: 'fx', fx: 'ignite', pos: at, radius: 300 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length ? { score: 70, pos: V.clone(foes[0].pos) } : null;
  },
};

export const OGRE: HeroDef = {
  key: 'ogre', name: '欧格', title: '雷霆双头', primary: 'str',
  baseStr: 24, gainStr: 3.0, baseAgi: 14, gainAgi: 1.2, baseInt: 16, gainInt: 1.8,
  baseDamage: [27, 33], baseArmor: 2, baseMs: 295, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.5, color: '#ff8a65', glyph: '雷',
  abilities: [OGRE_Q, OGRE_W, OGRE_E, OGRE_R], aiRole: 'support',
};

// ============ 昆恩·痛苦魔女(智力闪现爆发) ============

const BLINK_RANGE = [1000, 1075, 1150, 1225];

const QUEN_Q: AbilityDef = {
  key: 'quen_blink', name: '闪现', maxLevel: 4, targetMode: 'point',
  castRange: [1000, 1075, 1150, 1225], manaCost: [60, 60, 60, 60], cooldown: [12, 10, 8, 6],
  castPoint: 0.0, tags: ['escape'],
  description: '瞬间闪现到目标位置(超出最大距离则取最远点)。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const max = BLINK_RANGE[lvl - 1];
    let p = pos;
    if (V.dist(caster.pos, pos) > max) p = V.add(caster.pos, V.scale(V.norm(V.sub(pos, caster.pos)), max));
    blinkTo(w, caster, p);
    w.emit({ kind: 'fx', fx: 'blink', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    if (caster.hp / caster.calc.maxHp >= 0.35) return null;
    const foes = enemiesIn(w, caster, caster.pos, 500);
    return foes.length ? { score: 78, pos: V.clone(retreat(w, caster)) } : null;
  },
};

const SCREAM_DMG = [90, 160, 230, 300];

const QUEN_W: AbilityDef = {
  key: 'quen_scream', name: '尖啸', maxLevel: 4, targetMode: 'none',
  manaCost: [100, 115, 130, 145], cooldown: [9, 8, 7, 6],
  castPoint: 0.3, tags: ['nuke', 'aoe'],
  description: '发出痛苦尖啸,震伤周围所有敌人。',
  onCast(w, caster, lvl) {
    damageArea(w, caster, caster.pos, 500, SCREAM_DMG[lvl - 1]);
    w.emit({ kind: 'fx', fx: 'scream', pos: V.clone(caster.pos), radius: 500 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 480).filter((t) => t.isHero());
    return foes.length ? { score: 50 + foes.length * 8 } : null;
  },
};

const SS_INIT = [60, 100, 140, 180];
const SS_DPS = [30, 45, 60, 75];

const QUEN_E: AbilityDef = {
  key: 'quen_strike', name: '暗影突袭', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [650, 650, 650, 650], manaCost: [80, 90, 100, 110], cooldown: [8, 7, 6, 5],
  castPoint: 0.3, tags: ['nuke', 'slow'],
  description: '掷出毒匕,造成伤害并施加持续伤害与减速。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    spellDamage(w, caster, target, SS_INIT[lvl - 1]);
    applyModifier(w, target, {
      key: 'quen_strike_dot', duration: 5, stats: { bonusMoveSpeedPct: -0.3 }, tickInterval: 1,
      onTick: (world, u) => spellDamage(world, caster, u, SS_DPS[lvl - 1]),
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'shadowstrike', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 650).filter((t) => t.isHero());
    return foes.length ? { score: 56, targetId: foes[0].id } : null;
  },
};

const SONIC_DMG = [280, 380, 480];

const QUEN_R: AbilityDef = {
  key: 'quen_sonic', name: '音波冲击', maxLevel: 3, ultimate: true, targetMode: 'point',
  castRange: [900, 900, 900], manaCost: [150, 225, 300], cooldown: [60, 50, 40],
  castPoint: 0.35, tags: ['nuke', 'aoe', 'ultimate'],
  description: '释放一道音波,重创并击退直线上的敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const dir = V.norm(V.sub(pos, caster.pos));
    const hit = new Set<number>();
    for (let d = 120; d <= 900; d += 140) {
      for (const e of enemiesIn(w, caster, V.add(caster.pos, V.scale(dir, d)), 200)) {
        if (hit.has(e.id)) continue;
        hit.add(e.id);
        spellDamage(w, caster, e, SONIC_DMG[lvl - 1]);
        const kb = w.map.nearestWalkable(V.add(e.pos, V.scale(dir, 220)));
        e.pos = kb; e.prevPos = V.clone(kb); e.path = []; e.pathGoal = null;
        applyModifier(w, e, { key: 'quen_sonic_slow', duration: 0.6, stats: { bonusMoveSpeedPct: -0.3 } }, caster.id);
      }
    }
    w.emit({ kind: 'fx', fx: 'sonicwave', pos: V.clone(caster.pos), pos2: V.add(caster.pos, V.scale(dir, 900)) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 850).filter((t) => t.isHero());
    return foes.length ? { score: 74, pos: V.clone(foes[0].pos) } : null;
  },
};

export const QUEN: HeroDef = {
  key: 'quen', name: '昆恩', title: '痛苦魔女', primary: 'int',
  baseStr: 17, gainStr: 1.6, baseAgi: 18, gainAgi: 2.0, baseInt: 22, gainInt: 2.8,
  baseDamage: [22, 28], baseArmor: 2, baseMs: 300, attackRange: 550,
  projectileSpeed: 1100, bat: 1.6, attackPoint: 0.4, color: '#ce93d8', glyph: '痛',
  abilities: [QUEN_Q, QUEN_W, QUEN_E, QUEN_R], aiRole: 'ganker',
};

// ============ 泰德·深海督军(力量先手) ============

const GUSH_DMG = [90, 160, 230, 300];
const GUSH_ARMOR = [3, 4, 5, 6];

const TED_Q: AbilityDef = {
  key: 'ted_gush', name: '涌泉', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [700, 700, 700, 700], manaCost: [90, 100, 110, 120], cooldown: [8, 7, 6, 5],
  castPoint: 0.3, tags: ['nuke', 'slow'],
  description: '掀起涌泉重击目标,造成伤害、减速并削减护甲。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    spellDamage(w, caster, target, GUSH_DMG[lvl - 1]);
    applyModifier(w, target, {
      key: 'ted_gush_debuff', duration: 5,
      stats: { bonusMoveSpeedPct: -0.4, bonusArmor: -GUSH_ARMOR[lvl - 1] },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'gush', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length ? { score: 58, targetId: foes[0].id } : null;
  },
};

const ANCHOR_DMG = [70, 110, 150, 190];
const ANCHOR_REDUCE = [0.2, 0.3, 0.4, 0.5];

const TED_W: AbilityDef = {
  key: 'ted_anchor', name: '巨锚横扫', maxLevel: 4, targetMode: 'none',
  manaCost: [60, 70, 80, 90], cooldown: [5, 5, 5, 5],
  castPoint: 0.3, tags: ['nuke', 'aoe'],
  description: '挥舞巨锚横扫四周,造成伤害并削弱敌人的攻击力。',
  onCast(w, caster, lvl) {
    damageArea(w, caster, caster.pos, 400, ANCHOR_DMG[lvl - 1]);
    modifierArea(w, caster, caster.pos, 400, {
      key: 'ted_anchor_weaken', duration: 6, stats: { bonusDamagePct: -ANCHOR_REDUCE[lvl - 1] },
    }, 'enemy');
    w.emit({ kind: 'fx', fx: 'anchorsmash', pos: V.clone(caster.pos), radius: 400 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 400).filter((t) => t.isHero());
    return foes.length ? { score: 46 + foes.length * 6 } : null;
  },
};

const TED_E: AbilityDef = {
  key: 'ted_kraken', name: '海妖外壳', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '坚硬的外壳减免所受伤害,并定期甩落身上的负面状态。',
  passiveModifier: (lvl) => ({
    key: 'ted_kraken_passive', isBuff: true,
    stats: { incomingDamageReduction: 0.06 + lvl * 0.04 },
    tickInterval: 4,
    onTick: (world, u) => purge(world, u, false),
  }),
};

const RAVAGE_DMG = [200, 300, 400];
const RAVAGE_STUN = [2.0, 2.4, 2.8];

const TED_R: AbilityDef = {
  key: 'ted_ravage', name: '巨浪', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [150, 200, 250], cooldown: [140, 120, 100],
  castPoint: 0.4, tags: ['stun', 'aoe', 'nuke', 'ultimate'],
  description: '掀起滔天巨浪,震晕并重创周围大范围内的所有敌人。',
  onCast(w, caster, lvl) {
    damageArea(w, caster, caster.pos, 1000, RAVAGE_DMG[lvl - 1]);
    modifierArea(w, caster, caster.pos, 1000, {
      key: 'ted_ravage_stun', duration: RAVAGE_STUN[lvl - 1], states: { stunned: true },
    }, 'enemy');
    w.emit({ kind: 'fx', fx: 'ravage', pos: V.clone(caster.pos), radius: 1000 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 950).filter((t) => t.isHero());
    return foes.length >= 2 ? { score: 82 + foes.length * 4 } : foes.length ? { score: 60 } : null;
  },
};

export const TED: HeroDef = {
  key: 'ted', name: '泰德', title: '深海督军', primary: 'str',
  baseStr: 25, gainStr: 3.0, baseAgi: 14, gainAgi: 1.5, baseInt: 16, gainInt: 1.6,
  baseDamage: [27, 33], baseArmor: 3, baseMs: 300, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.5, color: '#26a69a', glyph: '海',
  abilities: [TED_Q, TED_W, TED_E, TED_R], aiRole: 'tank',
};

// ============ 玛格·巨角战兽(力量先手+强化) ============

const SKEWER_DIST = [600, 700, 800, 900];
const SKEWER_DMG = [80, 140, 200, 260];

const MAG_Q: AbilityDef = {
  key: 'mag_skewer', name: '穿刺冲撞', maxLevel: 4, targetMode: 'point',
  castRange: [900, 900, 900, 900], manaCost: [100, 110, 120, 130], cooldown: [18, 16, 14, 12],
  castPoint: 0.2, tags: ['stun', 'nuke'],
  description: '向目标方向猛冲,将沿途敌人钉在终点并击晕。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const dir = V.norm(V.sub(pos, caster.pos));
    const dist = Math.min(SKEWER_DIST[lvl - 1], Math.max(200, V.dist(caster.pos, pos)));
    const end = w.map.nearestWalkable(V.add(caster.pos, V.scale(dir, dist)));
    const dragged: Unit[] = [];
    const seen = new Set<number>();
    for (let d = 60; d <= dist; d += 120) {
      for (const e of enemiesIn(w, caster, V.add(caster.pos, V.scale(dir, d)), 150)) {
        if (seen.has(e.id)) continue;
        seen.add(e.id); dragged.push(e);
      }
    }
    blinkTo(w, caster, end);
    dragged.forEach((e, i) => {
      const p = w.map.nearestWalkable(V.add(end, { x: Math.cos(i) * 70, y: Math.sin(i) * 70 }));
      e.pos = p; e.prevPos = V.clone(p); e.path = []; e.pathGoal = null;
      spellDamage(w, caster, e, SKEWER_DMG[lvl - 1]);
      applyModifier(w, e, { key: 'mag_skewer_stun', duration: 1.4, states: { stunned: true } }, caster.id);
    });
    w.emit({ kind: 'fx', fx: 'skewer', pos: V.clone(caster.pos), pos2: end });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length ? { score: 60, pos: V.clone(foes[0].pos) } : null;
  },
};

const SHOCK_DMG = [100, 160, 220, 280];

const MAG_W: AbilityDef = {
  key: 'mag_shock', name: '震荡波', maxLevel: 4, targetMode: 'point',
  castRange: [800, 800, 800, 800], manaCost: [85, 95, 105, 115], cooldown: [11, 10, 9, 8],
  castPoint: 0.3, tags: ['nuke', 'aoe'],
  description: '震地掀起一道冲击波,贯穿伤害直线上的敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const dir = V.norm(V.sub(pos, caster.pos));
    const hit = new Set<number>();
    for (let d = 100; d <= 800; d += 150) {
      for (const e of enemiesIn(w, caster, V.add(caster.pos, V.scale(dir, d)), 160)) {
        if (hit.has(e.id)) continue;
        hit.add(e.id);
        spellDamage(w, caster, e, SHOCK_DMG[lvl - 1]);
      }
    }
    w.emit({ kind: 'fx', fx: 'shockwave', pos: V.clone(caster.pos), pos2: V.add(caster.pos, V.scale(dir, 800)) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 800).filter((t) => t.isHero());
    return foes.length ? { score: 48, pos: V.clone(foes[0].pos) } : null;
  },
};

const EMP_DMG = [20, 30, 40, 50];
const EMP_CLEAVE = [0.2, 0.3, 0.4, 0.5];

const MAG_E: AbilityDef = {
  key: 'mag_empower', name: '强化', maxLevel: 4, targetMode: 'unit', targetTeam: 'allyOrSelf',
  castRange: [600, 600, 600, 600], manaCost: [40, 45, 50, 55], cooldown: [10, 8, 6, 4],
  castPoint: 0.1, tags: ['buff'],
  description: '强化友军武器:提升攻击力并使其攻击产生劈砍溅射 30 秒。',
  onCast(w, caster, lvl, _pos, target) {
    const t = target && target.team === caster.team ? target : caster;
    applyModifier(w, t, {
      key: 'mag_empower', duration: 30, isBuff: true,
      stats: { bonusDamage: EMP_DMG[lvl - 1] },
      data: { cleavePct: EMP_CLEAVE[lvl - 1], cleaveRadius: 300 },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'empower', pos: V.clone(t.pos) });
  },
  aiScore(w, caster) {
    const allies = alliesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    const tgt = allies.sort((a, b) => b.calc.dmgMax - a.calc.dmgMax)[0] ?? caster;
    return hasModifier(tgt, 'mag_empower') ? null : { score: 38, targetId: tgt.id };
  },
};

const RP_RADIUS = [340, 380, 420];
const RP_STUN = [2.0, 2.3, 2.6];
const RP_DMG = [150, 225, 300];

const MAG_R: AbilityDef = {
  key: 'mag_polarity', name: '两极反转', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [150, 225, 300], cooldown: [120, 110, 100],
  castPoint: 0.4, tags: ['stun', 'aoe', 'nuke', 'ultimate'],
  description: '扭转磁极,将周围所有敌人拉到身前并长时间击晕。',
  onCast(w, caster, lvl) {
    const foes = enemiesIn(w, caster, caster.pos, RP_RADIUS[lvl - 1]);
    foes.forEach((e, i) => {
      const ang = (i / Math.max(1, foes.length)) * Math.PI * 2;
      const p = w.map.nearestWalkable(V.add(caster.pos, { x: Math.cos(ang) * 120, y: Math.sin(ang) * 120 }));
      e.pos = p; e.prevPos = V.clone(p); e.path = []; e.pathGoal = null;
      spellDamage(w, caster, e, RP_DMG[lvl - 1]);
      applyModifier(w, e, { key: 'mag_polarity_stun', duration: RP_STUN[lvl - 1], states: { stunned: true } }, caster.id);
    });
    w.emit({ kind: 'fx', fx: 'reversepolarity', pos: V.clone(caster.pos), radius: RP_RADIUS[lvl - 1] });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, RP_RADIUS[0]).filter((t) => t.isHero());
    return foes.length >= 2 ? { score: 88 } : null;
  },
};

export const MAG: HeroDef = {
  key: 'mag', name: '玛格', title: '巨角战兽', primary: 'str',
  baseStr: 23, gainStr: 2.9, baseAgi: 18, gainAgi: 1.8, baseInt: 18, gainInt: 1.8,
  baseDamage: [28, 34], baseArmor: 3, baseMs: 305, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.4, color: '#7e57c2', glyph: '角',
  abilities: [MAG_Q, MAG_W, MAG_E, MAG_R], aiRole: 'tank',
};

// ============ 莱赫·寒霜亡灵(智力寒霜法师) ============

const FB_DMG = [110, 180, 250, 320];
const FB_SPLASH = [60, 100, 140, 180];

const LYK_Q: AbilityDef = {
  key: 'lyk_blast', name: '霜爆', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [700, 700, 700, 700], manaCost: [90, 105, 120, 135], cooldown: [7, 6, 5, 4],
  castPoint: 0.3, tags: ['nuke', 'aoe', 'slow'],
  description: '在目标处引爆寒霜,重创目标并波及周围敌人,全部减速。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    spellDamage(w, caster, target, FB_DMG[lvl - 1]);
    applyModifier(w, target, { key: 'lyk_frost_slow', duration: 3, stats: { bonusMoveSpeedPct: -0.3, bonusAttackSpeed: -0.3 } }, caster.id);
    for (const e of enemiesIn(w, caster, target.pos, 250)) {
      if (e.id === target.id) continue;
      spellDamage(w, caster, e, FB_SPLASH[lvl - 1]);
      applyModifier(w, e, { key: 'lyk_frost_slow', duration: 2, stats: { bonusMoveSpeedPct: -0.2 } }, caster.id);
    }
    w.emit({ kind: 'fx', fx: 'frostblast', pos: V.clone(target.pos), radius: 250 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length ? { score: 60, targetId: foes[0].id } : null;
  },
};

const FA_ARMOR = [3, 5, 7, 9];

const LYK_W: AbilityDef = {
  key: 'lyk_armor', name: '寒霜护甲', maxLevel: 4, targetMode: 'unit', targetTeam: 'allyOrSelf',
  castRange: [700, 700, 700, 700], manaCost: [50, 55, 60, 65], cooldown: [12, 11, 10, 9],
  castPoint: 0.2, tags: ['buff'],
  description: '为友军披上寒霜护甲:提升护甲,攻击者会被冻缓。',
  onCast(w, caster, lvl, _pos, target) {
    const t = target && target.team === caster.team ? target : caster;
    applyModifier(w, t, {
      key: 'lyk_frost_armor', duration: 40, isBuff: true,
      stats: { bonusArmor: FA_ARMOR[lvl - 1] },
      data: { retaliateSlowPct: 0.3, retaliateSlowAs: 0.3, retaliateSlowDur: 1.5 },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'frostarmor', pos: V.clone(t.pos) });
  },
  aiScore(w, caster) {
    const allies = alliesIn(w, caster, caster.pos, 700).filter((t) => t.isHero() && !hasModifier(t, 'lyk_frost_armor'));
    if (!allies.length) return null;
    allies.sort((a, b) => a.hp / a.calc.maxHp - b.hp / b.calc.maxHp);
    return { score: 36, targetId: allies[0].id };
  },
};

const RITUAL_PCT = [0.3, 0.4, 0.5, 0.6];

const LYK_E: AbilityDef = {
  key: 'lyk_ritual', name: '黑暗献祭', maxLevel: 4, targetMode: 'unit', targetTeam: 'ally', targetKind: 'creep',
  castRange: [600, 600, 600, 600], manaCost: [0, 0, 0, 0], cooldown: [40, 32, 24, 16],
  castPoint: 0.2, tags: ['buff'],
  description: '献祭一名己方小兵,按其生命上限百分比回复自身法力。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target || target.team !== caster.team || target.isHero()) return;
    const mana = target.calc.maxHp * RITUAL_PCT[lvl - 1];
    target.hp = 0; target.alive = false; target.diedAt = w.time;
    caster.mp = Math.min(caster.calc.maxMp, caster.mp + mana);
    w.emit({ kind: 'fx', fx: 'darkritual', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    if (caster.mp / caster.calc.maxMp > 0.45) return null;
    const creep = alliesIn(w, caster, caster.pos, 350).find((t) => !t.isHero() && t.kind === 'creep');
    return creep ? { score: 34, targetId: creep.id } : null;
  },
};

const CF_DMG = [180, 250, 320];
const CF_BOUNCES = [6, 8, 10];
const CF_STEP = [15, 20, 25];

const LYK_R: AbilityDef = {
  key: 'lyk_chain', name: '寒霜连锁', maxLevel: 3, ultimate: true, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [700, 700, 700], manaCost: [200, 275, 350], cooldown: [120, 105, 90],
  castPoint: 0.3, tags: ['nuke', 'slow', 'ultimate'],
  description: '召唤一颗寒霜弹在敌人间反复弹跳,伤害逐跳递增并减速。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    let cur: Unit | undefined = target;
    let dmg = CF_DMG[lvl - 1];
    const bounces = CF_BOUNCES[lvl - 1];
    for (let b = 0; b < bounces && cur; b++) {
      const from: Unit = cur;
      spellDamage(w, caster, from, dmg);
      applyModifier(w, from, { key: 'lyk_chain_slow', duration: 1.5, stats: { bonusMoveSpeedPct: -0.4 } }, caster.id);
      w.emit({ kind: 'fx', fx: 'chainfrost', pos: V.clone(from.pos) });
      cur = enemiesIn(w, caster, from.pos, 600)
        .filter((t) => t.alive && t.id !== from.id)
        .sort((a, b2) => V.dist(from.pos, a.pos) - V.dist(from.pos, b2.pos))[0];
      dmg += CF_STEP[lvl - 1];
    }
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length ? { score: 76, targetId: foes[0].id } : null;
  },
};

export const LYK: HeroDef = {
  key: 'lyk', name: '莱赫', title: '寒霜亡灵', primary: 'int',
  baseStr: 17, gainStr: 1.6, baseAgi: 15, gainAgi: 1.5, baseInt: 25, gainInt: 3.0,
  baseDamage: [21, 27], baseArmor: 1, baseMs: 295, attackRange: 550,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.45, color: '#4fc3f7', glyph: '霜',
  abilities: [LYK_Q, LYK_W, LYK_E, LYK_R], aiRole: 'support',
};

// ============ 杜姆·噩梦领主(力量吞噬+末日) ============

const DEVOUR_DMG = [300, 500, 700, 900];
const DEVOUR_GOLD = [40, 80, 120, 160];

const DUM_Q: AbilityDef = {
  key: 'dum_devour', name: '吞噬', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy', targetKind: 'nonHeroNonBuilding',
  castRange: [200, 200, 200, 200], manaCost: [40, 40, 40, 40], cooldown: [40, 34, 28, 22],
  castPoint: 0.3, tags: ['nuke'],
  description: '吞食一个非英雄单位造成巨额伤害,得手则获得金钱与永久攻击成长。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    if (target.isHero()) { spellDamage(w, caster, target, 50 * lvl); return; }
    Combat.applyDamage(w, target, { source: caster.id, attackType: 'spell', amount: DEVOUR_DMG[lvl - 1], flags: { spell: true, pure: true } });
    if (!target.alive) {
      if (caster.heroMeta) caster.heroMeta.gold += DEVOUR_GOLD[lvl - 1];
      const m = caster.modifiers.find((x) => x.key === 'dum_devour_stacks')
        ?? applyModifier(w, caster, { key: 'dum_devour_stacks', isBuff: true, stats: { bonusDamage: 0 } }, caster.id);
      m.data!.n = (m.data!.n ?? 0) + 1;
      m.def = { ...m.def, stats: { bonusDamage: m.data!.n * 4 } };
    }
    w.emit({ kind: 'fx', fx: 'devour', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const prey = enemiesIn(w, caster, caster.pos, 200).find((t) => !t.isHero())
      ?? alliesIn(w, caster, caster.pos, 200).find((t) => t.kind === 'neutral');
    return prey ? { score: 28, targetId: prey.id } : null;
  },
};

const SCORCH_HEAL = [18, 28, 38, 48];
const SCORCH_DMG = [14, 22, 30, 38];

const DUM_W: AbilityDef = {
  key: 'dum_scorch', name: '焦土', maxLevel: 4, targetMode: 'none',
  manaCost: [50, 60, 70, 80], cooldown: [30, 30, 30, 30],
  castPoint: 0.0, tags: ['buff', 'aoe'],
  description: '点燃脚下焦土 12 秒:提升移速、灼烧周围敌人并治疗自身。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, {
      key: 'dum_scorch_buff', duration: 12, isBuff: true,
      stats: { bonusMoveSpeedPct: 0.12 }, tickInterval: 1,
      onTick(world, u) {
        u.hp = Math.min(u.calc.maxHp, u.hp + SCORCH_HEAL[lvl - 1]);
        for (const e of enemiesIn(world, u, u.pos, 400)) spellDamage(world, caster, e, SCORCH_DMG[lvl - 1]);
      },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'scorch', pos: V.clone(caster.pos), radius: 400 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 500).filter((t) => t.isHero());
    return foes.length && !hasModifier(caster, 'dum_scorch_buff') ? { score: 50 } : null;
  },
};

const INFERNAL_DPS = [20, 30, 40, 50];

const DUM_E: AbilityDef = {
  key: 'dum_infernal', name: '魔焰', maxLevel: 4, targetMode: 'passive',
  tags: ['orb'],
  description: '攻击附带魔焰灼烧,并永久提升自身攻击力。',
  passiveModifier: (lvl) => ({ key: 'dum_infernal_passive', isBuff: true, stats: { bonusDamage: 6 + lvl * 6 } }),
  orbOnHit(w, attacker, target, lvl) {
    if (target.isBuilding()) return;
    applyModifier(w, target, {
      key: 'dum_infernal_burn', duration: 3, tickInterval: 1,
      onTick: (world, u) => spellDamage(world, attacker, u, INFERNAL_DPS[lvl - 1]),
    }, attacker.id);
  },
};

const DOOM_DUR = [8, 9, 10];
const DOOM_DPS = [40, 60, 80];

const DUM_R: AbilityDef = {
  key: 'dum_doom', name: '末日', maxLevel: 3, ultimate: true, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [600, 600, 600], manaCost: [150, 200, 250], cooldown: [110, 100, 90],
  castPoint: 0.3, tags: ['nuke', 'ultimate'],
  description: '降下末日审判:目标被沉默、缴械并持续受到灼烧,无法反抗。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    applyModifier(w, target, {
      key: 'dum_doom_debuff', duration: DOOM_DUR[lvl - 1],
      states: { silenced: true, disarmed: true }, stats: { bonusMoveSpeedPct: -0.2 },
      tickInterval: 1, onTick: (world, u) => spellDamage(world, caster, u, DOOM_DPS[lvl - 1]),
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'doom', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    if (!foes.length) return null;
    foes.sort((a, b) => b.calc.maxHp - a.calc.maxHp);
    return { score: 80, targetId: foes[0].id };
  },
};

export const DUM: HeroDef = {
  key: 'dum', name: '杜姆', title: '噩梦领主', primary: 'str',
  baseStr: 24, gainStr: 2.9, baseAgi: 13, gainAgi: 1.4, baseInt: 17, gainInt: 1.7,
  baseDamage: [28, 34], baseArmor: 3, baseMs: 295, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.45, color: '#e53935', glyph: '噩',
  abilities: [DUM_Q, DUM_W, DUM_E, DUM_R], aiRole: 'ganker',
};

export const BATCH8 = [OGRE, QUEN, TED, MAG, LYK, DUM];

function retreat(w: World, caster: Unit): Vec2 {
  const foes = enemiesIn(w, caster, caster.pos, 600);
  if (!foes.length) return caster.pos;
  let cx = 0, cy = 0;
  for (const f of foes) { cx += f.pos.x; cy += f.pos.y; }
  const away = V.norm(V.sub(caster.pos, { x: cx / foes.length, y: cy / foes.length }));
  return V.add(caster.pos, V.scale(away, 650));
}
