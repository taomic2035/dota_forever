/** 第四批 6 名原创英雄:邓肯/泽诺/托尔加/赛丽娅/米拉/格里姆。 */
import { V } from '../../core/vec2';
import type { AbilityDef, HeroDef } from './types';
import {
  damageArea, modifierArea, enemiesIn, alliesIn, spellDamage, blinkTo, abilityProjectile,
} from '../../sim/abilities';
import { applyModifier } from '../../sim/modifiers';
import { isEnemy, kill } from '../../sim/combat';
import type { Unit } from '../../sim/unit';
import type { World } from '../../sim/world';

// ============ 邓肯·重装壁垒(力量坦克/嘲讽) ============

const TAUNT_DUR = [1.4, 1.8, 2.2, 2.6];
const TAUNT_ARMOR = [4, 6, 8, 10];

const DUNCAN_Q: AbilityDef = {
  key: 'duncan_taunt', name: '战吼嘲讽', maxLevel: 4, targetMode: 'none',
  manaCost: [60, 65, 70, 75], cooldown: [16, 14, 12, 10],
  castPoint: 0.1, tags: ['stun', 'aoe', 'buff'],
  description: '强迫周围敌人攻击自己,同时自身获得护甲。',
  onCast(w, caster, lvl) {
    for (const e of enemiesIn(w, caster, caster.pos, 400)) {
      e.tauntedUntil = w.time + TAUNT_DUR[lvl - 1];
      e.tauntSourceId = caster.id;
      e.windupTargetId = 0;
    }
    applyModifier(w, caster, {
      key: 'duncan_taunt_armor', duration: TAUNT_DUR[lvl - 1] + 1, isBuff: true,
      stats: { bonusArmor: TAUNT_ARMOR[lvl - 1] },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'taunt', pos: V.clone(caster.pos), radius: 400 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 400).filter((t) => t.isHero());
    return foes.length ? { score: 64 + foes.length * 10 } : null;
  },
};

const BLOCK = [12, 20, 28, 36];

const DUNCAN_W: AbilityDef = {
  key: 'duncan_block', name: '坚盾格挡', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '格挡来自攻击的部分伤害(护盾常驻并自动恢复)。',
  passiveModifier: (lvl) => ({
    key: 'duncan_block_passive', isBuff: true,
    tickInterval: 1,
    onTick(w, u, m) {
      // 常驻护盾每秒回满到上限(简化的格挡:充当小额护盾池)
      m.data!.shield = BLOCK[lvl - 1];
    },
  }),
};

const BASH_DMG = [80, 130, 180, 230];

const DUNCAN_E: AbilityDef = {
  key: 'duncan_bash', name: '盾击', maxLevel: 4, targetMode: 'unit',
  castRange: [200, 200, 200, 200], manaCost: [75, 80, 85, 90], cooldown: [9, 8, 7, 6],
  castPoint: 0.2, tags: ['stun', 'nuke'],
  description: '盾牌猛击目标,造成伤害并眩晕,自身获得护盾。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    spellDamage(w, caster, target, BASH_DMG[lvl - 1]);
    applyModifier(w, target, { key: 'duncan_bash_stun', duration: 1.3, states: { stunned: true } }, caster.id);
    const m = applyModifier(w, caster, { key: 'duncan_bash_shield', duration: 6, isBuff: true }, caster.id);
    m.data!.shield = BASH_DMG[lvl - 1];
    w.emit({ kind: 'fx', fx: 'bash', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 250).filter((t) => t.isHero());
    if (!foes.length) return null;
    return { score: 62, targetId: foes[0].id };
  },
};

const FORT_REDUC = [0.2, 0.3, 0.4];

const DUNCAN_R: AbilityDef = {
  key: 'duncan_fortress', name: '壁垒领域', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [100, 150, 200], cooldown: [70, 60, 50],
  castPoint: 0.2, tags: ['buff', 'aoe', 'ultimate'],
  description: '展开壁垒,周围友军受到的伤害降低 8 秒。',
  onCast(w, caster, lvl) {
    modifierArea(w, caster, caster.pos, 800, {
      key: 'duncan_fortress_buff', duration: 8, isBuff: true,
      stats: { bonusArmor: 6, bonusMagicResist: FORT_REDUC[lvl - 1] },
    }, 'ally');
    w.emit({ kind: 'fx', fx: 'fortress', pos: V.clone(caster.pos), radius: 800 });
  },
  aiScore(w, caster) {
    const allies = alliesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    const foes = enemiesIn(w, caster, caster.pos, 800).filter((t) => t.isHero());
    return allies.length >= 2 && foes.length >= 1 ? { score: 78 } : null;
  },
};

export const DUNCAN: HeroDef = {
  key: 'duncan', name: '邓肯', title: '重装壁垒', primary: 'str',
  baseStr: 25, gainStr: 3.2, baseAgi: 13, gainAgi: 1.3, baseInt: 14, gainInt: 1.4,
  baseDamage: [28, 34], baseArmor: 5, baseMs: 300, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.45, color: '#bcaaa4', glyph: '壁',
  abilities: [DUNCAN_Q, DUNCAN_W, DUNCAN_E, DUNCAN_R], aiRole: 'tank',
};

// ============ 泽诺·奥术工程师(智力法师/连发) ============

const LASER_DMG = [100, 175, 250, 325];

const ZENO_Q: AbilityDef = {
  key: 'zeno_laser', name: '奥术激光', maxLevel: 4, targetMode: 'unit',
  castRange: [650, 650, 650, 650], manaCost: [95, 110, 125, 140], cooldown: [8, 7, 6, 5],
  castPoint: 0.2, tags: ['nuke'],
  description: '纯能激光灼烧目标,造成纯粹伤害并使其攻击落空。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    // 纯粹伤害(无视护甲魔抗)
    const { applyDamage } = importCombat();
    applyDamage(w, target, { source: caster.id, attackType: 'spell', amount: LASER_DMG[lvl - 1] * (1 + caster.calc.spellAmp), flags: { pure: true } });
    applyModifier(w, target, { key: 'zeno_laser_blind', duration: 3, stats: { evasion: 0.6 } }, caster.id);
    w.emit({ kind: 'fx', fx: 'laser', pos: V.clone(caster.pos), pos2: V.clone(target.pos) });
  },
  aiScore(w, caster, lvl) {
    const foes = enemiesIn(w, caster, caster.pos, 650).filter((t) => t.isHero());
    if (!foes.length) return null;
    foes.sort((a, b) => a.hp - b.hp);
    return { score: 66 + (foes[0].hp < LASER_DMG[lvl - 1] ? 40 : 0), targetId: foes[0].id };
  },
};

const MISSILE_DMG = [60, 90, 120, 150];
const MISSILE_COUNT = [3, 4, 5, 6];

const ZENO_W: AbilityDef = {
  key: 'zeno_missiles', name: '追踪导弹', maxLevel: 4, targetMode: 'none',
  manaCost: [100, 120, 140, 160], cooldown: [22, 20, 18, 16],
  castPoint: 0.3, tags: ['nuke', 'aoe'],
  description: '发射数枚自动追踪导弹,攻击附近的敌方英雄。',
  onCast(w, caster, lvl) {
    const targets = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    if (!targets.length) return;
    const n = MISSILE_COUNT[lvl - 1];
    for (let i = 0; i < n; i++) {
      const target = targets[i % targets.length];
      abilityProjectile(w, caster, target, 900, (world, t, src) => {
        const caster2 = world.getUnit(src);
        spellDamage(world, caster2 ?? caster, t, MISSILE_DMG[lvl - 1]);
      }, 'missile');
    }
    w.emit({ kind: 'fx', fx: 'missiles', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length ? { score: 58 } : null;
  },
};

const ZENO_E: AbilityDef = {
  key: 'zeno_heat', name: '余热充能', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '法术造成伤害时积累热能,提升法术增强。',
  passiveModifier: (lvl) => ({
    key: 'zeno_heat_passive', isBuff: true,
    stats: { spellAmp: 0.04 + lvl * 0.03 },
  }),
};

const ZENO_R: AbilityDef = {
  key: 'zeno_overload', name: '过载重置', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [120, 120, 120], cooldown: [40, 30, 20],
  castPoint: 0.1, tags: ['buff', 'ultimate'],
  description: '过载奥术核心,立即重置 Q/W 的冷却时间。',
  onCast(w, caster) {
    caster.abilities[0].cooldownUntil = w.time;
    caster.abilities[1].cooldownUntil = w.time;
    applyModifier(w, caster, { key: 'zeno_overload_buff', duration: 4, isBuff: true, stats: { bonusMoveSpeedPct: 0.2 } }, caster.id);
    w.emit({ kind: 'fx', fx: 'overload', pos: V.clone(caster.pos), radius: 150 });
  },
  aiScore(w, caster) {
    // Q 或 W 在冷却且周围有敌人时重置
    const onCd = w.time < caster.abilities[0].cooldownUntil || w.time < caster.abilities[1].cooldownUntil;
    const foes = enemiesIn(w, caster, caster.pos, 650).filter((t) => t.isHero());
    return onCd && foes.length ? { score: 76 } : null;
  },
};

export const ZENO: HeroDef = {
  key: 'zeno', name: '泽诺', title: '奥术工程师', primary: 'int',
  baseStr: 17, gainStr: 1.8, baseAgi: 14, gainAgi: 1.2, baseInt: 26, gainInt: 3.2,
  baseDamage: [21, 27], baseArmor: 1, baseMs: 305, attackRange: 575,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.4, color: '#4fc3f7', glyph: '械',
  abilities: [ZENO_Q, ZENO_W, ZENO_E, ZENO_R], aiRole: 'ganker',
};

// ============ 托尔加·半人马酋长(力量先手/反伤) ============

const DSTRIKE_BONUS = [1.0, 1.6, 2.2, 2.8];

const TORGA_Q: AbilityDef = {
  key: 'torga_strike', name: '双刃重击', maxLevel: 4, targetMode: 'none',
  manaCost: [45, 50, 55, 60], cooldown: [6, 6, 6, 6],
  castPoint: 0.0, tags: ['buff'],
  description: '强化下一次攻击,造成大幅额外伤害(同时自损少量生命)。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, {
      key: 'torga_strike_buff', duration: 8, isBuff: true,
      stats: { bonusDamagePct: DSTRIKE_BONUS[lvl - 1] },
    }, caster.id);
    caster.hp = Math.max(1, caster.hp - 40);
  },
  aiScore(w, caster) {
    return enemiesIn(w, caster, caster.pos, 250).length ? { score: 44 } : null;
  },
};

const STOMP_DMG = [90, 150, 210, 270];

const TORGA_W: AbilityDef = {
  key: 'torga_stomp', name: '践踏', maxLevel: 4, targetMode: 'none',
  manaCost: [85, 95, 105, 115], cooldown: [14, 13, 12, 11],
  castPoint: 0.15, tags: ['stun', 'aoe', 'nuke'],
  description: '猛踏地面,眩晕并伤害周围所有敌人。',
  onCast(w, caster, lvl) {
    damageArea(w, caster, caster.pos, 315, STOMP_DMG[lvl - 1]);
    modifierArea(w, caster, caster.pos, 315, {
      key: 'torga_stomp_stun', duration: 1.5, states: { stunned: true },
    }, 'enemy');
    w.emit({ kind: 'fx', fx: 'stomp', pos: V.clone(caster.pos), radius: 315 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 315).filter((t) => t.isHero());
    return foes.length ? { score: 70 + foes.length * 8 } : null;
  },
};

const RETALIATE = [0.6, 0.9, 1.2, 1.5];

const TORGA_E: AbilityDef = {
  key: 'torga_retaliate', name: '反击', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '受到攻击时反弹伤害给攻击者(被动光环对己也生效)。',
  passiveModifier: (lvl) => ({ key: 'torga_retaliate_passive', isBuff: true, data: { retaliate: RETALIATE[lvl - 1] } }),
};

const STAMPEDE_DUR = [3, 3.5, 4];

const TORGA_R: AbilityDef = {
  key: 'torga_stampede', name: '马蹄飞踏', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [125, 150, 175], cooldown: [70, 60, 50],
  castPoint: 0.0, tags: ['buff', 'aoe', 'ultimate'],
  description: '全队进入飞踏状态,大幅加速并践踏沿途敌人。',
  onCast(w, caster, lvl) {
    modifierArea(w, caster, caster.pos, 1500, {
      key: 'torga_stampede_buff', duration: STAMPEDE_DUR[lvl - 1], isBuff: true,
      stats: { bonusMoveSpeedPct: 0.6 },
    }, 'ally');
    w.emit({ kind: 'fx', fx: 'stampede', pos: V.clone(caster.pos), radius: 1500 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 1400).filter((t) => t.isHero());
    return foes.length ? { score: 64 } : null;
  },
};

export const TORGA: HeroDef = {
  key: 'torga', name: '托尔加', title: '半人马酋长', primary: 'str',
  baseStr: 26, gainStr: 3.3, baseAgi: 14, gainAgi: 1.4, baseInt: 13, gainInt: 1.4,
  baseDamage: [30, 38], baseArmor: 3, baseMs: 300, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.5, color: '#a1887f', glyph: '蹄',
  abilities: [TORGA_Q, TORGA_W, TORGA_E, TORGA_R], aiRole: 'tank',
};

// ============ 赛丽娅·复仇之魂(敏捷辅助/换位) ============

const WAVE_DMG = [70, 110, 150, 190];
const WAVE_ARMOR = [-3, -4, -5, -6];

const SELIA_Q: AbilityDef = {
  key: 'selia_wave', name: '恐怖波动', maxLevel: 4, targetMode: 'point',
  castRange: [800, 800, 800, 800], manaCost: [80, 90, 100, 110], cooldown: [9, 8, 7, 6],
  castPoint: 0.2, tags: ['nuke', 'aoe'],
  description: '释放冲击波,伤害并削减沿途敌人的护甲。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const dir = V.norm(V.sub(pos, caster.pos));
    const hit = new Set<number>();
    for (let d = 100; d <= 800; d += 150) {
      const at = V.add(caster.pos, V.scale(dir, d));
      for (const e of enemiesIn(w, caster, at, 175)) {
        if (hit.has(e.id)) continue;
        hit.add(e.id);
        spellDamage(w, caster, e, WAVE_DMG[lvl - 1]);
        applyModifier(w, e, { key: 'selia_wave_armor', duration: 8, stats: { bonusArmor: WAVE_ARMOR[lvl - 1] } }, caster.id);
      }
    }
    w.emit({ kind: 'fx', fx: 'wave', pos: V.clone(caster.pos), pos2: V.add(caster.pos, V.scale(dir, 800)) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 750).filter((t) => t.isHero());
    if (!foes.length) return null;
    return { score: 58 + foes.length * 8, pos: V.clone(foes[0].pos) };
  },
};

const MISSILE2_DMG = [100, 175, 250, 325];

const SELIA_W: AbilityDef = {
  key: 'selia_missile', name: '魔法飞弹', maxLevel: 4, targetMode: 'unit',
  castRange: [600, 600, 600, 600], manaCost: [100, 115, 130, 145], cooldown: [11, 10, 9, 8],
  castPoint: 0.3, tags: ['nuke', 'stun'],
  description: '飞弹击中目标,造成伤害并眩晕。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    abilityProjectile(w, caster, target, 1000, (world, t, src) => {
      const c = world.getUnit(src) ?? caster;
      spellDamage(world, c, t, MISSILE2_DMG[lvl - 1]);
      applyModifier(world, t, { key: 'selia_missile_stun', duration: 1.4, states: { stunned: true } }, src);
    });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    if (!foes.length) return null;
    foes.sort((a, b) => a.hp - b.hp);
    return { score: 68, targetId: foes[0].id };
  },
};

const VENGE_DMG = [12, 22, 32, 42];

const SELIA_E: AbilityDef = {
  key: 'selia_aura', name: '复仇光环', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '提升周围友军的攻击力。',
  passiveModifier: (lvl) => ({
    key: 'selia_aura_passive', isBuff: true,
    aura: {
      radius: 900, affects: 'ally',
      grant: { key: 'selia_aura_buff', isBuff: true, stats: { bonusDamage: VENGE_DMG[lvl - 1] } },
    },
  }),
};

const SELIA_R: AbilityDef = {
  key: 'selia_swap', name: '灵魂换位', maxLevel: 3, ultimate: true, targetMode: 'unit',
  castRange: [700, 850, 1000], manaCost: [120, 120, 120], cooldown: [60, 45, 30],
  castPoint: 0.0, tags: ['escape', 'ultimate'],
  description: '与目标单位瞬间交换位置(可救友、可拽敌)。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    const a = V.clone(caster.pos);
    const b = V.clone(target.pos);
    blinkTo(w, caster, b);
    blinkTo(w, target, a);
    if (target.team !== caster.team) {
      applyModifier(w, target, { key: 'selia_swap_stun', duration: 0.6, states: { stunned: true } }, caster.id);
    }
    w.emit({ kind: 'fx', fx: 'swap', pos: a, pos2: b });
    void lvl;
  },
  aiScore(w, caster) {
    // 把残血敌方英雄拽回己方塔下
    const foes = enemiesIn(w, caster, caster.pos, (SELIA_R.castRange ?? [700])[0]).filter((t) => t.isHero() && t.hp / t.calc.maxHp < 0.4);
    if (!foes.length) return null;
    return { score: 74, targetId: foes[0].id };
  },
};

export const SELIA: HeroDef = {
  key: 'selia', name: '赛丽娅', title: '复仇之魂', primary: 'agi',
  baseStr: 18, gainStr: 1.9, baseAgi: 22, gainAgi: 2.5, baseInt: 16, gainInt: 1.7,
  baseDamage: [26, 32], baseArmor: 2, baseMs: 295, attackRange: 400,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.4, color: '#7986cb', glyph: '仇',
  abilities: [SELIA_Q, SELIA_W, SELIA_E, SELIA_R], aiRole: 'support',
};

// ============ 米拉·月之祭司(敏捷核心/夜战) ============

const GLAIVE_BOUNCE = [2, 3, 4, 5];
const GLAIVE_PCT = [0.5, 0.6, 0.7, 0.8];

const MIRA_Q: AbilityDef = {
  key: 'mira_glaive', name: '月刃', maxLevel: 4, targetMode: 'passive',
  tags: ['orb'],
  description: '攻击的月刃在敌人间弹射,造成递减伤害。',
  passiveModifier: () => ({ key: 'mira_glaive_passive', isBuff: true }),
  orbOnHit(w, attacker, target, lvl) {
    if (target.isBuilding()) return;
    let dmg = (attacker.calc.dmgMin + attacker.calc.dmgMax) / 2 * GLAIVE_PCT[lvl - 1];
    const visited = new Set<number>([target.id]);
    let from = target;
    for (let i = 0; i < GLAIVE_BOUNCE[lvl - 1]; i++) {
      const next = enemiesIn(w, attacker, from.pos, 500).filter((t) => !visited.has(t.id) && !t.isBuilding())[0];
      if (!next) break;
      visited.add(next.id);
      const { applyDamage } = importCombat();
      applyDamage(w, next, { source: attacker.id, attackType: attacker.calc.attackType, amount: dmg });
      w.emit({ kind: 'fx', fx: 'glaive', pos: V.clone(from.pos), pos2: V.clone(next.pos) });
      from = next;
      dmg *= GLAIVE_PCT[lvl - 1];
    }
  },
};

const BEAM_DMG = [120, 200, 280, 360];

const MIRA_W: AbilityDef = {
  key: 'mira_beam', name: '月光', maxLevel: 4, targetMode: 'unit',
  castRange: [700, 700, 700, 700], manaCost: [90, 105, 120, 135], cooldown: [10, 9, 8, 7],
  castPoint: 0.4, tags: ['nuke'],
  description: '一束月光射向目标,造成魔法伤害。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    spellDamage(w, caster, target, BEAM_DMG[lvl - 1]);
    w.emit({ kind: 'fx', fx: 'moonbeam', pos: V.clone(target.pos) });
  },
  aiScore(w, caster, lvl) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    if (!foes.length) return null;
    foes.sort((a, b) => a.hp - b.hp);
    return { score: 60 + (foes[0].hp < BEAM_DMG[lvl - 1] ? 40 : 0), targetId: foes[0].id };
  },
};

const STARFALL_DMG = [75, 120, 165, 210];

const MIRA_E: AbilityDef = {
  key: 'mira_starfall', name: '陨星', maxLevel: 4, targetMode: 'none',
  manaCost: [85, 100, 115, 130], cooldown: [10, 9, 8, 7],
  castPoint: 0.3, tags: ['nuke', 'aoe'],
  description: '召唤陨星轰击周围所有敌人。',
  onCast(w, caster, lvl) {
    damageArea(w, caster, caster.pos, 600, STARFALL_DMG[lvl - 1]);
    w.emit({ kind: 'fx', fx: 'starfall', pos: V.clone(caster.pos), radius: 600 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 580).filter((t) => t.isHero());
    return foes.length ? { score: 54 + foes.length * 10 } : null;
  },
};

const MOON_EVASION = [0.2, 0.3, 0.4];

const MIRA_R: AbilityDef = {
  key: 'mira_moonlight', name: '月华披风', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [100, 130, 160], cooldown: [60, 55, 50],
  castPoint: 0.1, tags: ['buff', 'ultimate'],
  description: '沐浴月华,自身与周围友军获得高额闪避(夜晚效果更佳)。',
  onCast(w, caster, lvl) {
    const evasion = MOON_EVASION[lvl - 1] + (w.isNight ? 0.15 : 0);
    modifierArea(w, caster, caster.pos, 700, {
      key: 'mira_moonlight_buff', duration: 12, isBuff: true,
      stats: { evasion, bonusMoveSpeedPct: 0.12 },
    }, 'ally');
    w.emit({ kind: 'fx', fx: 'moonlight', pos: V.clone(caster.pos), radius: 700 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length ? { score: 60 } : null;
  },
};

export const MIRA: HeroDef = {
  key: 'mira', name: '米拉', title: '月之祭司', primary: 'agi',
  baseStr: 17, gainStr: 1.8, baseAgi: 23, gainAgi: 2.7, baseInt: 17, gainInt: 1.8,
  baseDamage: [25, 31], baseArmor: 2, baseMs: 300, attackRange: 600,
  projectileSpeed: 1000, bat: 1.7, attackPoint: 0.4, color: '#b39ddb', glyph: '月',
  abilities: [MIRA_Q, MIRA_W, MIRA_E, MIRA_R], aiRole: 'carry',
};

// ============ 格里姆·收割者(力量消耗/处决) ============

const SCYTHE_BASE = [60, 90, 120, 150];
const SCYTHE_MISSING = [0.10, 0.14, 0.18, 0.22];

const GRIM_Q: AbilityDef = {
  key: 'grim_scythe', name: '收割之镰', maxLevel: 4, targetMode: 'unit',
  castRange: [600, 600, 600, 600], manaCost: [95, 110, 125, 140], cooldown: [10, 9, 8, 7],
  castPoint: 0.3, tags: ['nuke'],
  description: '收割目标,生命越低伤害越高。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    const missing = target.calc.maxHp - target.hp;
    const dmg = SCYTHE_BASE[lvl - 1] + missing * SCYTHE_MISSING[lvl - 1];
    spellDamage(w, caster, target, dmg);
    applyModifier(w, target, { key: 'grim_scythe_slow', duration: 2, stats: { bonusMoveSpeedPct: -0.2 } }, caster.id);
    w.emit({ kind: 'fx', fx: 'scythe', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    if (!foes.length) return null;
    foes.sort((a, b) => a.hp - b.hp);
    return { score: 62 + (foes[0].hp / foes[0].calc.maxHp < 0.5 ? 30 : 0), targetId: foes[0].id };
  },
};

const FEAST = [0.04, 0.05, 0.06, 0.07];

const GRIM_W: AbilityDef = {
  key: 'grim_feast', name: '盛宴', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '攻击按目标最大生命的百分比吸取生命。',
  passiveModifier: () => ({ key: 'grim_feast_passive', isBuff: true }),
  orbOnHit(w, attacker, target, lvl) {
    if (target.isBuilding()) return;
    const heal = target.calc.maxHp * FEAST[lvl - 1];
    attacker.hp = Math.min(attacker.calc.maxHp, attacker.hp + heal);
  },
};

const POOL_DPS = [30, 45, 60, 75];

const GRIM_E: AbilityDef = {
  key: 'grim_pool', name: '腐殖沼泽', maxLevel: 4, targetMode: 'point',
  castRange: [700, 700, 700, 700], manaCost: [90, 100, 110, 120], cooldown: [16, 15, 14, 13],
  castPoint: 0.3, tags: ['aoe', 'slow'],
  description: '制造腐殖沼泽,沉默、减速并持续伤害区域内敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const at = V.clone(pos);
    applyModifier(w, caster, {
      key: 'grim_pool_caster', duration: 5, isBuff: true, tickInterval: 0.5,
      onTick(world, u) {
        for (const e of enemiesIn(world, u, at, 300)) {
          spellDamage(world, u, e, POOL_DPS[lvl - 1] / 2);
          applyModifier(world, e, { key: 'grim_pool_debuff', duration: 0.6, states: { silenced: true }, stats: { bonusMoveSpeedPct: -0.3 } }, u.id);
        }
      },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'pool', pos: at, radius: 300, duration: 5 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    if (!foes.length) return null;
    return { score: 52, pos: V.clone(foes[0].pos) };
  },
};

const HARVEST_THRESH = [0.12, 0.16, 0.20];

const GRIM_R: AbilityDef = {
  key: 'grim_harvest', name: '死神收割', maxLevel: 3, ultimate: true, targetMode: 'unit',
  castRange: [550, 600, 650], manaCost: [150, 175, 200], cooldown: [55, 45, 35],
  castPoint: 0.3, tags: ['nuke', 'ultimate'],
  description: '处决目标:生命低于阈值则直接斩杀,否则造成等量于阈值的伤害。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    const threshold = target.calc.maxHp * HARVEST_THRESH[lvl - 1];
    if (target.hp <= threshold && !target.isBuilding() && target.kind !== 'boss') {
      kill(w, target, caster.id);
      w.emit({ kind: 'fx', fx: 'execute', pos: V.clone(target.pos) });
    } else {
      spellDamage(w, caster, target, threshold);
    }
  },
  aiScore(w, caster, lvl) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    if (!foes.length) return null;
    foes.sort((a, b) => a.hp - b.hp);
    const t = foes[0];
    if (t.hp <= t.calc.maxHp * HARVEST_THRESH[lvl - 1]) return { score: 99, targetId: t.id };
    return t.hp / t.calc.maxHp < 0.4 ? { score: 64, targetId: t.id } : null;
  },
};

export const GRIM: HeroDef = {
  key: 'grim', name: '格里姆', title: '收割者', primary: 'str',
  baseStr: 23, gainStr: 2.7, baseAgi: 15, gainAgi: 1.6, baseInt: 18, gainInt: 2.0,
  baseDamage: [27, 33], baseArmor: 2, baseMs: 295, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.45, color: '#78909c', glyph: '镰',
  abilities: [GRIM_Q, GRIM_W, GRIM_E, GRIM_R], aiRole: 'ganker',
};

export const BATCH4 = [DUNCAN, ZENO, TORGA, SELIA, MIRA, GRIM];

// 延迟取 combat 的 applyDamage(避免顶层循环依赖触发顺序问题)
import * as Combat from '../../sim/combat';
function importCombat(): typeof Combat { return Combat; }
void isEnemy;
