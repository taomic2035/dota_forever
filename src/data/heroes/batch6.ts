/** 第六批 6 名原创英雄:莱恩/莫芬/布罗格/薇芙/祖卡/塞德里克。 */
import { V } from '../../core/vec2';
import type { AbilityDef, HeroDef } from './types';
import {
  damageArea, modifierArea, enemiesIn, alliesIn, spellDamage, blinkTo, createIllusion, summonUnit,
} from '../../sim/abilities';
import { applyModifier, hasModifier } from '../../sim/modifiers';
import { heroAttributes } from '../../sim/hero';
import type { Unit } from '../../sim/unit';

// ============ 莱恩·奥术猎手(智力连招爆发) ============

const SKEWER_DMG = [90, 150, 210, 270];

const LAIN_Q: AbilityDef = {
  key: 'lain_skewer', name: '贯穿之刺', maxLevel: 4, targetMode: 'point',
  castRange: [800, 800, 800, 800], manaCost: [90, 100, 110, 120], cooldown: [11, 10, 9, 8],
  castPoint: 0.3, tags: ['nuke', 'stun'],
  description: '掷出长矛贯穿直线敌人,造成伤害并眩晕。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const dir = V.norm(V.sub(pos, caster.pos));
    const hit = new Set<number>();
    for (let d = 100; d <= 800; d += 130) {
      const at = V.add(caster.pos, V.scale(dir, d));
      for (const e of enemiesIn(w, caster, at, 130)) {
        if (hit.has(e.id)) continue;
        hit.add(e.id);
        spellDamage(w, caster, e, SKEWER_DMG[lvl - 1]);
        applyModifier(w, e, { key: 'lain_skewer_stun', duration: 1.6, states: { stunned: true } }, caster.id);
      }
    }
    w.emit({ kind: 'fx', fx: 'skewer', pos: V.clone(caster.pos), pos2: V.add(caster.pos, V.scale(dir, 800)) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 750).filter((t) => t.isHero());
    if (!foes.length) return null;
    return { score: 66, pos: V.clone(foes[0].pos) };
  },
};

const NOVA_DMG = [100, 160, 220, 280];

const LAIN_W: AbilityDef = {
  key: 'lain_nova', name: '奥术新星', maxLevel: 4, targetMode: 'point',
  castRange: [700, 700, 700, 700], manaCost: [100, 115, 130, 145], cooldown: [10, 9, 8, 7],
  castPoint: 0.4, tags: ['nuke', 'aoe'],
  description: '引爆奥术新星,伤害范围内敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    damageArea(w, caster, pos, 350, NOVA_DMG[lvl - 1]);
    w.emit({ kind: 'fx', fx: 'arcanenova', pos: V.clone(pos), radius: 350 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    if (!foes.length) return null;
    return { score: 56 + foes.length * 10, pos: V.clone(foes[0].pos) };
  },
};

const LAIN_E: AbilityDef = {
  key: 'lain_flux', name: '奥术涌流', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '强化施法者:提升法术增强与法力回复。',
  passiveModifier: (lvl) => ({
    key: 'lain_flux_passive', isBuff: true,
    stats: { spellAmp: 0.04 + lvl * 0.03, bonusMpRegen: 0.5 + lvl * 0.5 },
  }),
};

const BOLT_DMG = [400, 600, 800];

const LAIN_R: AbilityDef = {
  key: 'lain_deathbolt', name: '死亡之雷', maxLevel: 3, ultimate: true, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [700, 750, 800], manaCost: [200, 350, 500], cooldown: [50, 40, 30],
  castPoint: 0.4, tags: ['nuke', 'ultimate'],
  description: '凝聚毁灭之雷劈向目标,造成巨额魔法伤害。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    spellDamage(w, caster, target, BOLT_DMG[lvl - 1]);
    w.emit({ kind: 'fx', fx: 'deathbolt', pos: V.clone(target.pos) });
  },
  aiScore(w, caster, lvl) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    if (!foes.length) return null;
    foes.sort((a, b) => a.hp - b.hp);
    return { score: 70 + (foes[0].hp < BOLT_DMG[lvl - 1] ? 50 : 0), targetId: foes[0].id };
  },
};

export const LAIN: HeroDef = {
  key: 'lain', name: '莱恩', title: '奥术猎手', primary: 'int',
  baseStr: 18, gainStr: 1.9, baseAgi: 16, gainAgi: 1.6, baseInt: 25, gainInt: 3.0,
  baseDamage: [24, 30], baseArmor: 1, baseMs: 295, attackRange: 600,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.4, color: '#f06292', glyph: '术',
  abilities: [LAIN_Q, LAIN_W, LAIN_E, LAIN_R], aiRole: 'ganker',
};

// ============ 莫芬·流形海妖(敏捷流形) ============

const WAVE_DMG = [90, 140, 190, 240];

const MORFIN_Q: AbilityDef = {
  key: 'morfin_wave', name: '波形冲击', maxLevel: 4, targetMode: 'point',
  castRange: [700, 800, 900, 1000], manaCost: [70, 80, 90, 100], cooldown: [10, 9, 8, 7],
  castPoint: 0.0, tags: ['nuke', 'escape', 'aoe'],
  description: '化作水流冲向目标点,撞伤沿途敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const from = V.clone(caster.pos);
    blinkTo(w, caster, pos);
    const dir = V.norm(V.sub(pos, from));
    const len = V.dist(from, pos);
    const hit = new Set<number>();
    for (let d = 0; d <= len; d += 140) {
      for (const e of enemiesIn(w, caster, V.add(from, V.scale(dir, d)), 160)) {
        if (hit.has(e.id)) continue;
        hit.add(e.id);
        spellDamage(w, caster, e, WAVE_DMG[lvl - 1]);
      }
    }
    w.emit({ kind: 'fx', fx: 'waveform', pos: from, pos2: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 900).filter((t) => t.isHero());
    if (!foes.length) return null;
    return { score: 58, pos: V.clone(foes[0].pos) };
  },
};

const ADAPT_BASE = [80, 140, 200, 260];

const MORFIN_W: AbilityDef = {
  key: 'morfin_adapt', name: '自适打击', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [600, 600, 600, 600], manaCost: [90, 100, 110, 120], cooldown: [9, 8, 7, 6],
  castPoint: 0.2, tags: ['nuke', 'stun'],
  description: '依据力量与敏捷的高低自适应:力量高则强眩晕,敏捷高则高伤害。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    const a = heroAttributes(caster);
    if (a.str >= a.agi) {
      // 力量主导:强眩晕 + 基础伤害
      spellDamage(w, caster, target, ADAPT_BASE[lvl - 1] * 0.6);
      applyModifier(w, target, { key: 'morfin_adapt_stun', duration: 1 + lvl * 0.4, states: { stunned: true } }, caster.id);
    } else {
      // 敏捷主导:高伤害 + 短眩晕
      spellDamage(w, caster, target, ADAPT_BASE[lvl - 1] * 1.4);
      applyModifier(w, target, { key: 'morfin_adapt_stun', duration: 0.5, states: { stunned: true } }, caster.id);
    }
    w.emit({ kind: 'fx', fx: 'adapt', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    if (!foes.length) return null;
    foes.sort((a, b) => a.hp - b.hp);
    return { score: 66, targetId: foes[0].id };
  },
};

const MORFIN_E: AbilityDef = {
  key: 'morfin_morph', name: '流形之躯', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '流形之躯同时强化力量与敏捷,并提升攻击速度。',
  passiveModifier: (lvl) => ({
    key: 'morfin_morph_passive', isBuff: true,
    stats: { bonusStr: lvl * 3, bonusAgi: lvl * 3, bonusAttackSpeed: lvl * 0.05 },
  }),
};

const REPLICATE_OUT = [0.5, 0.65, 0.8];

const MORFIN_R: AbilityDef = {
  key: 'morfin_replicate', name: '潮汐复体', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [100, 150, 200], cooldown: [50, 40, 30],
  castPoint: 0.1, tags: ['buff', 'ultimate'],
  description: '分裂出一个强力复体协同作战,并短暂获得闪避。',
  onCast(w, caster, lvl) {
    createIllusion(w, caster, 1, REPLICATE_OUT[lvl - 1], 2.0, 20);
    applyModifier(w, caster, { key: 'morfin_replicate_buff', duration: 2, isBuff: true, stats: { evasion: 0.5 } }, caster.id);
    w.emit({ kind: 'fx', fx: 'replicate', pos: V.clone(caster.pos), radius: 120 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 800).filter((t) => t.isHero());
    return foes.length ? { score: 66 } : null;
  },
};

export const MORFIN: HeroDef = {
  key: 'morfin', name: '莫芬', title: '流形海妖', primary: 'agi',
  baseStr: 19, gainStr: 2.3, baseAgi: 21, gainAgi: 2.6, baseInt: 15, gainInt: 1.5,
  baseDamage: [25, 31], baseArmor: 2, baseMs: 295, attackRange: 350,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.4, color: '#4db6ac', glyph: '潮',
  abilities: [MORFIN_Q, MORFIN_W, MORFIN_E, MORFIN_R], aiRole: 'carry',
};

// ============ 布罗格·棘背魔(力量肉盾) ============

const QUILL_DMG = [70, 110, 150, 190];

const BROG_Q: AbilityDef = {
  key: 'brog_quill', name: '棘刺喷射', maxLevel: 4, targetMode: 'none',
  manaCost: [30, 40, 50, 60], cooldown: [3, 3, 3, 3],
  castPoint: 0.1, tags: ['nuke', 'aoe'],
  description: '向四周喷射棘刺,连续命中同一目标伤害递增。',
  onCast(w, caster, lvl) {
    for (const e of enemiesIn(w, caster, caster.pos, 650)) {
      const stacks = e.modifiers.filter((m) => m.key === 'brog_quill_stack').length;
      spellDamage(w, caster, e, QUILL_DMG[lvl - 1] + stacks * 30);
      applyModifier(w, e, { key: 'brog_quill_stack', duration: 9, stackable: true }, caster.id);
    }
    addWarpath(w, caster);
    w.emit({ kind: 'fx', fx: 'quill', pos: V.clone(caster.pos), radius: 650 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 650).filter((t) => t.isHero());
    return foes.length ? { score: 52 + foes.length * 8 } : null;
  },
};

const BRISTLE_REDUC = [0.1, 0.16, 0.22, 0.28];

const BROG_W: AbilityDef = {
  key: 'brog_bristle', name: '棘甲护身', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '坚硬的棘甲减免受到的所有伤害。',
  passiveModifier: (lvl) => ({
    key: 'brog_bristle_passive', isBuff: true,
    stats: { incomingDamageReduction: BRISTLE_REDUC[lvl - 1] },
  }),
};

const GOO_SLOW = [-0.15, -0.22, -0.29, -0.36];
const GOO_ARMOR = [-2, -3, -4, -5];

const BROG_E: AbilityDef = {
  key: 'brog_goo', name: '黏液', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [550, 550, 550, 550], manaCost: [40, 45, 50, 55], cooldown: [6, 6, 6, 6],
  castPoint: 0.2, tags: ['slow'],
  description: '泼洒黏液,降低目标护甲与移速(可叠加)。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    applyModifier(w, target, {
      key: 'brog_goo_debuff', duration: 5,
      stats: { bonusMoveSpeedPct: GOO_SLOW[lvl - 1], bonusArmor: GOO_ARMOR[lvl - 1] },
    }, caster.id);
    addWarpath(w, caster);
    w.emit({ kind: 'fx', fx: 'goo', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 550).filter((t) => t.isHero());
    if (!foes.length) return null;
    return { score: 48, targetId: foes[0].id };
  },
};

const WARPATH_DMG = [12, 18, 24];

const BROG_R: AbilityDef = {
  key: 'brog_warpath', name: '战意', maxLevel: 3, ultimate: true, targetMode: 'passive',
  tags: ['buff', 'ultimate'],
  description: '每次施法叠加战意:提升攻击力与移速(持续叠加,数秒后衰减)。',
  passiveModifier: (lvl) => ({ key: 'brog_warpath_passive', isBuff: true, data: { perStack: WARPATH_DMG[lvl - 1] } }),
};

export const BROG: HeroDef = {
  key: 'brog', name: '布罗格', title: '棘背魔', primary: 'str',
  baseStr: 24, gainStr: 3.0, baseAgi: 14, gainAgi: 1.5, baseInt: 16, gainInt: 1.7,
  baseDamage: [25, 31], baseArmor: 2, baseMs: 290, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.45, color: '#9ccc65', glyph: '棘',
  abilities: [BROG_Q, BROG_W, BROG_E, BROG_R], aiRole: 'tank',
};

// ============ 薇芙·编织者(敏捷游走核心) ============

const SWARM_DPS = [20, 30, 40, 50];

const WIF_Q: AbilityDef = {
  key: 'wif_swarm', name: '虫群', maxLevel: 4, targetMode: 'point',
  castRange: [800, 800, 800, 800], manaCost: [80, 90, 100, 110], cooldown: [16, 15, 14, 13],
  castPoint: 0.2, tags: ['nuke', 'aoe'],
  description: '释放虫群撕咬一片区域的敌人,持续削减护甲并造成伤害。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const at = V.clone(pos);
    applyModifier(w, caster, {
      key: 'wif_swarm_caster', duration: 4, isBuff: true, tickInterval: 0.5,
      onTick(world, u) {
        for (const e of enemiesIn(world, u, at, 300)) {
          spellDamage(world, u, e, SWARM_DPS[lvl - 1] / 2);
          applyModifier(world, e, { key: 'wif_swarm_armor', duration: 1, stats: { bonusArmor: -2 } }, u.id);
        }
      },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'swarm', pos: at, radius: 300, duration: 4 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 750).filter((t) => t.isHero());
    if (!foes.length) return null;
    return { score: 50, pos: V.clone(foes[0].pos) };
  },
};

const SHUKUCHI_DUR = [3, 3.5, 4, 4.5];

const WIF_W: AbilityDef = {
  key: 'wif_shukuchi', name: '缩地', maxLevel: 4, targetMode: 'none',
  manaCost: [40, 40, 40, 40], cooldown: [12, 10, 8, 6],
  castPoint: 0.0, tags: ['escape', 'buff'],
  description: '隐身并极速移动,撞到敌人会现身。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, {
      key: 'wif_shukuchi_buff', duration: SHUKUCHI_DUR[lvl - 1], isBuff: true,
      states: { invisible: true }, stats: { bonusMoveSpeedPct: 0.5 },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'shukuchi', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    return caster.hp / caster.calc.maxHp < 0.4 && enemiesIn(w, caster, caster.pos, 400).length
      ? { score: 84 } : null;
  },
};

const GEMINATE_CD = [5, 4, 3, 2];

const WIF_E: AbilityDef = {
  key: 'wif_geminate', name: '双重攻击', maxLevel: 4, targetMode: 'passive',
  tags: ['orb'],
  description: '攻击有时会附带一次额外打击。',
  passiveModifier: () => ({ key: 'wif_geminate_passive', isBuff: true }),
  orbOnHit(w, attacker, target, lvl) {
    if (target.isBuilding()) return;
    if (hasModifier(attacker, 'wif_geminate_cd')) return;
    // 追加一次攻击伤害
    const extra = (attacker.calc.dmgMin + attacker.calc.dmgMax) / 2;
    const { applyDamage } = importCombat();
    applyDamage(w, target, { source: attacker.id, attackType: attacker.calc.attackType, amount: extra });
    applyModifier(w, attacker, { key: 'wif_geminate_cd', duration: GEMINATE_CD[lvl - 1], isBuff: true }, attacker.id);
  },
};

const TIMELAPSE_HEAL = [0.35, 0.45, 0.55];

const WIF_R: AbilityDef = {
  key: 'wif_timelapse', name: '时光倒流', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [100, 100, 100], cooldown: [60, 50, 40],
  castPoint: 0.0, tags: ['escape', 'heal', 'ultimate'],
  description: '回溯时光:大幅恢复生命,瞬间撤回安全位置并短暂免疫魔法。',
  onCast(w, caster, lvl) {
    caster.hp = Math.min(caster.calc.maxHp, caster.hp + caster.calc.maxHp * TIMELAPSE_HEAL[lvl - 1]);
    // 朝己方基地撤回一段
    const fountain = [...w.units.values()].find((b) => b.buildingKind === 'fountain' && b.team === caster.team);
    if (fountain) {
      const dir = V.norm(V.sub(fountain.pos, caster.pos));
      blinkTo(w, caster, V.add(caster.pos, V.scale(dir, 600)));
    }
    applyModifier(w, caster, { key: 'wif_timelapse_buff', duration: 1, isBuff: true, states: { magicImmune: true } }, caster.id);
    w.emit({ kind: 'fx', fx: 'timelapse', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    return caster.hp / caster.calc.maxHp < 0.3 ? { score: 90 } : null;
  },
};

export const WIF: HeroDef = {
  key: 'wif', name: '薇芙', title: '编织者', primary: 'agi',
  baseStr: 16, gainStr: 1.6, baseAgi: 22, gainAgi: 2.8, baseInt: 15, gainInt: 1.5,
  baseDamage: [24, 30], baseArmor: 1, baseMs: 300, attackRange: 425,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.4, color: '#4dd0e1', glyph: '织',
  abilities: [WIF_Q, WIF_W, WIF_E, WIF_R], aiRole: 'carry',
};

// ============ 祖卡·巫医萨满(智力控制/召唤) ============

const HEX_DUR = [2, 2.75, 3.5, 4.25];

const ZUKA_Q: AbilityDef = {
  key: 'zuka_hex', name: '妖术', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [550, 600, 650, 700], manaCost: [110, 120, 130, 140], cooldown: [16, 14, 12, 10],
  castPoint: 0.3, tags: ['stun'],
  description: '将目标变为无害之物:无法攻击、施法并大幅减速。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    applyModifier(w, target, {
      key: 'zuka_hex_debuff', duration: HEX_DUR[lvl - 1],
      states: { disarmed: true, silenced: true }, stats: { bonusMoveSpeedPct: -0.55 },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'hex', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    if (!foes.length) return null;
    foes.sort((a, b) => b.calc.dmgMax - a.calc.dmgMax); // 优先变最强输出
    return { score: 72, targetId: foes[0].id };
  },
};

const SHACKLE_DPS = [80, 120, 160, 200];

const ZUKA_W: AbilityDef = {
  key: 'zuka_shackle', name: '锁缚', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [500, 500, 500, 500], manaCost: [100, 110, 120, 130], cooldown: [14, 13, 12, 11],
  castPoint: 0.2, tags: ['stun', 'channel', 'nuke'],
  description: '引导锁缚目标,使其无法行动并持续受到伤害。',
  channel: {
    duration: () => 3,
    tickInterval: 0.4,
    onChannelTick(w, caster, lvl) {
      const t = caster.channeling?.targetId ? w.getUnit(caster.channeling.targetId) : undefined;
      if (!t || !t.alive || V.dist(caster.pos, t.pos) > 650) {
        if (caster.channeling) caster.channeling.until = -Infinity;
        return;
      }
      spellDamage(w, caster, t, SHACKLE_DPS[lvl - 1] * 0.4);
      applyModifier(w, t, { key: 'zuka_shackle_stun', duration: 0.5, states: { stunned: true } }, caster.id);
    },
  },
  onCast(w, caster, _lvl, _pos, target) {
    if (target) applyModifier(w, target, { key: 'zuka_shackle_stun', duration: 0.5, states: { stunned: true } }, caster.id);
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 500).filter((t) => t.isHero());
    if (!foes.length) return null;
    foes.sort((a, b) => a.hp - b.hp);
    return { score: 64, targetId: foes[0].id };
  },
};

const WARD_COUNT = [2, 3, 4, 5];

const ZUKA_E: AbilityDef = {
  key: 'zuka_wards', name: '毒蛇守卫', maxLevel: 4, targetMode: 'point',
  castRange: [600, 600, 600, 600], manaCost: [120, 130, 140, 150], cooldown: [30, 28, 26, 24],
  castPoint: 0.3, tags: ['buff'],
  description: '召唤数个毒蛇守卫攻击附近敌人(无法移动,持续 35 秒)。',
  onCast(w, caster, lvl, pos) {
    const at = pos ?? caster.pos;
    const n = WARD_COUNT[lvl - 1];
    for (let i = 0; i < n; i++) {
      const off = { x: Math.cos((i / n) * Math.PI * 2) * 100, y: Math.sin((i / n) * Math.PI * 2) * 100 };
      const ward = summonUnit(w, caster, {
        name: '毒蛇守卫', hp: 100 + lvl * 30, dmg: [22 + lvl * 6, 28 + lvl * 6],
        armor: 0, ms: 0, range: 500, bat: 1.4, duration: 35,
        attackType: 'pierce', armorType: 'light',
      }, V.add(at, off), false);
      ward.base.moveSpeed = 0; // 固定不动
      ward.order = { type: 'hold' };
    }
    w.emit({ kind: 'fx', fx: 'wards', pos: V.clone(at), radius: 150 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length ? { score: 46, pos: V.clone(foes[0].pos) } : null;
  },
};

const DEATHWARD_DPS = [120, 180, 240];

const ZUKA_R: AbilityDef = {
  key: 'zuka_deathward', name: '死亡守卫', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [200, 300, 400], cooldown: [100, 90, 80],
  castPoint: 0.3, tags: ['channel', 'nuke', 'ultimate'],
  description: '引导召唤死亡守卫,持续轰击最近的敌方英雄 5 秒。',
  channel: {
    duration: () => 5,
    tickInterval: 0.3,
    onChannelTick(w, caster, lvl) {
      const foes = enemiesIn(w, caster, caster.pos, 900).filter((t) => t.isHero());
      if (!foes.length) return;
      foes.sort((a, b) => V.distSq(caster.pos, a.pos) - V.distSq(caster.pos, b.pos));
      spellDamage(w, caster, foes[0], DEATHWARD_DPS[lvl - 1] * 0.3);
      w.emit({ kind: 'fx', fx: 'deathward', pos: V.clone(caster.pos), pos2: V.clone(foes[0].pos) });
    },
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 800).filter((t) => t.isHero());
    return foes.length ? { score: 80 } : null;
  },
};

export const ZUKA: HeroDef = {
  key: 'zuka', name: '祖卡', title: '巫医萨满', primary: 'int',
  baseStr: 19, gainStr: 2.2, baseAgi: 14, gainAgi: 1.4, baseInt: 22, gainInt: 2.7,
  baseDamage: [24, 32], baseArmor: 2, baseMs: 290, attackRange: 500,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.4, color: '#aed581', glyph: '巫',
  abilities: [ZUKA_Q, ZUKA_W, ZUKA_E, ZUKA_R], aiRole: 'support',
};

// ============ 塞德里克·守护树灵(力量辅助) ============

const SEED_VAL = [14, 20, 26, 32];

const CEDRIC_Q: AbilityDef = {
  key: 'cedric_seed', name: '寄生之种', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [600, 600, 600, 600], manaCost: [80, 90, 100, 110], cooldown: [12, 11, 10, 9],
  castPoint: 0.2, tags: ['nuke', 'heal', 'slow'],
  description: '种下寄生种子:对敌持续伤害+减速,对友持续治疗。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    const ally = target.team === caster.team;
    applyModifier(w, target, {
      key: 'cedric_seed_mod', duration: 5,
      stats: ally ? {} : { bonusMoveSpeedPct: -0.2 },
      tickInterval: 0.5,
      onTick(world, u) {
        if (ally) u.hp = Math.min(u.calc.maxHp, u.hp + SEED_VAL[lvl - 1]);
        else spellDamage(world, caster, u, SEED_VAL[lvl - 1]);
      },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'seed', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    if (!foes.length) return null;
    return { score: 50, targetId: foes[0].id };
  },
};

const ARMOR_VAL = [60, 110, 160, 210];

const CEDRIC_W: AbilityDef = {
  key: 'cedric_armor', name: '生命护甲', maxLevel: 4, targetMode: 'unit', targetTeam: 'allyOrSelf',
  castRange: [99999, 99999, 99999, 99999], manaCost: [50, 60, 70, 80], cooldown: [18, 16, 14, 12],
  castPoint: 0.0, tags: ['heal', 'buff'],
  description: '为任意友军(全图)套上生命护甲:吸收伤害并提供护甲。',
  onCast(w, caster, lvl, _pos, target) {
    const t = target && target.team === caster.team ? target : caster;
    const m = applyModifier(w, t, {
      key: 'cedric_armor_buff', duration: 15, isBuff: true, stats: { bonusArmor: 3 + lvl },
    }, caster.id);
    m.data!.shield = ARMOR_VAL[lvl - 1];
    w.emit({ kind: 'fx', fx: 'livingarmor', pos: V.clone(t.pos) });
  },
  aiScore(w, caster, lvl) {
    const allies = alliesIn(w, caster, caster.pos, 1500).filter((t) => t.isHero() && t.hp / t.calc.maxHp < 0.6);
    if (!allies.length) return null;
    return { score: 54, targetId: allies[0].id };
    void lvl;
  },
};

const CEDRIC_E: AbilityDef = {
  key: 'cedric_guise', name: '丛林匿踪', maxLevel: 4, targetMode: 'none',
  manaCost: [40, 40, 40, 40], cooldown: [10, 9, 8, 7],
  castPoint: 0.0, tags: ['escape', 'buff'],
  description: '融入丛林:脱战后隐身并提升移速。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, {
      key: 'cedric_guise_buff', duration: 6, isBuff: true,
      states: { invisible: true }, stats: { bonusMoveSpeedPct: 0.1 + lvl * 0.03 },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'guise', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    return caster.hp / caster.calc.maxHp < 0.35 && enemiesIn(w, caster, caster.pos, 500).length
      ? { score: 70 } : null;
  },
};

const OVERGROWTH_DUR = [3, 4, 5];

const CEDRIC_R: AbilityDef = {
  key: 'cedric_overgrowth', name: '藤蔓缠绕', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [150, 175, 200], cooldown: [70, 65, 60],
  castPoint: 0.3, tags: ['stun', 'aoe', 'ultimate'],
  description: '召唤藤蔓缠绕周围所有敌人,使其无法移动并持续受伤。',
  onCast(w, caster, lvl) {
    modifierArea(w, caster, caster.pos, 700, {
      key: 'cedric_overgrowth_root', duration: OVERGROWTH_DUR[lvl - 1],
      states: { rooted: true },
      tickInterval: 1,
      onTick(world, u) { spellDamage(world, caster, u, 40 + lvl * 20); },
    }, 'enemy');
    w.emit({ kind: 'fx', fx: 'overgrowth', pos: V.clone(caster.pos), radius: 700 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 650).filter((t) => t.isHero());
    if (foes.length < 2) return null;
    return { score: 86 };
  },
};

export const CEDRIC: HeroDef = {
  key: 'cedric', name: '塞德里克', title: '守护树灵', primary: 'str',
  baseStr: 23, gainStr: 2.7, baseAgi: 13, gainAgi: 1.3, baseInt: 18, gainInt: 2.1,
  baseDamage: [26, 34], baseArmor: 3, baseMs: 290, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.45, color: '#66bb6a', glyph: '树',
  abilities: [CEDRIC_Q, CEDRIC_W, CEDRIC_E, CEDRIC_R], aiRole: 'support',
};

export const BATCH6 = [LAIN, MORFIN, BROG, WIF, ZUKA, CEDRIC];

/** 布罗格战意:每次施法叠加攻击力与移速(8 秒衰减),需已学大招。 */
function addWarpath(w: import('../../sim/world').World, caster: Unit): void {
  const r = caster.abilities[3];
  if (!r || r.level <= 0) return;
  const per = [12, 18, 24][r.level - 1];
  applyModifier(w, caster, {
    key: 'brog_warpath_stack', duration: 8, stackable: true, isBuff: true,
    stats: { bonusDamage: per, bonusMoveSpeedPct: 0.03 },
  }, caster.id);
}

import * as Combat from '../../sim/combat';
function importCombat(): typeof Combat { return Combat; }
