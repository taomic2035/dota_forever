/**
 * 战斗管线:面板重算 → 指令执行(移动/追击/前摇/出手)→ 弹道 → 伤害结算 → 死亡清理。
 * WC3 模型:伤害类型×护甲类型矩阵、护甲公式、魔抗、闪避、暴击、吸血。
 */
import { V } from '../core/vec2';
import { turnTowards } from '../core/mathx';
import {
  DAMAGE_MATRIX, armorReduction, MAX_IAS_BONUS, TURN_RATE, TOWER_ATTACK_RAMP, TOWER_ATTACK_RAMP_MAX,
  UPHILL_MISS_CHANCE, BLINK_DAMAGE_LOCKOUT, MAGIC_RESIST_CAP, BACKDOOR_DAMAGE_FACTOR,
  type AttackType,
} from '../data/balance';
import type { World } from './world';
import { Unit, type EntityId } from './unit';

/** 经典 DotA:重生「重组」窗口(秒)。期间无敌、眩晕;到期后原地满血复活。 */
const REINCARNATION_DELAY = 3;

export interface DamageEvent {
  source: EntityId;
  attackType: AttackType;
  amount: number;
  flags?: { spell?: boolean; pure?: boolean; noLifesteal?: boolean; reflected?: boolean };
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

/**
 * 施加嘲讽:被嘲讽者在 durationSec 内被迫攻击 sourceId(消费见 ordersSystem)。
 * 收口规则:无敌单位不可被嘲讽;嘲讽即时中断被嘲讽者的引导(经典)。
 * 注:魔免交互因技而异(狂战士之吼原型穿魔免),故此处不按魔免拦截,由具体技能决定。
 */
export function applyTaunt(w: World, target: Unit, sourceId: EntityId, durationSec: number): void {
  if (target.invulnerable) return;
  target.tauntedUntil = Math.max(target.tauntedUntil, w.time + durationSec);
  target.tauntSourceId = sourceId;
  target.windupTargetId = 0;
  if (target.channeling) castHooks.breakChannel?.(w, target);
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
  c.ias = 0; c.evasion = 0; c.trueStrike = false; c.critChance = 0; c.critMultiplier = 1.5;
  c.lifesteal = 0; c.trueSight = 0; c.spellAmp = 0; c.incomingDamageReduction = 0;
  // 聚合顺序固定:modifier 数值(含属性加成写入 bonusAttr)→ 英雄属性折算
  modifierFold(u);
  for (const ext of recalcExtensions) ext(u);
  // 魔抗在 fold 中只累加,这里统一 clamp 一次(避免逐项 clamp 导致丢抗与顺序相关)
  c.magicResist = Math.min(MAGIC_RESIST_CAP, c.magicResist);
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
  if (!target.alive || target.invulnerable || stateOf(target).untargetable) return 0;
  if (w.time < target.glyphUntil) return 0; // 防御符文 Glyph:建筑短时免疫一切伤害
  let amount = evt.amount;
  const flags = evt.flags ?? {};

  if (flags.pure) {
    // 纯粹伤害直通
  } else if (flags.spell) {
    if (stateOf(target).magicImmune) return 0;
    if (DAMAGE_MATRIX.spell[target.calc.armorType] === 0) return 0;
    amount *= DAMAGE_MATRIX.spell[target.calc.armorType];
    amount *= 1 - target.calc.magicResist;
    // 幽灵/以太状态:免疫物理,但额外承受 40% 魔法伤害(M12)
    if (stateOf(target).physImmune) amount *= 1.4;
  } else {
    const isChaos = evt.attackType === 'chaos';
    if (!isChaos && stateOf(target).physImmune) return 0; // chaos 穿以太(physImmune)
    // 闪避 + 低打高 miss。必中(MKB)同时无视闪避与上坡(低打高)落空。
    const source = w.getUnit(evt.source);
    const trueStrike = source?.calc.trueStrike ?? false;
    let missChance = trueStrike ? 0 : target.calc.evasion;
    if (!trueStrike && source && w.map.heightAt(source.pos) < w.map.heightAt(target.pos)) {
      missChance = 1 - (1 - missChance) * (1 - UPHILL_MISS_CHANCE);
    }
    if (missChance > 0 && w.rng.chance(missChance)) {
      w.emit({ kind: 'fx', fx: 'miss', pos: V.clone(target.pos) });
      return 0;
    }
    amount *= DAMAGE_MATRIX[evt.attackType][target.calc.armorType];
    if (!isChaos) amount *= 1 - armorReduction(target.calc.armor); // chaos 无视护甲减伤
  }

  // 实例格挡:完全免疫整次伤害,消耗一层(对非反弹伤害)。
  // blockPhysicalOnly(折光/Refraction)只挡物理,法术/纯粹穿透;无此标记(尖刺甲壳)挡所有类型。
  if (!flags.reflected) {
    for (const m of target.modifiers) {
      if ((m.data?.blockInstances ?? 0) > 0) {
        if (m.data?.blockPhysicalOnly && (flags.spell || flags.pure)) continue;
        m.data!.blockInstances! -= 1;
        if (m.data!.blockInstances! <= 0) m.expiresAt = -Infinity;
        w.emit({ kind: 'fx', fx: 'refract', pos: V.clone(target.pos) });
        return 0;
      }
    }
  }
  // 通用承伤减免(棘背魔/壁垒等)
  if (target.calc.incomingDamageReduction > 0) amount *= 1 - target.calc.incomingDamageReduction;
  // 后门保护:无攻方小兵在侧时建筑受击减伤(惩罚无兵推塔;buildingsSystem 另含快速回血)
  if (target.backdoorProtected) amount *= BACKDOOR_DAMAGE_FACTOR;
  // 幻象受伤翻倍
  if (target.kind === 'illusion') amount *= target.illuIncoming;

  if (amount <= 0) return 0;
  // 护盾吸收(modifier.data.shield);shieldMagicOnly(如洞察烟斗)仅吸魔法伤害,物理/纯粹穿透
  for (const m of target.modifiers) {
    const shield = m.data?.shield ?? 0;
    if (shield <= 0) continue;
    if (m.data?.shieldMagicOnly && !flags.spell) continue;
    const absorbed = Math.min(shield, amount);
    m.data!.shield = shield - absorbed;
    amount -= absorbed;
    if (m.data!.shield <= 0) m.expiresAt = -Infinity;
    if (amount <= 0) return 0;
  }
  target.hp -= amount;
  target.lastAttackerId = evt.source;
  target.lastDamagedAt = w.time;
  // Soul Burn(纷争面纱/血棘):沉默期间累计承伤,到期由 modifier.onExpire 爆发其比例
  if (!flags.reflected) {
    for (const m of target.modifiers) {
      if (m.def.data?.soulBurnPct && m.expiresAt > w.time) m.data!.soulBurnAccum = (m.data!.soulBurnAccum ?? 0) + amount;
    }
  }
  {
    const src = w.getUnit(evt.source);
    if (src && src.team !== target.team && (src.isHero() || src.kind === 'tower' || src.kind === 'boss')) {
      target.blinkLockedUntil = w.time + BLINK_DAMAGE_LOCKOUT;
    }
  }
  w.emit({ kind: 'unit_damaged', unitId: target.id, sourceId: evt.source, amount, pos: V.clone(target.pos) });
  // 反击/反伤(retaliate,火盾/反击类):仅对非反弹的物理伤害,反弹纯粹伤害给来源,标记防递归
  if (!flags.spell && !flags.reflected) {
    let retal = 0;
    for (const m of target.modifiers) retal += m.def.data?.retaliate ?? 0;
    if (retal > 0) {
      const src = w.getUnit(evt.source);
      if (src && src.alive && src.team !== target.team && !src.isBuilding()) {
        applyDamage(w, src, { source: target.id, attackType: 'hero', amount: amount * retal, flags: { pure: true, reflected: true } });
      }
    }
    // 静电护盾(风暴之锤):被普攻时概率向攻击者释放链状闪电(魔法,非物理反弹)
    for (const m of target.modifiers) {
      const sl = m.def.data?.staticLightning ?? 0;
      if (sl <= 0 || !w.rng.chance(m.def.data?.staticChance ?? 0.25)) continue;
      const src = w.getUnit(evt.source);
      if (src && src.alive && src.team !== target.team && !src.isBuilding()) {
        applyDamage(w, src, { source: target.id, attackType: 'spell', amount: sl, flags: { spell: true, reflected: true } });
        w.emit({ kind: 'fx', fx: 'lightning', pos: V.clone(src.pos) });
      }
    }
  }
  if (target.hp <= 0) {
    // 免死:preventDeath 保留 1 血;reviveFull 则触发延迟重组(重生)
    const grave = target.modifiers.find((m) => (m.def.data?.preventDeath ?? 0) > 0);
    if (grave) {
      if ((grave.def.data?.reviveFull ?? 0) > 0) {
        // 延迟重组:消耗 grave buff;3 秒无敌+眩晕窗口;到期后满血复活
        grave.expiresAt = -Infinity; // 消耗重生 buff
        target.hp = 1; // 存活(不调用 kill(),敌方无击杀奖励)
        target.invulnerable = true;
        target.order = null;
        target.windupTargetId = 0;
        target.attackTargetId = 0;
        target.modifiers.push({
          key: 'reincarnating',
          sourceId: target.id,
          expiresAt: w.time + REINCARNATION_DELAY,
          def: {
            key: 'reincarnating',
            duration: REINCARNATION_DELAY,
            isBuff: true,
            states: { stunned: true },
            onExpire(world, u) {
              u.invulnerable = false;
              u.hp = u.calc.maxHp;
              u.mp = u.calc.maxMp;
              world.emit({ kind: 'fx', fx: 'reincarnate', pos: { x: u.pos.x, y: u.pos.y } });
            },
          },
          data: {},
        });
      } else {
        target.hp = 1;
      }
    } else {
      kill(w, target, evt.source);
    }
  }
  return amount;
}

/** 单位控制状态聚合(由 modifiers.ts 的 setStateResolver 注入,避免循环依赖)。 */
export let stateOf: (u: Unit) => {
  stunned?: boolean; rooted?: boolean; silenced?: boolean; disarmed?: boolean;
  muted?: boolean; invisible?: boolean; magicImmune?: boolean; physImmune?: boolean; phased?: boolean; untargetable?: boolean;
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
  if (attacker.kind === 'illusion') amount *= attacker.illuOutgoing; // 幻象出伤打折
  let crit = false;
  if (attacker.calc.critChance > 0 && w.rng.chance(attacker.calc.critChance)) {
    amount *= attacker.calc.critMultiplier;
    crit = true;
  }
  const dealt = applyDamage(w, target, { source: attacker.id, attackType: attacker.calc.attackType, amount });
  if (crit && dealt > 0) {
    w.emit({ kind: 'fx', fx: 'crit', pos: V.clone(target.pos) });
  }
  // 注:普通命中视觉/音效已由 unit_damaged 事件统一处理(fx3d burst + 伤害数字 + audio.hitImpact),不重复 emit
  if (dealt > 0 && attacker.calc.lifesteal > 0 && !target.isBuilding()) {
    attacker.hp = Math.min(attacker.calc.maxHp, attacker.hp + dealt * attacker.calc.lifesteal);
  }
  // 攻击命中钩子(法球类技能由 abilities.ts 注册)。rawAmount=经暴击/幻象但未经目标护甲的原始攻击值(供劈砍按经典以原始值为基数)
  for (const hook of attackHitHooks) hook(w, attacker, target, dealt, amount);
}

export const attackHitHooks: Array<(w: World, attacker: Unit, target: Unit, dealt: number, rawAmount: number) => void> = [];

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

    // 嘲讽:被迫攻击嘲讽来源,无视当前指令
    if (w.time < u.tauntedUntil) {
      const taunter = w.getUnit(u.tauntSourceId);
      if (taunter && taunter.alive) {
        attackRoutine(w, u, taunter);
        continue;
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
          u.advanceOrder();
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
          if (V.dist(u.pos, o.pos) < 64) u.advanceOrder();
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
  u.lastActionAt = w.time;
  w.emit({ kind: 'attack_launched', unitId: u.id, targetId: t.id });
}

/**
 * 防御塔连击递增:对同目标每次连续攻击伤害 +20%(经典 DotA1「久留塔下伤害递增」),
 * 切换目标或闲置(>3s 未攻击)重置。返回伤害乘数(非塔单位恒为 1,不触状态)。
 */
function towerAttackRampMult(w: World, u: Unit, t: Unit): number {
  if (!u.buildingKind?.startsWith('tower')) return 1;
  if (u.attackStreakTargetId !== t.id || w.time - u.attackStreakAt > 3) {
    u.attackStreak = 0;
    u.attackStreakTargetId = t.id;
  } else {
    u.attackStreak += 1;
  }
  u.attackStreakAt = w.time;
  return Math.min(1 + TOWER_ATTACK_RAMP * u.attackStreak, TOWER_ATTACK_RAMP_MAX);
}

function launchAttack(w: World, u: Unit, t: Unit): void {
  const rampMult = towerAttackRampMult(w, u, t);
  if (u.calc.projectileSpeed > 0) {
    w.projectiles.push({
      pos: V.clone(u.pos),
      speed: u.calc.projectileSpeed,
      targetId: t.id,
      sourceId: u.id,
      kind: 'attack',
      attackPayload: { amount: rollAttackDamage(w, u) * rampMult },
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
    if (stateOf(v).invisible || v.invulnerable || stateOf(v).untargetable) continue;
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
    // 召唤物到期消失
    if (u.alive && u.summonExpiresAt !== undefined && w.time >= u.summonExpiresAt) {
      kill(w, u, 0);
    }
    if (u.alive) continue;
    if (u.isHero()) continue; // 英雄不移除,等待复活系统处理
    const linger = u.isBuilding() ? 60 : CORPSE_TIME;
    if (w.time - u.diedAt > linger) w.removeUnit(u.id);
  }
}
