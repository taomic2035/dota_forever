/** 第十批 6 名原创英雄:米拉/斯拉/昆恩(怒涛)/戴泽/帕克/斯文。 */
import { V, type Vec2 } from '../../core/vec2';
import type { AbilityDef, HeroDef } from './types';
import {
  damageArea, modifierArea, enemiesIn, alliesIn, spellDamage, blinkTo, hasScepter,
} from '../../sim/abilities';
import { applyModifier, hasModifier } from '../../sim/modifiers';
import type { Unit } from '../../sim/unit';
import type { World } from '../../sim/world';

// ============ 薇尔·疾风游侠(敏捷技能射手) ============

const SHACKLE_DMG = [60, 100, 140, 180];
const SHACKLE_ROOT = [1.6, 2.2, 2.8, 3.4];

const WIRA_Q: AbilityDef = {
  key: 'wira_shackle', name: '缚击', maxLevel: 4, targetMode: 'point',
  castRange: [1000, 1000, 1000, 1000], manaCost: [90, 100, 110, 120], cooldown: [14, 13, 12, 11],
  castPoint: 0.3, tags: ['stun', 'nuke'],
  description: '射出束缚之箭,缠绕直线上最前的两名敌人(无法移动与攻击)。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const dir = V.norm(V.sub(pos, caster.pos));
    const onLine = enemiesIn(w, caster, caster.pos, 1100)
      .map((e) => { const rel = V.sub(e.pos, caster.pos); return { e, proj: rel.x * dir.x + rel.y * dir.y, perp: Math.abs(rel.x * dir.y - rel.y * dir.x) }; })
      .filter((o) => o.proj > 0 && o.perp < 150)
      .sort((a, b) => a.proj - b.proj);
    for (let i = 0; i < Math.min(2, onLine.length); i++) {
      const e = onLine[i].e;
      spellDamage(w, caster, e, SHACKLE_DMG[lvl - 1]);
      applyModifier(w, e, { key: 'wira_shackle_root', duration: SHACKLE_ROOT[lvl - 1], states: { rooted: true, disarmed: true } }, caster.id);
    }
    w.emit({ kind: 'fx', fx: 'shackle', pos: V.clone(caster.pos), pos2: V.add(caster.pos, V.scale(dir, 1000)) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 900).filter((t) => t.isHero());
    return foes.length ? { score: 60, pos: V.clone(foes[0].pos) } : null;
  },
};

const POWER_DMG = [120, 200, 280, 360];

const WIRA_W: AbilityDef = {
  key: 'wira_powershot', name: '强力击', maxLevel: 4, targetMode: 'point',
  castRange: [900, 900, 900, 900], manaCost: [90, 100, 110, 120], cooldown: [9, 8, 7, 6],
  castPoint: 0.35, tags: ['nuke', 'aoe'],
  description: '蓄力射出一箭,贯穿伤害直线上的所有敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const dir = V.norm(V.sub(pos, caster.pos));
    const hit = new Set<number>();
    for (let d = 120; d <= 900; d += 140) {
      for (const e of enemiesIn(w, caster, V.add(caster.pos, V.scale(dir, d)), 150)) {
        if (hit.has(e.id)) continue;
        hit.add(e.id);
        spellDamage(w, caster, e, POWER_DMG[lvl - 1]);
      }
    }
    w.emit({ kind: 'fx', fx: 'powershot', pos: V.clone(caster.pos), pos2: V.add(caster.pos, V.scale(dir, 900)) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 900).filter((t) => t.isHero());
    return foes.length ? { score: 52, pos: V.clone(foes[0].pos) } : null;
  },
};

const WIRA_E: AbilityDef = {
  key: 'wira_windrun', name: '疾风步', maxLevel: 4, targetMode: 'none',
  manaCost: [50, 50, 50, 50], cooldown: [15, 13, 11, 9],
  castPoint: 0.0, tags: ['escape', 'buff'],
  description: '化作疾风:大幅提升移速并几乎完全闪避物理攻击。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, { key: 'wira_windrun_buff', duration: 3 + lvl * 0.5, isBuff: true, stats: { evasion: 0.6 + lvl * 0.08, bonusMoveSpeedPct: 0.4 } }, caster.id);
    w.emit({ kind: 'fx', fx: 'windrun', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    return caster.hp / caster.calc.maxHp < 0.4 && enemiesIn(w, caster, caster.pos, 450).length ? { score: 66 } : null;
  },
};

const FOCUS_AS = [2.0, 3.0, 4.0];

const WIRA_R: AbilityDef = {
  key: 'wira_focus', name: '集中火力', maxLevel: 3, ultimate: true, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [600, 600, 600], manaCost: [100, 100, 100], cooldown: [40, 32, 24],
  scepter: { cooldown: [28, 22, 16], desc: '神杖:冷却降低;集中火力同时为自身施加攻击射程 +200 的光环,箭雨更难躲避。' },
  castPoint: 0.2, tags: ['buff', 'ultimate'],
  description: '锁定目标倾泻箭雨:极大幅提升攻击速度并立即开火。',
  onCast(w, caster, lvl, _pos, target) {
    applyModifier(w, caster, { key: 'wira_focus_buff', duration: 6, isBuff: true, stats: { bonusAttackSpeed: FOCUS_AS[lvl - 1] } }, caster.id);
    if (target && target.team !== caster.team) caster.issueOrder({ type: 'attack', targetId: target.id });
    // 神杖:额外附加攻击射程增益
    if (hasScepter(caster)) {
      applyModifier(w, caster, { key: 'wira_focus_sc_range', duration: 6, isBuff: true, stats: { bonusAttackRange: 200 } }, caster.id);
    }
    w.emit({ kind: 'fx', fx: 'focusfire', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    return foes.length ? { score: 66, targetId: foes[0].id } : null;
  },
};

export const WIRA: HeroDef = {
  key: 'wira', name: '薇尔', title: '疾风游侠', primary: 'agi',
  baseStr: 18, gainStr: 1.8, baseAgi: 18, gainAgi: 2.6, baseInt: 18, gainInt: 2.4,
  baseDamage: [23, 29], baseArmor: 2, baseMs: 295, attackRange: 550,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.4, color: '#aed581', glyph: '游',
  abilities: [WIRA_Q, WIRA_W, WIRA_E, WIRA_R], aiRole: 'ganker',
};

// ============ 斯拉·深渊守望(力量先手) ============

const SLAR_Q: AbilityDef = {
  key: 'slar_sprint', name: '深海冲刺', maxLevel: 4, targetMode: 'none',
  manaCost: [25, 25, 25, 25], cooldown: [13, 12, 11, 10],
  castPoint: 0.0, tags: ['buff', 'escape'],
  description: '极速冲刺,大幅提升移动速度。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, { key: 'slar_sprint_buff', duration: 8, isBuff: true, stats: { bonusMoveSpeedPct: 0.28 + lvl * 0.06 } }, caster.id);
    w.emit({ kind: 'fx', fx: 'sprint', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 900).filter((t) => t.isHero());
    return foes.length && !hasModifier(caster, 'slar_sprint_buff') ? { score: 40 } : null;
  },
};

const CRUSH_DMG = [100, 160, 220, 280];

const SLAR_W: AbilityDef = {
  key: 'slar_crush', name: '深渊重压', maxLevel: 4, targetMode: 'none',
  manaCost: [90, 100, 110, 120], cooldown: [10, 9, 8, 7],
  castPoint: 0.3, tags: ['stun', 'aoe', 'nuke'],
  description: '猛击地面,震晕并重创周围敌人。',
  onCast(w, caster, lvl) {
    damageArea(w, caster, caster.pos, 400, CRUSH_DMG[lvl - 1]);
    modifierArea(w, caster, caster.pos, 400, { key: 'slar_crush_stun', duration: 1.2 + lvl * 0.15, states: { stunned: true } }, 'enemy');
    w.emit({ kind: 'fx', fx: 'crush', pos: V.clone(caster.pos), radius: 400 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 400).filter((t) => t.isHero());
    return foes.length ? { score: 64 + foes.length * 5 } : null;
  },
};

const BASH_DMG = [30, 50, 70, 90];

const SLAR_E: AbilityDef = {
  key: 'slar_bash', name: '深海重击', maxLevel: 4, targetMode: 'passive',
  tags: ['orb'],
  description: '攻击有概率眩晕目标并造成额外伤害。',
  passiveModifier: () => ({ key: 'slar_bash_passive', isBuff: true }),
  orbOnHit(w, attacker, target, lvl) {
    if (target.isBuilding() || !w.rng.chance(0.2)) return;
    spellDamage(w, attacker, target, BASH_DMG[lvl - 1]);
    applyModifier(w, target, { key: 'slar_bash_stun', duration: 0.8, states: { stunned: true } }, attacker.id);
  },
};

const AMP_ARMOR = [8, 12, 16];

const SLAR_R: AbilityDef = {
  key: 'slar_amplify', name: '裂目', maxLevel: 3, ultimate: true, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [700, 700, 700], manaCost: [50, 50, 50], cooldown: [12, 11, 10],
  scepter: { cooldown: [8, 7, 6], desc: '神杖:冷却大幅降低;裂目同时在目标周围 350 范围内溅射裂甲波,周围敌人也承受 50% 的护甲削减效果。' },
  castPoint: 0.2, tags: ['nuke', 'ultimate'],
  description: '撕裂目标护甲并使其减速,令其无所遁形。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    applyModifier(w, target, { key: 'slar_amplify_debuff', duration: 25, stats: { bonusArmor: -AMP_ARMOR[lvl - 1], bonusMoveSpeedPct: -0.2 } }, caster.id);
    // 神杖:周围 350 内的其他敌人承受 50% 护甲削减
    if (hasScepter(caster)) {
      for (const e of enemiesIn(w, caster, target.pos, 350)) {
        if (e.id === target.id) continue;
        applyModifier(w, e, { key: 'slar_amplify_sc_splash', duration: 25, stats: { bonusArmor: -Math.floor(AMP_ARMOR[lvl - 1] * 0.5), bonusMoveSpeedPct: -0.1 } }, caster.id);
      }
      w.emit({ kind: 'fx', fx: 'amplify', pos: V.clone(target.pos), radius: 350 });
    }
    w.emit({ kind: 'fx', fx: 'amplify', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length ? { score: 60, targetId: foes[0].id } : null;
  },
};

export const SLAR: HeroDef = {
  key: 'slar', name: '斯拉', title: '深渊守望', primary: 'str',
  baseStr: 22, gainStr: 2.9, baseAgi: 20, gainAgi: 2.0, baseInt: 15, gainInt: 1.5,
  baseDamage: [27, 33], baseArmor: 3, baseMs: 295, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.4, color: '#4dd0e1', glyph: '渊',
  abilities: [SLAR_Q, SLAR_W, SLAR_E, SLAR_R], aiRole: 'tank',
};

// ============ 昆恩·怒涛上将(力量先手/劈砍) ============

const TORRENT_DMG = [120, 180, 240, 300];
const TORRENT_STUN = [1.4, 1.6, 1.8, 2.0];

const KUN_Q: AbilityDef = {
  key: 'kun_torrent', name: '激流', maxLevel: 4, targetMode: 'point',
  castRange: [750, 750, 750, 750], manaCost: [90, 100, 110, 120], cooldown: [10, 9, 8, 7],
  castPoint: 0.3, tags: ['stun', 'aoe', 'nuke'],
  description: '在目标处蓄起激流,1.5 秒后喷发:击晕、减速并伤害其中敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const at = V.clone(pos);
    applyModifier(w, caster, {
      key: `kun_torrent_${w.tick}`, duration: 1.7, isBuff: true, tickInterval: 1.5,
      onTick(world, _u, m) {
        damageArea(world, caster, at, 300, TORRENT_DMG[lvl - 1]);
        modifierArea(world, caster, at, 300, { key: 'kun_torrent_stun', duration: TORRENT_STUN[lvl - 1], states: { stunned: true }, stats: { bonusMoveSpeedPct: -0.4 } }, 'enemy');
        world.emit({ kind: 'fx', fx: 'torrent', pos: at, radius: 300 });
        m.expiresAt = -Infinity;
      },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'torrent_warn', pos: at, radius: 300 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length ? { score: 54, pos: V.clone(foes[0].pos) } : null;
  },
};

const TIDE_CLEAVE = [0.2, 0.3, 0.4, 0.5];

const KUN_W: AbilityDef = {
  key: 'kun_tide', name: '潮汐之刃', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '巨剑挥砍时溅射劈砍身前的敌人。',
  passiveModifier: (lvl) => ({
    key: 'kun_tide_passive', isBuff: true,
    data: { cleavePct: TIDE_CLEAVE[lvl - 1], cleaveRadius: 350 },
  }),
};

const XMARK_DELAY = [2.0, 2.5, 3.0, 3.5];

const KUN_E: AbilityDef = {
  key: 'kun_xmark', name: '潮位标记', maxLevel: 4, targetMode: 'unit', targetTeam: 'any',
  castRange: [600, 650, 700, 750], manaCost: [70, 70, 70, 70], cooldown: [16, 14, 12, 10],
  castPoint: 0.2, tags: ['slow'],
  description: '标记一个单位,数秒后将其拉回标记位置(可控敌可救友)。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    applyModifier(w, target, {
      key: 'kun_xmark_mark', duration: XMARK_DELAY[lvl - 1],
      stats: { bonusMoveSpeedPct: target.team === caster.team ? 0 : -0.25 },
      data: { mx: target.pos.x, my: target.pos.y },
      onExpire(world, u, m) {
        const p = world.map.nearestWalkable({ x: m.def.data!.mx, y: m.def.data!.my });
        blinkTo(world, u, p);
        world.emit({ kind: 'fx', fx: 'xmark_return', pos: V.clone(p) });
      },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'xmark', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length ? { score: 44, targetId: foes[0].id } : null;
  },
};

const SHIP_DMG = [200, 300, 400];

const KUN_R: AbilityDef = {
  key: 'kun_ship', name: '幽灵船', maxLevel: 3, ultimate: true, targetMode: 'point',
  castRange: [1000, 1000, 1000], manaCost: [125, 150, 175], cooldown: [70, 60, 50],
  scepter: { cooldown: [50, 42, 34], desc: '神杖:冷却降低;幽灵船碰撞半径扩大至 320,且眩晕时间延长至 2.0 秒。' },
  castPoint: 0.3, tags: ['stun', 'aoe', 'nuke', 'ultimate'],
  description: '召来幽灵船冲撞:沿途击晕并重创敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const sc = hasScepter(caster);
    const dir = V.norm(V.sub(pos, caster.pos));
    const shipRadius = sc ? 320 : 220;
    const stunDur = sc ? 2.0 : 1.4;
    const hit = new Set<number>();
    for (let d = 150; d <= 1000; d += 150) {
      const at = V.add(caster.pos, V.scale(dir, d));
      for (const e of enemiesIn(w, caster, at, shipRadius)) {
        if (hit.has(e.id)) continue;
        hit.add(e.id);
        spellDamage(w, caster, e, SHIP_DMG[lvl - 1]);
        applyModifier(w, e, { key: 'kun_ship_stun', duration: stunDur, states: { stunned: true } }, caster.id);
      }
    }
    w.emit({ kind: 'fx', fx: 'ghostship', pos: V.clone(caster.pos), pos2: V.add(caster.pos, V.scale(dir, 1000)) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 900).filter((t) => t.isHero());
    return foes.length ? { score: 72, pos: V.clone(foes[0].pos) } : null;
  },
};

export const KUN: HeroDef = {
  key: 'kun', name: '昆卡', title: '怒涛上将', primary: 'str',
  baseStr: 23, gainStr: 2.9, baseAgi: 17, gainAgi: 1.7, baseInt: 16, gainInt: 1.7,
  baseDamage: [28, 36], baseArmor: 3, baseMs: 300, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.4, color: '#90caf9', glyph: '涛',
  abilities: [KUN_Q, KUN_W, KUN_E, KUN_R], aiRole: 'carry',
};

// ============ 戴泽·微光萨满(智力守护辅助) ============

const POISON_DPS = [14, 22, 30, 38];

const DAZ_Q: AbilityDef = {
  key: 'daz_poison', name: '剧毒之触', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [550, 550, 550, 550], manaCost: [95, 105, 115, 125], cooldown: [12, 11, 10, 9],
  castPoint: 0.3, tags: ['nuke', 'slow'],
  description: '剧毒侵蚀目标:持续造成伤害并减速。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    applyModifier(w, target, {
      key: 'daz_poison_dot', duration: 5, stats: { bonusMoveSpeedPct: -0.3 }, tickInterval: 1,
      onTick: (world, u) => spellDamage(world, caster, u, POISON_DPS[lvl - 1]),
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'poison', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 550).filter((t) => t.isHero());
    return foes.length ? { score: 50, targetId: foes[0].id } : null;
  },
};

const GRAVE_DUR = [4, 4.5, 5, 5.5];

const DAZ_W: AbilityDef = {
  key: 'daz_grave', name: '薄葬', maxLevel: 4, targetMode: 'unit', targetTeam: 'allyOrSelf',
  castRange: [550, 600, 650, 700], manaCost: [80, 90, 100, 110], cooldown: [24, 21, 18, 15],
  castPoint: 0.1, tags: ['buff'],
  description: '为友军施加薄葬:数秒内生命不会降到 1 以下(无法被击杀)。',
  onCast(w, caster, lvl, _pos, target) {
    const t = target && target.team === caster.team ? target : caster;
    applyModifier(w, t, { key: 'daz_grave_buff', duration: GRAVE_DUR[lvl - 1], isBuff: true, data: { preventDeath: 1 } }, caster.id);
    w.emit({ kind: 'fx', fx: 'grave', pos: V.clone(t.pos) });
  },
  aiScore(w, caster) {
    const allies = alliesIn(w, caster, caster.pos, 600).filter((t) => t.isHero() && t.hp / t.calc.maxHp < 0.3 && !hasModifier(t, 'daz_grave_buff'));
    return allies.length ? { score: 90, targetId: allies[0].id } : null;
  },
};

const WAVE_HEAL = [80, 130, 180, 230];

const DAZ_E: AbilityDef = {
  key: 'daz_wave', name: '暗影波', maxLevel: 4, targetMode: 'none',
  manaCost: [90, 105, 120, 135], cooldown: [10, 9, 8, 7],
  castPoint: 0.2, tags: ['heal', 'nuke', 'aoe'],
  description: '涌动暗影波:治疗附近友军,同时灼伤友军身边的敌人。',
  onCast(w, caster, lvl) {
    for (const a of alliesIn(w, caster, caster.pos, 500)) {
      a.hp = Math.min(a.calc.maxHp, a.hp + WAVE_HEAL[lvl - 1]);
      for (const e of enemiesIn(w, caster, a.pos, 250)) spellDamage(w, caster, e, WAVE_HEAL[lvl - 1]);
    }
    w.emit({ kind: 'fx', fx: 'shadowwave', pos: V.clone(caster.pos), radius: 500 });
  },
  aiScore(w, caster) {
    const allies = alliesIn(w, caster, caster.pos, 500).filter((t) => t.isHero() && t.hp / t.calc.maxHp < 0.7);
    return allies.length ? { score: 48 } : null;
  },
};

const WEAVE_DUR = [10, 13, 16];

const DAZ_R: AbilityDef = {
  key: 'daz_weave', name: '编织', maxLevel: 3, ultimate: true, targetMode: 'point',
  castRange: [1000, 1000, 1000], manaCost: [100, 125, 150], cooldown: [80, 70, 60],
  scepter: { cooldown: [55, 48, 40], desc: '神杖:冷却降低;编织织入时间加速,每次 tick 护甲削减量翻倍(-2),友军护甲加成也翻倍(+2)。' },
  castPoint: 0.3, tags: ['buff', 'aoe', 'ultimate'],
  description: '编织时空之力:持续削减区域内敌人护甲、强化友军护甲。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const at = V.clone(pos);
    const sc = hasScepter(caster);
    const armorSwing = sc ? 2 : 1;
    applyModifier(w, caster, {
      key: `daz_weave_${w.tick}`, duration: WEAVE_DUR[lvl - 1], isBuff: true, tickInterval: 0.5,
      onTick(world) {
        for (const e of enemiesIn(world, caster, at, 600)) applyModifier(world, e, { key: 'daz_weave_enemy', duration: 1.2, stackable: true, stats: { bonusArmor: -armorSwing } }, caster.id);
        for (const a of alliesIn(world, caster, at, 600)) applyModifier(world, a, { key: 'daz_weave_ally', duration: 1.2, isBuff: true, stackable: true, stats: { bonusArmor: armorSwing } }, caster.id);
        world.emit({ kind: 'fx', fx: 'weave', pos: at, radius: 600 });
      },
    }, caster.id);
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 800).filter((t) => t.isHero());
    return foes.length >= 2 ? { score: 66, pos: V.clone(centroid(foes)) } : null;
  },
};

export const DAZ: HeroDef = {
  key: 'daz', name: '戴泽', title: '微光萨满', primary: 'int',
  baseStr: 17, gainStr: 1.8, baseAgi: 21, gainAgi: 2.0, baseInt: 22, gainInt: 2.7,
  baseDamage: [21, 27], baseArmor: 1, baseMs: 305, attackRange: 550,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.45, color: '#ce93d8', glyph: '萨',
  abilities: [DAZ_Q, DAZ_W, DAZ_E, DAZ_R], aiRole: 'support',
};

// ============ 帕克·妖灵精怪(智力游走法师) ============

const ORB_DMG = [80, 140, 200, 260];

const PUK_Q: AbilityDef = {
  key: 'puk_orb', name: '幻惑法球', maxLevel: 4, targetMode: 'point',
  castRange: [800, 800, 800, 800], manaCost: [90, 100, 110, 120], cooldown: [9, 8, 7, 6],
  castPoint: 0.3, tags: ['nuke', 'aoe', 'slow'],
  description: '抛出幻惑法球,贯穿伤害并减速直线上的敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const dir = V.norm(V.sub(pos, caster.pos));
    const hit = new Set<number>();
    for (let d = 120; d <= 800; d += 140) {
      for (const e of enemiesIn(w, caster, V.add(caster.pos, V.scale(dir, d)), 170)) {
        if (hit.has(e.id)) continue;
        hit.add(e.id);
        spellDamage(w, caster, e, ORB_DMG[lvl - 1]);
        applyModifier(w, e, { key: 'puk_orb_slow', duration: 2, stats: { bonusMoveSpeedPct: -0.3 } }, caster.id);
      }
    }
    w.emit({ kind: 'fx', fx: 'orb', pos: V.clone(caster.pos), pos2: V.add(caster.pos, V.scale(dir, 800)) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 800).filter((t) => t.isHero());
    return foes.length ? { score: 52, pos: V.clone(foes[0].pos) } : null;
  },
};

const PUK_W: AbilityDef = {
  key: 'puk_rift', name: '微光裂隙', maxLevel: 4, targetMode: 'point',
  castRange: [700, 750, 800, 850], manaCost: [80, 90, 100, 110], cooldown: [14, 13, 12, 11],
  castPoint: 0.1, tags: ['escape', 'aoe'],
  description: '闪现到目标位置,并沉默落点周围的敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    blinkTo(w, caster, pos);
    modifierArea(w, caster, caster.pos, 350, { key: 'puk_rift_silence', duration: 1.5 + lvl * 0.4, states: { silenced: true } }, 'enemy');
    w.emit({ kind: 'fx', fx: 'waningrift', pos: V.clone(caster.pos), radius: 350 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    return foes.length ? { score: 50, pos: V.clone(foes[0].pos) } : null;
  },
};

const PUK_E: AbilityDef = {
  key: 'puk_phase', name: '相位转移', maxLevel: 4, targetMode: 'none',
  manaCost: [20, 20, 20, 20], cooldown: [11, 9, 7, 5],
  castPoint: 0.0, tags: ['escape', 'buff'],
  description: '相位转移:短暂进入虚无,免疫一切伤害(期间无法行动)。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, { key: 'puk_phase_buff', duration: 0.6 + lvl * 0.25, isBuff: true, states: { physImmune: true, magicImmune: true, disarmed: true } }, caster.id);
    w.emit({ kind: 'fx', fx: 'phaseshift', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    return caster.hp / caster.calc.maxHp < 0.25 && enemiesIn(w, caster, caster.pos, 400).length ? { score: 60 } : null;
  },
};

const COIL_DMG = [100, 150, 200];
const COIL_TICK = [40, 60, 80];

const PUK_R: AbilityDef = {
  key: 'puk_coil', name: '梦缠', maxLevel: 3, ultimate: true, targetMode: 'point',
  aoeRadius: [400], // 预览半径(=onCast 实际 AoE 半径)
  castRange: [800, 800, 800], manaCost: [100, 150, 200], cooldown: [80, 70, 60],
  scepter: { cooldown: [55, 48, 40], desc: '神杖:冷却降低;梦缠锁链对受缚目标施加沉默,令其无法在梦魇中施法。' },
  castPoint: 0.3, tags: ['stun', 'aoe', 'nuke', 'ultimate'],
  description: '编织梦境锁链:范围内敌人受初始伤害,并被持续灼烧与减速。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const sc = hasScepter(caster);
    for (const e of enemiesIn(w, caster, pos, 400)) {
      spellDamage(w, caster, e, COIL_DMG[lvl - 1]);
      applyModifier(w, e, {
        key: 'puk_coil_tether', duration: 4 + lvl, stats: { bonusMoveSpeedPct: -0.3 }, tickInterval: 1,
        onTick: (world, u) => spellDamage(world, caster, u, COIL_TICK[lvl - 1]),
      }, caster.id);
      // 神杖:附加沉默,锁缠目标无法施法
      if (sc) {
        applyModifier(w, e, { key: 'puk_coil_sc_silence', duration: 4 + lvl, states: { silenced: true } }, caster.id);
      }
    }
    w.emit({ kind: 'fx', fx: 'dreamcoil', pos: V.clone(pos), radius: 400 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 800).filter((t) => t.isHero());
    return foes.length >= 2 ? { score: 70, pos: V.clone(centroid(foes)) } : null;
  },
};

export const PUK: HeroDef = {
  key: 'puk', name: '帕克', title: '妖灵精怪', primary: 'int',
  baseStr: 17, gainStr: 1.7, baseAgi: 17, gainAgi: 1.8, baseInt: 23, gainInt: 2.9,
  baseDamage: [21, 27], baseArmor: 2, baseMs: 300, attackRange: 550,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.4, color: '#80deea', glyph: '妖',
  abilities: [PUK_Q, PUK_W, PUK_E, PUK_R], aiRole: 'ganker',
};

// ============ 斯文·流放骑士(力量物理核心) ============

const BOLT_DMG = [120, 180, 240, 300];

const SVE_Q: AbilityDef = {
  key: 'sve_bolt', name: '风暴之锤', maxLevel: 4, targetMode: 'point',
  aoeRadius: [250], // 预览半径(=onCast 实际 AoE 半径)
  castRange: [600, 600, 600, 600], manaCost: [110, 120, 130, 140], cooldown: [12, 11, 10, 9],
  castPoint: 0.3, tags: ['stun', 'nuke', 'aoe'],
  description: '掷出风暴之锤,击晕并伤害落点处的敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    damageArea(w, caster, pos, 250, BOLT_DMG[lvl - 1]);
    modifierArea(w, caster, pos, 250, { key: 'sve_bolt_stun', duration: 1.6 + lvl * 0.1, states: { stunned: true } }, 'enemy');
    w.emit({ kind: 'fx', fx: 'stormbolt', pos: V.clone(pos), radius: 250 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    return foes.length ? { score: 60, pos: V.clone(foes[0].pos) } : null;
  },
};

const WARCRY_ARMOR = [4, 6, 8, 10];

const SVE_W: AbilityDef = {
  key: 'sve_warcry', name: '战吼', maxLevel: 4, targetMode: 'none',
  manaCost: [25, 25, 25, 25], cooldown: [22, 20, 18, 16],
  castPoint: 0.0, tags: ['buff'],
  description: '发出战吼,提升附近友军的护甲与移动速度。',
  onCast(w, caster, lvl) {
    modifierArea(w, caster, caster.pos, 700, { key: 'sve_warcry_buff', duration: 8, isBuff: true, stats: { bonusArmor: WARCRY_ARMOR[lvl - 1], bonusMoveSpeedPct: 0.12 } }, 'ally');
    w.emit({ kind: 'fx', fx: 'warcry', pos: V.clone(caster.pos), radius: 700 });
  },
  aiScore(w, caster) {
    return enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero()).length ? { score: 38 } : null;
  },
};

const CLEAVE_PCT = [0.2, 0.35, 0.5, 0.65];

const SVE_E: AbilityDef = {
  key: 'sve_cleave', name: '巨力挥砍', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '攻击溅射劈砍身前一片敌人。',
  passiveModifier: (lvl) => ({
    key: 'sve_cleave_passive', isBuff: true,
    data: { cleavePct: CLEAVE_PCT[lvl - 1], cleaveRadius: 350 },
  }),
};

const GODS_DMG = [100, 160, 220];

const SVE_R: AbilityDef = {
  key: 'sve_gods', name: '神之力量', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [100, 150, 200], cooldown: [80, 70, 60],
  scepter: { cooldown: [55, 48, 40], desc: '神杖:冷却降低;爆发神力时引发震击,对周围 400 内敌人造成 150/200/250 魔法伤害。' },
  castPoint: 0.0, tags: ['buff', 'ultimate'],
  description: '爆发神力:大幅提升自身攻击力一段时间。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, { key: 'sve_gods_buff', duration: 25, isBuff: true, stats: { bonusDamage: GODS_DMG[lvl - 1] } }, caster.id);
    // 神杖:爆发时震击周围敌人
    if (hasScepter(caster)) {
      const shockDmg = [150, 200, 250][lvl - 1];
      damageArea(w, caster, caster.pos, 400, shockDmg);
      w.emit({ kind: 'fx', fx: 'godsstrength', pos: V.clone(caster.pos), radius: 400 });
    }
    w.emit({ kind: 'fx', fx: 'godsstrength', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length && !hasModifier(caster, 'sve_gods_buff') ? { score: 70 } : null;
  },
};

export const SVE: HeroDef = {
  key: 'sve', name: '斯文', title: '流放骑士', primary: 'str',
  baseStr: 22, gainStr: 3.0, baseAgi: 19, gainAgi: 2.0, baseInt: 16, gainInt: 1.7,
  baseDamage: [28, 36], baseArmor: 3, baseMs: 295, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.5, color: '#5c6bc0', glyph: '放',
  abilities: [SVE_Q, SVE_W, SVE_E, SVE_R], aiRole: 'carry',
};

export const BATCH10 = [WIRA, SLAR, KUN, DAZ, PUK, SVE];

function centroid(us: Unit[]): Vec2 {
  let cx = 0, cy = 0;
  for (const u of us) { cx += u.pos.x; cy += u.pos.y; }
  return { x: cx / us.length, y: cy / us.length };
}
