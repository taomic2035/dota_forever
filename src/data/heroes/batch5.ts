/** 第五批 6 名原创英雄:萨娅(幻象)/奥罗拉/巴尔/凯隆/塔伊/诺克斯。 */
import { V } from '../../core/vec2';
import type { AbilityDef, HeroDef } from './types';
import {
  damageArea, modifierArea, enemiesIn, alliesIn, spellDamage, blinkTo, createIllusion, hasScepter,
} from '../../sim/abilities';
import { applyModifier } from '../../sim/modifiers';
import * as Combat from '../../sim/combat';

// ============ 萨娅·幻影舞者(敏捷幻象核心) ============

const IMAGE_COUNT = [1, 2, 3, 3];
const IMAGE_OUT = [0.25, 0.3, 0.35, 0.4];

const SAYA_Q: AbilityDef = {
  key: 'saya_images', name: '虚影分身', maxLevel: 4, targetMode: 'none',
  manaCost: [70, 80, 90, 100], cooldown: [22, 19, 16, 13],
  castPoint: 0.1, tags: ['buff'],
  description: '制造数个幻象,造成自身一部分伤害、受到数倍伤害,持续 18 秒。',
  onCast(w, caster, lvl) {
    createIllusion(w, caster, IMAGE_COUNT[lvl - 1], IMAGE_OUT[lvl - 1], 3.0, 18);
    w.emit({ kind: 'fx', fx: 'images', pos: V.clone(caster.pos), radius: 120 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 900).filter((t) => t.isHero());
    // 有敌或推线时分身
    return foes.length || w.time % 30 < 1 ? { score: foes.length ? 56 : 30 } : null;
  },
};

const BLINK_RANGE = [700, 850, 1000, 1150];

const SAYA_W: AbilityDef = {
  key: 'saya_blink', name: '残影闪', maxLevel: 4, targetMode: 'point',
  castRange: BLINK_RANGE, manaCost: [50, 50, 50, 50], cooldown: [12, 10, 8, 6],
  castPoint: 0.0, tags: ['escape'],
  description: '瞬移一段距离,并在原地留下一个幻象。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    createIllusion(w, caster, 1, IMAGE_OUT[Math.min(lvl - 1, 3)], 3.0, 8);
    blinkTo(w, caster, pos);
    w.emit({ kind: 'fx', fx: 'blink', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    if (caster.hp / caster.calc.maxHp < 0.4 && enemiesIn(w, caster, caster.pos, 400).length) {
      const foes = enemiesIn(w, caster, caster.pos, 400);
      let cx = 0, cy = 0;
      for (const f of foes) { cx += f.pos.x; cy += f.pos.y; }
      const away = V.norm(V.sub(caster.pos, { x: cx / foes.length, y: cy / foes.length }));
      return { score: 82, pos: V.add(caster.pos, V.scale(away, 700)) };
    }
    return null;
  },
};

const JUXTA_CRIT = [0.15, 0.2, 0.25, 0.3];

const SAYA_E: AbilityDef = {
  key: 'saya_juxta', name: '锋影', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '攻击有概率造成 1.8 倍暴击(幻象同样继承)。',
  passiveModifier: (lvl) => ({
    key: 'saya_juxta_passive', isBuff: true,
    stats: { critChance: JUXTA_CRIT[lvl - 1], critMultiplier: 1.8 },
  }),
};

const DOPP_IMAGES = [2, 3, 4];

const SAYA_R: AbilityDef = {
  key: 'saya_doppel', name: '幻象大军', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [125, 150, 175], cooldown: [60, 50, 40],
  scepter: { cooldown: [40, 32, 24], desc: '神杖:冷却降低;幻象数量额外增加 2 个,闪避持续时间延长至 4 秒,幻象输出提升至 55%。' },
  castPoint: 0.1, tags: ['buff', 'escape', 'ultimate'],
  description: '瞬间生成强力幻象大军,并短暂获得高额闪避。',
  onCast(w, caster, lvl) {
    const sc = hasScepter(caster);
    const imageCount = DOPP_IMAGES[lvl - 1] + (sc ? 2 : 0);
    const outDmg = sc ? 0.55 : 0.4;
    const evasionDur = sc ? 4 : 2;
    createIllusion(w, caster, imageCount, outDmg, 2.5, 16);
    applyModifier(w, caster, {
      key: 'saya_doppel_buff', duration: evasionDur, isBuff: true, stats: { evasion: 0.7 },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'images', pos: V.clone(caster.pos), radius: 200 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 800).filter((t) => t.isHero());
    return foes.length ? { score: 70 } : null;
  },
};

export const SAYA: HeroDef = {
  key: 'saya', name: '萨娅', title: '幻影舞者', primary: 'agi',
  baseStr: 17, gainStr: 1.8, baseAgi: 23, gainAgi: 2.8, baseInt: 16, gainInt: 1.6,
  baseDamage: [26, 32], baseArmor: 2, baseMs: 305, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.35, color: '#ce93d8', glyph: '幻',
  abilities: [SAYA_Q, SAYA_W, SAYA_E, SAYA_R], aiRole: 'carry',
};

// ============ 奥罗拉·冰霜女王(智力法师) ============

const SHARD_DMG = [110, 175, 240, 305];

const AURORA_Q: AbilityDef = {
  key: 'aurora_shard', name: '寒霜碎片', maxLevel: 4, targetMode: 'point',
  aoeRadius: [250], // 预览半径(=onCast 实际 AoE 半径)
  castRange: [700, 700, 700, 700], manaCost: [95, 110, 125, 140], cooldown: [7, 6.5, 6, 5.5],
  castPoint: 0.3, tags: ['nuke', 'aoe', 'slow'],
  description: '掷出寒霜碎片,炸裂伤害并减速一小片区域。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    damageArea(w, caster, pos, 250, SHARD_DMG[lvl - 1]);
    modifierArea(w, caster, pos, 250, { key: 'aurora_shard_slow', duration: 2, stats: { bonusMoveSpeedPct: -0.3 } }, 'enemy');
    w.emit({ kind: 'fx', fx: 'frostnova', pos: V.clone(pos), radius: 250 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    if (!foes.length) return null;
    return { score: 60, pos: V.clone(foes[0].pos) };
  },
};

const PATH_DMG = [60, 90, 120, 150];

const AURORA_W: AbilityDef = {
  key: 'aurora_path', name: '寒冰之径', maxLevel: 4, targetMode: 'point',
  lineWidth: 160, // 线形预览半宽(=onCast 沿线 enemiesIn 半径)
  castRange: [900, 900, 900, 900], manaCost: [90, 100, 110, 120], cooldown: [16, 15, 14, 13],
  castPoint: 0.4, tags: ['aoe', 'slow', 'nuke'],
  description: '冻结一条冰径,沿线敌人被冻伤并大幅减速。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const dir = V.norm(V.sub(pos, caster.pos));
    const hit = new Set<number>();
    for (let d = 100; d <= 900; d += 150) {
      const at = V.add(caster.pos, V.scale(dir, d));
      for (const e of enemiesIn(w, caster, at, 160)) {
        if (hit.has(e.id)) continue;
        hit.add(e.id);
        spellDamage(w, caster, e, PATH_DMG[lvl - 1]);
        applyModifier(w, e, { key: 'aurora_path_slow', duration: 3, stats: { bonusMoveSpeedPct: -0.5 } }, caster.id);
      }
    }
    w.emit({ kind: 'fx', fx: 'icepath', pos: V.clone(caster.pos), pos2: V.add(caster.pos, V.scale(dir, 900)) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 850).filter((t) => t.isHero());
    if (!foes.length) return null;
    return { score: 58, pos: V.clone(foes[0].pos) };
  },
};

const EMBRACE_HEAL = [150, 250, 350, 450];

const AURORA_E: AbilityDef = {
  key: 'aurora_embrace', name: '寒冰庇护', maxLevel: 4, targetMode: 'unit', targetTeam: 'allyOrSelf',
  castRange: [600, 600, 600, 600], manaCost: [80, 90, 100, 110], cooldown: [20, 18, 16, 14],
  castPoint: 0.2, tags: ['heal', 'buff'],
  description: '将友军冰封 2 秒:期间无敌、无法行动,结束后治疗。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target || target.team !== caster.team) return;
    applyModifier(w, target, {
      key: 'aurora_embrace_buff', duration: 2, isBuff: true,
      states: { rooted: true, disarmed: true, magicImmune: true, physImmune: true },
      onExpire(world, u) {
        if (u.alive) u.hp = Math.min(u.calc.maxHp, u.hp + EMBRACE_HEAL[lvl - 1]);
      },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'embrace', pos: V.clone(target.pos) });
  },
  aiScore(w, caster, lvl) {
    const allies = alliesIn(w, caster, caster.pos, 600).filter((t) => t.isHero() && t.hp / t.calc.maxHp < 0.3);
    if (!allies.length) return null;
    return { score: 70, targetId: allies[0].id };
    void lvl;
  },
};

const GLACIER_DMG = [200, 300, 400];

const AURORA_R: AbilityDef = {
  key: 'aurora_glacier', name: '极地寒峰', maxLevel: 3, ultimate: true, targetMode: 'point',
  castRange: [700, 700, 700], manaCost: [200, 280, 360], cooldown: [100, 90, 80],
  scepter: { cooldown: [70, 62, 55], desc: '神杖:冷却降低;范围扩大至 650,冻结持续时间延长至 3 秒。' },
  castPoint: 0.4, tags: ['nuke', 'aoe', 'stun', 'ultimate'],
  description: '凝聚极地寒峰,冻结并重创大范围敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const sc = hasScepter(caster);
    const radius = sc ? 650 : 450;
    const freezeDur = sc ? 3 : 2;
    damageArea(w, caster, pos, radius, GLACIER_DMG[lvl - 1]);
    modifierArea(w, caster, pos, radius, { key: 'aurora_glacier_freeze', duration: freezeDur, states: { stunned: true } }, 'enemy');
    w.emit({ kind: 'fx', fx: 'glacier', pos: V.clone(pos), radius });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    if (foes.length < 2) return null;
    return { score: 90, pos: V.clone(foes[0].pos) };
  },
};

export const AURORA: HeroDef = {
  key: 'aurora', name: '奥罗拉', title: '冰霜女王', primary: 'int',
  baseStr: 18, gainStr: 2.0, baseAgi: 14, gainAgi: 1.4, baseInt: 24, gainInt: 2.9,
  baseDamage: [23, 29], baseArmor: 1, baseMs: 295, attackRange: 600,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.4, color: '#80deea', glyph: '凛',
  abilities: [AURORA_Q, AURORA_W, AURORA_E, AURORA_R], aiRole: 'support',
};

// ============ 巴尔·烈焰领主(力量辅助/灼烧) ============

const BLAST_DMG = [110, 170, 230, 290];

const BAL_Q: AbilityDef = {
  key: 'bal_blast', name: '烈焰冲击', maxLevel: 4, targetMode: 'point',
  aoeRadius: [260], // 预览半径(=onCast 实际 AoE 半径)
  castRange: [700, 700, 700, 700], manaCost: [100, 115, 130, 145], cooldown: [10, 9, 8, 7],
  castPoint: 0.4, tags: ['nuke', 'stun', 'aoe'],
  description: '引爆烈焰,伤害并眩晕落点区域的敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    damageArea(w, caster, pos, 260, BLAST_DMG[lvl - 1]);
    modifierArea(w, caster, pos, 260, { key: 'bal_blast_stun', duration: 1, states: { stunned: true } }, 'enemy');
    w.emit({ kind: 'fx', fx: 'fireblast', pos: V.clone(pos), radius: 260 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    if (!foes.length) return null;
    return { score: 64, pos: V.clone(foes[0].pos) };
  },
};

const ARMOR_HOT = [10, 16, 22, 28];

const BAL_W: AbilityDef = {
  key: 'bal_armor', name: '炽焰护甲', maxLevel: 4, targetMode: 'unit', targetTeam: 'allyOrSelf',
  castRange: [600, 600, 600, 600], manaCost: [70, 80, 90, 100], cooldown: [14, 13, 12, 11],
  castPoint: 0.2, tags: ['heal', 'buff'],
  description: '为友军附上炽焰护甲:持续回复生命并提升护甲 12 秒。',
  onCast(w, caster, lvl, _pos, target) {
    const t = target && target.team === caster.team ? target : caster;
    applyModifier(w, t, {
      key: 'bal_armor_buff', duration: 12, isBuff: true,
      stats: { bonusArmor: 4 + lvl },
      tickInterval: 1,
      onTick(world, u) { u.hp = Math.min(u.calc.maxHp, u.hp + ARMOR_HOT[lvl - 1]); },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'firearmor', pos: V.clone(t.pos) });
  },
  aiScore(w, caster, lvl) {
    const allies = alliesIn(w, caster, caster.pos, 600).filter((t) => t.isHero() && t.hp / t.calc.maxHp < 0.7);
    if (!allies.length) return null;
    return { score: 50, targetId: allies[0].id };
    void lvl;
  },
};

const FIRESHIELD = [0.25, 0.4, 0.55, 0.7];

const BAL_E: AbilityDef = {
  key: 'bal_shield', name: '烈焰之肤', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '被攻击时灼烧攻击者(反弹一部分伤害)。',
  passiveModifier: (lvl) => ({
    key: 'bal_shield_passive', isBuff: true, data: { retaliate: FIRESHIELD[lvl - 1] },
  }),
};

const PIT_DMG = [80, 120, 160];

const BAL_R: AbilityDef = {
  key: 'bal_pit', name: '炼狱深渊', maxLevel: 3, ultimate: true, targetMode: 'point',
  castRange: [700, 700, 700], manaCost: [175, 250, 325], cooldown: [80, 70, 60],
  scepter: { cooldown: [55, 48, 40], desc: '神杖:冷却降低;持续时间延长至 6 秒,范围扩大至 550。' },
  castPoint: 0.4, tags: ['aoe', 'stun', 'nuke', 'ultimate'],
  description: '撕裂大地为炼狱,区域内敌人反复被火焰禁锢并灼烧 4 秒。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const sc = hasScepter(caster);
    const at = V.clone(pos);
    const pitDur = sc ? 6 : 4;
    const pitRadius = sc ? 550 : 400;
    applyModifier(w, caster, {
      key: 'bal_pit_caster', duration: pitDur, isBuff: true, tickInterval: 0.5,
      onTick(world, u) {
        for (const e of enemiesIn(world, u, at, pitRadius)) {
          spellDamage(world, u, e, PIT_DMG[lvl - 1] / 2);
          applyModifier(world, e, { key: 'bal_pit_root', duration: 0.6, states: { rooted: true } }, u.id);
        }
        world.emit({ kind: 'fx', fx: 'pit', pos: at, radius: pitRadius });
      },
    }, caster.id);
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    if (foes.length < 1) return null;
    return { score: 80 + foes.length * 6, pos: V.clone(foes[0].pos) };
  },
};

export const BAL: HeroDef = {
  key: 'bal', name: '巴尔', title: '烈焰领主', primary: 'str',
  baseStr: 22, gainStr: 2.6, baseAgi: 13, gainAgi: 1.3, baseInt: 20, gainInt: 2.3,
  baseDamage: [26, 34], baseArmor: 3, baseMs: 300, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.45, color: '#ff8a65', glyph: '焰',
  abilities: [BAL_Q, BAL_W, BAL_E, BAL_R], aiRole: 'support',
};

// ============ 凯隆·神射手(敏捷远程核心) ============

const AIM_RANGE = [80, 140, 200, 260];

const KELON_Q: AbilityDef = {
  key: 'kelon_aim', name: '瞄准', maxLevel: 4, targetMode: 'none',
  manaCost: [0, 0, 0, 0], cooldown: [1, 1, 1, 1],
  castPoint: 0.0, tags: ['buff'],
  description: '凝神瞄准,提升攻击距离与攻击力 8 秒。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, {
      key: 'kelon_aim_buff', duration: 8, isBuff: true,
      stats: { bonusAttackRange: AIM_RANGE[lvl - 1], bonusDamage: lvl * 8 },
    }, caster.id);
  },
  aiScore(w, caster) {
    if (hasMod(caster, 'kelon_aim_buff')) return null;
    return enemiesIn(w, caster, caster.pos, 800).length ? { score: 40 } : null;
  },
};

const PIERCE_DMG = [120, 190, 260, 330];

const KELON_W: AbilityDef = {
  key: 'kelon_pierce', name: '穿透射击', maxLevel: 4, targetMode: 'point',
  lineWidth: 140, // 线形预览半宽(=onCast 沿线 enemiesIn 半径)
  castRange: [900, 900, 900, 900], manaCost: [90, 100, 110, 120], cooldown: [11, 10, 9, 8],
  castPoint: 0.3, tags: ['nuke', 'stun'],
  description: '射出穿透箭,伤害并击晕沿途敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const dir = V.norm(V.sub(pos, caster.pos));
    const hit = new Set<number>();
    for (let d = 100; d <= 1000; d += 130) {
      const at = V.add(caster.pos, V.scale(dir, d));
      for (const e of enemiesIn(w, caster, at, 140)) {
        if (hit.has(e.id)) continue;
        hit.add(e.id);
        spellDamage(w, caster, e, PIERCE_DMG[lvl - 1]);
        applyModifier(w, e, { key: 'kelon_pierce_stun', duration: 1, states: { stunned: true } }, caster.id);
      }
    }
    w.emit({ kind: 'fx', fx: 'pierce', pos: V.clone(caster.pos), pos2: V.add(caster.pos, V.scale(dir, 1000)) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 850).filter((t) => t.isHero());
    if (!foes.length) return null;
    return { score: 60, pos: V.clone(foes[0].pos) };
  },
};

const HEADSHOT_CHANCE = [0.3, 0.4, 0.5, 0.6];
const HEADSHOT_DMG = [40, 60, 80, 100];

const KELON_E: AbilityDef = {
  key: 'kelon_headshot', name: '爆头', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '攻击有概率爆头,造成额外伤害并短暂减速。',
  passiveModifier: () => ({ key: 'kelon_headshot_passive', isBuff: true }),
  orbOnHit(w, attacker, target, lvl) {
    if (target.isBuilding()) return;
    if (w.rng.chance(HEADSHOT_CHANCE[lvl - 1])) {
      spellDamage(w, attacker, target, HEADSHOT_DMG[lvl - 1]);
      applyModifier(w, target, { key: 'kelon_headshot_slow', duration: 0.5, stats: { bonusMoveSpeedPct: -0.5 } }, attacker.id);
    }
  },
};

const SNIPE_DMG = [300, 450, 600];

const KELON_R: AbilityDef = {
  key: 'kelon_assassinate', name: '狙杀', maxLevel: 3, ultimate: true, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [1500, 1800, 2100], manaCost: [175, 200, 225], cooldown: [20, 15, 10],
  scepter: { cooldown: [13, 10, 7], desc: '神杖:冷却降低;眩晕时间延长至 2 秒,施法前摇降低 0.3 秒。' },
  castPoint: 1.0, tags: ['nuke', 'ultimate'],
  description: '远距离蓄力狙击,造成巨额伤害并短暂眩晕。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    const sc = hasScepter(caster);
    const stunDur = sc ? 2.0 : 0.8;
    spellDamage(w, caster, target, SNIPE_DMG[lvl - 1]);
    applyModifier(w, target, { key: 'kelon_snipe_stun', duration: stunDur, states: { stunned: true } }, caster.id);
    w.emit({ kind: 'fx', fx: 'snipe', pos: V.clone(caster.pos), pos2: V.clone(target.pos) });
  },
  aiScore(w, caster, lvl) {
    const foes = enemiesIn(w, caster, caster.pos, (KELON_R.castRange ?? [1500])[lvl - 1] * 0.9).filter((t) => t.isHero());
    if (!foes.length) return null;
    foes.sort((a, b) => a.hp - b.hp);
    return { score: 66 + (foes[0].hp < SNIPE_DMG[lvl - 1] ? 40 : 0), targetId: foes[0].id };
  },
};

export const KELON: HeroDef = {
  key: 'kelon', name: '凯隆', title: '神射手', primary: 'agi',
  baseStr: 16, gainStr: 1.6, baseAgi: 22, gainAgi: 2.7, baseInt: 15, gainInt: 1.6,
  baseDamage: [24, 30], baseArmor: 1, baseMs: 295, attackRange: 575,
  projectileSpeed: 1100, bat: 1.7, attackPoint: 0.4, color: '#ffb74d', glyph: '狙',
  abilities: [KELON_Q, KELON_W, KELON_E, KELON_R], aiRole: 'carry',
};

// ============ 塔伊·风暴之灵(敏捷先手) ============

const BALL_DMG = [80, 120, 160, 200];

const TAI_Q: AbilityDef = {
  key: 'tai_ball', name: '球状闪电', maxLevel: 4, targetMode: 'point',
  castRange: [700, 850, 1000, 1150], manaCost: [80, 90, 100, 110], cooldown: [7, 6, 5, 4],
  castPoint: 0.0, tags: ['nuke', 'escape', 'aoe'],
  description: '化作闪电球冲向目标点,电击沿途敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    chargeOverload(w, caster);
    const from = V.clone(caster.pos);
    blinkTo(w, caster, pos);
    // 沿途线性伤害
    const dir = V.norm(V.sub(pos, from));
    const len = V.dist(from, pos);
    const hit = new Set<number>();
    for (let d = 0; d <= len; d += 140) {
      const at = V.add(from, V.scale(dir, d));
      for (const e of enemiesIn(w, caster, at, 180)) {
        if (hit.has(e.id)) continue;
        hit.add(e.id);
        spellDamage(w, caster, e, BALL_DMG[lvl - 1]);
      }
    }
    w.emit({ kind: 'fx', fx: 'balllightning', pos: from, pos2: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 900).filter((t) => t.isHero());
    if (!foes.length) return null;
    return { score: 58, pos: V.clone(foes[0].pos) };
  },
};

const REMNANT_DMG = [120, 180, 240, 300];

const TAI_W: AbilityDef = {
  key: 'tai_remnant', name: '静电残影', maxLevel: 4, targetMode: 'point',
  castRange: [400, 400, 400, 400], manaCost: [60, 60, 60, 60], cooldown: [4, 4, 4, 4],
  castPoint: 0.1, tags: ['nuke', 'aoe'],
  description: '留下静电残影,短暂后炸裂,伤害并减速周围敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    chargeOverload(w, caster);
    const at = V.clone(pos);
    applyModifier(w, caster, {
      key: 'tai_remnant_caster', duration: 1.2, isBuff: true,
      onExpire(world, u) {
        damageArea(world, u, at, 300, REMNANT_DMG[lvl - 1]);
        modifierArea(world, u, at, 300, { key: 'tai_remnant_slow', duration: 1.5, stats: { bonusMoveSpeedPct: -0.3 } }, 'enemy');
        world.emit({ kind: 'fx', fx: 'remnant', pos: at, radius: 300 });
      },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'remnant_place', pos: at });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 400).filter((t) => t.isHero());
    if (!foes.length) return null;
    return { score: 50, pos: V.clone(foes[0].pos) };
  },
};

const OVERLOAD_DMG = [40, 70, 100, 130];

const TAI_E: AbilityDef = {
  key: 'tai_overload', name: '超负荷', maxLevel: 4, targetMode: 'passive',
  tags: ['orb'],
  description: '施法后下一次攻击释放过载,伤害并减速目标周围敌人。',
  passiveModifier: () => ({ key: 'tai_overload_passive', isBuff: true }),
  orbOnHit(w, attacker, target, lvl) {
    if (!hasMod(attacker, 'tai_overload_charged')) return;
    Combat.applyDamage(w, target, { source: attacker.id, attackType: 'spell', amount: OVERLOAD_DMG[lvl - 1] * (1 + attacker.calc.spellAmp), flags: { spell: true } });
    for (const e of enemiesIn(w, attacker, target.pos, 250)) {
      applyModifier(w, e, { key: 'tai_overload_slow', duration: 0.8, stats: { bonusMoveSpeedPct: -0.4 } }, attacker.id);
    }
    // 消耗充能
    const m = attacker.modifiers.find((x) => x.key === 'tai_overload_charged');
    if (m) m.expiresAt = -Infinity;
  },
};

const VORTEX_DUR = [1.5, 2, 2.5];

const TAI_R: AbilityDef = {
  key: 'tai_vortex', name: '电磁漩涡', maxLevel: 3, ultimate: true, targetMode: 'point',
  castRange: [600, 600, 600], manaCost: [125, 150, 175], cooldown: [50, 45, 40],
  scepter: { cooldown: [34, 30, 26], desc: '神杖:冷却降低;漩涡范围扩大至 550,禁锢升级为完全眩晕。' },
  castPoint: 0.3, tags: ['stun', 'aoe', 'ultimate'],
  description: '制造漩涡,将周围敌人拉向中心并禁锢。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    chargeOverload(w, caster);
    const sc = hasScepter(caster);
    const at = V.clone(pos);
    const vortexRadius = sc ? 550 : 400;
    for (const e of enemiesIn(w, caster, at, vortexRadius)) {
      e.pos = w.map.nearestWalkable(V.lerp(e.pos, at, 0.6));
      e.prevPos = V.clone(e.pos);
      if (sc) {
        applyModifier(w, e, { key: 'tai_vortex_stun', duration: VORTEX_DUR[lvl - 1], states: { stunned: true } }, caster.id);
      } else {
        applyModifier(w, e, { key: 'tai_vortex_root', duration: VORTEX_DUR[lvl - 1], states: { rooted: true } }, caster.id);
      }
    }
    w.emit({ kind: 'fx', fx: 'vortex', pos: at, radius: vortexRadius });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    if (foes.length < 2) return null;
    return { score: 86, pos: V.clone(foes[0].pos) };
  },
};

export const TAI: HeroDef = {
  key: 'tai', name: '塔伊', title: '风暴之灵', primary: 'agi',
  baseStr: 19, gainStr: 2.1, baseAgi: 22, gainAgi: 2.6, baseInt: 18, gainInt: 2.0,
  baseDamage: [25, 31], baseArmor: 2, baseMs: 305, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.35, color: '#4dd0e1', glyph: '电',
  abilities: [TAI_Q, TAI_W, TAI_E, TAI_R], aiRole: 'ganker',
};

// ============ 诺克斯·暗夜猎手(力量游走) ============

const CRIPPLE_DMG = [80, 130, 180, 230];

const NOX_Q: AbilityDef = {
  key: 'nox_cripple', name: '致残射击', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [600, 600, 600, 600], manaCost: [90, 100, 110, 120], cooldown: [10, 9, 8, 7],
  castPoint: 0.3, tags: ['nuke', 'slow'],
  description: '射伤目标,造成伤害并大幅降低其攻速与移速。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    spellDamage(w, caster, target, CRIPPLE_DMG[lvl - 1]);
    applyModifier(w, target, {
      key: 'nox_cripple_debuff', duration: 4,
      stats: { bonusMoveSpeedPct: -0.3, bonusAttackSpeed: -(0.4 + lvl * 0.1) },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'cripple', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    if (!foes.length) return null;
    foes.sort((a, b) => a.hp - b.hp);
    return { score: 60, targetId: foes[0].id };
  },
};

const SILENCE_RADIUS = [300, 350, 400, 450];

const NOX_W: AbilityDef = {
  key: 'nox_silence', name: '静默领域', maxLevel: 4, targetMode: 'none',
  manaCost: [75, 85, 95, 105], cooldown: [15, 14, 13, 12],
  castPoint: 0.2, tags: ['aoe'],
  description: '散布静默,使周围敌人短时间内无法施法。',
  onCast(w, caster, lvl) {
    modifierArea(w, caster, caster.pos, SILENCE_RADIUS[lvl - 1], {
      key: 'nox_silence_debuff', duration: 3 + lvl * 0.5, states: { silenced: true },
    }, 'enemy');
    w.emit({ kind: 'fx', fx: 'silence', pos: V.clone(caster.pos), radius: SILENCE_RADIUS[lvl - 1] });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 420).filter((t) => t.isHero());
    return foes.length ? { score: 56 + foes.length * 8 } : null;
  },
};

const NOX_E: AbilityDef = {
  key: 'nox_dark', name: '黑暗降临', maxLevel: 4, targetMode: 'none',
  manaCost: [100, 100, 100, 100], cooldown: [60, 55, 50, 45],
  castPoint: 0.2, tags: ['buff'],
  description: '强制进入黑夜,自身获得加速与视野(夜晚是猎手的主场)。',
  onCast(w, caster, lvl) {
    w.forceNightUntil = w.time + 6 + lvl * 2;
    applyModifier(w, caster, {
      key: 'nox_dark_buff', duration: 6 + lvl * 2, isBuff: true,
      stats: { bonusMoveSpeedPct: 0.18 },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'nightfall', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 800).filter((t) => t.isHero());
    return foes.length && !w.isNight ? { score: 44 } : null;
  },
};

const FERVOR_IAS = [0.6, 0.9, 1.2];

const NOX_R: AbilityDef = {
  key: 'nox_fervor', name: '狩猎热诚', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [50, 50, 50], cooldown: [40, 32, 24],
  scepter: { cooldown: [28, 22, 16], desc: '神杖:冷却降低;热诚同时感染周围 600 范围内的友军英雄,且持续时间延长至 18 秒。' },
  castPoint: 0.0, tags: ['buff', 'ultimate'],
  description: '激发狩猎热诚:12 秒内大幅提升攻击速度。',
  onCast(w, caster, lvl) {
    const sc = hasScepter(caster);
    const fervorDur = sc ? 18 : 12;
    applyModifier(w, caster, {
      key: 'nox_fervor_buff', duration: fervorDur, isBuff: true,
      stats: { bonusAttackSpeed: FERVOR_IAS[lvl - 1] },
    }, caster.id);
    // 神杖:感染周围友军英雄
    if (sc) {
      for (const ally of alliesIn(w, caster, caster.pos, 600)) {
        if (!ally.isHero() || ally.id === caster.id) continue;
        applyModifier(w, ally, {
          key: 'nox_fervor_buff', duration: fervorDur, isBuff: true,
          stats: { bonusAttackSpeed: FERVOR_IAS[lvl - 1] },
        }, caster.id);
      }
    }
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    return foes.length ? { score: 58 } : null;
  },
};

export const NOX: HeroDef = {
  key: 'nox', name: '诺克斯', title: '暗夜猎手', primary: 'str',
  baseStr: 21, gainStr: 2.4, baseAgi: 19, gainAgi: 2.2, baseInt: 15, gainInt: 1.5,
  baseDamage: [27, 33], baseArmor: 3, baseMs: 300, attackRange: 150,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.4, color: '#5c6bc0', glyph: '夜',
  abilities: [NOX_Q, NOX_W, NOX_E, NOX_R], aiRole: 'ganker',
};

export const BATCH5 = [SAYA, AURORA, BAL, KELON, TAI, NOX];

function hasMod(u: import('../../sim/unit').Unit, key: string): boolean {
  return u.modifiers.some((m) => m.key === key);
}

/** 塔伊超负荷:施法后蓄能,下一次攻击释放(仅当已学 E 时有意义)。 */
function chargeOverload(w: import('../../sim/world').World, caster: import('../../sim/unit').Unit): void {
  if (caster.abilities[2]?.level > 0) {
    applyModifier(w, caster, { key: 'tai_overload_charged', duration: 6, isBuff: true }, caster.id);
  }
}
// 引用以避免未使用告警
void damageArea;
