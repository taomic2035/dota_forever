/** 第十三批 6 名原创英雄:葛朗/斯凯/杰洛/瓦克/冰漪/马尔。 */
import { V, type Vec2 } from '../../core/vec2';
import type { AbilityDef, HeroDef } from './types';
import {
  damageArea, modifierArea, enemiesIn, spellDamage,
} from '../../sim/abilities';
import { applyModifier, hasModifier } from '../../sim/modifiers';
import type { Unit } from '../../sim/unit';
import type { World } from '../../sim/world';

function aftershock(w: World, caster: Unit): void {
  modifierArea(w, caster, caster.pos, 300, { key: 'ear_aftershock', duration: 0.5, states: { stunned: true } }, 'enemy');
}

// ============ 葛朗·撼地者(力量先手) ============

const FISSURE_DMG = [100, 160, 220, 280];
const FISSURE_STUN = [1.2, 1.4, 1.6, 1.8];

const EAR_Q: AbilityDef = {
  key: 'ear_fissure', name: '沟壑', maxLevel: 4, targetMode: 'point',
  castRange: [700, 700, 700, 700], manaCost: [110, 120, 130, 140], cooldown: [12, 11, 10, 9],
  castPoint: 0.3, tags: ['stun', 'nuke', 'aoe'],
  description: '撕开一道沟壑,震晕并重创直线上的敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const dir = V.norm(V.sub(pos, caster.pos));
    const hit = new Set<number>();
    for (let d = 120; d <= 700; d += 130) {
      for (const e of enemiesIn(w, caster, V.add(caster.pos, V.scale(dir, d)), 150)) {
        if (hit.has(e.id)) continue;
        hit.add(e.id);
        spellDamage(w, caster, e, FISSURE_DMG[lvl - 1]);
        applyModifier(w, e, { key: 'ear_fissure_stun', duration: FISSURE_STUN[lvl - 1], states: { stunned: true } }, caster.id);
      }
    }
    aftershock(w, caster);
    w.emit({ kind: 'fx', fx: 'fissure', pos: V.clone(caster.pos), pos2: V.add(caster.pos, V.scale(dir, 700)) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length ? { score: 60, pos: V.clone(foes[0].pos) } : null;
  },
};

const TOTEM_DMG = [80, 160, 240, 320];

const EAR_W: AbilityDef = {
  key: 'ear_totem', name: '强化图腾', maxLevel: 4, targetMode: 'none',
  manaCost: [40, 45, 50, 55], cooldown: [5, 5, 5, 5],
  castPoint: 0.0, tags: ['buff'],
  description: '强化下一次攻击,造成大幅额外伤害。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, { key: 'ear_totem_buff', duration: 8, isBuff: true, stats: { bonusDamage: TOTEM_DMG[lvl - 1] } }, caster.id);
    w.emit({ kind: 'fx', fx: 'totem', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 300).filter((t) => t.isHero());
    return foes.length && !hasModifier(caster, 'ear_totem_buff') ? { score: 40 } : null;
  },
};

const EAR_E: AbilityDef = {
  key: 'ear_earth', name: '大地之力', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '大地的坚韧:提升护甲与生命。',
  passiveModifier: (lvl) => ({ key: 'ear_earth_passive', isBuff: true, stats: { bonusArmor: lvl * 1.5, bonusHp: lvl * 80 } }),
};

const ECHO_BASE = [120, 180, 240];
const ECHO_PER = [40, 55, 70];

const EAR_R: AbilityDef = {
  key: 'ear_echo', name: '回音击', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [150, 200, 250], cooldown: [120, 110, 100],
  castPoint: 0.3, tags: ['nuke', 'aoe', 'ultimate'],
  description: '震荡大地:周围敌人越多,每个所受伤害越高。',
  onCast(w, caster, lvl) {
    const foes = enemiesIn(w, caster, caster.pos, 600);
    const per = ECHO_BASE[lvl - 1] + foes.length * ECHO_PER[lvl - 1];
    for (const e of foes) spellDamage(w, caster, e, per);
    aftershock(w, caster);
    w.emit({ kind: 'fx', fx: 'echoslam', pos: V.clone(caster.pos), radius: 600 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 580).filter((t) => t.isHero());
    return foes.length >= 2 ? { score: 82 + foes.length * 4 } : foes.length ? { score: 56 } : null;
  },
};

export const EAR: HeroDef = {
  key: 'ear', name: '葛朗', title: '撼地者', primary: 'str',
  baseStr: 22, gainStr: 3.0, baseAgi: 12, gainAgi: 1.4, baseInt: 16, gainInt: 1.8,
  baseDamage: [27, 33], baseArmor: 2, baseMs: 300, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.5, color: '#6d4c41', glyph: '撼',
  abilities: [EAR_Q, EAR_W, EAR_E, EAR_R], aiRole: 'tank',
};

// ============ 斯凯·天怒法师(智力爆发法师) ============

const BOLT_DMG = [90, 150, 210, 270];

const SKY_Q: AbilityDef = {
  key: 'sky_bolt', name: '奥术飞弹', maxLevel: 4, targetMode: 'unit',
  castRange: [800, 800, 800, 800], manaCost: [90, 100, 110, 120], cooldown: [5, 5, 5, 5],
  castPoint: 0.3, tags: ['nuke'],
  description: '射出奥术飞弹,造成魔法伤害并短暂减速。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    spellDamage(w, caster, target, BOLT_DMG[lvl - 1]);
    applyModifier(w, target, { key: 'sky_bolt_slow', duration: 1.5, stats: { bonusMoveSpeedPct: -0.2 } }, caster.id);
    w.emit({ kind: 'fx', fx: 'arcanebolt', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 800).filter((t) => t.isHero());
    return foes.length ? { score: 54, targetId: foes[0].id } : null;
  },
};

const CONC_DMG = [60, 110, 160, 210];

const SKY_W: AbilityDef = {
  key: 'sky_concussive', name: '震荡波', maxLevel: 4, targetMode: 'none',
  manaCost: [90, 100, 110, 120], cooldown: [12, 11, 10, 9],
  castPoint: 0.3, tags: ['nuke', 'aoe', 'slow'],
  description: '发射一枚自动追踪最近敌方英雄的震荡波,落点伤害并减速。',
  onCast(w, caster, lvl) {
    const foes = enemiesIn(w, caster, caster.pos, 1500).filter((t) => t.isHero()).sort((a, b) => V.dist(caster.pos, a.pos) - V.dist(caster.pos, b.pos));
    const tgt = foes[0] ?? enemiesIn(w, caster, caster.pos, 1500)[0];
    if (!tgt) return;
    damageArea(w, caster, tgt.pos, 300, CONC_DMG[lvl - 1]);
    modifierArea(w, caster, tgt.pos, 300, { key: 'sky_concussive_slow', duration: 3, stats: { bonusMoveSpeedPct: -0.4 } }, 'enemy');
    w.emit({ kind: 'fx', fx: 'concussive', pos: V.clone(tgt.pos), radius: 300 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 1200).filter((t) => t.isHero());
    return foes.length ? { score: 50 } : null;
  },
};

const SEAL_AMP = [0.2, 0.3, 0.4, 0.5];

const SKY_E: AbilityDef = {
  key: 'sky_seal', name: '远古封印', maxLevel: 4, targetMode: 'unit',
  castRange: [700, 700, 700, 700], manaCost: [80, 90, 100, 110], cooldown: [16, 15, 14, 13],
  castPoint: 0.3, tags: ['aoe'],
  description: '封印目标:沉默并大幅提升其所受的魔法伤害。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    applyModifier(w, target, { key: 'sky_seal_debuff', duration: 4 + lvl * 0.5, states: { silenced: true }, stats: { bonusMagicResist: -SEAL_AMP[lvl - 1] } }, caster.id);
    w.emit({ kind: 'fx', fx: 'ancientseal', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length ? { score: 58, targetId: foes[0].id } : null;
  },
};

const FLARE_DMG = [400, 600, 800];

const SKY_R: AbilityDef = {
  key: 'sky_flare', name: '神秘之耀', maxLevel: 3, ultimate: true, targetMode: 'point',
  castRange: [1600, 1600, 1600], manaCost: [175, 275, 375], cooldown: [40, 30, 20],
  castPoint: 0.3, tags: ['nuke', 'aoe', 'ultimate'],
  description: '在远处引爆神秘能量,对小范围内的敌人造成毁灭性魔法伤害。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    damageArea(w, caster, pos, 220, FLARE_DMG[lvl - 1]);
    w.emit({ kind: 'fx', fx: 'mysticflare', pos: V.clone(pos), radius: 220 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 1400).filter((t) => t.isHero());
    return foes.length ? { score: 74, pos: V.clone(foes[0].pos) } : null;
  },
};

export const SKY: HeroDef = {
  key: 'sky', name: '斯凯', title: '天怒法师', primary: 'int',
  baseStr: 17, gainStr: 1.7, baseAgi: 14, gainAgi: 1.4, baseInt: 24, gainInt: 3.2,
  baseDamage: [20, 26], baseArmor: 1, baseMs: 295, attackRange: 550,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.4, color: '#ffb74d', glyph: '怒',
  abilities: [SKY_Q, SKY_W, SKY_E, SKY_R], aiRole: 'ganker',
};

// ============ 杰洛·双头火龙(智力元素法师) ============

const BREATH_DMG = [80, 130, 180, 230];

const JAK_Q: AbilityDef = {
  key: 'jak_breath', name: '冰火吐息', maxLevel: 4, targetMode: 'point',
  castRange: [700, 700, 700, 700], manaCost: [100, 110, 120, 130], cooldown: [10, 9, 8, 7],
  castPoint: 0.3, tags: ['nuke', 'aoe', 'slow'],
  description: '同时喷吐寒冰与烈焰,灼伤并冻缓锥形区域的敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const dir = V.norm(V.sub(pos, caster.pos));
    const hit = new Set<number>();
    for (let d = 120; d <= 700; d += 130) {
      const at = V.add(caster.pos, V.scale(dir, d));
      for (const e of enemiesIn(w, caster, at, 130 + d * 0.12)) {
        if (hit.has(e.id)) continue;
        hit.add(e.id);
        spellDamage(w, caster, e, BREATH_DMG[lvl - 1]);
        applyModifier(w, e, { key: 'jak_breath_slow', duration: 3, stats: { bonusMoveSpeedPct: -0.3 } }, caster.id);
      }
    }
    w.emit({ kind: 'fx', fx: 'dualbreath', pos: V.clone(caster.pos), pos2: V.add(caster.pos, V.scale(dir, 700)) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length ? { score: 54, pos: V.clone(foes[0].pos) } : null;
  },
};

const ICEPATH_STUN = [1.2, 1.6, 2.0, 2.4];

const JAK_W: AbilityDef = {
  key: 'jak_icepath', name: '冰封路径', maxLevel: 4, targetMode: 'point',
  castRange: [700, 700, 700, 700], manaCost: [90, 95, 100, 105], cooldown: [13, 12, 11, 10],
  castPoint: 0.3, tags: ['stun', 'aoe'],
  description: 'short delay 后沿直线竖起冰墙,冻结路径上的敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const dir = V.norm(V.sub(pos, caster.pos));
    applyModifier(w, caster, {
      key: `jak_icepath_${w.tick}`, duration: 0.8, isBuff: true, tickInterval: 0.6,
      onTick(world, _u, m) {
        const hit = new Set<number>();
        for (let d = 120; d <= 700; d += 130) {
          for (const e of enemiesIn(world, caster, V.add(caster.pos, V.scale(dir, d)), 140)) {
            if (hit.has(e.id)) continue;
            hit.add(e.id);
            applyModifier(world, e, { key: 'jak_icepath_stun', duration: ICEPATH_STUN[lvl - 1], states: { stunned: true } }, caster.id);
          }
        }
        world.emit({ kind: 'fx', fx: 'icepath', pos: V.clone(caster.pos), pos2: V.add(caster.pos, V.scale(dir, 700)) });
        m.expiresAt = -Infinity;
      },
    }, caster.id);
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    return foes.length ? { score: 50, pos: V.clone(foes[0].pos) } : null;
  },
};

const LIQFIRE_DMG = [30, 50, 70, 90];

const JAK_E: AbilityDef = {
  key: 'jak_liquidfire', name: '液火', maxLevel: 4, targetMode: 'passive',
  tags: ['orb'],
  description: '攻击喷洒液火,溅射并灼烧目标周围的敌人。',
  passiveModifier: () => ({ key: 'jak_liquidfire_passive', isBuff: true }),
  orbOnHit(w, attacker, target, lvl) {
    if (target.isBuilding()) return;
    for (const e of enemiesIn(w, attacker, target.pos, 250)) {
      spellDamage(w, attacker, e, LIQFIRE_DMG[lvl - 1]);
      applyModifier(w, e, { key: 'jak_liquidfire_slow', duration: 2, stats: { bonusAttackSpeed: -0.3 } }, attacker.id);
    }
  },
};

const MACRO_TICK = [50, 75, 100];

const JAK_R: AbilityDef = {
  key: 'jak_macropyre', name: '岩浆狂暴', maxLevel: 3, ultimate: true, targetMode: 'point',
  castRange: [800, 800, 800], manaCost: [150, 225, 300], cooldown: [80, 70, 60],
  castPoint: 0.4, tags: ['nuke', 'aoe', 'ultimate'],
  description: '点燃一片岩浆持续灼烧其中的敌人 7 秒。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const at = V.clone(pos);
    applyModifier(w, caster, {
      key: `jak_macropyre_${w.tick}`, duration: 7, isBuff: true, tickInterval: 0.5,
      onTick(world) {
        for (const e of enemiesIn(world, caster, at, 450)) spellDamage(world, caster, e, MACRO_TICK[lvl - 1]);
        world.emit({ kind: 'fx', fx: 'macropyre', pos: at, radius: 450 });
      },
    }, caster.id);
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 800).filter((t) => t.isHero());
    return foes.length ? { score: 64, pos: V.clone(foes[0].pos) } : null;
  },
};

export const JAK: HeroDef = {
  key: 'jak', name: '杰洛', title: '双头火龙', primary: 'int',
  baseStr: 20, gainStr: 2.4, baseAgi: 12, gainAgi: 1.2, baseInt: 22, gainInt: 2.8,
  baseDamage: [22, 28], baseArmor: 2, baseMs: 290, attackRange: 550,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.4, color: '#ff7043', glyph: '焰',
  abilities: [JAK_Q, JAK_W, JAK_E, JAK_R], aiRole: 'support',
};

// ============ 瓦克·不朽亡君(力量物理核心) ============

const WBLAST_DMG = [90, 150, 210, 270];
const WBLAST_STUN = [1.2, 1.5, 1.8, 2.1];

const WAK_Q: AbilityDef = {
  key: 'wak_blast', name: '亡灵冲击', maxLevel: 4, targetMode: 'unit',
  castRange: [600, 600, 600, 600], manaCost: [100, 110, 120, 130], cooldown: [9, 8, 7, 6],
  castPoint: 0.3, tags: ['stun', 'nuke'],
  description: '掷出亡灵之火,眩晕目标并造成持续伤害。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    spellDamage(w, caster, target, WBLAST_DMG[lvl - 1]);
    applyModifier(w, target, { key: 'wak_blast_stun', duration: WBLAST_STUN[lvl - 1], states: { stunned: true } }, caster.id);
    w.emit({ kind: 'fx', fx: 'wraithblast', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    return foes.length ? { score: 62, targetId: foes[0].id } : null;
  },
};

const WAK_W: AbilityDef = {
  key: 'wak_vampiric', name: '吸血光环', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '亡君的气息为周围友军赋予吸血(光环)。',
  passiveModifier: (lvl) => ({
    key: 'wak_vampiric_aura', isBuff: true,
    aura: { radius: 900, affects: 'ally', grant: { key: 'wak_vampiric_buff', isBuff: true, stats: { lifesteal: 0.08 + lvl * 0.04 } } },
  }),
};

const WAK_E: AbilityDef = {
  key: 'wak_mortal', name: '致命一击', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '攻击有概率造成致命暴击。',
  passiveModifier: (lvl) => ({
    key: 'wak_mortal_passive', isBuff: true,
    stats: { critChance: 0.15 + lvl * 0.05, critMultiplier: 1.8 + lvl * 0.1 },
  }),
};

const REINC_CD = [160, 130, 100];

const WAK_R: AbilityDef = {
  key: 'wak_reincarnation', name: '重生', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [120, 140, 160], cooldown: [160, 130, 100],
  castPoint: 0.0, tags: ['buff', 'ultimate'],
  description: '准备重生:致死时立即满血复活(消耗后进入冷却)。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, { key: 'wak_reincarnation_buff', duration: 999, isBuff: true, data: { preventDeath: 1, reviveFull: 1 } }, caster.id);
    void lvl;
    w.emit({ kind: 'fx', fx: 'reincarnation_ready', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    return !hasModifier(caster, 'wak_reincarnation_buff') ? { score: 48 } : null;
  },
};

export const WAK: HeroDef = {
  key: 'wak', name: '瓦克', title: '不朽亡君', primary: 'str',
  baseStr: 24, gainStr: 3.0, baseAgi: 18, gainAgi: 1.7, baseInt: 15, gainInt: 1.5,
  baseDamage: [28, 34], baseArmor: 2, baseMs: 300, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.5, color: '#ef5350', glyph: '君',
  abilities: [WAK_Q, WAK_W, WAK_E, WAK_R], aiRole: 'carry',
};

// ============ 冰漪·冰晶祭司(智力寒冰辅助) ============

const FROSTBITE_DPS = [30, 45, 60, 75];

const CRY_Q: AbilityDef = {
  key: 'cry_frostbite', name: '冰封禁制', maxLevel: 4, targetMode: 'unit',
  castRange: [550, 550, 550, 550], manaCost: [110, 120, 130, 140], cooldown: [9, 8, 7, 6],
  castPoint: 0.3, tags: ['stun', 'nuke'],
  description: '将目标冰封原地,使其无法行动并持续受冻伤。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    applyModifier(w, target, {
      key: 'cry_frostbite_root', duration: 1.5 + lvl * 0.4, states: { rooted: true, disarmed: true }, tickInterval: 0.5,
      onTick: (world, u) => spellDamage(world, caster, u, FROSTBITE_DPS[lvl - 1] / 2),
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'frostbite', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 550).filter((t) => t.isHero());
    return foes.length ? { score: 56, targetId: foes[0].id } : null;
  },
};

const NOVA_DMG = [100, 160, 220, 280];

const CRY_W: AbilityDef = {
  key: 'cry_nova', name: '极寒新星', maxLevel: 4, targetMode: 'point',
  castRange: [800, 800, 800, 800], manaCost: [100, 110, 120, 130], cooldown: [11, 10, 9, 8],
  castPoint: 0.3, tags: ['nuke', 'aoe', 'slow'],
  description: '在目标处炸开极寒新星,伤害并冻缓范围内敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    damageArea(w, caster, pos, 400, NOVA_DMG[lvl - 1]);
    modifierArea(w, caster, pos, 400, { key: 'cry_nova_slow', duration: 4, stats: { bonusMoveSpeedPct: -0.3, bonusAttackSpeed: -0.3 } }, 'enemy');
    w.emit({ kind: 'fx', fx: 'crystalnova', pos: V.clone(pos), radius: 400 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 800).filter((t) => t.isHero());
    return foes.length ? { score: 52, pos: V.clone(foes[0].pos) } : null;
  },
};

const CRY_E: AbilityDef = {
  key: 'cry_arcane', name: '奥术光环', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '为全队提供法力回复(光环)。',
  passiveModifier: (lvl) => ({
    key: 'cry_arcane_aura', isBuff: true,
    aura: { radius: 99999, affects: 'allyHero', grant: { key: 'cry_arcane_buff', isBuff: true, stats: { bonusMpRegen: 1 + lvl * 0.8 } } },
  }),
};

const FREEZE_TICK = [60, 90, 120];

const CRY_R: AbilityDef = {
  key: 'cry_freeze', name: '冰晶爆轰', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [200, 300, 400], cooldown: [110, 100, 90],
  castPoint: 0.2, tags: ['nuke', 'aoe', 'channel', 'ultimate'],
  description: '引导极寒爆轰,持续重创并冻缓周身大范围的敌人。',
  onCast(w, caster) {
    w.emit({ kind: 'fx', fx: 'freezingfield', pos: V.clone(caster.pos), radius: 600 });
  },
  channel: {
    duration: (lvl) => 3.5 + lvl * 0.5,
    tickInterval: 0.4,
    onChannelTick(w, caster, lvl) {
      for (const e of enemiesIn(w, caster, caster.pos, 600)) {
        spellDamage(w, caster, e, FREEZE_TICK[lvl - 1]);
        applyModifier(w, e, { key: 'cry_freeze_slow', duration: 0.6, stats: { bonusMoveSpeedPct: -0.4, bonusAttackSpeed: -0.4 } }, caster.id);
      }
      w.emit({ kind: 'fx', fx: 'freezingfield', pos: V.clone(caster.pos), radius: 600 });
    },
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 580).filter((t) => t.isHero());
    return foes.length >= 2 ? { score: 70 } : null;
  },
};

export const CRY: HeroDef = {
  key: 'cry', name: '冰漪', title: '冰晶祭司', primary: 'int',
  baseStr: 16, gainStr: 1.6, baseAgi: 16, gainAgi: 1.5, baseInt: 24, gainInt: 3.0,
  baseDamage: [21, 27], baseArmor: 1, baseMs: 285, attackRange: 550,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.45, color: '#81d4fa', glyph: '冰',
  abilities: [CRY_Q, CRY_W, CRY_E, CRY_R], aiRole: 'support',
};

// ============ 马尔·战神(力量先手坦克) ============

const SPEAR_DMG = [100, 160, 220, 280];

const MAR_Q: AbilityDef = {
  key: 'mar_spear', name: '战神长矛', maxLevel: 4, targetMode: 'point',
  castRange: [900, 900, 900, 900], manaCost: [90, 100, 110, 120], cooldown: [11, 10, 9, 8],
  castPoint: 0.3, tags: ['stun', 'nuke'],
  description: '掷出长矛贯穿敌人,击中则钉住并眩晕。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const dir = V.norm(V.sub(pos, caster.pos));
    for (let d = 120; d <= 900; d += 120) {
      const e = enemiesIn(w, caster, V.add(caster.pos, V.scale(dir, d)), 130)[0];
      if (e) {
        spellDamage(w, caster, e, SPEAR_DMG[lvl - 1]);
        applyModifier(w, e, { key: 'mar_spear_stun', duration: 1.5 + lvl * 0.2, states: { stunned: true } }, caster.id);
        break;
      }
    }
    w.emit({ kind: 'fx', fx: 'spear', pos: V.clone(caster.pos), pos2: V.add(caster.pos, V.scale(dir, 900)) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 900).filter((t) => t.isHero());
    return foes.length ? { score: 58, pos: V.clone(foes[0].pos) } : null;
  },
};

const REBUKE_DMG = [150, 250, 350, 450];

const MAR_W: AbilityDef = {
  key: 'mar_rebuke', name: '神威', maxLevel: 4, targetMode: 'point',
  castRange: [500, 500, 500, 500], manaCost: [90, 100, 110, 120], cooldown: [13, 12, 11, 10],
  castPoint: 0.3, tags: ['nuke', 'aoe'],
  description: '挥剑斩出一道扇形剑气,暴击式重创前方敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const dir = V.norm(V.sub(pos, caster.pos));
    for (const e of enemiesIn(w, caster, caster.pos, 500)) {
      const rel = V.sub(e.pos, caster.pos);
      const proj = rel.x * dir.x + rel.y * dir.y;
      if (proj <= 0) continue; // 仅扇形前方
      spellDamage(w, caster, e, REBUKE_DMG[lvl - 1]);
    }
    w.emit({ kind: 'fx', fx: 'godsrebuke', pos: V.clone(caster.pos), pos2: V.add(caster.pos, V.scale(dir, 500)) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 450).filter((t) => t.isHero());
    return foes.length ? { score: 54, pos: V.clone(foes[0].pos) } : null;
  },
};

const MAR_E: AbilityDef = {
  key: 'mar_bulwark', name: '壁垒', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '以盾牌格挡来袭伤害,减免所受伤害。',
  passiveModifier: (lvl) => ({ key: 'mar_bulwark_passive', isBuff: true, stats: { incomingDamageReduction: 0.08 + lvl * 0.04 } }),
};

const ARENA_DUR = [6, 7, 8];

const MAR_R: AbilityDef = {
  key: 'mar_arena', name: '血之竞技场', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [100, 150, 200], cooldown: [90, 80, 70],
  castPoint: 0.3, tags: ['buff', 'aoe', 'ultimate'],
  description: '召唤角斗竞技场:强化自身,并大幅减速困住周围的敌人。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, { key: 'mar_arena_buff', duration: ARENA_DUR[lvl - 1], isBuff: true, stats: { bonusArmor: 6 + lvl * 2, bonusDamage: 20 + lvl * 15, incomingDamageReduction: 0.2 } }, caster.id);
    const at = V.clone(caster.pos);
    applyModifier(w, caster, {
      key: `mar_arena_field_${w.tick}`, duration: ARENA_DUR[lvl - 1], isBuff: true, tickInterval: 0.4,
      onTick(world) {
        for (const e of enemiesIn(world, caster, at, 450)) applyModifier(world, e, { key: 'mar_arena_slow', duration: 0.5, stats: { bonusMoveSpeedPct: -0.6 } }, caster.id);
        world.emit({ kind: 'fx', fx: 'arena', pos: at, radius: 450 });
      },
    }, caster.id);
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 500).filter((t) => t.isHero());
    return foes.length ? { score: 70 } : null;
  },
};

export const MAR: HeroDef = {
  key: 'mar', name: '马尔', title: '战神', primary: 'str',
  baseStr: 23, gainStr: 2.9, baseAgi: 18, gainAgi: 1.9, baseInt: 16, gainInt: 1.6,
  baseDamage: [28, 34], baseArmor: 3, baseMs: 305, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.4, color: '#e57373', glyph: '战',
  abilities: [MAR_Q, MAR_W, MAR_E, MAR_R], aiRole: 'tank',
};

export const BATCH13 = [EAR, SKY, JAK, WAK, CRY, MAR];
