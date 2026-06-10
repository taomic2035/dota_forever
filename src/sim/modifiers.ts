/** Modifier(buff/debuff)系统 —— M3 实装,此处先定骨架类型。 */
import type { EntityId, Unit } from './unit';
import type { World } from './world';

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
}
