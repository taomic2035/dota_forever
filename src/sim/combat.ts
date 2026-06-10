/**
 * 战斗管线:面板重算 → 指令执行(移动/追击/前摇/出手)→ 弹道 → 伤害结算 → 死亡清理。
 * WC3 模型:伤害类型×护甲类型矩阵、护甲公式、魔抗、闪避、暴击、吸血。
 */
import { V } from '../core/vec2';
import { turnTowards } from '../core/mathx';
import {
  DAMAGE_MATRIX, armorReduction, MAX_IAS_BONUS, TURN_RATE,
  UPHILL_MISS_CHANCE,
  type AttackType,
} from '../data/balance';
import type { World } from './world';
import { Unit, type EntityId } from './unit';

export interface DamageEvent {
  source: EntityId;
  attackType: AttackType;
  amount: number;
  flags?: { spell?: boolean; pure?: boolean; noLifesteal?: boolean };
}

export function isEnemy(a: Unit, b: Unit): boolean {
  return a.team !== b.team && a.alive && b.alive;
}

/** 攻击间隔(秒)。 */
export function attackInterval(u: Unit): number {
  const ias = Math.min(MAX_IAS_BONUS, u.calc.ias);
  return Math.max(u.calc.bat / (1 + ias), u.calc.bat / 5);
}

/** 攻击射程判定(边到边)。 */
export function inAttackRange(a: Unit, b: Unit, slack = 0): boolean {
  return V.dist(a.pos, b.pos) <= a.calc.attackRange + a.base.collisionRadius + b.base.collisionRadius + slack;
}

// ---------- 面板重算 ----------
export function recalcUnit(u: Unit): void {
  const c = u.calc;
  const b = u.base;
  c.maxHp = b.maxHp; c.hpRegen = b.hpRegen;
  c.maxMp = b.maxMp; c.mpRegen = b.mpRegen;
  c.dmgMin = b.dmgMin; c.dmgMax = b.dmgMax;
  c.attackType = b.attackType; c.armorType = b.armorType;
  c.armor = b.armor; c.magicResist = b.magicResist;
  c.attackRange = b.attackRange; c.attackPoint = b.attackPoint;
  c.bat = b.bat; c.projectileSpeed = b.projectileSpeed;
  c.moveSpeed = b.moveSpeed; c.collisionRadius = b.collisionRadius;
  c.visionDay = b.visionDay; c.visionNight = b.visionNight;
  c.acquireRange = b.acquireRange;
  c.ias = 0; c.evasion = 0; c.critChance = 0; c.critMultiplier = 1.5;
  c.lifesteal = 0; c.trueSight = 0;
  // 聚合顺序固定:modifier 数值(含属性加成写入 bonusAttr)→ 英雄属性折算
  modifierFold(u);
  for (const ext of recalcExtensions) ext(u);
  if (u.hp > c.maxHp) u.hp = c.maxHp;
  if (u.mp > c.maxMp) u.mp = c.maxMp;
}

/** 由 modifiers.ts 注入,避免循环依赖。 */
let modifierFold: (u: Unit) => void = () => {};
export function setModifierFold(fn: (u: Unit) => void): void {
  modifierFold = fn;
}

/** 后续里程碑(英雄属性/modifier)注册的重算扩展,按注册序执行。 */
export const recalcExtensions: Array<(u: Unit) => void> = [];

export function recalcSystem(w: World): void {
  for (const u of w.units.values()) {
    if (u.alive) recalcUnit(u);
  }
}

// ---------- 伤害 ----------
/** 结算一次伤害,返回实际造成量。 */
export function applyDamage(w: World, target: Unit, evt: DamageEvent): number {
  if (!target.alive || target.invulnerable) return 0;
  let amount = evt.amount;
  const flags = evt.flags ?? {};

  if (flags.pure) {
    // 纯粹伤害直通
  } else if (flags.spell) {
    if (stateOf(target).magicImmune) return 0;
    if (DAMAGE_MATRIX.spell[target.calc.armorType] === 0) return 0;
    amount *= DAMAGE_MATRIX.spell[target.calc.armorType];
    amount *= 1 - target.calc.magicResist;
  } else {
    if (stateOf(target).physImmune) return 0;
    // 闪避 + 低打高 miss
    const source = w.getUnit(evt.source);
    let missChance = target.calc.evasion;
    if (source && w.map.heightAt(source.pos) < w.map.heightAt(target.pos)) {
      missChance = 1 - (1 - missChance) * (1 - UPHILL_MISS_CHANCE);
    }
    if (missChance > 0 && w.rng.chance(missChance)) {
      w.emit({ kind: 'fx', fx: 'miss', pos: V.clone(target.pos) });
      return 0;
    }
    amount *= DAMAGE_MATRIX[evt.attackType][target.calc.armorType];
    amount *= 1 - armorReduction(target.calc.armor);
  }

  if (amount <= 0) return 0;
  target.hp -= amount;
  target.lastAttackerId = evt.source;
  target.lastDamagedAt = w.time;
  w.emit({ kind: 'unit_damaged', unitId: target.id, sourceId: evt.source, amount, pos: V.clone(target.pos) });
  if (target.hp <= 0) {
    kill(w, target, evt.source);
  }
  return amount;
}

/** 状态聚合占位:M3 modifier 实装后由扩展覆盖。 */
export let stateOf: (u: Unit) => {
  stunned?: boolean; rooted?: boolean; silenced?: boolean; disarmed?: boolean;
  invisible?: boolean; magicImmune?: boolean; physImmune?: boolean; phased?: boolean;
} = () => EMPTY_STATE;
const EMPTY_STATE = {};
export function setStateResolver(fn: typeof stateOf): void {
  stateOf = fn;
}

export function kill(w: World, target: Unit, killerId: EntityId): void {
  target.alive = false;
  target.diedAt = w.time;
  target.order = null;
  target.windupTargetId = 0;
  target.attackTargetId = 0;
  w.emit({ kind: 'unit_died', unitId: target.id, killerId, pos: V.clone(target.pos) });
}

/** 普攻伤害结算(掷骰/暴击/吸血)。 */
export function dealAttackDamage(w: World, attacker: Unit, target: Unit, precomputed?: number): void {
  let amount = precomputed ?? rollAttackDamage(w, attacker);
  let crit = false;
  if (attacker.calc.critChance > 0 && w.rng.chance(attacker.calc.critChance)) {
    amount *= attacker.calc.critMultiplier;
    crit = true;
  }
  const dealt = applyDamage(w, target, { source: attacker.id, attackType: attacker.calc.attackType, amount });
  if (crit && dealt > 0) {
    w.emit({ kind: 'fx', fx: 'crit', pos: V.clone(target.pos) });
  }
  if (dealt > 0 && attacker.calc.lifesteal > 0 && !target.isBuilding()) {
    attacker.hp = Math.min(attacker.calc.maxHp, attacker.hp + dealt * attacker.calc.lifesteal);
  }
  // 攻击命中钩子(法球等,M3 注册)
  for (const hook of attackHitHooks) hook(w, attacker, target, dealt);
}

export const attackHitHooks: Array<(w: World, attacker: Unit, target: Unit, dealt: number) => void> = [];

/** 施法委托(abilities.ts 注入,避免循环依赖)。 */
export const castHooks: {
  progress?: (w: World, u: Unit) => boolean;
  startCast?: (w: World, u: Unit, o: import('./unit').Order) => void;
  breakChannel?: (w: World, u: Unit) => void;
} = {};

export function rollAttackDamage(w: World, u: Unit): number {
  return w.rng.range(u.calc.dmgMin, u.calc.dmgMax + 1e-9);
}

// ---------- 指令与攻击循环 ----------
export function ordersSystem(w: World): void {
  for (const u of w.units.values()) {
    if (!u.alive) continue;
    if (u.isBuilding()) {
      buildingCombat(w, u);
      continue;
    }
    const st = stateOf(u);
    if (st.stunned) {
      u.windupTargetId = 0; // 眩晕打断前摇
      u.casting = null; // 眩晕打断施法(蓝未付,不进 CD)
      if (u.channeling) castHooks.breakChannel?.(w, u);
      continue;
    }

    // 施法前摇/引导进行中(占用本 tick)
    if (castHooks.progress?.(w, u)) continue;

    // 前摇进行中
    if (u.windupTargetId) {
      const t = w.getUnit(u.windupTargetId);
      if (!t || !t.alive || !inAttackRange(u, t, 96)) {
        u.windupTargetId = 0; // 取消前摇(目标丢失/超距)
      } else {
        u.facing = turnTowards(u.facing, V.angle(u.pos, t.pos), TURN_RATE * w.dt);
        if (w.time >= u.windupUntil) {
          launchAttack(w, u, t);
          u.windupTargetId = 0;
        }
        continue; // 前摇期间不移动
      }
    }

    const o = u.order;
    if (!o) {
      idleCombat(w, u);
      continue;
    }
    switch (o.type) {
      case 'move':
        if (!st.rooted) u.stepMovement(w);
        break;
      case 'attack': {
        const t = w.getUnit(o.targetId!);
        if (!t || !t.alive) {
          u.order = u.orderQueue.shift() ?? null;
          break;
        }
        // 反补规则:攻击己方单位仅限血量<50%的小兵(或己方建筑<10%,经典可拆塔反补简化为不允许)
        if (t.team === u.team && !(t.kind === 'creep' && t.hp / t.calc.maxHp < 0.5)) {
          u.order = null;
          break;
        }
        attackRoutine(w, u, t);
        break;
      }
      case 'attackmove': {
        let t = w.getUnit(u.attackTargetId);
        if (!t || !t.alive || !isEnemy(u, t) || V.dist(u.pos, t.pos) > u.calc.acquireRange * 1.7) {
          u.attackTargetId = 0;
          t = undefined;
          if ((w.tick + u.id) % 6 === 0) {
            const found = acquireTarget(w, u);
            if (found) {
              u.attackTargetId = found.id;
              t = found;
            }
          }
        }
        if (t) {
          attackRoutine(w, u, t);
        } else if (o.pos) {
          u.moveAlongPathTo(w, o.pos);
          if (V.dist(u.pos, o.pos) < 64) u.order = u.orderQueue.shift() ?? null;
        }
        break;
      }
      case 'hold': {
        const t = nearestEnemyInRange(w, u, u.calc.attackRange + u.base.collisionRadius + 24);
        if (t) holdAttack(w, u, t);
        break;
      }
      case 'cast':
        castHooks.startCast?.(w, u, o);
        break;
      case 'stop':
        u.order = null;
        break;
    }
  }
}

/** 空闲单位:就地获取并短距追击。 */
function idleCombat(w: World, u: Unit): void {
  let t = w.getUnit(u.attackTargetId);
  if (!t || !t.alive || !isEnemy(u, t) || V.dist(u.pos, t.pos) > u.calc.acquireRange * 1.4) {
    u.attackTargetId = 0;
    t = undefined;
    if ((w.tick + u.id) % 6 === 0) {
      const found = acquireTarget(w, u);
      if (found) {
        u.attackTargetId = found.id;
        t = found;
      }
    }
  }
  if (t) attackRoutine(w, u, t);
}

/** 追击 + 攻击循环。 */
export function attackRoutine(w: World, u: Unit, t: Unit): void {
  if (inAttackRange(u, t)) {
    // 不清空路径缓存:脱战重新追击时按 goal 差异自然重算,避免高频 A*
    u.facing = turnTowards(u.facing, V.angle(u.pos, t.pos), TURN_RATE * w.dt);
    tryStartWindup(w, u, t);
  } else if (!stateOf(u).rooted) {
    u.moveAlongPathTo(w, t.pos);
  }
}

function holdAttack(w: World, u: Unit, t: Unit): void {
  u.facing = turnTowards(u.facing, V.angle(u.pos, t.pos), TURN_RATE * w.dt);
  tryStartWindup(w, u, t);
}

export function tryStartWindup(w: World, u: Unit, t: Unit): void {
  if (stateOf(u).disarmed) return;
  if (w.time < u.attackCooldownUntil) return;
  const interval = attackInterval(u);
  u.windupTargetId = t.id;
  u.windupUntil = w.time + u.calc.attackPoint * interval;
  u.attackCooldownUntil = w.time + interval;
  w.emit({ kind: 'attack_launched', unitId: u.id, targetId: t.id });
}

function launchAttack(w: World, u: Unit, t: Unit): void {
  if (u.calc.projectileSpeed > 0) {
    w.projectiles.push({
      pos: V.clone(u.pos),
      speed: u.calc.projectileSpeed,
      targetId: t.id,
      sourceId: u.id,
      kind: 'attack',
      attackPayload: { amount: rollAttackDamage(w, u) },
    });
  } else {
    dealAttackDamage(w, u, t);
  }
}

/** 由 vision.ts 注入的可见性查询(默认全可见)。 */
export let visibilityCheck: (w: World, viewerTeam: number, unit: Unit) => boolean = () => true;
export function setVisibilityCheck(fn: typeof visibilityCheck): void {
  visibilityCheck = fn;
}

/** 目标获取:优先非建筑、按距离;迷雾/隐身中的目标不可获取。 */
export function acquireTarget(w: World, u: Unit): Unit | undefined {
  const r = u.calc.acquireRange;
  let bestUnit: Unit | undefined;
  let bestUnitD = Infinity;
  let bestBuilding: Unit | undefined;
  let bestBuildingD = Infinity;
  const r2 = r * r;
  for (const v of w.units.values()) {
    if (!isEnemy(u, v)) continue;
    if (stateOf(v).invisible || v.invulnerable) continue;
    if (v.kind === 'ward') continue;
    if (!visibilityCheck(w, u.team, v)) continue;
    const d2 = V.distSq(u.pos, v.pos);
    if (d2 > r2) continue;
    if (v.isBuilding()) {
      if (d2 < bestBuildingD) { bestBuildingD = d2; bestBuilding = v; }
    } else {
      if (d2 < bestUnitD) { bestUnitD = d2; bestUnit = v; }
    }
  }
  return bestUnit ?? bestBuilding;
}

function nearestEnemyInRange(w: World, u: Unit, r: number): Unit | undefined {
  let best: Unit | undefined;
  let bestD = Infinity;
  const r2 = r * r;
  for (const v of w.units.values()) {
    if (!isEnemy(u, v) || stateOf(v).invisible || v.kind === 'ward') continue;
    const d2 = V.distSq(u.pos, v.pos);
    if (d2 <= r2 && d2 < bestD) { bestD = d2; best = v; }
  }
  return best;
}

/** 建筑战斗(塔的仇恨规则在 buildings.ts 细化;此处提供默认攻击循环)。 */
function buildingCombat(w: World, u: Unit): void {
  if (u.calc.dmgMax <= 0) return;
  if (u.windupTargetId) {
    const t = w.getUnit(u.windupTargetId);
    if (!t || !t.alive || !inAttackRange(u, t, 128)) {
      u.windupTargetId = 0;
    } else if (w.time >= u.windupUntil) {
      launchAttack(w, u, t);
      u.windupTargetId = 0;
    }
    return;
  }
  let t = w.getUnit(u.attackTargetId);
  if (!t || !t.alive || !inAttackRange(u, t, 64)) {
    u.attackTargetId = 0;
    t = towerAcquire(w, u);
    if (t) u.attackTargetId = t.id;
  }
  if (t) tryStartWindup(w, u, t);
}

/** 塔优先小兵;本方英雄 500 内被敌英雄攻击 → 优先该英雄(buildings.ts 注入事件覆盖)。 */
export function towerAcquire(w: World, tower: Unit): Unit | undefined {
  const r = tower.calc.attackRange + tower.base.collisionRadius;
  let bestCreep: Unit | undefined, bestCreepD = Infinity;
  let bestHero: Unit | undefined, bestHeroD = Infinity;
  for (const v of w.units.values()) {
    if (!isEnemy(tower, v) || stateOf(v).invisible || v.kind === 'ward' || v.isBuilding()) continue;
    const d = V.dist(tower.pos, v.pos) - v.base.collisionRadius;
    if (d > r) continue;
    if (v.isHero()) {
      if (d < bestHeroD) { bestHeroD = d; bestHero = v; }
    } else {
      if (d < bestCreepD) { bestCreepD = d; bestCreep = v; }
    }
  }
  return bestCreep ?? bestHero;
}

// ---------- 弹道 ----------
export function projectileSystem(w: World): void {
  const remain: typeof w.projectiles = [];
  for (const p of w.projectiles) {
    const t = w.getUnit(p.targetId);
    if (!t || !t.alive) {
      continue; // 目标已死,弹道作废
    }
    const step = p.speed * w.dt;
    if (V.dist(p.pos, t.pos) <= step + t.base.collisionRadius * 0.5) {
      // 命中
      if (p.kind === 'attack' && p.attackPayload) {
        const src = w.getUnit(p.sourceId);
        if (src) {
          dealAttackDamage(w, src, t, p.attackPayload.amount);
        } else {
          applyDamage(w, t, { source: p.sourceId, attackType: 'normal', amount: p.attackPayload.amount });
        }
      } else if (p.onHit) {
        p.onHit(w, t, p.sourceId);
      }
      w.emit({ kind: 'projectile_hit', pos: V.clone(t.pos) });
    } else {
      p.pos = V.moveTowards(p.pos, t.pos, step);
      remain.push(p);
    }
  }
  w.projectiles = remain;
}

// ---------- 清理 ----------
const CORPSE_TIME = 2.5;
export function cleanupSystem(w: World): void {
  for (const u of [...w.units.values()]) {
    if (u.alive) continue;
    if (u.isHero()) continue; // 英雄等待复活(M3)
    const linger = u.isBuilding() ? 60 : CORPSE_TIME;
    if (w.time - u.diedAt > linger) w.removeUnit(u.id);
  }
}
