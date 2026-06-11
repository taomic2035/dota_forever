/**
 * 技能系统:施法状态机(走位入程→前摇→结算/引导)、升级门控、被动挂载、法球钩子。
 * 设计:蓝耗与冷却在前摇结束时支付(被打断不亏蓝不进 CD)。
 */
import { V, type Vec2 } from '../core/vec2';
import { turnTowards } from '../core/mathx';
import { TURN_RATE, ULT_LEVELS, STAT_BONUS_MAX } from '../data/balance';
import type { AbilityDef } from '../data/heroes/types';
import type { World } from './world';
import { Unit, type Order, type EntityId } from './unit';
import { castHooks, attackHitHooks, stateOf, applyDamage, isEnemy } from './combat';
import { applyModifier, removeModifier, type ModifierDef } from './modifiers';

export interface AbilityInstance {
  key: string;
  level: number;
  cooldownUntil: number;
}

export function abilityDefAt(u: Unit, index: number): AbilityDef | undefined {
  return u.heroDef?.abilities[index];
}

export function abilityReady(w: World, u: Unit, index: number): boolean {
  const inst = u.abilities[index];
  const def = abilityDefAt(u, index);
  if (!inst || !def || inst.level <= 0) return false;
  if (def.passiveModifier && !def.onCast && !def.channel) return false; // 纯被动
  if (w.time < inst.cooldownUntil) return false;
  const mana = def.manaCost?.[inst.level - 1] ?? 0;
  if (u.mp < mana) return false;
  if (stateOf(u).silenced) return false;
  return true;
}

// ---------- 升级 ----------
/** 普通技能:英雄等级 ≥ 2×目标级−1;大招:6/11/16。 */
export function canLearn(u: Unit, index: number): boolean {
  const inst = u.abilities[index];
  const def = abilityDefAt(u, index);
  if (!inst || !def) return false;
  if (!u.heroMeta || u.heroMeta.skillPoints <= 0) return false;
  if (inst.level >= def.maxLevel) return false;
  const targetLvl = inst.level + 1;
  if (def.ultimate) return u.level >= ULT_LEVELS[targetLvl - 1];
  return u.level >= targetLvl * 2 - 1;
}

export function learnAbility(w: World, u: Unit, index: number): boolean {
  if (!canLearn(u, index)) return false;
  const inst = u.abilities[index];
  const def = abilityDefAt(u, index)!;
  inst.level++;
  u.heroMeta!.skillPoints--;
  if (def.passiveModifier) {
    removeModifier(w, u, `passive_${def.key}`, u.id);
    const mod = def.passiveModifier(inst.level);
    applyModifier(w, u, { ...mod, key: `passive_${def.key}`, duration: undefined }, u.id);
  }
  return true;
}

export function canLearnStatBonus(u: Unit): boolean {
  if (!u.heroMeta || u.heroMeta.skillPoints <= 0) return false;
  return u.heroMeta.statBonusLearned < STAT_BONUS_MAX;
}

export function learnStatBonus(u: Unit): boolean {
  if (!canLearnStatBonus(u)) return false;
  u.heroMeta!.statBonusLearned++;
  u.heroMeta!.skillPoints--;
  return true;
}

// ---------- 施法状态机 ----------
function startCast(w: World, u: Unit, o: Order): void {
  const index = o.abilityIndex!;
  const inst = u.abilities[index];
  const def = abilityDefAt(u, index);
  if (!inst || !def || inst.level <= 0) { u.order = null; return; }
  if (stateOf(u).silenced || w.time < inst.cooldownUntil) { u.order = null; return; }
  const lvl = inst.level;
  const mana = def.manaCost?.[lvl - 1] ?? 0;
  if (u.mp < mana) { u.order = null; return; }

  // 目标解析
  let target: Unit | undefined;
  let aim: Vec2 | undefined = o.pos;
  if (def.targetMode === 'unit') {
    target = w.getUnit(o.targetId!);
    if (!target || !target.alive) { u.order = null; return; }
    aim = target.pos;
  }

  // 射程检查与走位
  const range = def.castRange?.[lvl - 1] ?? 0;
  if (def.targetMode !== 'none' && aim && range > 0) {
    if (V.dist(u.pos, aim) > range) {
      if (!stateOf(u).rooted) u.moveAlongPathTo(w, aim);
      return; // 保持 order,下 tick 继续
    }
  }

  // 进入前摇
  if (aim) u.facing = turnTowards(u.facing, V.angle(u.pos, aim), TURN_RATE * w.dt * 4);
  u.path = [];
  u.pathGoal = null;
  u.casting = {
    abilityIndex: index,
    pointUntil: w.time + (def.castPoint ?? 0.3),
    pos: o.pos ? V.clone(o.pos) : undefined,
    targetId: o.targetId,
  };
  u.order = null;
  w.emit({ kind: 'cast_started', unitId: u.id, abilityKey: def.key });
}

/** 返回 true 表示本 tick 被施法占用。 */
function progress(w: World, u: Unit): boolean {
  if (u.casting) {
    const c = u.casting;
    const def = abilityDefAt(u, c.abilityIndex);
    const inst = u.abilities[c.abilityIndex];
    if (!def || !inst) { u.casting = null; return false; }
    // 单位目标中途死亡 → 取消
    if (def.targetMode === 'unit') {
      const t = w.getUnit(c.targetId!);
      if (!t || !t.alive) { u.casting = null; return false; }
    }
    if (w.time >= c.pointUntil) {
      u.casting = null;
      executeCast(w, u, c.abilityIndex, c.pos, c.targetId);
    }
    return true;
  }
  if (u.channeling) {
    const ch = u.channeling;
    const def = abilityDefAt(u, ch.abilityIndex);
    const inst = u.abilities[ch.abilityIndex];
    if (!def?.channel || !inst) { u.channeling = null; return false; }
    if (w.time >= ch.until) { u.channeling = null; return false; }
    if (w.time >= ch.nextTickAt) {
      ch.nextTickAt += def.channel.tickInterval;
      def.channel.onChannelTick(w, u, inst.level, ch.pos);
    }
    return true;
  }
  return false;
}

function executeCast(w: World, u: Unit, index: number, pos?: Vec2, targetId?: EntityId): void {
  const def = abilityDefAt(u, index)!;
  const inst = u.abilities[index];
  const lvl = inst.level;
  u.lastActionAt = w.time;
  // 支付
  u.mp -= def.manaCost?.[lvl - 1] ?? 0;
  inst.cooldownUntil = w.time + (def.cooldown?.[lvl - 1] ?? 0);
  const target = targetId ? w.getUnit(targetId) : undefined;
  w.emit({ kind: 'cast_done', unitId: u.id, abilityKey: def.key, pos, targetId });
  if (def.channel) {
    u.channeling = {
      abilityIndex: index,
      until: w.time + def.channel.duration(lvl),
      nextTickAt: w.time + def.channel.tickInterval,
      pos,
      targetId,
    };
    def.onCast?.(w, u, lvl, pos, target);
  } else {
    def.onCast?.(w, u, lvl, pos, target);
  }
}

function breakChannel(w: World, u: Unit): void {
  u.channeling = null;
}

castHooks.startCast = startCast;
castHooks.progress = progress;
castHooks.breakChannel = breakChannel;

// ---------- 法球(攻击命中附加效果) ----------
attackHitHooks.push((w, attacker, target, dealt) => {
  if (dealt <= 0 || !attacker.heroDef) return;
  for (let i = 0; i < attacker.abilities.length; i++) {
    const inst = attacker.abilities[i];
    const def = attacker.heroDef.abilities[i];
    if (!def?.orbOnHit || inst.level <= 0) continue;
    def.orbOnHit(w, attacker, target, inst.level);
  }
});

// ---------- 技能效果工具箱(英雄数据使用) ----------
export function enemiesIn(w: World, caster: Unit, pos: Vec2, radius: number): Unit[] {
  return w.queryRadius(pos, radius, (t) => isEnemy(caster, t) && !t.isBuilding() && t.kind !== 'ward');
}

export function alliesIn(w: World, caster: Unit, pos: Vec2, radius: number): Unit[] {
  return w.queryRadius(pos, radius, (t) => t.team === caster.team && !t.isBuilding() && t.kind !== 'ward');
}

export function damageArea(w: World, caster: Unit, pos: Vec2, radius: number, amount: number, spell = true): number {
  let hit = 0;
  const amt = spell ? amount * (1 + caster.calc.spellAmp) : amount;
  for (const t of enemiesIn(w, caster, pos, radius)) {
    applyDamage(w, t, { source: caster.id, attackType: 'spell', amount: amt, flags: { spell } });
    hit++;
  }
  return hit;
}

export function modifierArea(w: World, caster: Unit, pos: Vec2, radius: number, def: ModifierDef, affects: 'ally' | 'enemy'): number {
  const targets = affects === 'enemy' ? enemiesIn(w, caster, pos, radius) : alliesIn(w, caster, pos, radius);
  for (const t of targets) {
    if (affects === 'enemy' && stateOf(t).magicImmune) continue;
    applyModifier(w, t, def, caster.id);
  }
  return targets.length;
}

export function spellDamage(w: World, caster: Unit, target: Unit, amount: number): number {
  const amt = amount * (1 + caster.calc.spellAmp);
  return applyDamage(w, target, { source: caster.id, attackType: 'spell', amount: amt, flags: { spell: true } });
}

/** 技能弹道。 */
export function abilityProjectile(
  w: World, caster: Unit, target: Unit, speed: number,
  onHit: (w: World, t: Unit, sourceId: EntityId) => void, style?: string,
): void {
  w.projectiles.push({
    pos: V.clone(caster.pos), speed, targetId: target.id, sourceId: caster.id,
    kind: 'ability', onHit, style,
  });
}

/** 强制位移(闪烁/突进):落点取最近可走点。 */
export function blinkTo(w: World, u: Unit, pos: Vec2): void {
  u.pos = w.map.nearestWalkable(pos);
  u.prevPos = V.clone(u.pos);
  u.path = [];
  u.pathGoal = null;
}

export interface SummonSpec {
  name: string;
  hp: number;
  dmg: [number, number];
  armor: number;
  ms: number;
  range?: number;          // 100 = 近战
  bat?: number;
  duration: number;        // 存活秒数
  magicResist?: number;
  attackType?: import('../data/balance').AttackType;
  armorType?: import('../data/balance').ArmorType;
}

/**
 * 召唤一个归属召唤者阵营的单位(以 'creep' kind 复用兵线/战斗逻辑)。
 * 默认下达 attackmove 朝最近敌方主基地推进;若给 follow 则跟随召唤者附近。
 * 到时由 modifier onExpire 移除。
 */
export function summonUnit(
  w: World, owner: Unit, spec: SummonSpec, pos: Vec2, follow = false,
): Unit {
  const u = w.spawnUnit({
    kind: 'creep',
    team: owner.team,
    pos: w.map.nearestWalkable(pos),
    name: spec.name,
    stats: {
      maxHp: spec.hp, hpRegen: 0.5, maxMp: 0, mpRegen: 0,
      dmgMin: spec.dmg[0], dmgMax: spec.dmg[1],
      attackType: spec.attackType ?? 'normal', armorType: spec.armorType ?? 'medium',
      armor: spec.armor, magicResist: spec.magicResist ?? 0,
      attackRange: spec.range ?? 100, attackPoint: 0.35, bat: spec.bat ?? 1.5,
      projectileSpeed: (spec.range ?? 100) > 200 ? 900 : 0,
      moveSpeed: spec.ms, collisionRadius: 20,
      visionDay: 800, visionNight: 700, acquireRange: 600,
      bountyMin: 18, bountyMax: 24, xpBounty: 20,
    },
  });
  u.summonExpiresAt = w.time + spec.duration;
  u.summonOwnerId = owner.id;
  if (!follow) {
    const enemyAncient = [...w.units.values()].find((b) => b.buildingKind === 'ancient' && b.team !== owner.team);
    u.issueOrder({ type: 'attackmove', pos: enemyAncient ? V.clone(enemyAncient.pos) : V.clone(pos) });
  } else {
    u.issueOrder({ type: 'attackmove', pos: V.clone(owner.pos) });
  }
  return u;
}
