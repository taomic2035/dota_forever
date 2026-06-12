/** 雷恩·铁壁:力量先手坦克。锤晕/战吼/顺劈/泰坦之力。 */
import { V } from '../../core/vec2';
import type { AbilityDef } from './types';
import { abilityProjectile, spellDamage, modifierArea, enemiesIn } from '../../sim/abilities';
import { applyModifier } from '../../sim/modifiers';
import { applyDamage, isEnemy } from '../../sim/combat';

const HAMMER_DMG = [100, 175, 250, 325];
const HAMMER_STUN = [1.4, 1.6, 1.8, 2.0];

export const REIN_Q: AbilityDef = {
  key: 'rein_hammer', name: '雷霆战锤', maxLevel: 4, targetMode: 'unit',
  targetTeam: 'enemy',
  castRange: [600, 600, 600, 600], manaCost: [95, 110, 125, 140], cooldown: [12, 11, 10, 9],
  castPoint: 0.35, tags: ['nuke', 'stun'],
  description: '掷出战锤,造成魔法伤害并眩晕目标。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    abilityProjectile(w, caster, target, 1000, (world, t) => {
      spellDamage(world, caster, t, HAMMER_DMG[lvl - 1]);
      applyModifier(world, t, {
        key: 'rein_hammer_stun', duration: HAMMER_STUN[lvl - 1], states: { stunned: true },
      }, caster.id);
    }, 'hammer');
  },
  aiScore(w, caster, lvl) {
    const range = 600;
    const targets = enemiesIn(w, caster, caster.pos, range + 100).filter((t) => t.isHero());
    if (!targets.length) return null;
    targets.sort((a, b) => a.hp - b.hp);
    const t = targets[0];
    return { score: 80 + (t.hp < HAMMER_DMG[lvl - 1] ? 60 : 0), targetId: t.id };
  },
};

const WARCRY_ARMOR = [5, 7, 9, 11];

export const REIN_W: AbilityDef = {
  key: 'rein_warcry', name: '裂石战吼', maxLevel: 4, targetMode: 'none',
  manaCost: [60, 60, 60, 60], cooldown: [16, 16, 16, 16],
  castPoint: 0.2, tags: ['buff', 'aoe'],
  description: '战吼激励周围友军,提升护甲与移速。',
  onCast(w, caster, lvl) {
    modifierArea(w, caster, caster.pos, 700, {
      key: 'rein_warcry_buff', duration: 8, isBuff: true,
      stats: { bonusArmor: WARCRY_ARMOR[lvl - 1], bonusMoveSpeedPct: 0.08 },
    }, 'ally');
    w.emit({ kind: 'fx', fx: 'warcry', pos: V.clone(caster.pos), radius: 700 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 800).filter((t) => t.isHero());
    return foes.length ? { score: 42 } : null;
  },
};

const CLEAVE_PCT = [0.25, 0.35, 0.45, 0.55];

export const REIN_E: AbilityDef = {
  key: 'rein_cleave', name: '巨刃顺劈', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '近战攻击溅射周围敌人。',
  passiveModifier: () => ({ key: 'rein_cleave_passive', isBuff: true }),
  orbOnHit(w, attacker, target, lvl) {
    // 顺劈:对主目标周围 300 范围溅射物理伤害(不受护甲类型矩阵二次衰减,简化为直接物理)
    const splash = (attacker.calc.dmgMin + attacker.calc.dmgMax) / 2 * CLEAVE_PCT[lvl - 1];
    for (const e of w.queryRadius(target.pos, 300, (t) => isEnemy(attacker, t) && t.id !== target.id && !t.isBuilding())) {
      applyDamage(w, e, { source: attacker.id, attackType: attacker.calc.attackType, amount: splash });
    }
  },
};

const TITAN_DMG_PCT = [0.30, 0.45, 0.60];
const TITAN_STR = [10, 20, 30];

export const REIN_R: AbilityDef = {
  key: 'rein_titan', name: '泰坦之力', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [100, 150, 200], cooldown: [80, 75, 70],
  castPoint: 0.2, tags: ['buff'],
  description: '化身泰坦,大幅提升攻击与力量。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, {
      key: 'rein_titan_buff', duration: 25, isBuff: true,
      stats: { bonusDamagePct: TITAN_DMG_PCT[lvl - 1], bonusStr: TITAN_STR[lvl - 1] },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'titan', pos: V.clone(caster.pos), radius: 200 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    if (!foes.length || caster.hp / caster.calc.maxHp < 0.35) return null;
    return { score: 66 };
  },
};

export const REIN_ABILITIES = [REIN_Q, REIN_W, REIN_E, REIN_R];
