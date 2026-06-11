/** 第七批 6 名原创英雄:格雷夫/塞勒涅/德拉克/薇诺娜/格罗姆/奥莉薇。 */
import { V, type Vec2 } from '../../core/vec2';
import type { AbilityDef, HeroDef } from './types';
import {
  damageArea, modifierArea, enemiesIn, alliesIn, spellDamage, blinkTo,
} from '../../sim/abilities';
import { applyModifier, hasModifier } from '../../sim/modifiers';
import * as Combat from '../../sim/combat';
import type { Unit } from '../../sim/unit';
import type { World } from '../../sim/world';

// ============ 格雷夫·爆破工兵(智力埋雷) ============

const MINE_DMG = [120, 200, 280, 360];

function placeMine(w: World, owner: Unit, pos: Vec2, dmg: number): Unit {
  const mine = w.spawnUnit({
    kind: 'ward', team: owner.team, pos: w.map.nearestWalkable(pos),
    name: '遥控地雷',
    stats: {
      maxHp: 40, hpRegen: 0, maxMp: 0, mpRegen: 0, dmgMin: 0, dmgMax: 0,
      attackType: 'normal', armorType: 'unarmored', armor: 0, magicResist: 0,
      attackRange: 0, attackPoint: 0, bat: 1, projectileSpeed: 0,
      moveSpeed: 0, collisionRadius: 10, visionDay: 200, visionNight: 200,
      acquireRange: 0, bountyMin: 0, bountyMax: 0, xpBounty: 0,
    },
  });
  applyModifier(w, mine, { key: 'graf_mine', states: { invisible: true }, data: { dmg } }, owner.id);
  mine.summonOwnerId = owner.id;
  return mine;
}

const GRAF_Q: AbilityDef = {
  key: 'graf_mine', name: '遥控地雷', maxLevel: 4, targetMode: 'point',
  castRange: [500, 500, 500, 500], manaCost: [60, 70, 80, 90], cooldown: [3, 3, 3, 3],
  castPoint: 0.3, tags: ['nuke', 'aoe'],
  description: '埋设隐形遥控地雷,可由「引爆」一次性引爆全部。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    placeMine(w, caster, pos, MINE_DMG[lvl - 1]);
    w.emit({ kind: 'fx', fx: 'mine_place', pos: V.clone(pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    // 平时也埋雷攒数量
    return { score: foes.length ? 40 : 22, pos: foes.length ? V.clone(foes[0].pos) : V.add(caster.pos, { x: 200, y: 0 }) };
  },
};

const STASIS_DUR = [1.5, 2, 2.5, 3];

const GRAF_W: AbilityDef = {
  key: 'graf_stasis', name: '静滞陷阱', maxLevel: 4, targetMode: 'point',
  castRange: [500, 500, 500, 500], manaCost: [90, 100, 110, 120], cooldown: [20, 18, 16, 14],
  castPoint: 0.5, tags: ['stun', 'aoe'],
  description: '埋设隐形静滞陷阱,敌人靠近时引爆,缠绕周围敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const at = V.clone(pos);
    // 用一个持续检测的 caster modifier 模拟陷阱触发
    applyModifier(w, caster, {
      key: `graf_stasis_${w.tick}`, duration: 60, isBuff: true, tickInterval: 0.2,
      onTick(world, _u, m) {
        const foes = world.queryRadius(at, 250, (t) => t.team !== caster.team && t.isHero() && t.alive);
        if (foes.length || m.data!.armed) {
          for (const e of world.queryRadius(at, 350, (t) => t.team !== caster.team && !t.isBuilding())) {
            applyModifier(world, e, { key: 'graf_stasis_root', duration: STASIS_DUR[lvl - 1], states: { rooted: true, disarmed: true } }, caster.id);
          }
          world.emit({ kind: 'fx', fx: 'stasis', pos: at, radius: 350 });
          m.expiresAt = -Infinity;
        }
      },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'mine_place', pos: at });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 550).filter((t) => t.isHero());
    return foes.length ? { score: 50, pos: V.clone(foes[0].pos) } : null;
  },
};

const GRAF_E: AbilityDef = {
  key: 'graf_blast', name: '爆破护甲', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '常年与炸药为伴,提升护甲与魔抗。',
  passiveModifier: (lvl) => ({
    key: 'graf_blast_passive', isBuff: true,
    stats: { bonusArmor: 1 + lvl, bonusMagicResist: 0.04 + lvl * 0.03 },
  }),
};

const GRAF_R: AbilityDef = {
  key: 'graf_detonate', name: '引爆', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [50, 75, 100], cooldown: [16, 13, 10],
  castPoint: 0.2, tags: ['nuke', 'aoe', 'ultimate'],
  description: '同时引爆场上所有遥控地雷,造成范围伤害。',
  onCast(w, caster) {
    const mines = [...w.units.values()].filter((u) => u.alive && u.kind === 'ward' && u.name === '遥控地雷' && u.summonOwnerId === caster.id);
    for (const mine of mines) {
      const dmg = mine.modifiers.find((m) => m.key === 'graf_mine')?.def.data?.dmg ?? 120;
      damageArea(w, caster, mine.pos, 350, dmg);
      modifierArea(w, caster, mine.pos, 350, { key: 'graf_detonate_slow', duration: 2, stats: { bonusMoveSpeedPct: -0.3 } }, 'enemy');
      w.emit({ kind: 'fx', fx: 'detonate', pos: V.clone(mine.pos), radius: 350 });
      mine.alive = false; mine.diedAt = w.time;
    }
  },
  aiScore(w, caster) {
    const mines = [...w.units.values()].filter((u) => u.alive && u.name === '遥控地雷' && u.summonOwnerId === caster.id);
    if (mines.length < 2) return null;
    // 有敌方英雄靠近任一地雷则引爆
    for (const m of mines) {
      if (enemiesIn(w, caster, m.pos, 350).some((t) => t.isHero())) return { score: 88 };
    }
    return null;
  },
};

export const GRAF: HeroDef = {
  key: 'graf', name: '格雷夫', title: '爆破工兵', primary: 'int',
  baseStr: 21, gainStr: 2.4, baseAgi: 14, gainAgi: 1.4, baseInt: 18, gainInt: 2.0,
  baseDamage: [24, 30], baseArmor: 2, baseMs: 290, attackRange: 500,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.4, color: '#ffca28', glyph: '雷',
  abilities: [GRAF_Q, GRAF_W, GRAF_E, GRAF_R], aiRole: 'support',
};

// ============ 塞勒涅·月泉祭司(智力全球辅助) ============

const WELL_HEAL = [20, 32, 44, 56];

const SELENE_Q: AbilityDef = {
  key: 'selene_well', name: '月泉', maxLevel: 4, targetMode: 'point',
  castRange: [700, 700, 700, 700], manaCost: [90, 100, 110, 120], cooldown: [14, 13, 12, 11],
  castPoint: 0.3, tags: ['heal', 'aoe'],
  description: '在目标地点开辟月泉,持续治疗其中的友军 6 秒。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const at = V.clone(pos);
    applyModifier(w, caster, {
      key: `selene_well_${w.tick}`, duration: 6, isBuff: true, tickInterval: 0.5,
      onTick(world) {
        for (const a of world.queryRadius(at, 350, (t) => t.team === caster.team && !t.isBuilding())) {
          a.hp = Math.min(a.calc.maxHp, a.hp + WELL_HEAL[lvl - 1]);
        }
        world.emit({ kind: 'fx', fx: 'moonwell', pos: at, radius: 350 });
      },
    }, caster.id);
  },
  aiScore(w, caster, lvl) {
    const allies = alliesIn(w, caster, caster.pos, 700).filter((t) => t.isHero() && t.hp / t.calc.maxHp < 0.6);
    if (!allies.length) return null;
    return { score: 54, pos: V.clone(allies[0].pos) };
    void lvl;
  },
};

const SBEAM_DMG = [90, 150, 210, 270];

const SELENE_W: AbilityDef = {
  key: 'selene_beam', name: '静谧之光', maxLevel: 4, targetMode: 'unit',
  castRange: [650, 650, 650, 650], manaCost: [95, 110, 125, 140], cooldown: [12, 11, 10, 9],
  castPoint: 0.3, tags: ['nuke', 'aoe'],
  description: '一束圣光灼伤目标并沉默其周围敌人。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    spellDamage(w, caster, target, SBEAM_DMG[lvl - 1]);
    modifierArea(w, caster, target.pos, 280, { key: 'selene_beam_silence', duration: 3, states: { silenced: true } }, 'enemy');
    w.emit({ kind: 'fx', fx: 'holybeam', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 650).filter((t) => t.isHero());
    if (!foes.length) return null;
    return { score: 58, targetId: foes[0].id };
  },
};

const SELENE_E: AbilityDef = {
  key: 'selene_grace', name: '月之恩泽', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '月光眷顾全队英雄,提升生命与法力回复(全图光环)。',
  passiveModifier: (lvl) => ({
    key: 'selene_grace_aura', isBuff: true,
    aura: {
      radius: 99999, affects: 'allyHero',
      grant: { key: 'selene_grace_buff', isBuff: true, stats: { bonusHpRegen: lvl * 1.5, bonusMpRegen: lvl * 0.5 } },
    },
  }),
};

const SHOWER_HEAL = [150, 250, 350];
const SHOWER_DMG = [120, 200, 280];

const SELENE_R: AbilityDef = {
  key: 'selene_shower', name: '月华倾泻', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [200, 300, 400], cooldown: [120, 110, 100],
  castPoint: 0.4, tags: ['heal', 'nuke', 'aoe', 'ultimate'],
  description: '全图降下月华:治疗所有友方英雄,并伤害所有敌方英雄。',
  onCast(w, caster, lvl) {
    for (const u of w.units.values()) {
      if (!u.isHero() || !u.alive) continue;
      if (u.team === caster.team) u.hp = Math.min(u.calc.maxHp, u.hp + SHOWER_HEAL[lvl - 1]);
      else spellDamage(w, caster, u, SHOWER_DMG[lvl - 1]);
    }
    w.emit({ kind: 'fx', fx: 'moonshower', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster, lvl) {
    const hurtAllies = [...w.units.values()].filter((u) => u.isHero() && u.alive && u.team === caster.team && u.calc.maxHp - u.hp > SHOWER_HEAL[lvl - 1] * 0.7);
    return hurtAllies.length >= 2 ? { score: 78 } : null;
  },
};

export const SELENE: HeroDef = {
  key: 'selene', name: '塞勒涅', title: '月泉祭司', primary: 'int',
  baseStr: 18, gainStr: 1.9, baseAgi: 15, gainAgi: 1.5, baseInt: 23, gainInt: 2.8,
  baseDamage: [22, 28], baseArmor: 1, baseMs: 295, attackRange: 600,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.4, color: '#e1bee7', glyph: '泉',
  abilities: [SELENE_Q, SELENE_W, SELENE_E, SELENE_R], aiRole: 'support',
};

// ============ 德拉克·龙骑士(力量双形态) ============

const TAIL_DMG = [100, 160, 220, 280];

const DRAK_Q: AbilityDef = {
  key: 'drak_tail', name: '龙尾摆击', maxLevel: 4, targetMode: 'unit',
  castRange: [200, 200, 200, 200], manaCost: [90, 100, 110, 120], cooldown: [9, 8, 7, 6],
  castPoint: 0.3, tags: ['stun', 'nuke'],
  description: '甩动龙尾击晕目标并造成伤害。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    spellDamage(w, caster, target, TAIL_DMG[lvl - 1]);
    applyModifier(w, target, { key: 'drak_tail_stun', duration: 1.4, states: { stunned: true } }, caster.id);
    w.emit({ kind: 'fx', fx: 'tailwhip', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 250).filter((t) => t.isHero());
    if (!foes.length) return null;
    return { score: 64, targetId: foes[0].id };
  },
};

const BREATH_DPS = [30, 45, 60, 75];

const DRAK_W: AbilityDef = {
  key: 'drak_breath', name: '烈焰吐息', maxLevel: 4, targetMode: 'point',
  castRange: [600, 600, 600, 600], manaCost: [80, 90, 100, 110], cooldown: [10, 9, 8, 7],
  castPoint: 0.3, tags: ['nuke', 'aoe'],
  description: '喷吐烈焰,灼烧锥形区域的敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const dir = V.norm(V.sub(pos, caster.pos));
    const hit = new Set<number>();
    for (let d = 100; d <= 600; d += 130) {
      const at = V.add(caster.pos, V.scale(dir, d));
      for (const e of enemiesIn(w, caster, at, 130 + d * 0.15)) {
        if (hit.has(e.id)) continue;
        hit.add(e.id);
        spellDamage(w, caster, e, BREATH_DPS[lvl - 1] * 2);
        applyModifier(w, e, {
          key: 'drak_breath_burn', duration: 3, tickInterval: 1,
          onTick: (world, u) => spellDamage(world, caster, u, BREATH_DPS[lvl - 1]),
        }, caster.id);
      }
    }
    w.emit({ kind: 'fx', fx: 'firebreath', pos: V.clone(caster.pos), pos2: V.add(caster.pos, V.scale(dir, 600)) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    if (!foes.length) return null;
    return { score: 54, pos: V.clone(foes[0].pos) };
  },
};

const DRAK_E: AbilityDef = {
  key: 'drak_blood', name: '巨龙之血', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '巨龙血脉:提升护甲与生命回复。',
  passiveModifier: (lvl) => ({
    key: 'drak_blood_passive', isBuff: true,
    stats: { bonusArmor: 2 + lvl * 1.5, bonusHpRegen: 2 + lvl * 2 },
  }),
};

const ELDER_RANGE = [350, 400, 450];

const DRAK_R: AbilityDef = {
  key: 'drak_elder', name: '远古巨龙', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [100, 100, 100], cooldown: [110, 100, 90],
  castPoint: 0.2, tags: ['buff', 'ultimate'],
  description: '化身远古巨龙 30 秒:获得远程攻击距离、攻击溅射并附带减速。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, {
      key: 'drak_elder_buff', duration: 30, isBuff: true,
      stats: { bonusAttackRange: ELDER_RANGE[lvl - 1], bonusDamage: lvl * 15, bonusAttackSpeed: 0.3 },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'elderdragon', pos: V.clone(caster.pos), radius: 150 });
  },
  // 巨龙形态:攻击溅射 + 减速(法球钩子)
  orbOnHit(w, attacker, target) {
    if (!hasModifier(attacker, 'drak_elder_buff') || target.isBuilding()) return;
    const splash = (attacker.calc.dmgMin + attacker.calc.dmgMax) / 2 * 0.5;
    for (const e of w.queryRadius(target.pos, 250, (t) => Combat.isEnemy(attacker, t) && t.id !== target.id && !t.isBuilding())) {
      Combat.applyDamage(w, e, { source: attacker.id, attackType: attacker.calc.attackType, amount: splash });
    }
    applyModifier(w, target, { key: 'drak_elder_slow', duration: 1.5, stats: { bonusMoveSpeedPct: -0.25 } }, attacker.id);
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length && !hasModifier(caster, 'drak_elder_buff') ? { score: 68 } : null;
  },
};

export const DRAK: HeroDef = {
  key: 'drak', name: '德拉克', title: '龙骑士', primary: 'str',
  baseStr: 23, gainStr: 2.8, baseAgi: 17, gainAgi: 1.9, baseInt: 15, gainInt: 1.6,
  baseDamage: [28, 34], baseArmor: 4, baseMs: 295, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.4, color: '#ef5350', glyph: '龙',
  abilities: [DRAK_Q, DRAK_W, DRAK_E, DRAK_R], aiRole: 'carry',
};

// ============ 薇诺娜·剧毒妖姬(敏捷毒系) ============

const DART_DMG = [70, 110, 150, 190];

const VENONA_Q: AbilityDef = {
  key: 'venona_dart', name: '毒镖', maxLevel: 4, targetMode: 'unit',
  castRange: [600, 600, 600, 600], manaCost: [80, 90, 100, 110], cooldown: [8, 7, 6, 5],
  castPoint: 0.3, tags: ['nuke', 'slow'],
  description: '掷出毒镖,造成伤害并施加剧毒(减速+持续伤害)。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    spellDamage(w, caster, target, DART_DMG[lvl - 1]);
    applyVenom(w, caster, target, lvl);
    w.emit({ kind: 'fx', fx: 'dart', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    if (!foes.length) return null;
    foes.sort((a, b) => a.hp - b.hp);
    return { score: 60, targetId: foes[0].id };
  },
};

const VENONA_W: AbilityDef = {
  key: 'venona_step', name: '暗影潜行', maxLevel: 4, targetMode: 'point',
  castRange: [600, 650, 700, 750], manaCost: [70, 70, 70, 70], cooldown: [16, 14, 12, 10],
  castPoint: 0.0, tags: ['escape'],
  description: '闪现一段距离并短暂隐身。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    blinkTo(w, caster, pos);
    applyModifier(w, caster, { key: 'venona_step_invis', duration: 1 + lvl * 0.5, isBuff: true, states: { invisible: true }, stats: { bonusMoveSpeedPct: 0.2 } }, caster.id);
    w.emit({ kind: 'fx', fx: 'shadowstep', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    return caster.hp / caster.calc.maxHp < 0.4 && enemiesIn(w, caster, caster.pos, 400).length
      ? { score: 80, pos: V.clone(retreat(w, caster)) } : null;
  },
};

const VENOM_DPS = [16, 26, 36, 46];

function applyVenom(w: World, caster: Unit, target: Unit, lvl: number): void {
  applyModifier(w, target, {
    key: 'venona_venom', duration: 5, stackable: true,
    stats: { bonusMoveSpeedPct: -0.08 },
    tickInterval: 0.5,
    onTick: (world, u) => spellDamage(world, caster, u, VENOM_DPS[lvl - 1] / 2),
  }, caster.id);
}

const VENONA_E: AbilityDef = {
  key: 'venona_orb', name: '剧毒之触', maxLevel: 4, targetMode: 'passive',
  tags: ['orb'],
  description: '攻击附带剧毒,可叠加。',
  passiveModifier: () => ({ key: 'venona_orb_passive', isBuff: true }),
  orbOnHit(w, attacker, target, lvl) {
    if (target.isBuilding()) return;
    applyVenom(w, attacker, target, lvl);
  },
};

const NOVA_PER_STACK = [40, 60, 80];

const VENONA_R: AbilityDef = {
  key: 'venona_nova', name: '剧毒新星', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [150, 225, 300], cooldown: [80, 70, 60],
  castPoint: 0.3, tags: ['nuke', 'aoe', 'ultimate'],
  description: '引爆周围敌人体内的毒素:每层剧毒造成额外爆发伤害。',
  onCast(w, caster, lvl) {
    for (const e of enemiesIn(w, caster, caster.pos, 600)) {
      const stacks = e.modifiers.filter((m) => m.key === 'venona_venom').length;
      spellDamage(w, caster, e, 100 + stacks * NOVA_PER_STACK[lvl - 1]);
      applyModifier(w, e, { key: 'venona_nova_slow', duration: 3, stats: { bonusMoveSpeedPct: -0.4 } }, caster.id);
    }
    w.emit({ kind: 'fx', fx: 'venomnova', pos: V.clone(caster.pos), radius: 600 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 580).filter((t) => t.isHero());
    return foes.length ? { score: 72 + foes.length * 6 } : null;
  },
};

export const VENONA: HeroDef = {
  key: 'venona', name: '薇诺娜', title: '剧毒妖姬', primary: 'agi',
  baseStr: 18, gainStr: 1.9, baseAgi: 22, gainAgi: 2.6, baseInt: 18, gainInt: 1.9,
  baseDamage: [24, 30], baseArmor: 2, baseMs: 300, attackRange: 400,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.4, color: '#9ccc65', glyph: '毒',
  abilities: [VENONA_Q, VENONA_W, VENONA_E, VENONA_R], aiRole: 'ganker',
};

// ============ 格罗姆·巨魔战将(敏捷攻速核心) ============

const GROM_Q: AbilityDef = {
  key: 'grom_stance', name: '战斗姿态', maxLevel: 4, targetMode: 'none',
  manaCost: [0, 0, 0, 0], cooldown: [1, 1, 1, 1],
  castPoint: 0.0, tags: ['buff'],
  description: '在近战(高攻速)与远程(攻击距离)姿态间切换。',
  onCast(w, caster, lvl) {
    if (hasModifier(caster, 'grom_ranged_stance')) {
      // 切回近战
      caster.modifiers = caster.modifiers.filter((m) => m.key !== 'grom_ranged_stance');
      applyModifier(w, caster, { key: 'grom_melee_stance', duration: 9999, isBuff: true, stats: { bonusAttackSpeed: 0.2 + lvl * 0.1 } }, caster.id);
    } else {
      caster.modifiers = caster.modifiers.filter((m) => m.key !== 'grom_melee_stance');
      applyModifier(w, caster, { key: 'grom_ranged_stance', duration: 9999, isBuff: true, stats: { bonusAttackRange: 350 } }, caster.id);
    }
  },
  aiScore(w, caster) {
    // 远处有敌人切远程,近身切近战
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    if (!foes.length) return null;
    const close = foes.some((f) => V.dist(caster.pos, f.pos) < 250);
    const wantMelee = close;
    const isMelee = hasModifier(caster, 'grom_melee_stance') || (!hasModifier(caster, 'grom_ranged_stance'));
    return wantMelee !== isMelee ? { score: 42 } : null;
  },
};

const AXES_DMG = [100, 160, 220, 280];

const GROM_W: AbilityDef = {
  key: 'grom_axes', name: '旋斧', maxLevel: 4, targetMode: 'point',
  castRange: [700, 700, 700, 700], manaCost: [85, 95, 105, 115], cooldown: [10, 9, 8, 7],
  castPoint: 0.3, tags: ['nuke', 'aoe'],
  description: '掷出旋转飞斧,伤害一条线上的敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const dir = V.norm(V.sub(pos, caster.pos));
    const hit = new Set<number>();
    for (let d = 100; d <= 700; d += 140) {
      for (const e of enemiesIn(w, caster, V.add(caster.pos, V.scale(dir, d)), 150)) {
        if (hit.has(e.id)) continue;
        hit.add(e.id);
        spellDamage(w, caster, e, AXES_DMG[lvl - 1]);
      }
    }
    w.emit({ kind: 'fx', fx: 'whirlingaxes', pos: V.clone(caster.pos), pos2: V.add(caster.pos, V.scale(dir, 700)) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    if (!foes.length) return null;
    return { score: 52, pos: V.clone(foes[0].pos) };
  },
};

const FERVOR_PER = [8, 12, 16, 20];

const GROM_E: AbilityDef = {
  key: 'grom_fervor', name: '战斗专注', maxLevel: 4, targetMode: 'passive',
  tags: ['orb'],
  description: '持续攻击同一目标时层层叠加攻击速度(换目标重置)。',
  passiveModifier: () => ({ key: 'grom_fervor_passive', isBuff: true }),
  orbOnHit(w, attacker, target, lvl) {
    const cur = attacker.modifiers.find((m) => m.key === 'grom_fervor_buff');
    if (cur && cur.data!.target === target.id) {
      cur.data!.stacks = Math.min(6, (cur.data!.stacks ?? 1) + 1);
      cur.expiresAt = w.time + 3;
      cur.def = { ...cur.def, stats: { bonusAttackSpeed: FERVOR_PER[lvl - 1] / 100 * (cur.data!.stacks as number) } };
    } else {
      const m = applyModifier(w, attacker, { key: 'grom_fervor_buff', duration: 3, isBuff: true, stats: { bonusAttackSpeed: FERVOR_PER[lvl - 1] / 100 } }, attacker.id);
      m.data!.target = target.id;
      m.data!.stacks = 1;
    }
  },
};

const TRANCE_AS = [0.6, 0.9, 1.2];

const GROM_R: AbilityDef = {
  key: 'grom_trance', name: '战斗专注·爆发', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [50, 50, 50], cooldown: [45, 38, 31],
  castPoint: 0.0, tags: ['buff', 'ultimate'],
  description: '进入战斗恍惚:大幅提升自身与周围友军的攻击速度 7 秒。',
  onCast(w, caster, lvl) {
    modifierArea(w, caster, caster.pos, 900, {
      key: 'grom_trance_buff', duration: 7, isBuff: true,
      stats: { bonusAttackSpeed: TRANCE_AS[lvl - 1] },
    }, 'ally');
    w.emit({ kind: 'fx', fx: 'trance', pos: V.clone(caster.pos), radius: 900 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length ? { score: 66 } : null;
  },
};

export const GROM: HeroDef = {
  key: 'grom', name: '格罗姆', title: '巨魔战将', primary: 'agi',
  baseStr: 19, gainStr: 2.2, baseAgi: 22, gainAgi: 2.9, baseInt: 14, gainInt: 1.3,
  baseDamage: [25, 31], baseArmor: 2, baseMs: 300, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.35, color: '#80cbc4', glyph: '将',
  abilities: [GROM_Q, GROM_W, GROM_E, GROM_R], aiRole: 'carry',
};

// ============ 奥莉薇·圣堂祭司(智力/敏捷折光) ============

const REFRACT_INST = [3, 4, 5, 6];
const REFRACT_DMG = [30, 50, 70, 90];

const OLIVE_Q: AbilityDef = {
  key: 'olive_refract', name: '折光', maxLevel: 4, targetMode: 'none',
  manaCost: [60, 70, 80, 90], cooldown: [18, 16, 14, 12],
  castPoint: 0.0, tags: ['buff'],
  description: '折射屏障:格挡接下来数次伤害,期间攻击附带额外伤害。',
  onCast(w, caster, lvl) {
    const m = applyModifier(w, caster, {
      key: 'olive_refract_buff', duration: 12, isBuff: true,
      stats: { bonusDamage: REFRACT_DMG[lvl - 1] },
    }, caster.id);
    m.data!.blockInstances = REFRACT_INST[lvl - 1];
    w.emit({ kind: 'fx', fx: 'refract', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    return foes.length && !hasModifier(caster, 'olive_refract_buff') ? { score: 58 } : null;
  },
};

const OLIVE_W: AbilityDef = {
  key: 'olive_meld', name: '潜影', maxLevel: 4, targetMode: 'none',
  manaCost: [40, 40, 40, 40], cooldown: [4, 4, 4, 4],
  castPoint: 0.0, tags: ['buff'],
  description: '隐入暗影,下次攻击破甲并造成额外伤害(移动会现身)。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, {
      key: 'olive_meld_buff', duration: 15, isBuff: true,
      states: { invisible: true }, data: { meldDmg: 40 + lvl * 30 },
    }, caster.id);
  },
  aiScore() { return null; },
};

const PSI_PCT = [0.4, 0.5, 0.6, 0.7];

const OLIVE_E: AbilityDef = {
  key: 'olive_psi', name: '灵能之刃', maxLevel: 4, targetMode: 'passive',
  tags: ['orb'],
  description: '攻击穿透目标,对其身后的敌人造成额外灵能伤害。',
  passiveModifier: () => ({ key: 'olive_psi_passive', isBuff: true }),
  orbOnHit(w, attacker, target, lvl) {
    if (target.isBuilding()) return;
    // 潜影破甲
    if (hasModifier(attacker, 'olive_meld_buff')) {
      const dmg = attacker.modifiers.find((m) => m.key === 'olive_meld_buff')?.def.data?.meldDmg ?? 40;
      spellDamage(w, attacker, target, dmg);
      applyModifier(w, target, { key: 'olive_meld_armor', duration: 6, stats: { bonusArmor: -5 } }, attacker.id);
      attacker.modifiers = attacker.modifiers.filter((m) => m.key !== 'olive_meld_buff');
    }
    // 灵能穿透:目标身后方向的敌人
    const dir = V.norm(V.sub(target.pos, attacker.pos));
    const behind = V.add(target.pos, V.scale(dir, 250));
    const spill = (attacker.calc.dmgMin + attacker.calc.dmgMax) / 2 * PSI_PCT[lvl - 1];
    for (const e of w.queryRadius(behind, 220, (t) => Combat.isEnemy(attacker, t) && t.id !== target.id && !t.isBuilding())) {
      Combat.applyDamage(w, e, { source: attacker.id, attackType: attacker.calc.attackType, amount: spill });
    }
  },
};

const TRAP_SLOW = [-0.3, -0.4, -0.5];

const OLIVE_R: AbilityDef = {
  key: 'olive_trap', name: '灵能陷阱', maxLevel: 3, ultimate: true, targetMode: 'point',
  castRange: [1500, 1500, 1500], manaCost: [60, 60, 60], cooldown: [11, 8, 5],
  castPoint: 0.2, tags: ['slow', 'aoe', 'ultimate'],
  description: '在远处布下灵能陷阱,引爆后大幅减速并伤害区域内敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    damageArea(w, caster, pos, 400, 100 + lvl * 60);
    modifierArea(w, caster, pos, 400, {
      key: 'olive_trap_slow', duration: 5, stats: { bonusMoveSpeedPct: TRAP_SLOW[lvl - 1], bonusAttackSpeed: -0.3 },
    }, 'enemy');
    w.emit({ kind: 'fx', fx: 'psitrap', pos: V.clone(pos), radius: 400 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 1200).filter((t) => t.isHero());
    if (!foes.length) return null;
    return { score: 56, pos: V.clone(foes[0].pos) };
  },
};

export const OLIVE: HeroDef = {
  key: 'olive', name: '奥莉薇', title: '圣堂祭司', primary: 'int',
  baseStr: 18, gainStr: 1.9, baseAgi: 20, gainAgi: 2.3, baseInt: 22, gainInt: 2.5,
  baseDamage: [25, 31], baseArmor: 2, baseMs: 300, attackRange: 140,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.4, color: '#b39ddb', glyph: '堂',
  abilities: [OLIVE_Q, OLIVE_W, OLIVE_E, OLIVE_R], aiRole: 'carry',
};

export const BATCH7 = [GRAF, SELENE, DRAK, VENONA, GROM, OLIVE];

function retreat(w: World, caster: Unit): Vec2 {
  const foes = enemiesIn(w, caster, caster.pos, 600);
  if (!foes.length) return caster.pos;
  let cx = 0, cy = 0;
  for (const f of foes) { cx += f.pos.x; cy += f.pos.y; }
  const away = V.norm(V.sub(caster.pos, { x: cx / foes.length, y: cy / foes.length }));
  return V.add(caster.pos, V.scale(away, 650));
}
