/** 第十二批 6 名原创英雄:里卡/朱戈/克蕾/塞尔/巴洛/纳克斯。 */
import { V, type Vec2 } from '../../core/vec2';
import type { AbilityDef, HeroDef } from './types';
import {
  modifierArea, enemiesIn, alliesIn, spellDamage, blinkTo, summonUnit, createIllusion, hasScepter,
} from '../../sim/abilities';
import { applyModifier, hasModifier } from '../../sim/modifiers';
import * as Combat from '../../sim/combat';
import type { Unit } from '../../sim/unit';
import type { World } from '../../sim/world';

// ============ 里卡·暗影潜伏(敏捷隐刺) ============

const SMOKE_DUR = [4, 5, 6, 7];

const RIK_Q: AbilityDef = {
  key: 'rik_smoke', name: '烟幕', maxLevel: 4, targetMode: 'point',
  aoeRadius: [350], // 预览半径(=onCast 实际 AoE 半径)
  castRange: [550, 550, 550, 550], manaCost: [80, 90, 100, 110], cooldown: [16, 14, 12, 10],
  castPoint: 0.3, tags: ['slow', 'aoe'],
  description: '抛出烟幕弹:范围内敌人被沉默并减速。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    modifierArea(w, caster, pos, 350, { key: 'rik_smoke_debuff', duration: SMOKE_DUR[lvl - 1], states: { silenced: true }, stats: { bonusMoveSpeedPct: -0.3, evasion: 0 } }, 'enemy');
    w.emit({ kind: 'fx', fx: 'smokescreen', pos: V.clone(pos), radius: 350 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 550).filter((t) => t.isHero());
    return foes.length ? { score: 52, pos: V.clone(foes[0].pos) } : null;
  },
};

const BLINKSTRIKE_DMG = [60, 110, 160, 210];

const RIK_W: AbilityDef = {
  key: 'rik_blinkstrike', name: '闪袭', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [700, 750, 800, 850], manaCost: [40, 45, 50, 55], cooldown: [6, 5, 4, 3],
  castPoint: 0.0, tags: ['nuke'],
  description: '瞬移到目标背后并发动突袭,造成额外伤害。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    blinkTo(w, caster, w.map.nearestWalkable(V.add(target.pos, V.scale(V.norm(V.sub(caster.pos, target.pos)), 120))));
    spellDamage(w, caster, target, BLINKSTRIKE_DMG[lvl - 1]);
    caster.issueOrder({ type: 'attack', targetId: target.id });
    w.emit({ kind: 'fx', fx: 'blinkstrike', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 800).filter((t) => t.isHero());
    return foes.length ? { score: 56, targetId: foes[0].id } : null;
  },
};

const BACKSTAB_DMG = [40, 70, 100, 130];

const RIK_E: AbilityDef = {
  key: 'rik_backstab', name: '背刺', maxLevel: 4, targetMode: 'passive',
  tags: ['orb'],
  description: '匕首精准刺击要害,攻击造成额外背刺伤害。',
  passiveModifier: () => ({ key: 'rik_backstab_passive', isBuff: true }),
  orbOnHit(w, attacker, target, lvl) {
    if (target.isBuilding()) return;
    spellDamage(w, attacker, target, BACKSTAB_DMG[lvl - 1]);
  },
};

const CLOAK_DUR = [20, 30, 40];

const RIK_R: AbilityDef = {
  key: 'rik_cloak', name: '潜行大师', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [50, 50, 50], cooldown: [40, 32, 24],
  scepter: { cooldown: [28, 22, 16], desc: '神杖:冷却降低;潜行持续时间延长至 30/45/60 秒,且额外提升 20% 移速。' },
  castPoint: 0.0, tags: ['buff', 'ultimate'],
  description: '隐入暗影长时间潜行,并大幅提升移动速度伺机突袭。',
  onCast(w, caster, lvl) {
    const sc = hasScepter(caster);
    const dur = sc ? [30, 45, 60][lvl - 1] : CLOAK_DUR[lvl - 1];
    const msPct = sc ? 0.35 + lvl * 0.05 : 0.15 + lvl * 0.05;
    applyModifier(w, caster, { key: 'rik_cloak_buff', duration: dur, isBuff: true, states: { invisible: true }, stats: { bonusMoveSpeedPct: msPct } }, caster.id);
    w.emit({ kind: 'fx', fx: 'permainvis', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    return !hasModifier(caster, 'rik_cloak_buff') ? { score: 44 } : null;
  },
};

export const RIK: HeroDef = {
  key: 'rik', name: '里卡', title: '暗影潜伏', primary: 'agi',
  baseStr: 18, gainStr: 1.9, baseAgi: 21, gainAgi: 2.9, baseInt: 15, gainInt: 1.5,
  baseDamage: [24, 30], baseArmor: 2, baseMs: 305, attackRange: 128,
  projectileSpeed: 0, bat: 1.6, attackPoint: 0.3, color: '#455a64', glyph: '刺',
  abilities: [RIK_Q, RIK_W, RIK_E, RIK_R], aiRole: 'ganker',
};

// ============ 朱戈·剑刃主宰(敏捷物理核心) ============

const BF_DMG = [25, 40, 55, 70];
const BF_DUR = [2.5, 3.0, 3.5, 4.0];

const JUG_Q: AbilityDef = {
  key: 'jug_bladefury', name: '剑刃风暴', maxLevel: 4, targetMode: 'none',
  manaCost: [90, 100, 110, 120], cooldown: [12, 11, 10, 9],
  castPoint: 0.0, tags: ['nuke', 'aoe', 'buff'],
  description: '旋身斩击:期间免疫魔法、持续伤害周围敌人(无法普攻)。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, {
      key: 'jug_bladefury_buff', duration: BF_DUR[lvl - 1], isBuff: true,
      states: { magicImmune: true, disarmed: true }, tickInterval: 0.3,
      onTick(world, u) { for (const e of enemiesIn(world, u, u.pos, 300)) spellDamage(world, u, e, BF_DMG[lvl - 1]); },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'bladefury', pos: V.clone(caster.pos), radius: 300 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 350).filter((t) => t.isHero());
    return foes.length ? { score: 58 } : null;
  },
};

const HW_HEAL = [25, 40, 55, 70];

const JUG_W: AbilityDef = {
  key: 'jug_ward', name: '治疗守卫', maxLevel: 4, targetMode: 'none',
  manaCost: [80, 90, 100, 110], cooldown: [30, 28, 26, 24],
  castPoint: 0.2, tags: ['heal'],
  description: '布置治疗守卫,持续治疗周围友军 12 秒。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, {
      key: 'jug_ward_buff', duration: 12, isBuff: true, tickInterval: 1,
      onTick(world, u) { for (const a of alliesIn(world, u, u.pos, 500)) a.hp = Math.min(a.calc.maxHp, a.hp + HW_HEAL[lvl - 1]); },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'healward', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    const allies = alliesIn(w, caster, caster.pos, 500).filter((t) => t.isHero() && t.hp / t.calc.maxHp < 0.7);
    return allies.length ? { score: 40 } : null;
  },
};

const JUG_E: AbilityDef = {
  key: 'jug_dance', name: '剑舞', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '凌厉剑舞:获得暴击几率。',
  passiveModifier: (lvl) => ({
    key: 'jug_dance_passive', isBuff: true,
    stats: { critChance: 0.15 + lvl * 0.05, critMultiplier: 1.7 + lvl * 0.1 },
  }),
};

const OMNI_HITS = [6, 9, 12];

const JUG_R: AbilityDef = {
  key: 'jug_omni', name: '无敌斩', maxLevel: 3, ultimate: true, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [400, 400, 400], manaCost: [150, 175, 200], cooldown: [130, 120, 110],
  scepter: { cooldown: [95, 85, 75], desc: '神杖:冷却降低;斩击次数增加 3 次,每斩额外造成 50 点纯粹伤害。' },
  castPoint: 0.2, tags: ['nuke', 'ultimate'],
  description: '化作剑影在敌群间穿梭,连续斩击附近的敌人多次。',
  onCast(w, caster, lvl) {
    const sc = hasScepter(caster);
    const n = OMNI_HITS[lvl - 1] + (sc ? 3 : 0);
    for (let i = 0; i < n; i++) {
      const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.alive);
      if (!foes.length) break;
      const tgt = foes[i % foes.length];
      blinkTo(w, caster, w.map.nearestWalkable(V.add(tgt.pos, { x: Math.cos(i) * 70, y: Math.sin(i) * 70 })));
      Combat.dealAttackDamage(w, caster, tgt);
      spellDamage(w, caster, tgt, 30 + lvl * 20);
      // 神杖:额外纯粹伤害
      if (sc) {
        tgt.hp = Math.max(0, tgt.hp - 50);
        if (tgt.hp === 0) tgt.alive = false;
      }
    }
    w.emit({ kind: 'fx', fx: 'omnislash', pos: V.clone(caster.pos), radius: 600 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 400).filter((t) => t.isHero());
    return foes.length ? { score: 80, targetId: foes[0].id } : null;
  },
};

export const JUG: HeroDef = {
  key: 'jug', name: '朱戈', title: '剑刃主宰', primary: 'agi',
  baseStr: 20, gainStr: 2.2, baseAgi: 22, gainAgi: 2.8, baseInt: 14, gainInt: 1.4,
  baseDamage: [25, 31], baseArmor: 3, baseMs: 305, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.35, color: '#26a69a', glyph: '剑',
  abilities: [JUG_Q, JUG_W, JUG_E, JUG_R], aiRole: 'carry',
};

// ============ 克蕾·亡灵先知(智力召唤法师) ============

const SWARM_DMG = [90, 150, 210, 270];

const DPR_Q: AbilityDef = {
  key: 'dpr_swarm', name: '蝗群', maxLevel: 4, targetMode: 'point',
  castRange: [700, 700, 700, 700], manaCost: [90, 100, 110, 120], cooldown: [8, 7, 6, 5],
  castPoint: 0.3, tags: ['nuke', 'aoe'],
  description: '放出蝗群,贯穿啃食直线上的敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const dir = V.norm(V.sub(pos, caster.pos));
    const hit = new Set<number>();
    for (let d = 120; d <= 700; d += 140) {
      for (const e of enemiesIn(w, caster, V.add(caster.pos, V.scale(dir, d)), 160)) {
        if (hit.has(e.id)) continue;
        hit.add(e.id);
        spellDamage(w, caster, e, SWARM_DMG[lvl - 1]);
      }
    }
    w.emit({ kind: 'fx', fx: 'cryptswarm', pos: V.clone(caster.pos), pos2: V.add(caster.pos, V.scale(dir, 700)) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length ? { score: 52, pos: V.clone(foes[0].pos) } : null;
  },
};

const DPR_W: AbilityDef = {
  key: 'dpr_silence', name: '沉默', maxLevel: 4, targetMode: 'point',
  aoeRadius: [425], // 预览半径(=onCast 实际 AoE 半径)
  castRange: [900, 900, 900, 900], manaCost: [90, 100, 110, 120], cooldown: [15, 14, 13, 12],
  castPoint: 0.3, tags: ['aoe'],
  description: '在目标区域施放沉默,封禁其中敌人的施法。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    modifierArea(w, caster, pos, 425, { key: 'dpr_silence_debuff', duration: 3 + lvl * 0.7, states: { silenced: true } }, 'enemy');
    w.emit({ kind: 'fx', fx: 'silence', pos: V.clone(pos), radius: 425 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 900).filter((t) => t.isHero());
    return foes.length >= 2 ? { score: 56, pos: V.clone(centroid(foes)) } : null;
  },
};

const SIPHON_DPS = [40, 60, 80, 100];

const DPR_E: AbilityDef = {
  key: 'dpr_siphon', name: '灵魂虹吸', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [600, 600, 600, 600], manaCost: [40, 45, 50, 55], cooldown: [10, 9, 8, 7],
  castPoint: 0.2, tags: ['nuke', 'slow'],
  description: '连接目标持续吸取生命,减速目标并治疗自身。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    applyModifier(w, target, {
      key: 'dpr_siphon_drain', duration: 5, stats: { bonusMoveSpeedPct: -0.2 }, tickInterval: 0.5,
      onTick(world, u) { const d = spellDamage(world, caster, u, SIPHON_DPS[lvl - 1] / 2); caster.hp = Math.min(caster.calc.maxHp, caster.hp + d); },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'spiritsiphon', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    return foes.length ? { score: 46, targetId: foes[0].id } : null;
  },
};

const EXORCISM_SPIRITS = [4, 6, 8];

const DPR_R: AbilityDef = {
  key: 'dpr_exorcism', name: '群魔乱舞', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [150, 200, 250], cooldown: [120, 115, 110],
  scepter: { cooldown: [85, 80, 75], desc: '神杖:冷却降低;恶灵数量额外增加 3 只,持续时间延长至 40 秒。' },
  castPoint: 0.3, tags: ['ultimate'],
  description: '释放一群恶灵环绕作战,自动扑击附近敌人 25 秒。',
  onCast(w, caster, lvl) {
    const sc = hasScepter(caster);
    const count = EXORCISM_SPIRITS[lvl - 1] + (sc ? 3 : 0);
    const dur = sc ? 40 : 25;
    for (let i = 0; i < count; i++) {
      summonUnit(w, caster, {
        name: '恶灵', hp: 120, dmg: [28, 36], armor: 0, ms: 400, range: 150, duration: dur, magicResist: 0.5, attackType: 'pierce',
      }, V.add(caster.pos, { x: (i - Math.floor(count / 2)) * 40, y: 50 }), true);
    }
    w.emit({ kind: 'fx', fx: 'exorcism', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 900).filter((t) => t.isHero());
    return foes.length ? { score: 64 } : { score: 30 };
  },
};

export const DPR: HeroDef = {
  key: 'dpr', name: '克蕾', title: '亡灵先知', primary: 'int',
  baseStr: 18, gainStr: 2.2, baseAgi: 14, gainAgi: 1.4, baseInt: 22, gainInt: 2.9,
  baseDamage: [22, 28], baseArmor: 2, baseMs: 290, attackRange: 550,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.4, color: '#66bb6a', glyph: '亡',
  abilities: [DPR_Q, DPR_W, DPR_E, DPR_R], aiRole: 'carry',
};

// ============ 塞尔·虚灵术士(智力团控/增益) ============

const VAC_DMG = [80, 130, 180, 230];

const DSR_Q: AbilityDef = {
  key: 'dsr_vacuum', name: '真空', maxLevel: 4, targetMode: 'point',
  castRange: [800, 800, 800, 800], manaCost: [90, 110, 130, 150], cooldown: [22, 19, 16, 13],
  castPoint: 0.3, tags: ['stun', 'aoe', 'nuke'],
  description: '撕开真空将范围内敌人吸聚到一点,造成伤害与减速。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const at = V.clone(pos);
    enemiesIn(w, caster, at, 450).forEach((e, i) => {
      const p = w.map.nearestWalkable(V.add(at, { x: Math.cos(i) * 60, y: Math.sin(i) * 60 }));
      e.pos = p; e.prevPos = V.clone(p); e.path = []; e.pathGoal = null;
      spellDamage(w, caster, e, VAC_DMG[lvl - 1]);
      applyModifier(w, e, { key: 'dsr_vacuum_slow', duration: 1.5, stats: { bonusMoveSpeedPct: -0.3 } }, caster.id);
    });
    w.emit({ kind: 'fx', fx: 'vacuum', pos: at, radius: 450 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 800).filter((t) => t.isHero());
    return foes.length >= 2 ? { score: 64, pos: V.clone(centroid(foes)) } : null;
  },
};

const ION_DMG = [16, 26, 36, 46];

const DSR_W: AbilityDef = {
  key: 'dsr_ion', name: '离子外壳', maxLevel: 4, targetMode: 'unit', targetTeam: 'any',
  castRange: [600, 600, 600, 600], manaCost: [70, 80, 90, 100], cooldown: [10, 9, 8, 7],
  castPoint: 0.2, tags: ['nuke', 'aoe'],
  description: '在目标身上附着离子外壳,持续灼烧其周围的敌人。',
  onCast(w, caster, lvl, _pos, target) {
    const t = target ?? caster;
    applyModifier(w, t, {
      key: 'dsr_ion_shell', duration: 15, isBuff: t.team === caster.team, tickInterval: 0.4,
      onTick(world, u) { for (const e of enemiesIn(world, caster, u.pos, 300)) spellDamage(world, caster, e, ION_DMG[lvl - 1]); },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'ionshell', pos: V.clone(t.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    return foes.length ? { score: 48, targetId: caster.id } : null;
  },
};

const DSR_E: AbilityDef = {
  key: 'dsr_surge', name: '激增', maxLevel: 4, targetMode: 'unit', targetTeam: 'allyOrSelf',
  castRange: [600, 600, 600, 600], manaCost: [40, 45, 50, 55], cooldown: [16, 13, 10, 7],
  castPoint: 0.0, tags: ['buff', 'escape'],
  description: '使友军移动速度激增到极限,瞬间拉开或贴近距离。',
  onCast(w, caster, lvl, _pos, target) {
    const t = target && target.team === caster.team ? target : caster;
    applyModifier(w, t, { key: 'dsr_surge_buff', duration: 4, isBuff: true, stats: { bonusMoveSpeedPct: 0.4 + lvl * 0.06 } }, caster.id);
    w.emit({ kind: 'fx', fx: 'surge', pos: V.clone(t.pos) });
  },
  aiScore() { return null; },
};

const WALL_ILLU = [2, 3, 4];

const DSR_R: AbilityDef = {
  key: 'dsr_wall', name: '复制之墙', maxLevel: 3, ultimate: true, targetMode: 'point',
  aoeRadius: [450], // 预览半径(=onCast 实际 AoE 半径)
  castRange: [800, 800, 800], manaCost: [125, 150, 175], cooldown: [100, 90, 80],
  scepter: { cooldown: [70, 62, 55], desc: '神杖:冷却降低;幻象数量额外增加 2 只,减速加深至 60%。' },
  castPoint: 0.3, tags: ['aoe', 'slow', 'ultimate'],
  description: '竖起复制之墙:大幅减速区域内敌人,并召唤自身幻象助战。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const sc = hasScepter(caster);
    const slowPct = sc ? -0.6 : -0.45;
    const illuCount = WALL_ILLU[lvl - 1] + (sc ? 2 : 0);
    modifierArea(w, caster, pos, 450, { key: 'dsr_wall_slow', duration: 5, stats: { bonusMoveSpeedPct: slowPct } }, 'enemy');
    createIllusion(w, caster, illuCount, 0.4, 2, 18);
    w.emit({ kind: 'fx', fx: 'wallreplica', pos: V.clone(pos), radius: 450 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length ? { score: 60, pos: V.clone(foes[0].pos) } : null;
  },
};

export const DSR: HeroDef = {
  key: 'dsr', name: '塞尔', title: '虚灵术士', primary: 'int',
  baseStr: 22, gainStr: 2.6, baseAgi: 14, gainAgi: 1.4, baseInt: 20, gainInt: 2.5,
  baseDamage: [23, 29], baseArmor: 2, baseMs: 295, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.4, color: '#26c6da', glyph: '虚',
  abilities: [DSR_Q, DSR_W, DSR_E, DSR_R], aiRole: 'tank',
};

// ============ 巴洛·野性之王(力量召唤先手) ============

const AXES_DMG = [90, 140, 190, 240];

const BEA_Q: AbilityDef = {
  key: 'bea_axes', name: '野性飞斧', maxLevel: 4, targetMode: 'point',
  castRange: [700, 700, 700, 700], manaCost: [90, 100, 110, 120], cooldown: [9, 8, 7, 6],
  castPoint: 0.3, tags: ['nuke', 'aoe'],
  description: '掷出回旋飞斧,伤害沿途的敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const dir = V.norm(V.sub(pos, caster.pos));
    const hit = new Set<number>();
    for (let d = 120; d <= 700; d += 140) {
      for (const e of enemiesIn(w, caster, V.add(caster.pos, V.scale(dir, d)), 150)) {
        if (hit.has(e.id)) continue;
        hit.add(e.id);
        spellDamage(w, caster, e, AXES_DMG[lvl - 1]);
      }
    }
    w.emit({ kind: 'fx', fx: 'wildaxes', pos: V.clone(caster.pos), pos2: V.add(caster.pos, V.scale(dir, 700)) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length ? { score: 50, pos: V.clone(foes[0].pos) } : null;
  },
};

const BOAR_HP = [350, 500, 650, 800];

const BEA_W: AbilityDef = {
  key: 'bea_call', name: '野性呼唤', maxLevel: 4, targetMode: 'none',
  manaCost: [50, 60, 70, 80], cooldown: [34, 32, 30, 28],
  castPoint: 0.2, tags: ['buff'],
  description: '召唤一头野猪与一只雄鹰协同作战。',
  onCast(w, caster, lvl) {
    summonUnit(w, caster, { name: '战野猪', hp: BOAR_HP[lvl - 1], dmg: [24 + lvl * 5, 30 + lvl * 5], armor: 2, ms: 320, range: 100, duration: 60, magicResist: 0.2 }, V.add(caster.pos, { x: -70, y: 60 }), true);
    summonUnit(w, caster, { name: '雄鹰', hp: 80, dmg: [10, 14], armor: 0, ms: 420, range: 400, duration: 60, magicResist: 0.4, attackType: 'pierce' }, V.add(caster.pos, { x: 70, y: 60 }), true);
    w.emit({ kind: 'fx', fx: 'callofwild', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    return !hasModifier(caster, 'bea_call_cd') ? { score: 42 } : null;
  },
};

const BEA_E: AbilityDef = {
  key: 'bea_inner', name: '野兽之心', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '野性之心鼓舞周围友军,提升攻击速度(光环)。',
  passiveModifier: (lvl) => ({
    key: 'bea_inner_aura', isBuff: true,
    aura: { radius: 900, affects: 'ally', grant: { key: 'bea_inner_buff', isBuff: true, stats: { bonusAttackSpeed: 0.1 + lvl * 0.06 } } },
  }),
};

const ROAR_DMG = [150, 250, 350];
const ROAR_STUN = [2.5, 3.0, 3.5];

const BEA_R: AbilityDef = {
  key: 'bea_roar', name: '原始咆哮', maxLevel: 3, ultimate: true, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [550, 550, 550], manaCost: [100, 150, 200], cooldown: [80, 70, 60],
  scepter: { cooldown: [55, 48, 40], desc: '神杖:冷却降低;余波震退升级为完整击晕(持续 1.5 秒),震慑整片区域。' },
  castPoint: 0.3, tags: ['stun', 'aoe', 'nuke', 'ultimate'],
  description: '发出震天咆哮:重创并长时间击晕目标,余波震退周围敌人。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    const sc = hasScepter(caster);
    spellDamage(w, caster, target, ROAR_DMG[lvl - 1]);
    applyModifier(w, target, { key: 'bea_roar_stun', duration: ROAR_STUN[lvl - 1], states: { stunned: true } }, caster.id);
    for (const e of enemiesIn(w, caster, target.pos, 400)) {
      if (e.id === target.id) continue;
      spellDamage(w, caster, e, ROAR_DMG[lvl - 1] * 0.4);
      if (sc) {
        // 神杖:余波升级为击晕
        applyModifier(w, e, { key: 'bea_roar_aoe_stun', duration: 1.5, states: { stunned: true } }, caster.id);
      } else {
        applyModifier(w, e, { key: 'bea_roar_slow', duration: 2, stats: { bonusMoveSpeedPct: -0.4 } }, caster.id);
      }
    }
    w.emit({ kind: 'fx', fx: 'primalroar', pos: V.clone(target.pos), radius: 400 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 550).filter((t) => t.isHero());
    return foes.length ? { score: 78, targetId: foes[0].id } : null;
  },
};

export const BEA: HeroDef = {
  key: 'bea', name: '巴洛', title: '野性之王', primary: 'str',
  baseStr: 23, gainStr: 2.9, baseAgi: 18, gainAgi: 1.9, baseInt: 16, gainInt: 1.7,
  baseDamage: [27, 33], baseArmor: 3, baseMs: 300, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.45, color: '#8d6e63', glyph: '兽',
  abilities: [BEA_Q, BEA_W, BEA_E, BEA_R], aiRole: 'tank',
};

// ============ 纳克斯·噬魂虫(敏捷反手刺客) ============

const IMPALE_DMG = [90, 150, 210, 270];

const NYX_Q: AbilityDef = {
  key: 'nyx_impale', name: '穿刺', maxLevel: 4, targetMode: 'point',
  castRange: [600, 600, 600, 600], manaCost: [95, 110, 125, 140], cooldown: [13, 12, 11, 10],
  castPoint: 0.3, tags: ['stun', 'aoe', 'nuke'],
  description: '掀起地刺,挑飞并击晕直线上的敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const dir = V.norm(V.sub(pos, caster.pos));
    const hit = new Set<number>();
    for (let d = 120; d <= 600; d += 130) {
      for (const e of enemiesIn(w, caster, V.add(caster.pos, V.scale(dir, d)), 140)) {
        if (hit.has(e.id)) continue;
        hit.add(e.id);
        spellDamage(w, caster, e, IMPALE_DMG[lvl - 1]);
        applyModifier(w, e, { key: 'nyx_impale_stun', duration: 1.6, states: { stunned: true } }, caster.id);
      }
    }
    w.emit({ kind: 'fx', fx: 'impale', pos: V.clone(caster.pos), pos2: V.add(caster.pos, V.scale(dir, 600)) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    return foes.length ? { score: 62, pos: V.clone(foes[0].pos) } : null;
  },
};

const MANABURN_DMG = [0.6, 0.9, 1.2, 1.5];

const NYX_W: AbilityDef = {
  key: 'nyx_manaburn', name: '法力燃烧', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [500, 500, 500, 500], manaCost: [80, 90, 100, 110], cooldown: [20, 16, 12, 8],
  castPoint: 0.2, tags: ['nuke'],
  description: '焚烧目标法力,并按烧掉的法力造成等量伤害。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    const burn = Math.min(target.mp, caster.calc.maxMp * MANABURN_DMG[lvl - 1] * 0.2 + 50 * lvl);
    target.mp = Math.max(0, target.mp - burn);
    spellDamage(w, caster, target, burn);
    w.emit({ kind: 'fx', fx: 'manaburn', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 500).filter((t) => t.isHero() && t.mp > 100);
    return foes.length ? { score: 48, targetId: foes[0].id } : null;
  },
};

const NYX_E: AbilityDef = {
  key: 'nyx_carapace', name: '尖刺甲壳', maxLevel: 4, targetMode: 'none',
  manaCost: [40, 40, 40, 40], cooldown: [16, 13, 10, 7],
  castPoint: 0.0, tags: ['buff'],
  description: '竖起尖刺甲壳:完全格挡下一次伤害,并冻缓来袭的攻击者。',
  onCast(w, caster, lvl) {
    const m = applyModifier(w, caster, {
      key: 'nyx_carapace_buff', duration: 2 + lvl * 0.4, isBuff: true,
      data: { retaliateSlowPct: 0.5, retaliateSlowAs: 0.5, retaliateSlowDur: 2 },
    }, caster.id);
    m.data!.blockInstances = 1;
    w.emit({ kind: 'fx', fx: 'carapace', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    return enemiesIn(w, caster, caster.pos, 350).filter((t) => t.isHero()).length ? { score: 46 } : null;
  },
};

const VENDETTA_DMG = [150, 250, 350];
const VENDETTA_DUR = [25, 30, 35];

const NYX_R: AbilityDef = {
  key: 'nyx_vendetta', name: '复仇', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [100, 125, 150], cooldown: [70, 60, 50],
  scepter: { cooldown: [48, 40, 33], desc: '神杖:冷却降低;复仇爆发伤害提升 50%,潜行持续时间延长至 40/50/60 秒。' },
  castPoint: 0.0, tags: ['buff', 'ultimate'],
  description: '隐入暗影伺机复仇:潜行加速,下次出手附带巨额爆发。',
  onCast(w, caster, lvl) {
    const sc = hasScepter(caster);
    const dur = sc ? [40, 50, 60][lvl - 1] : VENDETTA_DUR[lvl - 1];
    const dmg = sc ? VENDETTA_DMG[lvl - 1] * 1.5 : VENDETTA_DMG[lvl - 1];
    applyModifier(w, caster, {
      key: 'nyx_vendetta_buff', duration: dur, isBuff: true,
      states: { invisible: true }, stats: { bonusMoveSpeedPct: 0.2 }, data: { vendettaDmg: dmg },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'vendetta', pos: V.clone(caster.pos) });
  },
  // 潜行后的首次攻击附带爆发(法球钩子读取标记)
  orbOnHit(w, attacker, target) {
    const m = attacker.modifiers.find((x) => x.key === 'nyx_vendetta_buff');
    if (!m || target.isBuilding()) return;
    spellDamage(w, attacker, target, m.def.data?.vendettaDmg ?? 150);
    attacker.modifiers = attacker.modifiers.filter((x) => x.key !== 'nyx_vendetta_buff');
  },
  aiScore(w, caster) {
    return !hasModifier(caster, 'nyx_vendetta_buff') && caster.hp / caster.calc.maxHp < 0.6 ? { score: 50 } : null;
  },
};

export const NYX: HeroDef = {
  key: 'nyx', name: '纳克斯', title: '噬魂虫', primary: 'agi',
  baseStr: 19, gainStr: 2.2, baseAgi: 19, gainAgi: 2.4, baseInt: 18, gainInt: 2.0,
  baseDamage: [23, 29], baseArmor: 2, baseMs: 300, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.4, color: '#7cb342', glyph: '虫',
  abilities: [NYX_Q, NYX_W, NYX_E, NYX_R], aiRole: 'ganker',
};

export const BATCH12 = [RIK, JUG, DPR, DSR, BEA, NYX];

function centroid(us: Unit[]): Vec2 {
  let cx = 0, cy = 0;
  for (const u of us) { cx += u.pos.x; cy += u.pos.y; }
  return { x: cx / us.length, y: cy / us.length };
}
