/**
 * Modifier(buff/debuff)系统:一切状态效果的统一载体。
 * 属性修正/控制状态/DoT/光环全部经由 modifier;
 * combat.recalcUnit 在重算时调用 foldModifiers 聚合数值。
 */
import { V } from '../core/vec2';
import type { EntityId, Unit } from './unit';
import type { World, WorldSystem } from './world';
import { setStateResolver, setModifierFold } from './combat';
import { MIN_MOVE_SPEED, MAX_MOVE_SPEED } from '../data/balance';

export interface StatMods {
  bonusHp: number;
  bonusMp: number;
  bonusDamage: number;
  bonusDamagePct: number;
  bonusArmor: number;
  bonusAttackSpeed: number; // IAS,0.1 = +10%
  bonusMoveSpeed: number;
  bonusMoveSpeedPct: number;
  bonusStr: number;
  bonusAgi: number;
  bonusInt: number;
  bonusHpRegen: number;
  bonusMpRegen: number;
  bonusMagicResist: number;
  evasion: number;
  critChance: number;
  critMultiplier: number;
  lifesteal: number;
  bonusAttackRange: number;
  trueSightRadius: number;
  spellAmp: number;
}

export interface StateMods {
  stunned?: boolean;
  rooted?: boolean;
  silenced?: boolean;
  disarmed?: boolean;
  invisible?: boolean;
  magicImmune?: boolean;
  phased?: boolean;
  physImmune?: boolean;
}

export interface Modifier {
  key: string;
  sourceId: EntityId;
  expiresAt: number; // world.time;Infinity = 永久
  def: ModifierDef;
  nextTickAt?: number;
  data?: Record<string, number>;
}

/** Modifier 模板:施加时实例化为 Modifier。 */
export interface ModifierDef {
  key: string;
  /** 秒;不填 = 永久(光环授予的短时效由光环本体续期) */
  duration?: number;
  stats?: Partial<StatMods>;
  states?: StateMods;
  /** 周期效果(DoT/回复) */
  tickInterval?: number;
  onTick?(w: World, u: Unit, m: Modifier): void;
  /** 光环:挂在持有者身上,周期向半径内目标授予 grant */
  aura?: {
    radius: number;
    affects: 'ally' | 'enemy' | 'allyHero';
    grant: ModifierDef;
  };
  /** 同 key 不同来源是否可叠加(默认 false=刷新) */
  stackable?: boolean;
  /** 到期/移除回调 */
  onExpire?(w: World, u: Unit, m: Modifier): void;
  /** 纯标记(驱散用):true 为增益 */
  isBuff?: boolean;
  /** 静态参数(非 stats 聚合的特殊机制读取,如 retaliate 反伤系数) */
  data?: Record<string, number>;
}

export function applyModifier(w: World, target: Unit, def: ModifierDef, sourceId: EntityId): Modifier {
  if (!def.stackable) {
    const existing = target.modifiers.find((m) => m.key === def.key && m.sourceId === sourceId);
    if (existing) {
      existing.expiresAt = def.duration !== undefined ? w.time + def.duration : Infinity;
      existing.def = def;
      return existing;
    }
  }
  const m: Modifier = {
    key: def.key,
    sourceId,
    expiresAt: def.duration !== undefined ? w.time + def.duration : Infinity,
    def,
    nextTickAt: def.tickInterval !== undefined ? w.time + def.tickInterval : undefined,
    data: {},
  };
  target.modifiers.push(m);
  return m;
}

export function removeModifier(w: World, u: Unit, key: string, sourceId?: EntityId): void {
  for (let i = u.modifiers.length - 1; i >= 0; i--) {
    const m = u.modifiers[i];
    if (m.key === key && (sourceId === undefined || m.sourceId === sourceId)) {
      u.modifiers.splice(i, 1);
      m.def.onExpire?.(w, u, m);
    }
  }
}

export function hasModifier(u: Unit, key: string): boolean {
  return u.modifiers.some((m) => m.key === key);
}

/** 驱散:移除可驱散的 buff(对敌)或 debuff(对友)。 */
export function purge(w: World, u: Unit, removeBuffs: boolean): void {
  for (let i = u.modifiers.length - 1; i >= 0; i--) {
    const m = u.modifiers[i];
    if (m.expiresAt === Infinity) continue; // 永久(被动/光环)不可驱散
    if ((m.def.isBuff ?? false) === removeBuffs) {
      u.modifiers.splice(i, 1);
      m.def.onExpire?.(w, u, m);
    }
  }
}

/** 状态聚合。 */
export function modifierStates(u: Unit): StateMods {
  const s: StateMods = {};
  for (const m of u.modifiers) {
    const st = m.def.states;
    if (!st) continue;
    if (st.stunned) s.stunned = true;
    if (st.rooted) s.rooted = true;
    if (st.silenced) s.silenced = true;
    if (st.disarmed) s.disarmed = true;
    if (st.invisible) s.invisible = true;
    if (st.magicImmune) s.magicImmune = true;
    if (st.phased) s.phased = true;
    if (st.physImmune) s.physImmune = true;
  }
  return s;
}
setStateResolver(modifierStates);

/** 数值聚合:combat.recalcUnit 在 base 镜像后调用。 */
export function foldModifiers(u: Unit): void {
  const c = u.calc;
  u.bonusAttr.str = 0;
  u.bonusAttr.agi = 0;
  u.bonusAttr.int = 0;
  let msFlat = 0;
  let msPct = 0;
  let dmgPct = 0;
  for (const m of u.modifiers) {
    const s = m.def.stats;
    if (!s) continue;
    c.maxHp += s.bonusHp ?? 0;
    c.maxMp += s.bonusMp ?? 0;
    c.dmgMin += s.bonusDamage ?? 0;
    c.dmgMax += s.bonusDamage ?? 0;
    dmgPct += s.bonusDamagePct ?? 0;
    c.armor += s.bonusArmor ?? 0;
    c.ias += s.bonusAttackSpeed ?? 0;
    msFlat += s.bonusMoveSpeed ?? 0;
    msPct += s.bonusMoveSpeedPct ?? 0;
    u.bonusAttr.str += s.bonusStr ?? 0;
    u.bonusAttr.agi += s.bonusAgi ?? 0;
    u.bonusAttr.int += s.bonusInt ?? 0;
    c.hpRegen += s.bonusHpRegen ?? 0;
    c.mpRegen += s.bonusMpRegen ?? 0;
    c.magicResist = Math.min(0.85, c.magicResist + (s.bonusMagicResist ?? 0));
    c.evasion = Math.max(c.evasion, s.evasion ?? 0);
    if ((s.critChance ?? 0) > c.critChance) {
      c.critChance = s.critChance!;
      c.critMultiplier = s.critMultiplier ?? 1.5;
    }
    c.lifesteal += s.lifesteal ?? 0;
    c.attackRange += s.bonusAttackRange ?? 0;
    c.trueSight = Math.max(c.trueSight, s.trueSightRadius ?? 0);
    c.spellAmp += s.spellAmp ?? 0;
  }
  if (dmgPct !== 0) {
    c.dmgMin *= 1 + dmgPct;
    c.dmgMax *= 1 + dmgPct;
  }
  c.moveSpeed = Math.max(MIN_MOVE_SPEED, Math.min(MAX_MOVE_SPEED, (c.moveSpeed + msFlat) * (1 + msPct)));
}
setModifierFold(foldModifiers);

const AURA_CADENCE = 0.5;
const AURA_GRANT_DURATION = 0.8;

export function installModifiers(w: World): void {
  let nextAura = w.time;
  const system: WorldSystem = (world) => {
    // 过期与周期 tick
    for (const u of world.units.values()) {
      if (u.modifiers.length === 0) continue;
      for (let i = u.modifiers.length - 1; i >= 0; i--) {
        const m = u.modifiers[i];
        if (world.time >= m.expiresAt || (!u.alive && m.expiresAt !== Infinity)) {
          u.modifiers.splice(i, 1);
          m.def.onExpire?.(w, u, m);
          continue;
        }
        if (u.alive && m.def.onTick && m.nextTickAt !== undefined && world.time >= m.nextTickAt) {
          m.nextTickAt += m.def.tickInterval!;
          m.def.onTick(world, u, m);
        }
      }
    }
    // 光环授予
    if (world.time >= nextAura) {
      nextAura = world.time + AURA_CADENCE;
      for (const holder of world.units.values()) {
        if (!holder.alive) continue;
        for (const m of holder.modifiers) {
          const aura = m.def.aura;
          if (!aura) continue;
          const targets = world.queryRadius(holder.pos, aura.radius, (t) => {
            if (aura.affects === 'enemy') return t.team !== holder.team && !t.isBuilding();
            if (aura.affects === 'allyHero') return t.team === holder.team && t.isHero();
            return t.team === holder.team && !t.isBuilding();
          });
          for (const t of targets) {
            applyModifier(world, t, { ...aura.grant, duration: AURA_GRANT_DURATION }, holder.id);
          }
        }
      }
    }
  };
  // 在重算(index 0)之后立刻执行,保证当 tick 数值生效
  w.systems.splice(1, 0, system);
}
