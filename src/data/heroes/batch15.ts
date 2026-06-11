/** 第十五批 6 名原创英雄:鲁比/菲尼/潘戈/图斯/基普/崔恩。 */
import { V, type Vec2 } from '../../core/vec2';
import type { AbilityDef, HeroDef } from './types';
import {
  damageArea, modifierArea, enemiesIn, alliesIn, spellDamage, blinkTo,
} from '../../sim/abilities';
import { applyModifier, hasModifier } from '../../sim/modifiers';
import type { Unit } from '../../sim/unit';
import type { World } from '../../sim/world';

// ============ 鲁比·魔导师(智力控制辅助) ============

const TELE_DMG = [80, 130, 180, 230];
const TELE_DUR = [1.4, 1.6, 1.8, 2.0];

const RUB_Q: AbilityDef = {
  key: 'rub_telekinesis', name: '心灵之握', maxLevel: 4, targetMode: 'unit',
  castRange: [550, 550, 550, 550], manaCost: [100, 110, 120, 130], cooldown: [16, 15, 14, 13],
  castPoint: 0.3, tags: ['stun', 'nuke'],
  description: '将目标托举到空中(无法行动),随后重摔在地,震晕落点周围的敌人。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    target.invulnerable = true;
    applyModifier(w, target, {
      key: 'rub_telekinesis_lift', duration: TELE_DUR[lvl - 1], states: { stunned: true },
      onExpire(world, u) {
        u.invulnerable = false; // 托举结束,落地重摔
        spellDamage(world, caster, u, TELE_DMG[lvl - 1]);
        modifierArea(world, caster, u.pos, 300, { key: 'rub_tele_landstun', duration: 1.2, states: { stunned: true } }, 'enemy');
        world.emit({ kind: 'fx', fx: 'telekinesis_land', pos: V.clone(u.pos), radius: 300 });
      },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'telekinesis', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 550).filter((t) => t.isHero());
    return foes.length ? { score: 60, targetId: foes[0].id } : null;
  },
};

const FADE_DMG = [100, 170, 240, 310];

const RUB_W: AbilityDef = {
  key: 'rub_fade', name: '虚法弹', maxLevel: 4, targetMode: 'unit',
  castRange: [700, 700, 700, 700], manaCost: [90, 100, 110, 120], cooldown: [8, 7, 6, 5],
  castPoint: 0.3, tags: ['nuke'],
  description: '弹出一道虚法,造成魔法伤害并削弱目标的攻击力。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    spellDamage(w, caster, target, FADE_DMG[lvl - 1]);
    applyModifier(w, target, { key: 'rub_fade_weaken', duration: 6, stats: { bonusDamagePct: -0.25 } }, caster.id);
    w.emit({ kind: 'fx', fx: 'fadebolt', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    return foes.length ? { score: 52, targetId: foes[0].id } : null;
  },
};

const RUB_E: AbilityDef = {
  key: 'rub_null', name: '虚无力场', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '展开虚无力场,为周围友军提供魔抗(光环)。',
  passiveModifier: (lvl) => ({
    key: 'rub_null_aura', isBuff: true,
    aura: { radius: 900, affects: 'ally', grant: { key: 'rub_null_buff', isBuff: true, stats: { bonusMagicResist: 0.06 + lvl * 0.04 } } },
  }),
};

const DRAIN_TICK = [70, 110, 150];

const RUB_R: AbilityDef = {
  key: 'rub_drain', name: '奥术汲取', maxLevel: 3, ultimate: true, targetMode: 'unit',
  castRange: [600, 600, 600], manaCost: [100, 150, 200], cooldown: [90, 80, 70],
  castPoint: 0.3, tags: ['nuke', 'channel', 'ultimate'],
  description: '引导汲取目标:持续造成伤害并将其生命转化为自身生命。',
  onCast(w, caster, _lvl, _pos, target) {
    if (target) w.emit({ kind: 'fx', fx: 'arcanedrain', pos: V.clone(target.pos) });
  },
  channel: {
    duration: (lvl) => 3 + lvl * 0.5,
    tickInterval: 0.5,
    onChannelTick(w, caster, lvl) {
      const t = caster.channeling?.targetId ? w.getUnit(caster.channeling.targetId) : undefined;
      if (!t || !t.alive || V.dist(caster.pos, t.pos) > 800) { if (caster.channeling) caster.channeling.until = -Infinity; return; }
      const d = spellDamage(w, caster, t, DRAIN_TICK[lvl - 1]);
      caster.hp = Math.min(caster.calc.maxHp, caster.hp + d);
      applyModifier(w, t, { key: 'rub_drain_slow', duration: 0.7, stats: { bonusMoveSpeedPct: -0.3 } }, caster.id);
    },
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    return foes.length ? { score: 64, targetId: foes[0].id } : null;
  },
};

export const RUB: HeroDef = {
  key: 'rub', name: '鲁比', title: '魔导师', primary: 'int',
  baseStr: 18, gainStr: 1.9, baseAgi: 16, gainAgi: 1.6, baseInt: 23, gainInt: 2.9,
  baseDamage: [22, 28], baseArmor: 2, baseMs: 290, attackRange: 550,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.4, color: '#26c6da', glyph: '导',
  abilities: [RUB_Q, RUB_W, RUB_E, RUB_R], aiRole: 'support',
};

// ============ 菲尼·烈阳凤凰(力量/智力火系) ============

const SPIRITS_DMG = [60, 100, 140, 180];

const PHX_Q: AbilityDef = {
  key: 'phx_spirits', name: '烈焰精魂', maxLevel: 4, targetMode: 'point',
  castRange: [900, 900, 900, 900], manaCost: [90, 100, 110, 120], cooldown: [11, 10, 9, 8],
  castPoint: 0.3, tags: ['nuke', 'aoe', 'slow'],
  description: '放出烈焰精魂冲向目标区域,灼烧并降低敌人攻速。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    for (const e of enemiesIn(w, caster, pos, 350)) {
      spellDamage(w, caster, e, SPIRITS_DMG[lvl - 1]);
      applyModifier(w, e, { key: 'phx_spirits_slow', duration: 3, stats: { bonusAttackSpeed: -0.3 } }, caster.id);
    }
    w.emit({ kind: 'fx', fx: 'firespirits', pos: V.clone(pos), radius: 350 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 800).filter((t) => t.isHero());
    return foes.length ? { score: 50, pos: V.clone(foes[0].pos) } : null;
  },
};

const DIVE_DMG = [80, 130, 180, 230];

const PHX_W: AbilityDef = {
  key: 'phx_dive', name: '烈日俯冲', maxLevel: 4, targetMode: 'point',
  castRange: [1000, 1000, 1000, 1000], manaCost: [50, 50, 50, 50], cooldown: [13, 12, 11, 10],
  castPoint: 0.0, tags: ['nuke', 'escape', 'slow'],
  description: '振翅俯冲到目标方向,沿途灼烧并减速敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const dir = V.norm(V.sub(pos, caster.pos));
    const dist = Math.min(1000, V.dist(caster.pos, pos));
    for (let d = 100; d <= dist; d += 150) {
      for (const e of enemiesIn(w, caster, V.add(caster.pos, V.scale(dir, d)), 200)) {
        spellDamage(w, caster, e, DIVE_DMG[lvl - 1]);
        applyModifier(w, e, { key: 'phx_dive_slow', duration: 2, stats: { bonusMoveSpeedPct: -0.3 } }, caster.id);
      }
    }
    blinkTo(w, caster, w.map.nearestWalkable(V.add(caster.pos, V.scale(dir, dist))));
    w.emit({ kind: 'fx', fx: 'icarusdive', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    return caster.hp / caster.calc.maxHp < 0.4 && enemiesIn(w, caster, caster.pos, 400).length ? { score: 56, pos: V.clone(retreat(w, caster)) } : null;
  },
};

const RAY_DMG = [40, 60, 80, 100];

const PHX_E: AbilityDef = {
  key: 'phx_sunray', name: '烈阳光线', maxLevel: 4, targetMode: 'none',
  manaCost: [50, 50, 50, 50], cooldown: [16, 15, 14, 13],
  castPoint: 0.2, tags: ['nuke', 'heal', 'channel'],
  description: '引导一束烈阳:持续治疗周围友军并灼烧周围敌人(消耗自身生命)。',
  onCast() { /* 持续效果在引导 tick 中 */ },
  channel: {
    duration: () => 4,
    tickInterval: 0.5,
    onChannelTick(w, caster, lvl) {
      caster.hp = Math.max(1, caster.hp - 15);
      for (const u of w.queryRadius(caster.pos, 500, (t) => t.alive && !t.isBuilding() && t.kind !== 'ward')) {
        if (u.team === caster.team) u.hp = Math.min(u.calc.maxHp, u.hp + RAY_DMG[lvl - 1] * 0.6);
        else spellDamage(w, caster, u, RAY_DMG[lvl - 1]);
      }
      w.emit({ kind: 'fx', fx: 'sunray', pos: V.clone(caster.pos), radius: 500 });
    },
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 480).filter((t) => t.isHero());
    return foes.length ? { score: 40 } : null;
  },
};

const NOVA_DMG = [200, 300, 400];

const PHX_R: AbilityDef = {
  key: 'phx_supernova', name: '超新星', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [100, 100, 100], cooldown: [110, 100, 90],
  castPoint: 0.2, tags: ['nuke', 'aoe', 'ultimate'],
  description: '燃烧成蛋:期间无敌但无法行动并快速回血,数秒后炸裂震伤周围敌人。',
  onCast(w, caster, lvl) {
    caster.invulnerable = true;
    applyModifier(w, caster, {
      key: 'phx_supernova_egg', duration: 4, isBuff: true, states: { rooted: true, disarmed: true, silenced: true }, tickInterval: 0.5,
      onTick(_world, u) { u.hp = Math.min(u.calc.maxHp, u.hp + u.calc.maxHp * 0.06); },
      onExpire(world, u) {
        u.invulnerable = false;
        for (const e of enemiesIn(world, u, u.pos, 700)) {
          spellDamage(world, caster, e, NOVA_DMG[lvl - 1]);
          applyModifier(world, e, { key: 'phx_nova_stun', duration: 1.4, states: { stunned: true } }, caster.id);
        }
        world.emit({ kind: 'fx', fx: 'supernova', pos: V.clone(u.pos), radius: 700 });
      },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'supernova_egg', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    return caster.hp / caster.calc.maxHp < 0.4 && enemiesIn(w, caster, caster.pos, 600).length ? { score: 66 } : null;
  },
};

export const PHX: HeroDef = {
  key: 'phx', name: '菲尼', title: '烈阳凤凰', primary: 'str',
  baseStr: 22, gainStr: 2.3, baseAgi: 14, gainAgi: 1.4, baseInt: 20, gainInt: 2.2,
  baseDamage: [24, 30], baseArmor: 2, baseMs: 290, attackRange: 550,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.45, color: '#ff8f00', glyph: '凰',
  abilities: [PHX_Q, PHX_W, PHX_E, PHX_R], aiRole: 'support',
};

// ============ 潘戈·穿山斗士(敏捷突进) ============

const SWASH_DMG = [80, 130, 180, 230];

const PAN_Q: AbilityDef = {
  key: 'pan_swash', name: '剑突击', maxLevel: 4, targetMode: 'point',
  castRange: [600, 600, 600, 600], manaCost: [80, 90, 100, 110], cooldown: [8, 7, 6, 5],
  castPoint: 0.1, tags: ['nuke', 'aoe'],
  description: '向目标方向疾冲一段,连斩沿途敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const dir = V.norm(V.sub(pos, caster.pos));
    const dist = Math.min(600, V.dist(caster.pos, pos));
    const hit = new Set<number>();
    for (let d = 100; d <= dist; d += 120) {
      for (const e of enemiesIn(w, caster, V.add(caster.pos, V.scale(dir, d)), 160)) {
        if (hit.has(e.id)) continue;
        hit.add(e.id);
        spellDamage(w, caster, e, SWASH_DMG[lvl - 1]);
      }
    }
    blinkTo(w, caster, w.map.nearestWalkable(V.add(caster.pos, V.scale(dir, dist))));
    w.emit({ kind: 'fx', fx: 'swashbuckle', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    return foes.length ? { score: 52, pos: V.clone(foes[0].pos) } : null;
  },
};

const CRASH_DMG = [90, 150, 210, 270];

const PAN_W: AbilityDef = {
  key: 'pan_crash', name: '盾击', maxLevel: 4, targetMode: 'none',
  manaCost: [80, 90, 100, 110], cooldown: [12, 11, 10, 9],
  castPoint: 0.2, tags: ['nuke', 'aoe', 'buff'],
  description: '猛然盾击四周敌人,并为自身套上护盾。',
  onCast(w, caster, lvl) {
    damageArea(w, caster, caster.pos, 400, CRASH_DMG[lvl - 1]);
    const m = applyModifier(w, caster, { key: 'pan_crash_shield', duration: 6, isBuff: true }, caster.id);
    m.data!.shield = 100 + lvl * 60;
    w.emit({ kind: 'fx', fx: 'shieldcrash', pos: V.clone(caster.pos), radius: 400 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 400).filter((t) => t.isHero());
    return foes.length ? { score: 48 } : null;
  },
};

const PAN_E: AbilityDef = {
  key: 'pan_lucky', name: '幸运一击', maxLevel: 4, targetMode: 'passive',
  tags: ['orb'],
  description: '攻击有概率打出幸运一击,造成额外伤害并减速。',
  passiveModifier: () => ({ key: 'pan_lucky_passive', isBuff: true }),
  orbOnHit(w, attacker, target, lvl) {
    if (target.isBuilding() || !w.rng.chance(0.25)) return;
    spellDamage(w, attacker, target, 30 + lvl * 25);
    applyModifier(w, target, { key: 'pan_lucky_slow', duration: 2, stats: { bonusMoveSpeedPct: -0.3 } }, attacker.id);
  },
};

const ROLL_DUR = [3, 3.5, 4];

const PAN_R: AbilityDef = {
  key: 'pan_roll', name: '滚滚妙妙', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [100, 100, 100], cooldown: [60, 52, 44],
  castPoint: 0.2, tags: ['stun', 'aoe', 'buff', 'ultimate'],
  description: '蜷成滚球高速冲撞:期间提速并撞晕沿途敌人。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, {
      key: 'pan_roll_buff', duration: ROLL_DUR[lvl - 1], isBuff: true,
      stats: { bonusMoveSpeedPct: 0.5 }, tickInterval: 0.3,
      onTick(world, u) {
        for (const e of enemiesIn(world, u, u.pos, 250)) {
          spellDamage(world, caster, e, 40 + lvl * 20);
          applyModifier(world, e, { key: 'pan_roll_stun', duration: 0.5, states: { stunned: true } }, caster.id);
        }
      },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'rollingthunder', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    return foes.length ? { score: 64 } : null;
  },
};

export const PAN: HeroDef = {
  key: 'pan', name: '潘戈', title: '穿山斗士', primary: 'agi',
  baseStr: 19, gainStr: 2.0, baseAgi: 22, gainAgi: 2.7, baseInt: 16, gainInt: 1.6,
  baseDamage: [24, 30], baseArmor: 3, baseMs: 305, attackRange: 128,
  projectileSpeed: 0, bat: 1.6, attackPoint: 0.35, color: '#ffb300', glyph: '穿',
  abilities: [PAN_Q, PAN_W, PAN_E, PAN_R], aiRole: 'carry',
};

// ============ 图斯·巨牙海民(力量先手) ============

const SHARDS_DMG = [80, 120, 160, 200];

const TUS_Q: AbilityDef = {
  key: 'tus_shards', name: '寒冰碎片', maxLevel: 4, targetMode: 'point',
  castRange: [800, 800, 800, 800], manaCost: [90, 100, 110, 120], cooldown: [13, 12, 11, 10],
  castPoint: 0.3, tags: ['nuke', 'aoe', 'slow'],
  description: '抛射寒冰碎片在目标处炸开,伤害并冻缓范围内敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    damageArea(w, caster, pos, 350, SHARDS_DMG[lvl - 1]);
    modifierArea(w, caster, pos, 350, { key: 'tus_shards_slow', duration: 4, stats: { bonusMoveSpeedPct: -0.4 } }, 'enemy');
    w.emit({ kind: 'fx', fx: 'iceshards', pos: V.clone(pos), radius: 350 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 800).filter((t) => t.isHero());
    return foes.length ? { score: 50, pos: V.clone(foes[0].pos) } : null;
  },
};

const SNOWBALL_DMG = [100, 160, 220, 280];

const TUS_W: AbilityDef = {
  key: 'tus_snowball', name: '雪球', maxLevel: 4, targetMode: 'unit',
  castRange: [900, 1000, 1100, 1200], manaCost: [90, 100, 110, 120], cooldown: [15, 14, 13, 12],
  castPoint: 0.0, tags: ['stun', 'nuke'],
  description: '滚起雪球冲向目标,撞击造成伤害并击晕。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    blinkTo(w, caster, w.map.nearestWalkable(V.add(target.pos, V.scale(V.norm(V.sub(caster.pos, target.pos)), 130))));
    spellDamage(w, caster, target, SNOWBALL_DMG[lvl - 1]);
    applyModifier(w, target, { key: 'tus_snowball_stun', duration: 1.2 + lvl * 0.15, states: { stunned: true } }, caster.id);
    w.emit({ kind: 'fx', fx: 'snowball', pos: V.clone(caster.pos), pos2: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 1000).filter((t) => t.isHero());
    return foes.length ? { score: 58, targetId: foes[0].id } : null;
  },
};

const TUS_E: AbilityDef = {
  key: 'tus_sigil', name: '寒霜印记', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '散发寒霜:减缓周围敌人的移动速度(光环)。',
  passiveModifier: (lvl) => ({
    key: 'tus_sigil_aura', isBuff: true,
    aura: { radius: 350, affects: 'enemy', grant: { key: 'tus_sigil_slow', stats: { bonusMoveSpeedPct: -(0.1 + lvl * 0.04) } } },
  }),
};

const PUNCH_DMG = [200, 325, 450];

const TUS_R: AbilityDef = {
  key: 'tus_punch', name: '海象神拳', maxLevel: 3, ultimate: true, targetMode: 'unit',
  castRange: [200, 200, 200], manaCost: [100, 100, 100], cooldown: [40, 32, 24],
  castPoint: 0.3, tags: ['stun', 'nuke', 'ultimate'],
  description: '一记重拳将目标击飞:造成巨额伤害并长时间击晕。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    spellDamage(w, caster, target, PUNCH_DMG[lvl - 1]);
    applyModifier(w, target, { key: 'tus_punch_stun', duration: 1.5 + lvl * 0.3, states: { stunned: true }, stats: { bonusMoveSpeedPct: -0.4 } }, caster.id);
    w.emit({ kind: 'fx', fx: 'walruspunch', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 250).filter((t) => t.isHero());
    return foes.length ? { score: 76, targetId: foes[0].id } : null;
  },
};

export const TUS: HeroDef = {
  key: 'tus', name: '图斯', title: '巨牙海民', primary: 'str',
  baseStr: 23, gainStr: 2.8, baseAgi: 17, gainAgi: 1.7, baseInt: 15, gainInt: 1.5,
  baseDamage: [27, 33], baseArmor: 3, baseMs: 305, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.5, color: '#4fc3f7', glyph: '牙',
  abilities: [TUS_Q, TUS_W, TUS_E, TUS_R], aiRole: 'ganker',
};

// ============ 基普·光之守卫(智力辅助) ============

const ILLUM_DMG = [100, 170, 240, 310];

const KPR_Q: AbilityDef = {
  key: 'kpr_illuminate', name: '集中照明', maxLevel: 4, targetMode: 'point',
  castRange: [900, 900, 900, 900], manaCost: [100, 110, 120, 130], cooldown: [10, 9, 8, 7],
  castPoint: 0.3, tags: ['nuke', 'aoe'],
  description: '凝聚一道光束,灼烧直线上的所有敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const dir = V.norm(V.sub(pos, caster.pos));
    const hit = new Set<number>();
    for (let d = 120; d <= 900; d += 140) {
      for (const e of enemiesIn(w, caster, V.add(caster.pos, V.scale(dir, d)), 180)) {
        if (hit.has(e.id)) continue;
        hit.add(e.id);
        spellDamage(w, caster, e, ILLUM_DMG[lvl - 1]);
      }
    }
    w.emit({ kind: 'fx', fx: 'illuminate', pos: V.clone(caster.pos), pos2: V.add(caster.pos, V.scale(dir, 900)) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 900).filter((t) => t.isHero());
    return foes.length ? { score: 52, pos: V.clone(foes[0].pos) } : null;
  },
};

const CHAKRA_MP = [75, 125, 175, 225];

const KPR_W: AbilityDef = {
  key: 'kpr_chakra', name: '查克拉魔法', maxLevel: 4, targetMode: 'unit',
  castRange: [600, 600, 600, 600], manaCost: [40, 45, 50, 55], cooldown: [13, 12, 11, 10],
  castPoint: 0.1, tags: ['buff'],
  description: '为友军恢复法力。',
  onCast(w, caster, lvl, _pos, target) {
    const t = target && target.team === caster.team ? target : caster;
    t.mp = Math.min(t.calc.maxMp, t.mp + CHAKRA_MP[lvl - 1]);
    w.emit({ kind: 'fx', fx: 'chakra', pos: V.clone(t.pos) });
  },
  aiScore(w, caster) {
    const allies = alliesIn(w, caster, caster.pos, 600).filter((t) => t.isHero() && t.mp / Math.max(1, t.calc.maxMp) < 0.4);
    return allies.length ? { score: 38, targetId: allies[0].id } : null;
  },
};

const BLIND_DMG = [60, 100, 140, 180];

const KPR_E: AbilityDef = {
  key: 'kpr_blind', name: '致盲之光', maxLevel: 4, targetMode: 'none',
  manaCost: [90, 100, 110, 120], cooldown: [16, 15, 14, 13],
  castPoint: 0.3, tags: ['nuke', 'aoe'],
  description: '爆发刺目光芒,震退并致盲周围敌人(短暂无法普攻)。',
  onCast(w, caster, lvl) {
    for (const e of enemiesIn(w, caster, caster.pos, 450)) {
      spellDamage(w, caster, e, BLIND_DMG[lvl - 1]);
      applyModifier(w, e, { key: 'kpr_blind_debuff', duration: 2 + lvl * 0.3, states: { disarmed: true }, stats: { bonusMoveSpeedPct: -0.2 } }, caster.id);
    }
    w.emit({ kind: 'fx', fx: 'blindinglight', pos: V.clone(caster.pos), radius: 450 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 420).filter((t) => t.isHero());
    return foes.length ? { score: 50 } : null;
  },
};

const KPR_R: AbilityDef = {
  key: 'kpr_recall', name: '跃迁', maxLevel: 3, ultimate: true, targetMode: 'unit',
  castRange: [99999, 99999, 99999], manaCost: [75, 75, 75], cooldown: [60, 50, 40],
  castPoint: 0.5, tags: ['buff', 'ultimate'],
  description: '引导后将一名远方友军传送到自己身边,并提升其移速。',
  onCast(w, caster, _lvl, _pos, target) {
    if (!target || target.team !== caster.team) return;
    blinkTo(w, target, w.map.nearestWalkable(V.add(caster.pos, { x: 80, y: 0 })));
    applyModifier(w, target, { key: 'kpr_recall_buff', duration: 4, isBuff: true, stats: { bonusMoveSpeedPct: 0.25 } }, caster.id);
    w.emit({ kind: 'fx', fx: 'recall', pos: V.clone(caster.pos) });
  },
  aiScore() { return null; },
};

export const KPR: HeroDef = {
  key: 'kpr', name: '基普', title: '光之守卫', primary: 'int',
  baseStr: 17, gainStr: 1.7, baseAgi: 14, gainAgi: 1.4, baseInt: 24, gainInt: 3.0,
  baseDamage: [20, 26], baseArmor: 1, baseMs: 290, attackRange: 550,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.4, color: '#fff59d', glyph: '光',
  abilities: [KPR_Q, KPR_W, KPR_E, KPR_R], aiRole: 'support',
};

// ============ 崔恩·森林守护(力量坦克辅助) ============

const SEED_DPS = [30, 45, 60, 75];

const TRN_Q: AbilityDef = {
  key: 'trn_seed', name: '缠绕之种', maxLevel: 4, targetMode: 'unit',
  castRange: [600, 600, 600, 600], manaCost: [90, 100, 110, 120], cooldown: [11, 10, 9, 8],
  castPoint: 0.3, tags: ['stun', 'nuke'],
  description: '种下缠绕之种,定身目标并持续吸取其生命。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    applyModifier(w, target, {
      key: 'trn_seed_root', duration: 1.5 + lvl * 0.3, states: { rooted: true }, tickInterval: 0.5,
      onTick(world, u) { const d = spellDamage(world, caster, u, SEED_DPS[lvl - 1] / 2); caster.hp = Math.min(caster.calc.maxHp, caster.hp + d); },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'leechseed', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    return foes.length ? { score: 54, targetId: foes[0].id } : null;
  },
};

const ARMOR_HEAL = [20, 32, 44, 56];

const TRN_W: AbilityDef = {
  key: 'trn_armor', name: '活体护甲', maxLevel: 4, targetMode: 'unit',
  castRange: [700, 700, 700, 700], manaCost: [50, 55, 60, 65], cooldown: [14, 13, 12, 11],
  castPoint: 0.2, tags: ['heal', 'buff'],
  description: '为友军披上活体护甲:持续回血并提升护甲。',
  onCast(w, caster, lvl, _pos, target) {
    const t = target && target.team === caster.team ? target : caster;
    applyModifier(w, t, {
      key: 'trn_armor_buff', duration: 8, isBuff: true, stats: { bonusArmor: 4 + lvl }, tickInterval: 1,
      onTick: (_world, u) => { u.hp = Math.min(u.calc.maxHp, u.hp + ARMOR_HEAL[lvl - 1]); },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'livingarmor', pos: V.clone(t.pos) });
  },
  aiScore(w, caster) {
    const allies = alliesIn(w, caster, caster.pos, 700).filter((t) => t.isHero() && t.hp / t.calc.maxHp < 0.7);
    return allies.length ? { score: 42, targetId: allies[0].id } : null;
  },
};

const TRN_E: AbilityDef = {
  key: 'trn_bark', name: '树皮坚甲', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '坚硬树皮:减免所受伤害并提升生命。',
  passiveModifier: (lvl) => ({ key: 'trn_bark_passive', isBuff: true, stats: { incomingDamageReduction: 0.05 + lvl * 0.03, bonusHp: lvl * 80 } }),
};

const OVERGROWTH_DPS = [60, 90, 120];

const TRN_R: AbilityDef = {
  key: 'trn_overgrowth', name: '过载生长', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [150, 175, 200], cooldown: [80, 75, 70],
  castPoint: 0.3, tags: ['stun', 'aoe', 'ultimate'],
  description: '召唤藤蔓缠绕周身所有敌人,使其无法移动并持续受伤。',
  onCast(w, caster, lvl) {
    for (const e of enemiesIn(w, caster, caster.pos, 700)) {
      applyModifier(w, e, {
        key: 'trn_overgrowth_root', duration: 2.5 + lvl * 0.5, states: { rooted: true }, tickInterval: 1,
        onTick: (world, u) => spellDamage(world, caster, u, OVERGROWTH_DPS[lvl - 1]),
      }, caster.id);
    }
    w.emit({ kind: 'fx', fx: 'overgrowth', pos: V.clone(caster.pos), radius: 700 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 680).filter((t) => t.isHero());
    return foes.length >= 2 ? { score: 78 } : foes.length ? { score: 54 } : null;
  },
};

export const TRN: HeroDef = {
  key: 'trn', name: '崔恩', title: '森林守护', primary: 'str',
  baseStr: 24, gainStr: 3.0, baseAgi: 13, gainAgi: 1.4, baseInt: 18, gainInt: 1.9,
  baseDamage: [28, 34], baseArmor: 3, baseMs: 290, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.5, color: '#66bb6a', glyph: '树',
  abilities: [TRN_Q, TRN_W, TRN_E, TRN_R], aiRole: 'tank',
};

export const BATCH15 = [RUB, PHX, PAN, TUS, KPR, TRN];

function retreat(w: World, caster: Unit): Vec2 {
  const foes = enemiesIn(w, caster, caster.pos, 600);
  if (!foes.length) return caster.pos;
  let cx = 0, cy = 0;
  for (const f of foes) { cx += f.pos.x; cy += f.pos.y; }
  const away = V.norm(V.sub(caster.pos, { x: cx / foes.length, y: cy / foes.length }));
  return V.add(caster.pos, V.scale(away, 650));
}
