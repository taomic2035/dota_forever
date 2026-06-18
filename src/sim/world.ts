/**
 * 世界:固定步长模拟核心。持有地图、全部单位、事件流。
 * 渲染/UI 仅读取,绝不在 sim 内 import DOM。
 */
import { type Vec2, V } from '../core/vec2';
import { Rng } from '../core/rng';
import { DT } from '../data/balance';
import { GameMap, Team } from './map';
import { Unit, resetIds, type EntityId, type UnitInit } from './unit';
import type { Projectile } from './projectile';

export type GameEvent =
  | { kind: 'unit_died'; unitId: EntityId; killerId: EntityId; pos: Vec2 }
  | { kind: 'unit_damaged'; unitId: EntityId; sourceId: EntityId; amount: number; pos: Vec2; damageType: 'physical' | 'magical' | 'pure' }
  | { kind: 'attack_launched'; unitId: EntityId; targetId: EntityId }
  | { kind: 'projectile_hit'; pos: Vec2 }
  | { kind: 'hero_level'; unitId: EntityId; level: number }
  | { kind: 'hero_kill'; killerId: EntityId; victimId: EntityId; bounty: number; streakText?: string; assists?: EntityId[] }
  | { kind: 'first_blood'; killerId: EntityId; victimId: EntityId }
  | { kind: 'last_hit'; unitId: EntityId; gold: number; pos: Vec2; deny?: boolean }
  | { kind: 'tower_fell'; unitId: EntityId; team: Team; byTeam: Team }
  | { kind: 'rax_fell'; unitId: EntityId; team: Team }
  | { kind: 'game_over'; winner: Team }
  | { kind: 'rune_spawned'; rune: string; pos: Vec2 }
  | { kind: 'rune_taken'; rune: string; unitId: EntityId }
  | { kind: 'boss_killed'; killerId: EntityId; byTeam: Team }
  | { kind: 'cast_started'; unitId: EntityId; abilityKey: string }
  | { kind: 'cast_done'; unitId: EntityId; abilityKey: string; pos?: Vec2; targetId?: EntityId }
  | { kind: 'fx'; fx: string; pos: Vec2; pos2?: Vec2; radius?: number; duration?: number };

/** 每 tick 调用的子系统钩子(兵线/经济/AI 等注册进来)。 */
export type WorldSystem = (w: World) => void;

export class World {
  tick = 0;
  /** 比赛时间(秒),0 = 兵线计时起点 */
  time = 0;
  readonly dt = DT;
  rng: Rng;
  map: GameMap;
  units = new Map<EntityId, Unit>();
  events: GameEvent[] = [];
  systems: WorldSystem[] = [];
  projectiles: Projectile[] = [];
  gameOver: Team | null = null;
  /** 视野数据(installVision 初始化) */
  vision?: import('./vision').VisionData;
  /** 夜晚标志(daynight 系统驱动) */
  isNight = false;
  /** 技能强制黑夜至该时刻(暗夜猎手等) */
  forceNightUntil = -Infinity;
  /** 当前在场符文(installRunes 维护,至多一个) */
  runes: import('./runes').RuneSpawn[] = [];
  /** 防御符文 Glyph 各队就绪时刻([Dawn, Night];world.time ≥ 此值方可激活)。 */
  glyphReadyAt: number[] = [0, 0];
  /** 深渊领主(Boss):当前实体 id(0=不在世),下次复活时刻(在世时 = Infinity)。供 HUD 计时。 */
  bossId: EntityId = 0;
  bossRespawnAt = Infinity;
  /** 比赛实际开始前的准备时间偏移(time 从 -PREP 开始走) */
  constructor(map: GameMap, seed: number, startTime = -75) {
    this.map = map;
    this.rng = new Rng(seed);
    this.time = startTime;
    resetIds();
  }

  spawnUnit(init: UnitInit): Unit {
    const u = new Unit(init);
    this.units.set(u.id, u);
    return u;
  }

  removeUnit(id: EntityId): void {
    this.units.delete(id);
  }

  getUnit(id: EntityId | 0): Unit | undefined {
    return id === 0 ? undefined : this.units.get(id);
  }

  *aliveUnits(): IterableIterator<Unit> {
    for (const u of this.units.values()) if (u.alive) yield u;
  }

  queryRadius(pos: Vec2, r: number, filter?: (u: Unit) => boolean): Unit[] {
    const out: Unit[] = [];
    const r2 = r * r;
    for (const u of this.units.values()) {
      if (!u.alive) continue;
      if (V.distSq(u.pos, pos) > r2) continue;
      if (filter && !filter(u)) continue;
      out.push(u);
    }
    return out;
  }

  private pendingEvents: GameEvent[] = [];
  private inStep = false;

  /** step 内的事件当 tick 可见;step 外(测试/直调)的事件下一 tick 并入。 */
  emit(e: GameEvent): void {
    (this.inStep ? this.events : this.pendingEvents).push(e);
  }

  step(): void {
    if (this.gameOver !== null) return;
    this.tick++;
    this.time += this.dt;
    // 事件只保留一 tick:消费方在 step 后立即读取
    this.inStep = true;
    this.events = this.pendingEvents;
    this.pendingEvents = [];

    for (const u of this.units.values()) {
      u.prevPos = V.clone(u.pos);
    }

    for (const sys of this.systems) sys(this);

    for (const u of this.units.values()) {
      if (!u.alive) continue;
      u.hp = Math.min(u.calc.maxHp, u.hp + u.calc.hpRegen * this.dt);
      u.mp = Math.min(u.calc.maxMp, u.mp + u.calc.mpRegen * this.dt);
    }
    this.inStep = false;
  }
}

export { Team };
