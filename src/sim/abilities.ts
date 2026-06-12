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
import { applyModifier, removeModifier, tryLinkenBlock, type ModifierDef } from './modifiers';
import { targetMatchesFilter } from './targeting';

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

export type AbilityCastReason = 'dead' | 'not-learned' | 'passive' | 'cooldown' | 'no-mana' | 'silenced';

/**
 * 技能为何不能施放的细分原因(null = 可施放)。UX 层(预拒绝文案)与 sim 共用此判断,
 * 避免 main.ts 自行复刻校验导致漂移。仅含「能否发起」的原因;目标合法性见 sim/targeting。
 */
export function abilityCastReason(w: World, u: Unit, index: number): AbilityCastReason | null {
  if (!u.alive) return 'dead';
  const def = abilityDefAt(u, index);
  const inst = u.abilities[index];
  if (!def || !inst || inst.level <= 0) return 'not-learned';
  if (def.targetMode === 'passive' || (def.passiveModifier && !def.onCast && !def.channel)) return 'passive';
  if (w.time < inst.cooldownUntil) return 'cooldown';
  const mana = def.manaCost?.[Math.max(0, inst.level - 1)] ?? 0;
  if (u.mp < mana) return 'no-mana';
  if (stateOf(u).silenced) return 'silenced';
  return null;
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
    // 权威目标校验:队伍/种类不合法则拒绝(人类/AI/未来网络命令一视同仁)
    if (!targetMatchesFilter(u, target, def.targetTeam, def.targetKind)) { u.order = null; return; }
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
  // M4 林肯法球:单体敌对指向技被格挡 → 已付蓝/CD,效果作废
  if (def.targetMode === 'unit' && target && isEnemy(u, target) && tryLinkenBlock(w, target, u.id)) {
    return;
  }
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

// ---------- 通用攻击衍生效果(数据驱动,供英雄/物品复用) ----------
// 由 modifier.def.data 上的约定键触发,不绑定任何具体英雄:
//   攻击者持有 cleavePct → 对目标周围溅射物理伤害(劈砍/强化)
//   目标持有 retaliateSlowPct → 攻击者被减速(冰甲类反伤)
// 注:溅射走 applyDamage,不经攻击流水线,不会再次触发本钩子(无递归)。
attackHitHooks.push((w, attacker, target, dealt) => {
  if (dealt <= 0) return;
  for (const m of attacker.modifiers) {
    const pct = m.def.data?.cleavePct;
    if (!pct) continue;
    const radius = m.def.data?.cleaveRadius ?? 250;
    for (const e of w.queryRadius(target.pos, radius, (t) => isEnemy(attacker, t) && t.id !== target.id && !t.isBuilding())) {
      applyDamage(w, e, { source: attacker.id, attackType: attacker.calc.attackType, amount: dealt * pct });
    }
  }
  for (const m of target.modifiers) {
    const slow = m.def.data?.retaliateSlowPct;
    if (!slow) continue;
    applyModifier(w, attacker, {
      key: `${m.key}_retaliate`, duration: m.def.data?.retaliateSlowDur ?? 1.5,
      stats: { bonusMoveSpeedPct: -slow, bonusAttackSpeed: -(m.def.data?.retaliateSlowAs ?? slow) },
    }, target.id);
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
    // 免疫判定收口于 applyModifier/immuneToDebuff(尊重 piercesSpellImmunity、无敌、buff、友方来源)。
    // 此处不再就地跳过魔免——否则穿魔免 AoE 会被错误拦截(B2)。
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
 * 创建源英雄的幻象:复制当前面板,出伤打折、受伤翻倍,无法施法,定时消失。
 * 以 'illusion' kind 区分(不计英雄数/胜负/英雄赏金),渲染时仍显示为该英雄。
 */
export function createIllusion(
  w: World, source: Unit, count: number, outgoing: number, incoming: number, duration: number,
): Unit[] {
  const out: Unit[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const offset = { x: Math.cos(angle) * 90, y: Math.sin(angle) * 90 };
    const u = w.spawnUnit({
      kind: 'illusion',
      team: source.team,
      pos: w.map.nearestWalkable(V.add(source.pos, offset)),
      name: source.name,
      stats: { ...source.base },
    });
    u.heroDef = source.heroDef;        // 渲染识别(颜色/字形)
    u.level = source.level;
    u.illuOutgoing = outgoing;
    u.illuIncoming = incoming;
    u.summonExpiresAt = w.time + duration;
    u.summonOwnerId = source.id;
    u.hp = u.base.maxHp;
    // 跟随源英雄朝其面向推进
    const ahead = V.add(source.pos, { x: Math.cos(source.facing) * 300, y: Math.sin(source.facing) * 300 });
    u.issueOrder({ type: 'attackmove', pos: w.map.nearestWalkable(ahead) });
    out.push(u);
  }
  return out;
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
