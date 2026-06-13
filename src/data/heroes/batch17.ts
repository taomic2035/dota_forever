/** 第十七批 6 名原创英雄:德如/帕格/勒沙/薇洛/晨曦/比斯。 */
import { V, type Vec2 } from '../../core/vec2';
import type { AbilityDef, HeroDef } from './types';
import {
  damageArea, modifierArea, enemiesIn, alliesIn, spellDamage, blinkTo, summonUnit, hasScepter,
} from '../../sim/abilities';
import { applyModifier, hasModifier } from '../../sim/modifiers';
import type { Unit } from '../../sim/unit';
import type { World } from '../../sim/world';

// ============ 德如·熊灵德鲁伊(力量召唤核心) ============

const BEAR_HP = [900, 1300, 1700, 2100];

const DRU_Q: AbilityDef = {
  key: 'dru_bear', name: '召唤灵熊', maxLevel: 4, targetMode: 'none',
  manaCost: [75, 75, 75, 75], cooldown: [40, 36, 32, 28],
  castPoint: 0.3, tags: ['buff'],
  description: '召唤一头强壮的灵熊并肩作战(存活久、肉厚)。',
  onCast(w, caster, lvl) {
    // 已有灵熊则先移除旧的
    for (const u of w.units.values()) if (u.alive && u.name === '灵熊' && u.summonOwnerId === caster.id) { u.alive = false; u.diedAt = w.time; }
    summonUnit(w, caster, { name: '灵熊', hp: BEAR_HP[lvl - 1], dmg: [30 + lvl * 8, 38 + lvl * 8], armor: 3 + lvl, ms: 320, range: 100, duration: 9999, magicResist: 0.2 }, V.add(caster.pos, { x: 90, y: 60 }), true);
    w.emit({ kind: 'fx', fx: 'spiritbear', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    const bear = [...w.units.values()].some((u) => u.alive && u.name === '灵熊' && u.summonOwnerId === caster.id);
    return bear ? null : { score: 50 };
  },
};

const ROAR_DMG = [80, 130, 180, 230];

const DRU_W: AbilityDef = {
  key: 'dru_roar', name: '野性咆哮', maxLevel: 4, targetMode: 'none',
  manaCost: [80, 90, 100, 110], cooldown: [12, 11, 10, 9],
  castPoint: 0.3, tags: ['nuke', 'aoe', 'slow'],
  description: '发出震慑咆哮,伤害并减速周围敌人。',
  onCast(w, caster, lvl) {
    damageArea(w, caster, caster.pos, 450, ROAR_DMG[lvl - 1]);
    modifierArea(w, caster, caster.pos, 450, { key: 'dru_roar_slow', duration: 3, stats: { bonusMoveSpeedPct: -0.3 } }, 'enemy');
    w.emit({ kind: 'fx', fx: 'savageroar', pos: V.clone(caster.pos), radius: 450 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 450).filter((t) => t.isHero());
    return foes.length ? { score: 48 } : null;
  },
};

const DRU_E: AbilityDef = {
  key: 'dru_synergy', name: '兽性协同', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '与灵熊共鸣:提升自身攻击力与生命回复。',
  passiveModifier: (lvl) => ({ key: 'dru_synergy_passive', isBuff: true, stats: { bonusDamage: lvl * 8, bonusHpRegen: 2 + lvl * 2 } }),
};

const TRUEFORM_DUR = [16, 20, 24];

const DRU_R: AbilityDef = {
  key: 'dru_trueform', name: '真身形态', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [50, 50, 50], cooldown: [70, 60, 50],
  scepter: { cooldown: [50, 42, 34], desc: '神杖:冷却降低;化身时同时召唤一头神兽灵熊,并震击周围 400 内敌人。' },
  castPoint: 0.2, tags: ['buff', 'ultimate'],
  description: '化身真熊形态:大幅提升生命、护甲与攻击力。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, {
      key: 'dru_trueform_buff', duration: TRUEFORM_DUR[lvl - 1], isBuff: true,
      stats: { bonusHp: 300 + lvl * 150, bonusArmor: 6 + lvl * 2, bonusDamage: 30 + lvl * 20 },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'trueform', pos: V.clone(caster.pos) });
    // 神杖:召唤神兽灵熊 + 震击周围敌人
    if (hasScepter(caster)) {
      for (const u of w.units.values()) if (u.alive && u.name === '神兽灵熊' && u.summonOwnerId === caster.id) { u.alive = false; u.diedAt = w.time; }
      summonUnit(w, caster, { name: '神兽灵熊', hp: BEAR_HP[lvl - 1] + 400, dmg: [50 + lvl * 10, 58 + lvl * 10], armor: 6 + lvl, ms: 330, range: 100, duration: 9999, magicResist: 0.3 }, V.add(caster.pos, { x: -90, y: 60 }), true);
      damageArea(w, caster, caster.pos, 400, 80 + lvl * 40);
      w.emit({ kind: 'fx', fx: 'spiritbear', pos: V.clone(caster.pos), radius: 400 });
    }
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    return foes.length && !hasModifier(caster, 'dru_trueform_buff') ? { score: 64 } : null;
  },
};

export const DRU: HeroDef = {
  key: 'dru', name: '德如', title: '熊灵德鲁伊', primary: 'str',
  baseStr: 22, gainStr: 2.8, baseAgi: 17, gainAgi: 1.8, baseInt: 16, gainInt: 1.7,
  baseDamage: [26, 32], baseArmor: 3, baseMs: 300, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.45, color: '#8d6e63', glyph: '熊',
  abilities: [DRU_Q, DRU_W, DRU_E, DRU_R], aiRole: 'carry',
};

// ============ 帕格·虚无大师(智力法核消耗) ============

const NBLAST_DMG = [90, 150, 210, 270];

const PUG_Q: AbilityDef = {
  key: 'pug_blast', name: '虚无爆轰', maxLevel: 4, targetMode: 'point',
  castRange: [800, 800, 800, 800], manaCost: [90, 100, 110, 120], cooldown: [6, 6, 6, 6],
  castPoint: 0.45, tags: ['nuke', 'aoe'],
  description: '蓄力片刻后在目标处引爆虚无能量,炸伤范围内敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    damageArea(w, caster, pos, 350, NBLAST_DMG[lvl - 1]);
    w.emit({ kind: 'fx', fx: 'netherblast', pos: V.clone(pos), radius: 350 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 800).filter((t) => t.isHero());
    return foes.length ? { score: 54, pos: V.clone(foes[0].pos) } : null;
  },
};

const PUG_W: AbilityDef = {
  key: 'pug_decrepify', name: '衰老', maxLevel: 4, targetMode: 'unit', targetTeam: 'any',
  castRange: [600, 600, 600, 600], manaCost: [40, 45, 50, 55], cooldown: [7, 6, 5, 4],
  castPoint: 0.2, tags: ['slow'],
  description: '使目标虚无化:免疫物理但移动大幅减速(可虚化友军保命或控制敌人)。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    applyModifier(w, target, { key: 'pug_decrepify_ghost', duration: 3 + lvl * 0.3, states: { physImmune: true }, stats: { bonusMoveSpeedPct: -0.5 } }, caster.id);
    w.emit({ kind: 'fx', fx: 'decrepify', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    return foes.length ? { score: 44, targetId: foes[0].id } : null;
  },
};

const WARD_DPS = [50, 75, 100, 125];

const PUG_E: AbilityDef = {
  key: 'pug_ward', name: '虚无之墙', maxLevel: 4, targetMode: 'point',
  castRange: [600, 600, 600, 600], manaCost: [50, 50, 50, 50], cooldown: [25, 23, 21, 19],
  castPoint: 0.3, tags: ['nuke', 'aoe'],
  description: '在地面布下虚无之墙,持续灼烧周围的敌人 8 秒。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const at = V.clone(pos);
    applyModifier(w, caster, {
      key: `pug_ward_${w.tick}`, duration: 8, isBuff: true, tickInterval: 1,
      onTick(world) {
        for (const e of enemiesIn(world, caster, at, 400)) spellDamage(world, caster, e, WARD_DPS[lvl - 1]);
        world.emit({ kind: 'fx', fx: 'netherward', pos: at, radius: 400 });
      },
    }, caster.id);
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    return foes.length ? { score: 42, pos: V.clone(foes[0].pos) } : null;
  },
};

const DRAIN_TICK = [80, 120, 160];

const PUG_R: AbilityDef = {
  key: 'pug_drain', name: '生命汲取', maxLevel: 3, ultimate: true, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [600, 600, 600], manaCost: [100, 150, 200], cooldown: [16, 12, 8],
  scepter: { cooldown: [10, 7, 4], desc: '神杖:冷却大幅降低;每 tick 额外汲取 50% 生命,并对目标周围 350 内敌人造成溢出汲取伤害。' },
  castPoint: 0.1, tags: ['nuke', 'channel', 'ultimate'],
  description: '引导汲取目标生命,并转化为自身生命。',
  onCast(w, caster, _lvl, _pos, target) {
    if (target) w.emit({ kind: 'fx', fx: 'lifedrain', pos: V.clone(target.pos) });
  },
  channel: {
    duration: (lvl) => 4 + lvl,
    tickInterval: 0.4,
    onChannelTick(w, caster, lvl) {
      const t = caster.channeling?.targetId ? w.getUnit(caster.channeling.targetId) : undefined;
      if (!t || !t.alive || V.dist(caster.pos, t.pos) > 700) { if (caster.channeling) caster.channeling.until = -Infinity; return; }
      const base = DRAIN_TICK[lvl - 1];
      const tick = hasScepter(caster) ? Math.round(base * 1.5) : base;
      const d = spellDamage(w, caster, t, tick);
      caster.hp = Math.min(caster.calc.maxHp, caster.hp + d);
      // 神杖:溢出汲取波及周围敌人
      if (hasScepter(caster)) {
        for (const e of enemiesIn(w, caster, t.pos, 350)) {
          if (e.id === t.id) continue;
          spellDamage(w, caster, e, Math.round(base * 0.5));
        }
      }
    },
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    return foes.length ? { score: 62, targetId: foes[0].id } : null;
  },
};

export const PUG: HeroDef = {
  key: 'pug', name: '帕格', title: '虚无大师', primary: 'int',
  baseStr: 18, gainStr: 2.0, baseAgi: 14, gainAgi: 1.4, baseInt: 24, gainInt: 3.0,
  baseDamage: [21, 27], baseArmor: 1, baseMs: 290, attackRange: 550,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.4, color: '#7e57c2', glyph: '虚',
  abilities: [PUG_Q, PUG_W, PUG_E, PUG_R], aiRole: 'ganker',
};

// ============ 勒沙·受难者(智力范围法师) ============

const SPLIT_DMG = [100, 160, 220, 280];

const LES_Q: AbilityDef = {
  key: 'les_split', name: '裂地', maxLevel: 4, targetMode: 'point',
  castRange: [800, 800, 800, 800], manaCost: [90, 100, 110, 120], cooldown: [9, 8, 7, 6],
  castPoint: 0.3, tags: ['stun', 'aoe', 'nuke'],
  description: '撕裂大地,短暂延迟后震晕并重创目标区域的敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const at = V.clone(pos);
    applyModifier(w, caster, {
      key: `les_split_${w.tick}`, duration: 0.8, isBuff: true, tickInterval: 0.6,
      onTick(world, _u, m) {
        damageArea(world, caster, at, 350, SPLIT_DMG[lvl - 1]);
        modifierArea(world, caster, at, 350, { key: 'les_split_stun', duration: 1.3, states: { stunned: true } }, 'enemy');
        world.emit({ kind: 'fx', fx: 'splitearth', pos: at, radius: 350 });
        m.expiresAt = -Infinity;
      },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'splitearth_warn', pos: at, radius: 350 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 800).filter((t) => t.isHero());
    return foes.length ? { score: 52, pos: V.clone(foes[0].pos) } : null;
  },
};

const EDICT_DPS = [40, 60, 80, 100];

const LES_W: AbilityDef = {
  key: 'les_edict', name: '恶魔敕令', maxLevel: 4, targetMode: 'none',
  manaCost: [90, 100, 110, 120], cooldown: [14, 13, 12, 11],
  castPoint: 0.2, tags: ['nuke', 'aoe'],
  description: '召唤恶魔敕令环绕自身,持续轰击周围敌人 6 秒。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, {
      key: 'les_edict_buff', duration: 6, isBuff: true, tickInterval: 0.5,
      onTick(world, u) { for (const e of enemiesIn(world, u, u.pos, 400)) spellDamage(world, u, e, EDICT_DPS[lvl - 1]); },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'diabolicedict', pos: V.clone(caster.pos), radius: 400 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 400).filter((t) => t.isHero());
    return foes.length ? { score: 48 } : null;
  },
};

const STORM_DMG = [70, 110, 150, 190];

const LES_E: AbilityDef = {
  key: 'les_storm', name: '闪电风暴', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [700, 700, 700, 700], manaCost: [80, 90, 100, 110], cooldown: [6, 5, 4, 3],
  castPoint: 0.3, tags: ['nuke', 'slow'],
  description: '召唤闪电劈向目标并弹向附近敌人,命中者减速。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    const visited = new Set<number>();
    let cur: Unit | undefined = target; let prev = caster.pos;
    for (let i = 0; i < 3 && cur; i++) {
      visited.add(cur.id);
      spellDamage(w, caster, cur, STORM_DMG[lvl - 1]);
      applyModifier(w, cur, { key: 'les_storm_slow', duration: 1.5, stats: { bonusMoveSpeedPct: -0.25, bonusAttackSpeed: -0.25 } }, caster.id);
      w.emit({ kind: 'fx', fx: 'lightning', pos: V.clone(prev), pos2: V.clone(cur.pos) });
      prev = cur.pos;
      cur = w.queryRadius(cur.pos, 450, (t) => t.team !== caster.team && !t.isBuilding() && !visited.has(t.id) && t.kind !== 'ward')[0];
    }
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length ? { score: 50, targetId: foes[0].id } : null;
  },
};

const NOVA_DPS = [70, 105, 140];

const LES_R: AbilityDef = {
  key: 'les_nova', name: '脉冲新星', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [150, 200, 250], cooldown: [60, 55, 50],
  scepter: { cooldown: [42, 38, 34], desc: '神杖:冷却降低;脉冲新星半径从 500 扩大至 700,持续时间延长至 7 秒。' },
  castPoint: 0.2, tags: ['nuke', 'aoe', 'ultimate'],
  description: '爆发持续的脉冲新星,在 5 秒内不断重创周围所有敌人。',
  onCast(w, caster, lvl) {
    const sc = hasScepter(caster);
    const radius = sc ? 700 : 500;
    const duration = sc ? 7 : 5;
    applyModifier(w, caster, {
      key: 'les_nova_buff', duration, isBuff: true, tickInterval: 0.5,
      onTick(world, u) { for (const e of enemiesIn(world, u, u.pos, radius)) spellDamage(world, u, e, NOVA_DPS[lvl - 1]); },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'pulsenova', pos: V.clone(caster.pos), radius });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 480).filter((t) => t.isHero());
    return foes.length ? { score: 66 + foes.length * 4 } : null;
  },
};

export const LES: HeroDef = {
  key: 'les', name: '勒沙', title: '受难者', primary: 'int',
  baseStr: 19, gainStr: 2.2, baseAgi: 14, gainAgi: 1.4, baseInt: 22, gainInt: 2.9,
  baseDamage: [22, 28], baseArmor: 2, baseMs: 290, attackRange: 550,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.4, color: '#ab47bc', glyph: '难',
  abilities: [LES_Q, LES_W, LES_E, LES_R], aiRole: 'ganker',
};

// ============ 薇洛·林影(智力控制辅助) ============

const MAZE_DPS = [40, 60, 80, 100];

const DWL_Q: AbilityDef = {
  key: 'dwl_maze', name: '荆棘迷宫', maxLevel: 4, targetMode: 'point',
  castRange: [800, 800, 800, 800], manaCost: [90, 100, 110, 120], cooldown: [16, 14, 12, 10],
  castPoint: 0.3, tags: ['stun', 'aoe', 'nuke'],
  description: '在目标区域生出荆棘,定身并持续伤害其中敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    for (const e of enemiesIn(w, caster, pos, 350)) {
      applyModifier(w, e, {
        key: 'dwl_maze_root', duration: 1.5 + lvl * 0.3, states: { rooted: true }, tickInterval: 0.5,
        onTick: (world, u) => spellDamage(world, caster, u, MAZE_DPS[lvl - 1] / 2),
      }, caster.id);
    }
    w.emit({ kind: 'fx', fx: 'bramblemaze', pos: V.clone(pos), radius: 350 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 800).filter((t) => t.isHero());
    return foes.length ? { score: 54, pos: V.clone(foes[0].pos) } : null;
  },
};

const DWL_W: AbilityDef = {
  key: 'dwl_shadow', name: '暗影潜行', maxLevel: 4, targetMode: 'none',
  manaCost: [50, 50, 50, 50], cooldown: [12, 11, 10, 9],
  castPoint: 0.0, tags: ['buff', 'escape'],
  description: '隐入暗影领域:隐身加速,下次施法/攻击附带额外伤害。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, { key: 'dwl_shadow_buff', duration: 6, isBuff: true, states: { invisible: true }, stats: { bonusMoveSpeedPct: 0.2, bonusDamage: 20 + lvl * 20 } }, caster.id);
    w.emit({ kind: 'fx', fx: 'shadowrealm', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    return caster.hp / caster.calc.maxHp < 0.4 && enemiesIn(w, caster, caster.pos, 450).length ? { score: 50 } : null;
  },
};

const CROWN_DMG = [120, 200, 280, 360];

const DWL_E: AbilityDef = {
  key: 'dwl_crown', name: '诅咒之冠', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [600, 600, 600, 600], manaCost: [90, 100, 110, 120], cooldown: [18, 16, 14, 12],
  castPoint: 0.3, tags: ['stun', 'aoe'],
  description: '给目标戴上诅咒之冠:数秒后引爆,眩晕并重创其周围敌人。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    applyModifier(w, target, {
      key: 'dwl_crown_mark', duration: 2.5, tickInterval: 2.5,
      onTick(world, u, m) {
        damageArea(world, caster, u.pos, 300, CROWN_DMG[lvl - 1]);
        modifierArea(world, caster, u.pos, 300, { key: 'dwl_crown_stun', duration: 1.6, states: { stunned: true } }, 'enemy');
        world.emit({ kind: 'fx', fx: 'cursedcrown', pos: V.clone(u.pos), radius: 300 });
        m.expiresAt = -Infinity;
      },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'cursedcrown_mark', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    return foes.length ? { score: 52, targetId: foes[0].id } : null;
  },
};

const FEAR_DUR = [2.5, 3.0, 3.5];

const DWL_R: AbilityDef = {
  key: 'dwl_terror', name: '恐惧', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [100, 125, 150], cooldown: [60, 50, 40],
  scepter: { cooldown: [42, 35, 28], desc: '神杖:冷却降低;恐惧范围扩大至 800,并对每个受影响的敌人施加 0.8 秒真实眩晕。' },
  castPoint: 0.3, tags: ['stun', 'aoe', 'ultimate'],
  description: '释放无边恐惧:周围敌人被吓退,无法攻击与施法并四散奔逃。',
  onCast(w, caster, lvl) {
    const sc = hasScepter(caster);
    const radius = sc ? 800 : 600;
    for (const e of enemiesIn(w, caster, caster.pos, radius)) {
      applyModifier(w, e, { key: 'dwl_terror_fear', duration: FEAR_DUR[lvl - 1], states: { disarmed: true, silenced: true }, stats: { bonusMoveSpeedPct: -0.15 } }, caster.id);
      const away = w.map.nearestWalkable(V.add(e.pos, V.scale(V.norm(V.sub(e.pos, caster.pos)), 700)));
      e.issueOrder({ type: 'move', pos: away });
      // 神杖:附加 0.8 秒眩晕
      if (sc) applyModifier(w, e, { key: 'dwl_terror_sc_stun', duration: 0.8, states: { stunned: true } }, caster.id);
    }
    w.emit({ kind: 'fx', fx: 'terrorize', pos: V.clone(caster.pos), radius });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 550).filter((t) => t.isHero());
    return foes.length >= 2 ? { score: 70 } : null;
  },
};

export const DWL: HeroDef = {
  key: 'dwl', name: '薇洛', title: '林影', primary: 'int',
  baseStr: 18, gainStr: 1.9, baseAgi: 18, gainAgi: 2.0, baseInt: 22, gainInt: 2.7,
  baseDamage: [21, 27], baseArmor: 2, baseMs: 290, attackRange: 550,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.4, color: '#9ccc65', glyph: '影',
  abilities: [DWL_Q, DWL_W, DWL_E, DWL_R], aiRole: 'ganker',
};

// ============ 晨曦·破晓使者(力量先手辅助) ============

const HAMMER_DMG = [90, 150, 210, 270];

const DWN_Q: AbilityDef = {
  key: 'dwn_hammer', name: '圣锤', maxLevel: 4, targetMode: 'point',
  castRange: [900, 900, 900, 900], manaCost: [90, 100, 110, 120], cooldown: [10, 9, 8, 7],
  castPoint: 0.2, tags: ['nuke', 'aoe', 'slow'],
  description: '投出圣锤击向目标方向,随后化身冲向圣锤位置,沿途减速敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const dir = V.norm(V.sub(pos, caster.pos));
    const dist = Math.min(900, V.dist(caster.pos, pos));
    const hit = new Set<number>();
    for (let d = 120; d <= dist; d += 140) {
      for (const e of enemiesIn(w, caster, V.add(caster.pos, V.scale(dir, d)), 160)) {
        if (hit.has(e.id)) continue;
        hit.add(e.id);
        spellDamage(w, caster, e, HAMMER_DMG[lvl - 1]);
        applyModifier(w, e, { key: 'dwn_hammer_slow', duration: 2, stats: { bonusMoveSpeedPct: -0.3 } }, caster.id);
      }
    }
    blinkTo(w, caster, w.map.nearestWalkable(V.add(caster.pos, V.scale(dir, dist))));
    w.emit({ kind: 'fx', fx: 'celestialhammer', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 900).filter((t) => t.isHero());
    return foes.length ? { score: 52, pos: V.clone(foes[0].pos) } : null;
  },
};

const DWN_W: AbilityDef = {
  key: 'dwn_lumin', name: '光耀', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '攻击有概率打出强力暴击,并治疗自身。',
  passiveModifier: (lvl) => ({
    key: 'dwn_lumin_passive', isBuff: true,
    stats: { critChance: 0.25, critMultiplier: 1.5 + lvl * 0.15, lifesteal: 0.1 + lvl * 0.04 },
  }),
};

const STAR_DMG = [70, 110, 150, 190];

const DWN_E: AbilityDef = {
  key: 'dwn_starbreaker', name: '破晓', maxLevel: 4, targetMode: 'none',
  manaCost: [90, 100, 110, 120], cooldown: [11, 10, 9, 8],
  castPoint: 0.4, tags: ['stun', 'aoe', 'nuke'],
  description: '旋身重击周身敌人:造成伤害并在末段击晕。',
  onCast(w, caster, lvl) {
    for (const e of enemiesIn(w, caster, caster.pos, 350)) {
      spellDamage(w, caster, e, STAR_DMG[lvl - 1]);
      applyModifier(w, e, { key: 'dwn_starbreaker_stun', duration: 1.0, states: { stunned: true } }, caster.id);
    }
    w.emit({ kind: 'fx', fx: 'starbreaker', pos: V.clone(caster.pos), radius: 350 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 350).filter((t) => t.isHero());
    return foes.length ? { score: 54 } : null;
  },
};

const SOLAR_HEAL = [200, 300, 400];

const DWN_R: AbilityDef = {
  key: 'dwn_solar', name: '旭日守护', maxLevel: 3, ultimate: true, targetMode: 'unit', targetTeam: 'allyOrSelf',
  castRange: [99999, 99999, 99999], manaCost: [100, 100, 100], cooldown: [100, 90, 80],
  scepter: { cooldown: [70, 62, 54], desc: '神杖:冷却降低;旭日守护范围从 600 扩大至 900,同时赋予区域内友军 3 秒护甲加成。' },
  castPoint: 0.3, tags: ['heal', 'aoe', 'ultimate'],
  description: '降临到一名友军身边,治疗并伤害落点周围的敌我双方阵营。',
  onCast(w, caster, lvl, _pos, target) {
    const dest = target && target.team === caster.team ? target.pos : caster.pos;
    blinkTo(w, caster, w.map.nearestWalkable(V.add(dest, { x: 60, y: 0 })));
    const sc = hasScepter(caster);
    const radius = sc ? 900 : 600;
    for (const a of alliesIn(w, caster, caster.pos, radius)) {
      a.hp = Math.min(a.calc.maxHp, a.hp + SOLAR_HEAL[lvl - 1]);
      // 神杖:附加护甲 buff
      if (sc) applyModifier(w, a, { key: 'dwn_solar_sc_armor', duration: 3, isBuff: true, stats: { bonusArmor: 6 + lvl * 2 } }, caster.id);
    }
    damageArea(w, caster, caster.pos, radius, SOLAR_HEAL[lvl - 1] * 0.5);
    w.emit({ kind: 'fx', fx: 'solarguardian', pos: V.clone(caster.pos), radius });
  },
  aiScore(w, caster) {
    const allies = [...w.units.values()].filter((u) => u.isHero() && u.alive && u.team === caster.team && u.id !== caster.id && u.hp / u.calc.maxHp < 0.4);
    return allies.length ? { score: 60, targetId: allies[0].id } : null;
  },
};

export const DWN: HeroDef = {
  key: 'dwn', name: '晨曦', title: '破晓使者', primary: 'str',
  baseStr: 23, gainStr: 2.9, baseAgi: 16, gainAgi: 1.6, baseInt: 17, gainInt: 1.8,
  baseDamage: [27, 33], baseArmor: 3, baseMs: 305, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.4, color: '#ffd54f', glyph: '曦',
  abilities: [DWN_Q, DWN_W, DWN_E, DWN_R], aiRole: 'tank',
};

// ============ 比斯·原始兽(力量冲锋先手) ============

const ONSLAUGHT_DMG = [100, 160, 220, 280];

const PBST_Q: AbilityDef = {
  key: 'pbst_onslaught', name: '践踏冲锋', maxLevel: 4, targetMode: 'point',
  castRange: [900, 900, 900, 900], manaCost: [90, 100, 110, 120], cooldown: [13, 12, 11, 10],
  castPoint: 0.1, tags: ['stun', 'nuke'],
  description: '咆哮着向目标方向猛冲,撞飞沿途敌人并将其击晕。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const dir = V.norm(V.sub(pos, caster.pos));
    const dist = Math.min(900, V.dist(caster.pos, pos));
    const hit = new Set<number>();
    for (let d = 100; d <= dist; d += 130) {
      for (const e of enemiesIn(w, caster, V.add(caster.pos, V.scale(dir, d)), 170)) {
        if (hit.has(e.id)) continue;
        hit.add(e.id);
        spellDamage(w, caster, e, ONSLAUGHT_DMG[lvl - 1]);
        applyModifier(w, e, { key: 'pbst_onslaught_stun', duration: 1.2, states: { stunned: true } }, caster.id);
      }
    }
    blinkTo(w, caster, w.map.nearestWalkable(V.add(caster.pos, V.scale(dir, dist))));
    w.emit({ kind: 'fx', fx: 'onslaught', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 800).filter((t) => t.isHero());
    return foes.length ? { score: 60, pos: V.clone(foes[0].pos) } : null;
  },
};

const TRAMPLE_DPS = [40, 60, 80, 100];

const PBST_W: AbilityDef = {
  key: 'pbst_trample', name: '顿足', maxLevel: 4, targetMode: 'none',
  manaCost: [70, 80, 90, 100], cooldown: [16, 15, 14, 13],
  castPoint: 0.0, tags: ['nuke', 'aoe', 'buff'],
  description: '进入践踏状态 6 秒:持续踏伤脚下周围的敌人。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, {
      key: 'pbst_trample_buff', duration: 6, isBuff: true, stats: { bonusMoveSpeedPct: 0.1 }, tickInterval: 0.5,
      onTick(world, u) { for (const e of enemiesIn(world, u, u.pos, 350)) spellDamage(world, u, e, TRAMPLE_DPS[lvl - 1]); },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'trample', pos: V.clone(caster.pos), radius: 350 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 350).filter((t) => t.isHero());
    return foes.length ? { score: 48 } : null;
  },
};

const PBST_E: AbilityDef = {
  key: 'pbst_uproar', name: '咆哮', maxLevel: 4, targetMode: 'none',
  manaCost: [40, 40, 40, 40], cooldown: [14, 13, 12, 11],
  castPoint: 0.1, tags: ['buff'],
  description: '愤然咆哮:嘲讽周围敌人攻击自己,并提升自身攻击力与护甲。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, { key: 'pbst_uproar_buff', duration: 5, isBuff: true, stats: { bonusDamage: 20 + lvl * 15, bonusArmor: 4 + lvl } }, caster.id);
    for (const e of enemiesIn(w, caster, caster.pos, 400)) {
      e.tauntedUntil = w.time + 2.5; e.tauntSourceId = caster.id;
    }
    w.emit({ kind: 'fx', fx: 'uproar', pos: V.clone(caster.pos), radius: 400 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 380).filter((t) => t.isHero());
    return foes.length ? { score: 44 } : null;
  },
};

const PULV_TICK = [80, 120, 160];

const PBST_R: AbilityDef = {
  key: 'pbst_pulverize', name: '痛击', maxLevel: 3, ultimate: true, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [300, 300, 300], manaCost: [125, 150, 175], cooldown: [90, 80, 70],
  scepter: { cooldown: [65, 56, 48], desc: '神杖:冷却降低;每次砸击同时波及目标周围 300 内的敌人,造成 50% 分散伤害并击晕。' },
  castPoint: 0.3, tags: ['stun', 'channel', 'ultimate'],
  description: '抓住目标连续猛砸:引导期间反复造成伤害并击晕。',
  onCast(w, caster, _lvl, _pos, target) {
    if (target) w.emit({ kind: 'fx', fx: 'pulverize', pos: V.clone(target.pos) });
  },
  channel: {
    duration: (lvl) => 2.5 + lvl * 0.5,
    tickInterval: 0.5,
    onChannelTick(w, caster, lvl) {
      const t = caster.channeling?.targetId ? w.getUnit(caster.channeling.targetId) : undefined;
      if (!t || !t.alive || V.dist(caster.pos, t.pos) > 500) { if (caster.channeling) caster.channeling.until = -Infinity; return; }
      spellDamage(w, caster, t, PULV_TICK[lvl - 1]);
      applyModifier(w, t, { key: 'pbst_pulverize_stun', duration: 0.6, states: { stunned: true } }, caster.id);
      // 神杖:波及周围 300 内其他敌人
      if (hasScepter(caster)) {
        for (const e of enemiesIn(w, caster, t.pos, 300)) {
          if (e.id === t.id) continue;
          spellDamage(w, caster, e, Math.round(PULV_TICK[lvl - 1] * 0.5));
          applyModifier(w, e, { key: 'pbst_pulverize_sc_stun', duration: 0.6, states: { stunned: true } }, caster.id);
        }
      }
    },
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 300).filter((t) => t.isHero());
    return foes.length ? { score: 74, targetId: foes[0].id } : null;
  },
};

export const PBST: HeroDef = {
  key: 'pbst', name: '比斯', title: '原始兽', primary: 'str',
  baseStr: 25, gainStr: 3.1, baseAgi: 15, gainAgi: 1.5, baseInt: 15, gainInt: 1.5,
  baseDamage: [28, 34], baseArmor: 3, baseMs: 300, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.5, color: '#6d4c41', glyph: '兽',
  abilities: [PBST_Q, PBST_W, PBST_E, PBST_R], aiRole: 'tank',
};

export const BATCH17 = [DRU, PUG, LES, DWL, DWN, PBST];
