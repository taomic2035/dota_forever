/** Modifier(buff/debuff)系统 —— M3 实装,此处先定骨架类型。 */
import type { EntityId } from './unit';

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
  auraBurn: number; // 灼烧光环 DPS(辉光类)
  bonusVision: number;
  trueSightRadius: number;
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
  unstoppableChannel?: boolean;
}

export interface Modifier {
  key: string;
  sourceId: EntityId;
  expiresAt: number; // world.time;Infinity = 永久
  stats?: Partial<StatMods>;
  states?: StateMods;
  tickInterval?: number;
  nextTickAt?: number;
  data?: Record<string, number>;
}
