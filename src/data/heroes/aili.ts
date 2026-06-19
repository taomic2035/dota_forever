/** 疾风射手·艾莉:敏捷远程核心。霜寒之箭/风行/精准光环/百步穿杨。 */
import { V } from '../../core/vec2';
import type { AbilityDef } from './types';
import { enemiesIn, spellDamage, hasShard } from '../../sim/abilities';
import { applyModifier } from '../../sim/modifiers';

const SHARD_SHATTER = [60, 90, 120, 150];

const FROST_SLOW = [-0.10, -0.20, -0.30, -0.40];

export const AILI_Q: AbilityDef = {
  key: 'aili_frost', name: '霜寒之箭', maxLevel: 4, targetMode: 'passive',
  tags: ['orb', 'slow'],
  shard: { desc: '神识:对已处于减速状态的敌人,寒霜碎裂造成额外魔法伤害(60/90/120/150)。' },
  description: '箭矢附着寒霜,攻击减速敌人。',
  passiveModifier: () => ({ key: 'aili_frost_passive', isBuff: true }),
  orbOnHit(w, attacker, target, lvl) {
    if (target.isBuilding()) return;
    // 神识:命中前若目标已减速,则触发寒霜碎裂额外魔法伤害
    const shatter = hasShard(attacker) && target.modifiers.some((m) => (m.def.stats?.bonusMoveSpeedPct ?? 0) < 0);
    applyModifier(w, target, {
      key: 'aili_frost_slow', duration: 1.5,
      stats: { bonusMoveSpeedPct: FROST_SLOW[lvl - 1] },
    }, attacker.id);
    if (shatter) spellDamage(w, attacker, target, SHARD_SHATTER[lvl - 1]);
  },
};

const WIND_DUR = [2.5, 3.0, 3.5, 4.0];

export const AILI_W: AbilityDef = {
  key: 'aili_wind', name: '疾风步', maxLevel: 4, targetMode: 'none',
  manaCost: [100, 100, 100, 100], cooldown: [15, 14, 13, 12],
  castPoint: 0.0, tags: ['escape', 'buff'],
  description: '化作疾风,期间闪避所有普通攻击并大幅加速。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, {
      key: 'aili_wind_buff', duration: WIND_DUR[lvl - 1], isBuff: true,
      stats: { evasion: 1.0, bonusMoveSpeedPct: 0.5 },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'windrun', pos: V.clone(caster.pos), radius: 120 });
  },
  aiScore(w, caster) {
    const danger = enemiesIn(w, caster, caster.pos, 500).length;
    if (caster.hp / caster.calc.maxHp < 0.45 && danger > 0) return { score: 92 };
    return null;
  },
};

const PRECISION_PCT = [0.06, 0.12, 0.18, 0.24];

export const AILI_E: AbilityDef = {
  key: 'aili_precision', name: '精准光环', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '提升周围友方英雄的攻击力。',
  passiveModifier: (lvl) => ({
    key: 'aili_precision_aura', isBuff: true,
    aura: {
      radius: 900, affects: 'allyHero',
      grant: { key: 'aili_precision_buff', stats: { bonusDamagePct: PRECISION_PCT[lvl - 1] }, isBuff: true },
    },
  }),
};

const MARKSMAN_AGI = [12, 24, 36];
const MARKSMAN_SC_RANGE = [100, 125, 150];

export const AILI_R: AbilityDef = {
  key: 'aili_marksman', name: '百步穿杨', maxLevel: 3, ultimate: true, targetMode: 'passive',
  scepter: { desc: '神杖:射术更臻极致,额外增加 100/125/150 攻击射程,令天下皆在箭矢射程之内。' },
  tags: ['buff', 'ultimate'],
  description: '射术臻于化境,大幅提升敏捷。',
  passiveModifier: (lvl) => ({
    key: 'aili_marksman_passive', isBuff: true,
    stats: { bonusAgi: MARKSMAN_AGI[lvl - 1] },
  }),
  scepterPassive: (lvl) => ({
    key: 'aili_marksman_sc_range', isBuff: true,
    stats: { bonusAttackRange: MARKSMAN_SC_RANGE[lvl - 1] },
  }),
};

export const AILI_ABILITIES = [AILI_Q, AILI_W, AILI_E, AILI_R];
