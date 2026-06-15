/** 第二批 6 名原创英雄:戈姆/格罗什/凯/辰/奥兰/墨菲斯。 */
import { V, type Vec2 } from '../../core/vec2';
import type { AbilityDef, HeroDef } from './types';
import {
  damageArea, modifierArea, enemiesIn, alliesIn, spellDamage, blinkTo, hasScepter,
} from '../../sim/abilities';
import { applyModifier, purge, hasModifier } from '../../sim/modifiers';
import { isEnemy } from '../../sim/combat';
import type { Unit } from '../../sim/unit';
import type { World } from '../../sim/world';

// ============ 戈姆·裂地者(力量团控) ============

const QUAKE_DMG = [120, 175, 230, 285];
const QUAKE_STUN = [1.2, 1.4, 1.6, 1.8];

const GORM_Q: AbilityDef = {
  key: 'gorm_quake', name: '裂地震击', maxLevel: 4, targetMode: 'point',
  castRange: [1200, 1200, 1200, 1200], manaCost: [110, 130, 150, 170], cooldown: [15, 14, 13, 12],
  castPoint: 0.5, tags: ['nuke', 'stun', 'aoe'],
  description: '沿直线撕裂大地,眩晕并伤害线上敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const dir = V.norm(V.sub(pos, caster.pos));
    const len = Math.min(1200, V.dist(caster.pos, pos) + 300);
    // 线性判定:沿线每 150 一个采样圈
    const hit = new Set<number>();
    for (let d = 100; d <= len; d += 150) {
      const at = V.add(caster.pos, V.scale(dir, d));
      for (const e of enemiesIn(w, caster, at, 170)) {
        if (hit.has(e.id)) continue;
        hit.add(e.id);
        spellDamage(w, caster, e, QUAKE_DMG[lvl - 1]);
        applyModifier(w, e, { key: 'gorm_quake_stun', duration: QUAKE_STUN[lvl - 1], states: { stunned: true } }, caster.id);
      }
    }
    w.emit({ kind: 'fx', fx: 'quake', pos: V.clone(caster.pos), pos2: V.add(caster.pos, V.scale(dir, len)) });
    gormAftershock(w, caster);
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 1100).filter((t) => t.isHero());
    if (!foes.length) return null;
    return { score: 70 + foes.length * 10, pos: V.clone(foes[0].pos) };
  },
};

/** 余震:施法时震击周围。 */
const AFTERSHOCK_DMG = [0, 50, 75, 100, 125];
function gormAftershock(w: World, caster: Unit): void {
  const inst = caster.abilities[1];
  if (!inst || inst.level <= 0) return;
  damageArea(w, caster, caster.pos, 350, AFTERSHOCK_DMG[inst.level]);
  modifierArea(w, caster, caster.pos, 350, {
    key: 'gorm_aftershock_stun', duration: 0.6, states: { stunned: true },
  }, 'enemy');
  w.emit({ kind: 'fx', fx: 'staticfield', pos: V.clone(caster.pos), radius: 350 });
}

const GORM_W: AbilityDef = {
  key: 'gorm_aftershock', name: '余震', maxLevel: 4, targetMode: 'passive',
  tags: ['stun'],
  description: '每次施放技能时,震击周围 350 内敌人并短暂眩晕。',
  passiveModifier: () => ({ key: 'gorm_aftershock_passive', isBuff: true }),
};

const TOTEM_PCT = [0.8, 1.4, 2.0, 2.6];

const GORM_E: AbilityDef = {
  key: 'gorm_totem', name: '蓄力图腾', maxLevel: 4, targetMode: 'none',
  manaCost: [40, 45, 50, 55], cooldown: [5, 5, 5, 5],
  castPoint: 0.1, tags: ['buff'],
  description: '强化下一次攻击,造成额外伤害。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, {
      key: 'gorm_totem_buff', duration: 14, isBuff: true,
      stats: { bonusDamagePct: TOTEM_PCT[lvl - 1] },
      // 命中一次后由 orb 钩子移除(简化:短时高加成)
    }, caster.id);
    gormAftershock(w, caster);
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 350);
    return foes.length ? { score: 45 } : null;
  },
};

const ECHO_BASE = [160, 210, 270];
const ECHO_PER_UNIT = [40, 55, 70];

const GORM_R: AbilityDef = {
  key: 'gorm_echo', name: '大地回响', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [145, 205, 265], cooldown: [130, 120, 110],
  scepter: { cooldown: [90, 80, 70], desc: '神杖:冷却降低;震波向外扩散第二圈(范围 900),外圈敌人受到半量伤害并眩晕 0.8 秒。' },
  castPoint: 0.5, tags: ['nuke', 'aoe', 'ultimate'],
  description: '震波回响,周围每个单位都会放大伤害。',
  onCast(w, caster, lvl) {
    const targets = enemiesIn(w, caster, caster.pos, 600);
    const nearby = w.queryRadius(caster.pos, 600, (u) => !u.isBuilding()).length;
    const dmg = ECHO_BASE[lvl - 1] + nearby * ECHO_PER_UNIT[lvl - 1];
    for (const t of targets) spellDamage(w, caster, t, dmg);
    w.emit({ kind: 'fx', fx: 'quake_echo', pos: V.clone(caster.pos), radius: 600 });
    gormAftershock(w, caster);
    // 神杖:外圈扩散波
    if (hasScepter(caster)) {
      const innerIds = new Set(targets.map((t) => t.id));
      for (const t of enemiesIn(w, caster, caster.pos, 900)) {
        if (innerIds.has(t.id)) continue;
        spellDamage(w, caster, t, dmg * 0.5);
        applyModifier(w, t, { key: 'gorm_echo_sc_stun', duration: 0.8, states: { stunned: true } }, caster.id);
      }
      w.emit({ kind: 'fx', fx: 'quake_echo', pos: V.clone(caster.pos), radius: 900 });
    }
  },
  aiScore(w, caster) {
    const heroes = enemiesIn(w, caster, caster.pos, 550).filter((t) => t.isHero());
    if (heroes.length < 2) return null;
    return { score: 96 };
  },
};

export const GORM: HeroDef = {
  key: 'gorm', name: '戈姆', title: '裂地者', primary: 'str',
  baseStr: 22, gainStr: 2.5, baseAgi: 12, gainAgi: 1.4, baseInt: 16, gainInt: 1.8,
  baseDamage: [25, 35], baseArmor: 3, baseMs: 295, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.45, color: '#a1887f', glyph: '岩',
  abilities: [GORM_Q, GORM_W, GORM_E, GORM_R], aiRole: 'tank',
};

// ============ 钩魂者·格罗什(力量游走) ============

const HOOK_DMG = [90, 180, 270, 360];

const GROSH_Q: AbilityDef = {
  key: 'grosh_hook', name: '锁链魂钩', maxLevel: 4, targetMode: 'point',
  castRange: [1000, 1100, 1200, 1300], manaCost: [110, 120, 130, 140], cooldown: [14, 13, 12, 11],
  castPoint: 0.3, tags: ['nuke', 'stun'],
  description: '掷出锁钩,把命中的第一个敌人拖到身边。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const dir = V.norm(V.sub(pos, caster.pos));
    const range = (GROSH_Q.castRange ?? [1000])[lvl - 1];
    // 沿线找第一个敌人
    let victim: Unit | null = null;
    for (let d = 150; d <= range && !victim; d += 120) {
      const at = V.add(caster.pos, V.scale(dir, d));
      const found = enemiesIn(w, caster, at, 140);
      if (found.length) victim = found[0];
    }
    if (!victim) return;
    spellDamage(w, caster, victim, HOOK_DMG[lvl - 1]);
    // 拖拽:0.5s 内拉到施法者身边
    const v = victim;
    applyModifier(w, v, {
      key: 'grosh_hook_drag', duration: 0.5, states: { stunned: true },
      tickInterval: 0.05,
      onTick(world, u) {
        u.pos = V.moveTowards(u.pos, world.map.nearestWalkable(V.add(caster.pos, V.scale(dir, 120))), 200);
        u.prevPos = V.clone(u.pos);
      },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'hook', pos: V.clone(caster.pos), pos2: V.clone(v.pos) });
  },
  aiScore(w, caster, lvl) {
    const foes = enemiesIn(w, caster, caster.pos, (GROSH_Q.castRange ?? [1000])[lvl - 1] * 0.9).filter((t) => t.isHero());
    if (!foes.length) return null;
    foes.sort((a, b) => a.hp - b.hp);
    return { score: 74, pos: V.clone(foes[0].pos) };
  },
};

const MIASMA_DPS = [30, 45, 60, 75];

const GROSH_W: AbilityDef = {
  key: 'grosh_miasma', name: '腐蚀瘴气', maxLevel: 4, targetMode: 'none',
  manaCost: [75, 85, 95, 105], cooldown: [18, 16, 14, 12],
  castPoint: 0.2, tags: ['aoe', 'slow'],
  description: '散布瘴气 8 秒,持续腐蚀并减速周围敌人。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, {
      key: 'grosh_miasma_self', duration: 8, isBuff: true,
      tickInterval: 0.5,
      onTick(world, u) {
        for (const e of enemiesIn(world, u, u.pos, 280)) {
          spellDamage(world, u, e, MIASMA_DPS[lvl - 1] / 2);
          applyModifier(world, e, { key: 'grosh_miasma_slow', duration: 1, stats: { bonusMoveSpeedPct: -0.2 } }, u.id);
        }
      },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'miasma', pos: V.clone(caster.pos), radius: 280, duration: 8 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 320);
    return foes.length ? { score: 55 } : null;
  },
};

const FLESH_STR = [0.6, 0.9, 1.2, 1.5];

const GROSH_E: AbilityDef = {
  key: 'grosh_flesh', name: '血肉堆积', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '周围单位死亡时永久积累力量。',
  passiveModifier: (lvl) => ({
    key: 'grosh_flesh_passive', isBuff: true,
    tickInterval: 1 / 30,
    onTick(w, u) {
      for (const e of w.events) {
        if (e.kind !== 'unit_died') continue;
        if (V.dist(e.pos, u.pos) > 500) continue;
        applyModifier(w, u, {
          key: 'grosh_flesh_stack', stackable: true, isBuff: true,
          stats: { bonusStr: FLESH_STR[lvl - 1] },
        }, u.id);
      }
    },
  }),
};

const DISMEMBER_DPS = [85, 120, 155];

const GROSH_R: AbilityDef = {
  key: 'grosh_dismember', name: '碎骨肢解', maxLevel: 3, ultimate: true, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [200, 200, 200], manaCost: [120, 150, 180], cooldown: [30, 25, 20],
  scepter: { cooldown: [22, 18, 14], desc: '神杖:冷却降低;每次撕咬伤害提升 50%,并溅射周围 250 内其他敌人 40% 伤害。' },
  castPoint: 0.2, tags: ['stun', 'nuke', 'channel', 'ultimate'],
  description: '钳制目标 3 秒,持续撕咬造成重创。',
  channel: {
    duration: () => 3,
    tickInterval: 0.5,
    onChannelTick(w, caster, lvl) {
      const t = caster.channeling?.targetId ? w.getUnit(caster.channeling.targetId) : undefined;
      if (!t || !t.alive || V.dist(caster.pos, t.pos) > 350) {
        if (caster.channeling) caster.channeling.until = -Infinity;
        return;
      }
      const sc = hasScepter(caster);
      const tickDmg = DISMEMBER_DPS[lvl - 1] / 2 * (sc ? 1.5 : 1);
      spellDamage(w, caster, t, tickDmg);
      applyModifier(w, t, { key: 'grosh_dismember_lock', duration: 0.6, states: { stunned: true } }, caster.id);
      // 神杖:溅射伤害
      if (sc) {
        for (const nearby of enemiesIn(w, caster, t.pos, 250)) {
          if (nearby.id === t.id) continue;
          spellDamage(w, caster, nearby, tickDmg * 0.4);
        }
      }
    },
  },
  onCast(w, caster, lvl, _pos, target) {
    if (target) {
      applyModifier(w, target, { key: 'grosh_dismember_lock', duration: 0.6, states: { stunned: true } }, caster.id);
    }
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 250).filter((t) => t.isHero());
    if (!foes.length) return null;
    foes.sort((a, b) => a.hp - b.hp);
    return { score: 85, targetId: foes[0].id };
  },
};

export const GROSH: HeroDef = {
  key: 'grosh', name: '格罗什', title: '钩魂者', primary: 'str',
  baseStr: 25, gainStr: 3.0, baseAgi: 14, gainAgi: 1.4, baseInt: 14, gainInt: 1.5,
  baseDamage: [28, 36], baseArmor: 1, baseMs: 285, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.5, color: '#8d6e63', glyph: '钩',
  abilities: [GROSH_Q, GROSH_W, GROSH_E, GROSH_R], aiRole: 'ganker',
};

// ============ 影刃·凯(敏捷刺客) ============

const SMOKE_SLOW = [-0.15, -0.2, -0.25, -0.3];

const KAI_Q: AbilityDef = {
  key: 'kai_smoke', name: '烟尘弥障', maxLevel: 4, targetMode: 'point',
  aoeRadius: [330], // 预览半径(=onCast 实际 AoE 半径)
  castRange: [700, 700, 700, 700], manaCost: [80, 90, 100, 110], cooldown: [16, 15, 14, 13],
  castPoint: 0.2, tags: ['aoe', 'slow'],
  description: '掷出烟雾,沉默并减速区域内敌人 4 秒。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    modifierArea(w, caster, pos, 330, {
      key: 'kai_smoke_debuff', duration: 4,
      states: { silenced: true },
      stats: { bonusMoveSpeedPct: SMOKE_SLOW[lvl - 1] },
    }, 'enemy');
    w.emit({ kind: 'fx', fx: 'smoke', pos: V.clone(pos), radius: 330, duration: 4 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    if (!foes.length) return null;
    return { score: 62, pos: V.clone(foes[0].pos) };
  },
};

const STRIKE_DMG = [80, 140, 200, 260];

const KAI_W: AbilityDef = {
  key: 'kai_strike', name: '疾影突袭', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [700, 700, 700, 700], manaCost: [90, 100, 110, 120], cooldown: [14, 12, 10, 8],
  castPoint: 0.1, tags: ['nuke', 'escape'],
  description: '闪现至目标背后突袭。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    const behind = V.add(target.pos, V.scale(V.norm(V.sub(target.pos, caster.pos)), 100));
    blinkTo(w, caster, behind);
    spellDamage(w, caster, target, STRIKE_DMG[lvl - 1]);
    w.emit({ kind: 'fx', fx: 'blink', pos: V.clone(caster.pos) });
  },
  aiScore(w, caster, lvl) {
    const foes = enemiesIn(w, caster, caster.pos, 680).filter((t) => t.isHero());
    if (!foes.length || caster.hp / caster.calc.maxHp < 0.4) return null;
    foes.sort((a, b) => a.hp - b.hp);
    return { score: 66 + (foes[0].hp < STRIKE_DMG[lvl - 1] ? 50 : 0), targetId: foes[0].id };
  },
};

const RUPTURE_CRIT = [0.2, 0.25, 0.3, 0.35];

const KAI_E: AbilityDef = {
  key: 'kai_rupture', name: '弱点撕裂', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '攻击有概率撕裂要害,造成 1.6 倍暴击。',
  passiveModifier: (lvl) => ({
    key: 'kai_rupture_passive', isBuff: true,
    stats: { critChance: RUPTURE_CRIT[lvl - 1], critMultiplier: 1.6 },
  }),
};

const VEIL_DELAY = [3.5, 2.75, 2.0];

const VEIL_EVASION = [0.15, 0.2, 0.25];

const KAI_R: AbilityDef = {
  key: 'kai_veil', name: '暗影帷幕', maxLevel: 3, ultimate: true, targetMode: 'passive',
  scepter: { desc: '神杖:持续被动额外赋予 15/20/25% 闪避,融入黑暗更难被命中。' },
  tags: ['escape', 'ultimate'],
  description: '脱离战斗片刻后融入阴影(攻击或施法现身)。',
  passiveModifier: (lvl) => ({
    key: 'kai_veil_passive', isBuff: true,
    tickInterval: 0.25,
    onTick(w, u) {
      const idle = w.time - u.lastActionAt > VEIL_DELAY[lvl - 1];
      if (idle) {
        applyModifier(w, u, { key: 'kai_veil_invis', duration: 0.6, isBuff: true, states: { invisible: true } }, u.id);
      }
    },
  }),
  scepterPassive: (lvl) => ({
    key: 'kai_veil_sc_evasion', isBuff: true,
    stats: { evasion: VEIL_EVASION[lvl - 1] },
  }),
};

export const KAI: HeroDef = {
  key: 'kai', name: '凯', title: '影刃', primary: 'agi',
  baseStr: 17, gainStr: 1.9, baseAgi: 24, gainAgi: 2.8, baseInt: 14, gainInt: 1.3,
  baseDamage: [26, 32], baseArmor: 2, baseMs: 310, attackRange: 128,
  projectileSpeed: 0, bat: 1.7, attackPoint: 0.35, color: '#7e57c2', glyph: '影',
  abilities: [KAI_Q, KAI_W, KAI_E, KAI_R], aiRole: 'ganker',
};

// ============ 刃舞者·辰(敏捷近战核心) ============

const SPIN_DPS = [80, 110, 140, 170];

const CHEN_Q: AbilityDef = {
  key: 'chen_spin', name: '旋刃风暴', maxLevel: 4, targetMode: 'none',
  manaCost: [90, 100, 110, 120], cooldown: [24, 21, 18, 15],
  castPoint: 0.0, tags: ['aoe', 'nuke'],
  description: '化作剑刃旋风 3 秒,期间魔法免疫并绞杀周围敌人。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, {
      key: 'chen_spin_buff', duration: 3, isBuff: true,
      states: { magicImmune: true },
      tickInterval: 0.5,
      onTick(world, u) {
        for (const e of enemiesIn(world, u, u.pos, 260)) {
          spellDamage(world, u, e, SPIN_DPS[lvl - 1] / 2);
        }
      },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'spin', pos: V.clone(caster.pos), radius: 260, duration: 3 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 300);
    if (!foes.length) return null;
    return { score: 58 + (foes.some((f) => f.isHero()) ? 15 : 0) };
  },
};

const SHADOW_MS = [0.25, 0.32, 0.39, 0.46];

const CHEN_W: AbilityDef = {
  key: 'chen_shadow', name: '残影步', maxLevel: 4, targetMode: 'none',
  manaCost: [60, 60, 60, 60], cooldown: [16, 14, 12, 10],
  castPoint: 0.0, tags: ['escape', 'buff'],
  description: '身化残影,大幅提升移速与攻速 5 秒。',
  onCast(w, caster, lvl) {
    applyModifier(w, caster, {
      key: 'chen_shadow_buff', duration: 5, isBuff: true,
      stats: { bonusMoveSpeedPct: SHADOW_MS[lvl - 1], bonusAttackSpeed: 0.3 },
    }, caster.id);
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    if (!foes.length) return null;
    return { score: 48 };
  },
};

const SWORD_IAS = [0.1, 0.14, 0.18, 0.22];

const CHEN_E: AbilityDef = {
  key: 'chen_sword', name: '剑意', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '剑术精纯:提升攻速并汲取伤害为生命。',
  passiveModifier: (lvl) => ({
    key: 'chen_sword_passive', isBuff: true,
    stats: { bonusAttackSpeed: SWORD_IAS[lvl - 1], lifesteal: 0.08 },
  }),
};

const OMNI_STRIKES = [4, 6, 8];
const OMNI_DMG = [170, 200, 230];

const CHEN_R: AbilityDef = {
  key: 'chen_omni', name: '无双连斩', maxLevel: 3, ultimate: true, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [450, 500, 550], manaCost: [200, 275, 350], cooldown: [120, 110, 100],
  scepter: { cooldown: [85, 75, 65], desc: '神杖:冷却降低;斩击次数额外增加 2 次,每斩造成额外 100 纯粹伤害(无视护甲类型)。' },
  castPoint: 0.3, tags: ['nuke', 'ultimate'],
  description: '化影连斩周围敌人,每一斩都是致命剑光。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    const sc = hasScepter(caster);
    const strikes = OMNI_STRIKES[lvl - 1] + (sc ? 2 : 0);
    let current: Unit = target;
    for (let i = 0; i < strikes; i++) {
      if (!current.alive) {
        const next = enemiesIn(w, caster, current.pos, 450).filter((t) => !t.isBuilding());
        if (!next.length) break;
        current = next[0];
      }
      spellDamage(w, caster, current, OMNI_DMG[lvl - 1]);
      // 神杖:额外纯粹伤害
      if (sc) {
        current.hp = Math.max(0, current.hp - 100);
        if (current.hp === 0) current.alive = false;
      }
      w.emit({ kind: 'fx', fx: 'slash', pos: V.clone(current.pos) });
      const others = enemiesIn(w, caster, current.pos, 450).filter((t) => t.id !== current.id && !t.isBuilding());
      if (others.length) current = w.rng.pick(others);
    }
    blinkTo(w, caster, V.add(current.pos, { x: 80, y: 0 }));
  },
  aiScore(w, caster, lvl) {
    const foes = enemiesIn(w, caster, caster.pos, 500).filter((t) => t.isHero());
    if (!foes.length) return null;
    foes.sort((a, b) => a.hp - b.hp);
    return { score: 80 + (foes[0].hp < OMNI_DMG[lvl - 1] * 2 ? 30 : 0), targetId: foes[0].id };
  },
};

export const CHEN_BLADE: HeroDef = {
  key: 'chenblade', name: '辰', title: '刃舞者', primary: 'agi',
  baseStr: 19, gainStr: 2.0, baseAgi: 24, gainAgi: 2.9, baseInt: 14, gainInt: 1.4,
  baseDamage: [26, 30], baseArmor: 3, baseMs: 305, attackRange: 128,
  projectileSpeed: 0, bat: 1.6, attackPoint: 0.33, color: '#26c6da', glyph: '刃',
  abilities: [CHEN_Q, CHEN_W, CHEN_E, CHEN_R], aiRole: 'carry',
};

// ============ 晨光牧师·奥兰(智力治疗) ============

const PURIFY_VAL = [90, 160, 230, 300];

const OLAN_Q: AbilityDef = {
  key: 'olan_purify', name: '圣疗术', maxLevel: 4, targetMode: 'unit',
  targetTeam: 'allyOrSelf',
  castRange: [550, 550, 550, 550], manaCost: [85, 100, 115, 130], cooldown: [11, 10, 9, 8],
  castPoint: 0.25, tags: ['heal', 'nuke'],
  description: '圣光治愈友军,并灼伤其周围的敌人。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target || target.team !== caster.team) return;
    target.hp = Math.min(target.calc.maxHp, target.hp + PURIFY_VAL[lvl - 1]);
    damageArea(w, caster, target.pos, 260, PURIFY_VAL[lvl - 1] * 0.5);
    w.emit({ kind: 'fx', fx: 'heal', pos: V.clone(target.pos), radius: 260 });
  },
  aiScore(w, caster, lvl) {
    const allies = alliesIn(w, caster, caster.pos, 550).filter((t) => t.isHero());
    const hurt = allies.filter((a) => a.calc.maxHp - a.hp > PURIFY_VAL[lvl - 1] * 0.8);
    if (!hurt.length) return null;
    hurt.sort((a, b) => a.hp / a.calc.maxHp - b.hp / b.calc.maxHp);
    return { score: 76, targetId: hurt[0].id };
  },
};

const FLAME_DPS = [20, 30, 40, 50];

const OLAN_W: AbilityDef = {
  key: 'olan_flame', name: '净化之焰', maxLevel: 4, targetMode: 'unit', targetTeam: 'any',
  castRange: [600, 600, 600, 600], manaCost: [80, 90, 100, 110], cooldown: [14, 13, 12, 11],
  castPoint: 0.25, tags: ['nuke'],
  description: '对敌:驱散增益并灼烧 5 秒;对友:驱散负面效果。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    if (target.team === caster.team) {
      purge(w, target, false);
    } else {
      purge(w, target, true);
      applyModifier(w, target, {
        key: 'olan_flame_burn', duration: 5,
        tickInterval: 1,
        onTick(world, u) { spellDamage(world, caster, u, FLAME_DPS[lvl - 1]); },
      }, caster.id);
    }
    w.emit({ kind: 'fx', fx: 'purify', pos: V.clone(target.pos) });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    if (!foes.length) return null;
    return { score: 50, targetId: foes[0].id };
  },
};

const SHIELD_VAL = [110, 170, 230, 290];

const OLAN_E: AbilityDef = {
  key: 'olan_shield', name: '信仰守护', maxLevel: 4, targetMode: 'unit',
  targetTeam: 'allyOrSelf',
  castRange: [600, 600, 600, 600], manaCost: [90, 100, 110, 120], cooldown: [12, 11, 10, 9],
  castPoint: 0.25, tags: ['buff', 'heal'],
  description: '为友军展开圣盾,吸收伤害。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target || target.team !== caster.team) return;
    const m = applyModifier(w, target, {
      key: 'olan_shield_buff', duration: 8, isBuff: true,
    }, caster.id);
    m.data!.shield = SHIELD_VAL[lvl - 1];
    w.emit({ kind: 'fx', fx: 'shield', pos: V.clone(target.pos) });
  },
  aiScore(w, caster, lvl) {
    const allies = alliesIn(w, caster, caster.pos, 600).filter((t) => t.isHero() && t.hp / t.calc.maxHp < 0.6);
    if (!allies.length) return null;
    return { score: 64, targetId: allies[0].id };
  },
};

const GUARD_DUR = [4, 5, 6];

const OLAN_R: AbilityDef = {
  key: 'olan_guard', name: '神圣庇护', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [175, 250, 325], cooldown: [150, 130, 110],
  scepter: { cooldown: [110, 95, 80], desc: '神杖:冷却降低;神圣力量同时驱散周围友军的所有负面效果,并对周围敌人造成 200 神圣伤害。' },
  castPoint: 0.3, tags: ['buff', 'ultimate'],
  description: '神圣力量降临,周围友军免疫物理伤害。',
  onCast(w, caster, lvl) {
    modifierArea(w, caster, caster.pos, 700, {
      key: 'olan_guard_buff', duration: GUARD_DUR[lvl - 1], isBuff: true,
      states: { physImmune: true },
    }, 'ally');
    w.emit({ kind: 'fx', fx: 'guardian', pos: V.clone(caster.pos), radius: 700 });
    // 神杖:驱散友军负面 + 灼伤敌人
    if (hasScepter(caster)) {
      for (const ally of alliesIn(w, caster, caster.pos, 700)) {
        if (ally.isHero()) purge(w, ally, false);
      }
      for (const foe of enemiesIn(w, caster, caster.pos, 700)) {
        spellDamage(w, caster, foe, 200);
      }
      w.emit({ kind: 'fx', fx: 'guardian', pos: V.clone(caster.pos), radius: 700 });
    }
  },
  aiScore(w, caster) {
    const allies = alliesIn(w, caster, caster.pos, 650).filter((t) => t.isHero() && t.hp / t.calc.maxHp < 0.45);
    const foes = enemiesIn(w, caster, caster.pos, 800).filter((t) => t.isHero());
    if (allies.length >= 1 && foes.length >= 1) return { score: 90 };
    return null;
  },
};

export const OLAN: HeroDef = {
  key: 'olan', name: '奥兰', title: '晨光牧师', primary: 'int',
  baseStr: 19, gainStr: 2.2, baseAgi: 13, gainAgi: 1.2, baseInt: 22, gainInt: 2.6,
  baseDamage: [24, 32], baseArmor: 3, baseMs: 295, attackRange: 450,
  projectileSpeed: 900, bat: 1.7, attackPoint: 0.4, color: '#ffe082', glyph: '圣',
  abilities: [OLAN_Q, OLAN_W, OLAN_E, OLAN_R], aiRole: 'support',
};

// ============ 暗渊术士·墨菲斯(智力消耗) ============

const SHADOW_DMG = [110, 190, 270, 350];

const MORPHIS_Q: AbilityDef = {
  key: 'morphis_bolt', name: '暗影之箭', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [650, 650, 650, 650], manaCost: [95, 115, 135, 155], cooldown: [10, 9, 8, 7],
  castPoint: 0.4, tags: ['nuke', 'slow'],
  description: '暗影侵蚀目标,造成伤害并放缓脚步。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    spellDamage(w, caster, target, SHADOW_DMG[lvl - 1]);
    applyModifier(w, target, { key: 'morphis_bolt_slow', duration: 2.5, stats: { bonusMoveSpeedPct: -0.25 } }, caster.id);
    w.emit({ kind: 'fx', fx: 'shadowbolt', pos: V.clone(target.pos) });
  },
  aiScore(w, caster, lvl) {
    const foes = enemiesIn(w, caster, caster.pos, 650).filter((t) => t.isHero());
    if (!foes.length) return null;
    foes.sort((a, b) => a.hp - b.hp);
    return { score: 70 + (foes[0].hp < SHADOW_DMG[lvl - 1] * 0.75 ? 50 : 0), targetId: foes[0].id };
  },
};

const SIPHON_DPS = [25, 40, 55, 70];

const MORPHIS_W: AbilityDef = {
  key: 'morphis_siphon', name: '生命虹吸', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [550, 550, 550, 550], manaCost: [100, 110, 120, 130], cooldown: [16, 15, 14, 13],
  castPoint: 0.3, tags: ['nuke', 'heal'],
  description: '与目标建立虹吸链接 5 秒,窃取其生命。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    applyModifier(w, target, {
      key: 'morphis_siphon_link', duration: 5,
      tickInterval: 0.5,
      onTick(world, u, m) {
        const src = world.getUnit(m.sourceId);
        if (!src || !src.alive || V.dist(src.pos, u.pos) > 900) {
          m.expiresAt = -Infinity;
          return;
        }
        const dealt = spellDamage(world, src, u, SIPHON_DPS[lvl - 1] / 2);
        src.hp = Math.min(src.calc.maxHp, src.hp + dealt);
      },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'siphon', pos: V.clone(caster.pos), pos2: V.clone(target.pos), duration: 5 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 550).filter((t) => t.isHero());
    if (!foes.length) return null;
    return { score: 58, targetId: foes[0].id };
  },
};

const CURSE_DMG_PCT = [-0.16, -0.22, -0.28, -0.34];

const MORPHIS_E: AbilityDef = {
  key: 'morphis_curse', name: '恐惧诅咒', maxLevel: 4, targetMode: 'point',
  aoeRadius: [350], // 预览半径(=onCast 实际 AoE 半径)
  castRange: [700, 700, 700, 700], manaCost: [85, 95, 105, 115], cooldown: [15, 14, 13, 12],
  castPoint: 0.35, tags: ['aoe', 'slow'],
  description: '诅咒区域内敌人,削弱攻击与移速 6 秒。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    modifierArea(w, caster, pos, 350, {
      key: 'morphis_curse_debuff', duration: 6,
      stats: { bonusDamagePct: CURSE_DMG_PCT[lvl - 1], bonusMoveSpeedPct: -0.12 },
    }, 'enemy');
    w.emit({ kind: 'fx', fx: 'curse', pos: V.clone(pos), radius: 350 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 700).filter((t) => t.isHero());
    if (foes.length < 1) return null;
    return { score: 52 + foes.length * 8, pos: V.clone(foes[0].pos) };
  },
};

const RAIN_WAVE_DMG = [65, 95, 125];

const MORPHIS_R: AbilityDef = {
  key: 'morphis_rain', name: '暗渊火雨', maxLevel: 3, ultimate: true, targetMode: 'point',
  castRange: [900, 900, 900], manaCost: [200, 300, 400], cooldown: [120, 110, 100],
  scepter: { cooldown: [85, 78, 70], desc: '神杖:冷却降低;火雨波数增加至 7 波,范围从 450 扩大至 600,且每波都附带 0.5 秒眩晕。' },
  castPoint: 0.5, tags: ['aoe', 'nuke', 'ultimate'],
  description: '召唤暗渊之火轰击区域,5 波灼烧,首波眩晕。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    const at = V.clone(pos);
    const sc = hasScepter(caster);
    const totalWaves = sc ? 7 : 5;
    const radius = sc ? 600 : 450;
    const dur = (totalWaves - 1) * 0.8 + 0.1;
    applyModifier(w, caster, {
      key: 'morphis_rain_caster', duration: dur, isBuff: true,
      tickInterval: 0.8,
      onTick(world, u, m) {
        m.data!.wave = (m.data!.wave ?? 0) + 1;
        if (m.data!.wave > totalWaves) return;
        damageArea(world, u, at, radius, RAIN_WAVE_DMG[lvl - 1]);
        if (m.data!.wave === 1 || sc) {
          modifierArea(world, u, at, radius, {
            key: 'morphis_rain_stun', duration: sc ? 0.5 : 0.8, states: { stunned: true },
          }, 'enemy');
        }
        world.emit({ kind: 'fx', fx: 'firerain', pos: V.clone(at), radius });
      },
    }, caster.id);
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 850).filter((t) => t.isHero());
    if (foes.length < 2) return null;
    return { score: 92, pos: V.clone(foes[0].pos) };
  },
};

export const MORPHIS: HeroDef = {
  key: 'morphis', name: '墨菲斯', title: '暗渊术士', primary: 'int',
  baseStr: 18, gainStr: 1.9, baseAgi: 12, gainAgi: 1.2, baseInt: 25, gainInt: 3.1,
  baseDamage: [22, 30], baseArmor: 1, baseMs: 290, attackRange: 600,
  projectileSpeed: 950, bat: 1.7, attackPoint: 0.45, color: '#ab47bc', glyph: '渊',
  abilities: [MORPHIS_Q, MORPHIS_W, MORPHIS_E, MORPHIS_R], aiRole: 'support',
};

export const BATCH2 = [GORM, GROSH, KAI, CHEN_BLADE, OLAN, MORPHIS];
