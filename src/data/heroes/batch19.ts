/** 第十九批 6 名原创英雄:沙立/巴特/蛊巫/墨翰/林莺/奥锐。补齐至 112 名经典规模。 */
import { V, type Vec2 } from '../../core/vec2';
import type { AbilityDef, HeroDef } from './types';
import {
  damageArea, modifierArea, enemiesIn, alliesIn, spellDamage, summonUnit,
} from '../../sim/abilities';
import { applyModifier, hasModifier } from '../../sim/modifiers';
import type { Unit } from '../../sim/unit';
import type { World } from '../../sim/world';

// ============ 沙立·流沙领主(力量先手) ============

const BURROW_DMG = [100, 160, 220, 280];

const SNK_Q: AbilityDef = {
  key: 'snk_burrow', name: '穿刺', maxLevel: 4, targetMode: 'point',
  castRange: [600, 600, 600, 600], manaCost: [110, 120, 130, 140], cooldown: [12, 11, 10, 9],
  castPoint: 0.3, tags: ['stun', 'aoe', 'nuke'],
  description: '钻地突袭,挑飞并击晕直线上的敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const dir = V.norm(V.sub(pos, caster.pos));
    const hit = new Set<number>();
    for (let d = 120; d <= 600; d += 130) {
      for (const e of enemiesIn(w, caster, V.add(caster.pos, V.scale(dir, d)), 140)) {
        if (hit.has(e.id)) continue;
        hit.add(e.id);
        spellDamage(w, caster, e, BURROW_DMG[lvl - 1]);
        applyModifier(w, e, { key: 'snk_burrow_stun', duration: 1.5, states: { stunned: true } }, caster.id);
      }
    }
    w.emit({ kind: 'fx', fx: 'burrowstrike', pos: V.clone(caster.pos), pos2: V.add(caster.pos, V.scale(dir, 600)) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    return foes.length ? { score: 60, pos: V.clone(foes[0].pos) } : null;
  },
};

const SANDSTORM_DPS = [40, 60, 80, 100];

const SNK_W: AbilityDef = {
  key: 'snk_sandstorm', name: '沙暴', maxLevel: 4, targetMode: 'none',
  manaCost: [80, 90, 100, 110], cooldown: [14, 13, 12, 11],
  castPoint: 0.0, tags: ['buff', 'aoe', 'nuke'],
  description: '掀起沙暴:期间隐身并持续灼伤周围敌人。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, {
      key: 'snk_sandstorm_buff', duration: 6, isBuff: true, states: { invisible: true }, tickInterval: 0.5,
      onTick(world, u) { for (const e of enemiesIn(world, u, u.pos, 400)) spellDamage(world, u, e, SANDSTORM_DPS[lvl - 1] / 2); },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'sandstorm', pos: V.clone(caster.pos), radius: 400 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 400).filter((t) => t.isHero());
    return foes.length ? { score: 48 } : null;
  },
};

const CAUSTIC_DPS = [20, 32, 44, 56];

const SNK_E: AbilityDef = {
  key: 'snk_caustic', name: '腐尸毒', maxLevel: 4, targetMode: 'passive',
  tags: ['orb'],
  description: '攻击附带腐毒,持续伤害目标;目标死亡时爆开毒云伤害周围。',
  passiveModifier: () => ({ key: 'snk_caustic_passive', isBuff: true }),
  orbOnHit(w, attacker, target, lvl) {
    if (target.isBuilding()) return;
    applyModifier(w, target, {
      key: 'snk_caustic_dot', duration: 5, stackable: false, tickInterval: 0.5,
      onTick: (world, u) => spellDamage(world, attacker, u, CAUSTIC_DPS[lvl - 1] / 2),
      onExpire(world, u) { if (!u.alive) damageArea(world, attacker, u.pos, 350, CAUSTIC_DPS[lvl - 1] * 3); },
    }, attacker.id);
  },
};

const EPI_DPS = [70, 100, 130];

const SNK_R: AbilityDef = {
  key: 'snk_epicenter', name: '地震', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [150, 200, 250], cooldown: [80, 70, 60],
  castPoint: 0.3, tags: ['nuke', 'aoe', 'slow', 'channel', 'ultimate'],
  description: '引导震源:持续爆发一圈圈震荡波,伤害并减速周围敌人。',
  onCast(w, caster) { w.emit({ kind: 'fx', fx: 'epicenter', pos: V.clone(caster.pos), radius: 600 }); },
  channel: {
    duration: (lvl) => 2.5 + lvl * 0.5,
    tickInterval: 0.4,
    onChannelTick(w, caster, lvl) {
      for (const e of enemiesIn(w, caster, caster.pos, 600)) {
        spellDamage(w, caster, e, EPI_DPS[lvl - 1]);
        applyModifier(w, e, { key: 'snk_epi_slow', duration: 0.6, stats: { bonusMoveSpeedPct: -0.3, bonusAttackSpeed: -0.3 } }, caster.id);
      }
      w.emit({ kind: 'fx', fx: 'epicenter', pos: V.clone(caster.pos), radius: 600 });
    },
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 580).filter((t) => t.isHero());
    return foes.length >= 2 ? { score: 72 } : null;
  },
};

export const SNK: HeroDef = {
  key: 'snk', name: '沙立', title: '流沙领主', primary: 'str',
  baseStr: 22, gainStr: 2.7, baseAgi: 18, gainAgi: 2.0, baseInt: 17, gainInt: 1.8,
  baseDamage: [26, 32], baseArmor: 2, baseMs: 300, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.4, color: '#c9a227', glyph: '沙',
  abilities: [SNK_Q, SNK_W, SNK_E, SNK_R], aiRole: 'ganker',
};

// ============ 巴特·焰翼骑士(智力游走) ============

const NAPALM_DMG = [20, 35, 50, 65];

const BAT_Q: AbilityDef = {
  key: 'bat_napalm', name: '黏性烈焰', maxLevel: 4, targetMode: 'unit',
  castRange: [700, 700, 700, 700], manaCost: [20, 25, 30, 35], cooldown: [3, 3, 3, 3],
  castPoint: 0.2, tags: ['nuke', 'slow'],
  description: '涂抹黏性烈焰(可叠加):减速目标并放大其受到的后续火焰伤害。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    spellDamage(w, caster, target, NAPALM_DMG[lvl - 1]);
    applyModifier(w, target, { key: 'bat_napalm_stack', duration: 6, stackable: true, stats: { bonusMoveSpeedPct: -0.05, bonusMagicResist: -0.05 } }, caster.id);
    w.emit({ kind: 'fx', fx: 'stickynapalm', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length ? { score: 44, targetId: foes[0].id } : null;
  },
};

const FBREAK_DMG = [100, 160, 220, 280];

const BAT_W: AbilityDef = {
  key: 'bat_flamebreak', name: '烈焰爆', maxLevel: 4, targetMode: 'point',
  castRange: [800, 800, 800, 800], manaCost: [90, 100, 110, 120], cooldown: [13, 12, 11, 10],
  castPoint: 0.3, tags: ['nuke', 'aoe', 'slow'],
  description: '掷出爆裂火球,炸伤并击退落点处的敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    for (const e of enemiesIn(w, caster, pos, 300)) {
      spellDamage(w, caster, e, FBREAK_DMG[lvl - 1]);
      applyModifier(w, e, { key: 'bat_flamebreak_slow', duration: 2, stats: { bonusMoveSpeedPct: -0.3 } }, caster.id);
      const kb = w.map.nearestWalkable(V.add(e.pos, V.scale(V.norm(V.sub(e.pos, pos)), 150)));
      e.pos = kb; e.prevPos = V.clone(kb); e.path = []; e.pathGoal = null;
    }
    w.emit({ kind: 'fx', fx: 'flamebreak', pos: V.clone(pos), radius: 300 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 800).filter((t) => t.isHero());
    return foes.length ? { score: 50, pos: V.clone(foes[0].pos) } : null;
  },
};

const FIREFLY_DPS = [30, 45, 60, 75];

const BAT_E: AbilityDef = {
  key: 'bat_firefly', name: '萤火', maxLevel: 4, targetMode: 'none',
  manaCost: [100, 100, 100, 100], cooldown: [20, 19, 18, 17],
  castPoint: 0.0, tags: ['buff', 'aoe'],
  description: '展翅飞行:大幅提速,并在身后留下灼烧敌人的火焰。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, {
      key: 'bat_firefly_buff', duration: 10, isBuff: true, stats: { bonusMoveSpeedPct: 0.25 }, tickInterval: 0.5,
      onTick(world, u) { for (const e of enemiesIn(world, u, u.pos, 300)) spellDamage(world, u, e, FIREFLY_DPS[lvl - 1] / 2); },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'firefly', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    return enemiesIn(w, caster, caster.pos, 500).filter((t) => t.isHero()).length ? { score: 40 } : null;
  },
};

const LASSO_DPS = [60, 90, 120];

const BAT_R: AbilityDef = {
  key: 'bat_lasso', name: '烈焰套索', maxLevel: 3, ultimate: true, targetMode: 'unit',
  castRange: [500, 500, 500], manaCost: [125, 150, 175], cooldown: [70, 55, 40],
  castPoint: 0.3, tags: ['stun', 'nuke', 'ultimate'],
  description: '套住目标将其拖在身后:持续灼烧并使其无法行动。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    const back = w.map.nearestWalkable(V.add(caster.pos, V.scale(V.norm(V.sub(target.pos, caster.pos)), -60)));
    target.pos = back; target.prevPos = V.clone(back); target.path = []; target.pathGoal = null;
    applyModifier(w, target, {
      key: 'bat_lasso_drag', duration: 1.8 + lvl * 0.3, states: { stunned: true }, tickInterval: 0.5,
      onTick: (world, u) => spellDamage(world, caster, u, LASSO_DPS[lvl - 1] / 2),
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'flaminglasso', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 500).filter((t) => t.isHero());
    return foes.length ? { score: 70, targetId: foes[0].id } : null;
  },
};

export const BAT: HeroDef = {
  key: 'bat', name: '巴特', title: '焰翼骑士', primary: 'int',
  baseStr: 21, gainStr: 2.6, baseAgi: 16, gainAgi: 1.7, baseInt: 20, gainInt: 2.4,
  baseDamage: [22, 28], baseArmor: 2, baseMs: 305, attackRange: 425,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.4, color: '#ff7043', glyph: '翼',
  abilities: [BAT_Q, BAT_W, BAT_E, BAT_R], aiRole: 'ganker',
};

// ============ 蛊巫·蛊术士(智力召唤控制) ============

const ETHER_DMG = [120, 200, 280, 360];

const SHM_Q: AbilityDef = {
  key: 'shm_ether', name: '以太冲击', maxLevel: 4, targetMode: 'unit',
  castRange: [700, 700, 700, 700], manaCost: [90, 100, 110, 120], cooldown: [8, 7, 6, 5],
  castPoint: 0.3, tags: ['nuke'],
  description: '释放以太冲击劈向目标并弹向附近敌人。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    const visited = new Set<number>();
    let cur: Unit | undefined = target; let prev = caster.pos;
    for (let i = 0; i < 3 && cur; i++) {
      visited.add(cur.id);
      spellDamage(w, caster, cur, ETHER_DMG[lvl - 1]);
      w.emit({ kind: 'fx', fx: 'ethershock', pos: V.clone(prev), pos2: V.clone(cur.pos) });
      prev = cur.pos;
      cur = w.queryRadius(cur.pos, 450, (t) => t.team !== caster.team && !t.isBuilding() && !visited.has(t.id) && t.kind !== 'ward')[0];
    }
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length ? { score: 54, targetId: foes[0].id } : null;
  },
};

const SHM_W: AbilityDef = {
  key: 'shm_hex', name: '妖术', maxLevel: 4, targetMode: 'unit',
  castRange: [550, 550, 550, 550], manaCost: [100, 110, 120, 130], cooldown: [22, 19, 16, 13],
  castPoint: 0.3, tags: ['stun'],
  description: '将目标变为无害形态(沉默+缴械+重度减速)。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    applyModifier(w, target, { key: 'shm_hex_debuff', duration: 1.5 + lvl * 0.5, states: { silenced: true, disarmed: true }, stats: { bonusMoveSpeedPct: -0.55 } }, caster.id);
    w.emit({ kind: 'fx', fx: 'hex', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 550).filter((t) => t.isHero());
    return foes.length ? { score: 60, targetId: foes[0].id } : null;
  },
};

const SHACKLE_DPS = [80, 120, 160, 200];

const SHM_E: AbilityDef = {
  key: 'shm_shackles', name: '枷锁', maxLevel: 4, targetMode: 'unit',
  castRange: [500, 500, 500, 500], manaCost: [110, 120, 130, 140], cooldown: [16, 15, 14, 13],
  castPoint: 0.2, tags: ['stun', 'channel', 'nuke'],
  description: '引导枷锁束缚目标:持续定身并造成伤害。',
  onCast(w, caster, _lvl, _pos, target) {
    if (target) w.emit({ kind: 'fx', fx: 'shackles', pos: V.clone(target.pos) });
  },
  channel: {
    duration: (lvl) => 2 + lvl * 0.4,
    tickInterval: 0.5,
    onChannelTick(w, caster, lvl) {
      const t = caster.channeling?.targetId ? w.getUnit(caster.channeling.targetId) : undefined;
      if (!t || !t.alive || V.dist(caster.pos, t.pos) > 600) { if (caster.channeling) caster.channeling.until = -Infinity; return; }
      spellDamage(w, caster, t, SHACKLE_DPS[lvl - 1] / 2);
      applyModifier(w, t, { key: 'shm_shackles_root', duration: 0.7, states: { rooted: true, disarmed: true } }, caster.id);
    },
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 500).filter((t) => t.isHero());
    return foes.length ? { score: 52, targetId: foes[0].id } : null;
  },
};

const WARD_HP = [120, 160, 200];

const SHM_R: AbilityDef = {
  key: 'shm_wards', name: '群蛇守卫', maxLevel: 3, ultimate: true, targetMode: 'point',
  castRange: [500, 500, 500], manaCost: [150, 175, 200], cooldown: [90, 80, 70],
  castPoint: 0.3, tags: ['ultimate'],
  description: '召出一排群蛇守卫,猛烈攻击附近敌人(攻城利器)。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    for (let i = 0; i < 4; i++) {
      summonUnit(w, caster, { name: '群蛇守卫', hp: WARD_HP[lvl - 1], dmg: [30 + lvl * 12, 36 + lvl * 12], armor: 0, ms: 0, range: 500, duration: 20, magicResist: 0, attackType: 'pierce' }, V.add(pos, { x: (i - 1.5) * 60, y: 0 }), false);
    }
    w.emit({ kind: 'fx', fx: 'serpentwards', pos: V.clone(pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero() || t.isBuilding());
    return foes.length ? { score: 56, pos: V.clone(caster.pos) } : null;
  },
};

export const SHM: HeroDef = {
  key: 'shm', name: '蛊巫', title: '蛊术士', primary: 'int',
  baseStr: 17, gainStr: 1.8, baseAgi: 14, gainAgi: 1.4, baseInt: 23, gainInt: 2.9,
  baseDamage: [22, 28], baseArmor: 1, baseMs: 290, attackRange: 500,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.4, color: '#7cb342', glyph: '蛊',
  abilities: [SHM_Q, SHM_W, SHM_E, SHM_R], aiRole: 'support',
};

// ============ 墨翰·墨魂(智力消耗辅助) ============

const STROKE_DMG = [70, 110, 150, 190];

const GRM_Q: AbilityDef = {
  key: 'grm_stroke', name: '命运一击', maxLevel: 4, targetMode: 'point',
  castRange: [900, 900, 900, 900], manaCost: [90, 100, 110, 120], cooldown: [9, 8, 7, 6],
  castPoint: 0.3, tags: ['nuke', 'aoe'],
  description: '泼出一道墨线,击中的敌人越多每个伤害越高。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const dir = V.norm(V.sub(pos, caster.pos));
    const onLine: Unit[] = [];
    const seen = new Set<number>();
    for (let d = 120; d <= 900; d += 130) {
      for (const e of enemiesIn(w, caster, V.add(caster.pos, V.scale(dir, d)), 150)) { if (!seen.has(e.id)) { seen.add(e.id); onLine.push(e); } }
    }
    const per = STROKE_DMG[lvl - 1] * (1 + (onLine.length - 1) * 0.25);
    for (const e of onLine) spellDamage(w, caster, e, per);
    w.emit({ kind: 'fx', fx: 'strokeoffate', pos: V.clone(caster.pos), pos2: V.add(caster.pos, V.scale(dir, 900)) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 900).filter((t) => t.isHero());
    return foes.length ? { score: 52, pos: V.clone(foes[0].pos) } : null;
  },
};

const PHANTOM_DPS = [40, 60, 80, 100];

const GRM_W: AbilityDef = {
  key: 'grm_phantom', name: '鬼影缠身', maxLevel: 4, targetMode: 'unit',
  castRange: [800, 800, 800, 800], manaCost: [90, 100, 110, 120], cooldown: [14, 13, 12, 11],
  castPoint: 0.3, tags: ['nuke', 'slow'],
  description: '附上鬼影:持续撕咬目标并沉默之。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    applyModifier(w, target, {
      key: 'grm_phantom_latch', duration: 4, states: { silenced: true }, stats: { bonusMoveSpeedPct: -0.2 }, tickInterval: 0.5,
      onTick: (world, u) => spellDamage(world, caster, u, PHANTOM_DPS[lvl - 1] / 2),
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'phantomembrace', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 800).filter((t) => t.isHero());
    return foes.length ? { score: 50, targetId: foes[0].id } : null;
  },
};

const SWELL_DUR = [3, 3.5, 4, 4.5];

const GRM_E: AbilityDef = {
  key: 'grm_swell', name: '墨涌', maxLevel: 4, targetMode: 'unit',
  castRange: [600, 600, 600, 600], manaCost: [80, 90, 100, 110], cooldown: [16, 15, 14, 13],
  castPoint: 0.2, tags: ['buff', 'stun'],
  description: '在友军身上积聚墨力:提供护盾,数秒后炸开震晕周围敌人。',
  onCast(w, caster, lvl, _pos, target) {
    const t = target && target.team === caster.team ? target : caster;
    const m = applyModifier(w, t, {
      key: 'grm_swell_buff', duration: SWELL_DUR[lvl - 1], isBuff: true, stats: { bonusMoveSpeedPct: 0.1 },
      onExpire(world, u) {
        damageArea(world, caster, u.pos, 350, 60 + lvl * 40);
        modifierArea(world, caster, u.pos, 350, { key: 'grm_swell_stun', duration: 1.4, states: { stunned: true } }, 'enemy');
        world.emit({ kind: 'fx', fx: 'inkswell_burst', pos: V.clone(u.pos), radius: 350 });
      },
    }, caster.id);
    m.data!.shield = 100 + lvl * 60;
    w.emit({ kind: 'fx', fx: 'inkswell', pos: V.clone(t.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    return foes.length ? { score: 46, targetId: caster.id } : null;
  },
};

const BIND_DMG = [150, 225, 300];

const GRM_R: AbilityDef = {
  key: 'grm_soulbind', name: '灵魂链结', maxLevel: 3, ultimate: true, targetMode: 'point',
  castRange: [800, 800, 800], manaCost: [125, 150, 175], cooldown: [70, 60, 50],
  castPoint: 0.3, tags: ['nuke', 'aoe', 'slow', 'ultimate'],
  description: '以墨链束缚一片敌人:重创并使其共同减速、持续受创。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    for (const e of enemiesIn(w, caster, pos, 400)) {
      spellDamage(w, caster, e, BIND_DMG[lvl - 1]);
      applyModifier(w, e, {
        key: 'grm_soulbind_link', duration: 4, states: { silenced: true }, stats: { bonusMoveSpeedPct: -0.35 }, tickInterval: 1,
        onTick: (world, u) => spellDamage(world, caster, u, 40 + lvl * 25),
      }, caster.id);
    }
    w.emit({ kind: 'fx', fx: 'soulbind', pos: V.clone(pos), radius: 400 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 800).filter((t) => t.isHero());
    return foes.length >= 2 ? { score: 70, pos: V.clone(centroid(foes)) } : null;
  },
};

export const GRM: HeroDef = {
  key: 'grm', name: '墨翰', title: '墨魂', primary: 'int',
  baseStr: 18, gainStr: 2.0, baseAgi: 15, gainAgi: 1.5, baseInt: 22, gainInt: 2.8,
  baseDamage: [21, 27], baseArmor: 2, baseMs: 290, attackRange: 550,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.4, color: '#5e35b1', glyph: '墨',
  abilities: [GRM_Q, GRM_W, GRM_E, GRM_R], aiRole: 'support',
};

// ============ 林莺·魅惑使者(智力远程辅助) ============

const ENCH_W: AbilityDef = {
  key: 'ench_enchant', name: '魅惑', maxLevel: 4, targetMode: 'unit',
  castRange: [600, 600, 600, 600], manaCost: [50, 55, 60, 65], cooldown: [11, 10, 9, 8],
  castPoint: 0.2, tags: ['slow'],
  description: '魅惑目标:大幅削减其攻速与移速(对中立生物则收为己用)。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    applyModifier(w, target, { key: 'ench_enchant_debuff', duration: 4 + lvl * 0.5, stats: { bonusMoveSpeedPct: -0.4, bonusAttackSpeed: -0.4 } }, caster.id);
    w.emit({ kind: 'fx', fx: 'enchant', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    return foes.length ? { score: 46, targetId: foes[0].id } : null;
  },
};

const ATTEND_HEAL = [20, 32, 44, 56];

const ENCH_Q: AbilityDef = {
  key: 'ench_attend', name: '自然守护', maxLevel: 4, targetMode: 'none',
  manaCost: [70, 80, 90, 100], cooldown: [16, 15, 14, 13],
  castPoint: 0.0, tags: ['heal', 'buff'],
  description: '召出自然小精灵环绕,持续治疗附近友军 8 秒。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, {
      key: 'ench_attend_buff', duration: 8, isBuff: true, tickInterval: 1,
      onTick(world, u) { for (const a of alliesIn(world, u, u.pos, 500)) a.hp = Math.min(a.calc.maxHp, a.hp + ATTEND_HEAL[lvl - 1]); },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'naturesattendant', pos: V.clone(caster.pos), radius: 500 });
  },
  aiScore(w, caster) {
    const allies = alliesIn(w, caster, caster.pos, 500).filter((t) => t.isHero() && t.hp / t.calc.maxHp < 0.7);
    return allies.length ? { score: 44 } : null;
  },
};

const IMPETUS_PCT = [0.4, 0.55, 0.7, 0.85];

const ENCH_E: AbilityDef = {
  key: 'ench_impetus', name: '推进', maxLevel: 4, targetMode: 'passive',
  tags: ['orb'],
  description: '攻击附带推进之力:距离目标越远附加伤害越高。',
  passiveModifier: () => ({ key: 'ench_impetus_passive', isBuff: true }),
  orbOnHit(w, attacker, target, lvl) {
    if (target.isBuilding()) return;
    const dist = V.dist(attacker.pos, target.pos);
    spellDamage(w, attacker, target, dist * IMPETUS_PCT[lvl - 1] * 0.1);
  },
};

const ENCH_R: AbilityDef = {
  key: 'ench_untouchable', name: '不可侵犯', maxLevel: 3, ultimate: true, targetMode: 'passive',
  tags: ['buff', 'ultimate'],
  description: '不可侵犯:任何攻击林莺的敌人都会被大幅减速。',
  passiveModifier: (lvl) => ({
    key: 'ench_untouchable_passive', isBuff: true,
    data: { retaliateSlowPct: 0.4 + lvl * 0.1, retaliateSlowAs: 0.5 + lvl * 0.1, retaliateSlowDur: 2.5 },
  }),
};

export const ENCH: HeroDef = {
  key: 'ench', name: '林莺', title: '魅惑使者', primary: 'int',
  baseStr: 17, gainStr: 1.8, baseAgi: 16, gainAgi: 1.6, baseInt: 22, gainInt: 2.7,
  baseDamage: [24, 30], baseArmor: 2, baseMs: 295, attackRange: 550,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.4, color: '#aed581', glyph: '莺',
  abilities: [ENCH_Q, ENCH_W, ENCH_E, ENCH_R], aiRole: 'support',
};

// ============ 奥锐·神谕者(智力守护辅助) ============

const FORTUNE_DMG = [80, 130, 180, 230];

const ORA_Q: AbilityDef = {
  key: 'ora_fortune', name: '命运止境', maxLevel: 4, targetMode: 'unit',
  castRange: [700, 700, 700, 700], manaCost: [90, 100, 110, 120], cooldown: [10, 9, 8, 7],
  castPoint: 0.3, tags: ['stun', 'nuke'],
  description: '凝聚命运能量轰击目标:造成伤害并定身。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    spellDamage(w, caster, target, FORTUNE_DMG[lvl - 1]);
    applyModifier(w, target, { key: 'ora_fortune_root', duration: 1.2 + lvl * 0.2, states: { rooted: true } }, caster.id);
    w.emit({ kind: 'fx', fx: 'fortunesend', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length ? { score: 52, targetId: foes[0].id } : null;
  },
};

const EDICT_AMP = [0.2, 0.3, 0.4, 0.5];

const ORA_W: AbilityDef = {
  key: 'ora_edict', name: '命运敕令', maxLevel: 4, targetMode: 'unit',
  castRange: [600, 600, 600, 600], manaCost: [70, 75, 80, 85], cooldown: [13, 12, 11, 10],
  castPoint: 0.2, tags: ['slow'],
  description: '宣告敕令:缴械目标,并放大其所受的魔法伤害。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    applyModifier(w, target, { key: 'ora_edict_debuff', duration: 3 + lvl * 0.4, states: { disarmed: true }, stats: { bonusMagicResist: -EDICT_AMP[lvl - 1] } }, caster.id);
    w.emit({ kind: 'fx', fx: 'fatesedict', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    return foes.length ? { score: 48, targetId: foes[0].id } : null;
  },
};

const FLAMES_HEAL = [180, 280, 380, 480];

const ORA_E: AbilityDef = {
  key: 'ora_flames', name: '净化之焰', maxLevel: 4, targetMode: 'unit',
  castRange: [600, 600, 600, 600], manaCost: [90, 100, 110, 120], cooldown: [6, 5, 4, 3],
  castPoint: 0.2, tags: ['heal', 'nuke'],
  description: '净化之焰:对友军是强力治疗,对敌人是灼烧伤害(先有少量即时伤害)。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    if (target.team === caster.team) {
      spellDamage(w, caster, target, 40); // 即时小伤
      target.hp = Math.min(target.calc.maxHp, target.hp + FLAMES_HEAL[lvl - 1]);
    } else {
      spellDamage(w, caster, target, FLAMES_HEAL[lvl - 1] * 0.6);
    }
    w.emit({ kind: 'fx', fx: 'purifyingflames', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const allies = alliesIn(w, caster, caster.pos, 600).filter((t) => t.isHero() && t.hp / t.calc.maxHp < 0.6);
    return allies.length ? { score: 50, targetId: allies[0].id } : null;
  },
};

const PROMISE_DUR = [6, 7, 8];

const ORA_R: AbilityDef = {
  key: 'ora_promise', name: '虚妄之诺', maxLevel: 3, ultimate: true, targetMode: 'unit',
  castRange: [700, 700, 700], manaCost: [100, 100, 100], cooldown: [90, 80, 70],
  castPoint: 0.2, tags: ['buff', 'heal', 'ultimate'],
  description: '为友军许下虚妄之诺:数秒内大幅减伤并持续回复(救人神技)。',
  onCast(w, caster, lvl, _pos, target) {
    const t = target && target.team === caster.team ? target : caster;
    applyModifier(w, t, {
      key: 'ora_promise_buff', duration: PROMISE_DUR[lvl - 1], isBuff: true, stats: { incomingDamageReduction: 0.5 }, tickInterval: 0.5,
      onTick: (_world, u) => { u.hp = Math.min(u.calc.maxHp, u.hp + 40 + lvl * 20); },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'falsepromise', pos: V.clone(t.pos) });
  },
  aiScore(w, caster) {
    const allies = [...w.units.values()].filter((u) => u.isHero() && u.alive && u.team === caster.team && u.hp / u.calc.maxHp < 0.4);
    return allies.length ? { score: 72, targetId: allies[0].id } : null;
  },
};

export const ORA: HeroDef = {
  key: 'ora', name: '奥锐', title: '神谕者', primary: 'int',
  baseStr: 18, gainStr: 1.9, baseAgi: 14, gainAgi: 1.4, baseInt: 23, gainInt: 2.9,
  baseDamage: [21, 27], baseArmor: 1, baseMs: 290, attackRange: 550,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.4, color: '#ffd54f', glyph: '谕',
  abilities: [ORA_Q, ORA_W, ORA_E, ORA_R], aiRole: 'support',
};

export const BATCH19 = [SNK, BAT, SHM, GRM, ENCH, ORA];

function centroid(us: Unit[]): Vec2 {
  let cx = 0, cy = 0;
  for (const u of us) { cx += u.pos.x; cy += u.pos.y; }
  return { x: cx / us.length, y: cy / us.length };
}
