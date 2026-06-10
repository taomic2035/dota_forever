/**
 * 单位实体:英雄/小兵/野怪/建筑共用一个类,以 kind + 数据区分。
 * M1 仅实现移动;战斗在 combat.ts,状态效果在 modifiers.ts。
 */
import { V, type Vec2 } from '../core/vec2';
import { turnTowards } from '../core/mathx';
import type { AttackType, ArmorType } from '../data/balance';
import { TURN_RATE } from '../data/balance';
import type { World } from './world';
import { findPath } from './pathfinding';
import type { Modifier } from './modifiers';
import type { AbilityInstance } from './abilities';
import type { ItemInstance } from './items';
import type { BuildingKind, Lane } from '../data/mapLayout';

export type EntityId = number;
export type UnitKind = 'hero' | 'creep' | 'neutral' | 'boss' | 'tower' | 'building' | 'ward';

export type OrderType = 'move' | 'attack' | 'attackmove' | 'cast' | 'hold' | 'stop';
export interface Order {
  type: OrderType;
  pos?: Vec2;
  targetId?: EntityId;
  abilityIndex?: number;
}

/** 单位面板(基础值;最终值见 CalcStats)。 */
export interface UnitStats {
  maxHp: number;
  hpRegen: number;
  maxMp: number;
  mpRegen: number;
  dmgMin: number;
  dmgMax: number;
  attackType: AttackType;
  armorType: ArmorType;
  armor: number;
  magicResist: number;
  attackRange: number;
  /** 攻击前摇占攻击间隔比例 0-1 */
  attackPoint: number;
  bat: number;
  /** 0 = 近战瞬时 */
  projectileSpeed: number;
  moveSpeed: number;
  collisionRadius: number;
  visionDay: number;
  visionNight: number;
  acquireRange: number;
  bountyMin: number;
  bountyMax: number;
  xpBounty: number;
}

/** 经 modifier 聚合后的实际面板(每 tick 重算,M3 起生效;当前=base 镜像)。 */
export interface CalcStats extends UnitStats {
  ias: number; // 总攻速加成
  evasion: number;
  critChance: number;
  critMultiplier: number;
  lifesteal: number;
  trueSight: number; // 真视半径,0=无
}

export interface UnitInit {
  kind: UnitKind;
  team: number;
  pos: Vec2;
  stats: UnitStats;
  name: string;
}

export interface HeroMeta {
  gold: number;
  xp: number;
  skillPoints: number;
  statBonusLearned: number;
  lastHits: number;
  denies: number;
  kills: number;
  deaths: number;
  assists: number;
  streak: number;
  respawnAt: number;
}

export function makeHeroMeta(startingGold: number): HeroMeta {
  return {
    gold: startingGold, xp: 0, skillPoints: 1, statBonusLearned: 0,
    lastHits: 0, denies: 0, kills: 0, deaths: 0, assists: 0, streak: 0,
    respawnAt: -Infinity,
  };
}

let NEXT_ID = 1;
export function resetIds() {
  NEXT_ID = 1;
}

export class Unit {
  id: EntityId;
  kind: UnitKind;
  team: number;
  name: string;
  pos: Vec2;
  prevPos: Vec2;
  facing = 0;
  base: UnitStats;
  calc: CalcStats;
  hp: number;
  mp: number;
  level = 1;
  alive = true;
  invulnerable = false;
  /** 死亡时刻(world.time) */
  diedAt = -Infinity;
  /** 建筑专属 */
  buildingKind?: BuildingKind;
  lane?: Lane;
  /** 英雄专属经济/成长状态 */
  heroMeta?: HeroMeta;
  /** 英雄定义引用(data/heroes) */
  heroDef?: import('../data/heroes/types').HeroDef;
  /** 物品/技能给予的属性加成(modifier 聚合写入) */
  bonusAttr = { str: 0, agi: 0, int: 0 };

  order: Order | null = null;
  orderQueue: Order[] = [];
  path: Vec2[] = [];
  pathGoal: Vec2 | null = null;

  modifiers: Modifier[] = [];
  abilities: AbilityInstance[] = [];
  inventory: (ItemInstance | null)[] = [null, null, null, null, null, null];

  // 施法状态(abilities.ts 驱动)
  casting: { abilityIndex: number; pointUntil: number; pos?: Vec2; targetId?: EntityId } | null = null;
  channeling: { abilityIndex: number; until: number; nextTickAt: number; pos?: Vec2; targetId?: EntityId } | null = null;

  // 战斗状态(combat.ts 驱动)。时钟从负数起走(准备期),时间戳一律初始化为 -Infinity
  attackTargetId: EntityId | 0 = 0;
  attackCooldownUntil = -Infinity; // world.time
  windupUntil = -Infinity;
  windupTargetId: EntityId | 0 = 0;
  lastAttackerId: EntityId | 0 = 0;
  lastDamagedAt = -Infinity;

  constructor(init: UnitInit) {
    this.id = NEXT_ID++;
    this.kind = init.kind;
    this.team = init.team;
    this.name = init.name;
    if (init.kind === 'hero') this.heroMeta = makeHeroMeta(603);
    this.pos = V.clone(init.pos);
    this.prevPos = V.clone(init.pos);
    this.base = { ...init.stats };
    this.calc = { ...init.stats, ias: 0, evasion: 0, critChance: 0, critMultiplier: 1.5, lifesteal: 0, trueSight: 0 };
    this.hp = this.base.maxHp;
    this.mp = this.base.maxMp;
  }

  isHero(): boolean {
    return this.kind === 'hero';
  }
  isBuilding(): boolean {
    return this.kind === 'tower' || this.kind === 'building';
  }
  isAlive(): boolean {
    return this.alive;
  }

  issueOrder(o: Order): void {
    this.order = o;
    this.orderQueue.length = 0;
    this.path = [];
    this.pathGoal = null;
    if (o.type === 'stop') this.order = null;
    this.attackTargetId = 0;
    this.windupTargetId = 0;
    // 任何新指令打断施法前摇与引导
    this.casting = null;
    this.channeling = null;
  }

  /** M1 移动执行;战斗类 order 由 combat 扩展处理。 */
  stepMovement(w: World): void {
    const o = this.order;
    if (!o) return;
    if (o.type === 'move' && o.pos) {
      this.moveAlongPathTo(w, o.pos);
      if (V.dist(this.pos, o.pos) < 48) {
        this.order = this.orderQueue.shift() ?? null;
        this.path = [];
        this.pathGoal = null;
      }
    }
  }

  /** 朝目标点沿路径移动一 tick;路径缓存,目标变化才重算。 */
  moveAlongPathTo(w: World, goal: Vec2): void {
    if (!this.pathGoal || V.dist(this.pathGoal, goal) > 96) {
      this.path = findPath(w.map, this.pos, goal);
      this.pathGoal = V.clone(goal);
      // 去掉起点(就是自己位置)
      if (this.path.length > 1) this.path.shift();
    }
    if (this.path.length === 0) return;
    let next = this.path[0];
    while (next && V.dist(this.pos, next) < 24) {
      this.path.shift();
      next = this.path[0];
    }
    if (!next) return;
    const targetAngle = V.angle(this.pos, next);
    this.facing = turnTowards(this.facing, targetAngle, TURN_RATE * w.dt);
    const step = this.calc.moveSpeed * w.dt;
    const newPos = V.moveTowards(this.pos, next, step);
    // 自己已在阻挡格(被技能位移/出生点异常)时允许自由移动逃脱
    if (w.map.isWalkable(newPos) || !w.map.isWalkable(this.pos)) {
      this.pos = newPos;
    } else {
      const snapped = w.map.nearestWalkable(newPos);
      if (V.dist(snapped, this.pos) < step * 2) this.pos = snapped;
      else this.path = []; // 卡住,下 tick 重新寻路
      this.pathGoal = null;
    }
  }
}
