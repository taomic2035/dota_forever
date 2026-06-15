/**
 * 单位碰撞 / body-block:移动后的确定性分离 pass。
 *
 * 经典 DotA1 的核心玩法之一——单位有实体,不可重叠:卡兵控线、body-block 拦截逃跑、
 * 绕单位 juke。此前 collisionRadius 仅用于攻击距离判定,位移阶段单位互相穿透,无卡位博弈。
 *
 * 设计:两阶段 Jacobi 松弛。先基于「当前所有位置」只读计算每个单位的分离位移(与遍历顺序无关
 * → 确定性),再统一施加(带单 tick 上限 + 不推入墙的轴滑行)。挂在 ordersSystem(移动)之后。
 *
 * 参与碰撞 = 可动的战斗单位(英雄/小兵/野怪/Boss/幻象);排除守卫、信使、建筑(建筑硬碰撞需
 * 与寻路障碍集成,否则路径与碰撞互斗抖动,留作后续)。phased(相位移动)/ untargetable(旋风升空)
 * 单位穿越,不参与碰撞。
 */
import { V, type Vec2 } from '../core/vec2';
import type { World } from './world';
import type { Unit, UnitKind, EntityId } from './unit';
import { stateOf, inAttackRange } from './combat';

/** 参与单位间碰撞的可动单位种类。建筑/守卫/信使不参与(见模块注释)。 */
const COLLIDE_KINDS: ReadonlySet<UnitKind> = new Set<UnitKind>([
  'hero',
  'creep',
  'neutral',
  'boss',
  'illusion',
]);

/**
 * 单 tick 最大分离位移(单位):必须 ≈ 单位移速量级(典型 moveSpeed ~300 → 10/tick),
 * 取 14(≈420/s)——足以挡住典型移动单位实现 body-block,又不会在密集围攻时把单位
 * 甩飞得比走路还快(早期取 24≈720/s 远超移速,导致攻城单位被甩散、推进吞吐腰斩)。
 */
export const MAX_SEPARATION_PER_TICK = 14;

/** 完全重叠(同点)时的确定性散开角度种子(黄金角,均匀铺开,无随机)。 */
const GOLDEN_ANGLE = 2.399963;

/** 该单位当前是否参与碰撞(活着、可动战斗种类、未处于穿越态)。 */
export function collides(u: Unit): boolean {
  if (!u.alive) return false;
  if (!COLLIDE_KINDS.has(u.kind)) return false;
  const st = stateOf(u);
  if (st.phased || st.untargetable) return false;
  return true;
}

/**
 * 单位是否「站桩」(攻击前摇中,或站在目标攻击范围内开打)——站桩单位仍推开他人(可 body-block),
 * 但自身不被位移:保持攻城/团战阵型紧凑(攻城单位不被自家队伍挤散,吞吐不腰斩),同时开阔地的
 * 移动单位照常分离。追击中(目标超出攻击距离)仍算移动,正常参与分离。
 */
function isPlanted(u: Unit, w: World): boolean {
  if (u.windupUntil > w.time) return true;
  if (u.attackTargetId !== 0) {
    const t = w.getUnit(u.attackTargetId);
    if (t && t.alive && inAttackRange(u, t)) return true;
  }
  return false;
}

/** 碰撞体:分离计算只需 id / 位置 / 半径,与 World 解耦,便于纯函数测试。 */
export interface Collider {
  id: EntityId;
  pos: Vec2;
  r: number;
}

/**
 * 纯函数:给定一组碰撞体,返回每个重叠单位应施加的分离位移(id → 位移向量)。
 * 每对重叠按各取一半 overlap 分离(两边合计恰好分开 overlap);多邻居贡献累加。
 * 完全重叠(d≈0)按 id 派生的黄金角方向散开,保证确定性且不同 id 朝不同方向。
 * 结果与输入顺序无关(全部基于传入位置只读计算)。
 */
export function separationOffsets(cs: readonly Collider[]): Map<EntityId, Vec2> {
  const out = new Map<EntityId, Vec2>();
  for (let i = 0; i < cs.length; i++) {
    const a = cs[i];
    let dx = 0;
    let dy = 0;
    for (let j = 0; j < cs.length; j++) {
      if (i === j) continue;
      const b = cs[j];
      const rsum = a.r + b.r;
      const ex = a.pos.x - b.pos.x;
      const ey = a.pos.y - b.pos.y;
      const d2 = ex * ex + ey * ey;
      if (d2 >= rsum * rsum) continue; // 未重叠
      const d = Math.sqrt(d2);
      let nx: number;
      let ny: number;
      if (d < 1e-4) {
        // 完全重叠:按 id 派生方向散开(确定性,非随机)
        const ang = a.id * GOLDEN_ANGLE;
        nx = Math.cos(ang);
        ny = Math.sin(ang);
      } else {
        nx = ex / d;
        ny = ey / d;
      }
      const half = (rsum - d) * 0.5; // 本单位分担一半 overlap
      dx += nx * half;
      dy += ny * half;
    }
    if (dx !== 0 || dy !== 0) out.set(a.id, { x: dx, y: dy });
  }
  return out;
}

/** 把位移钳制到单 tick 上限(保持方向)。 */
function clampStep(v: Vec2, max: number): Vec2 {
  const mag = Math.hypot(v.x, v.y);
  if (mag <= max || mag === 0) return v;
  const s = max / mag;
  return { x: v.x * s, y: v.y * s };
}

/**
 * 碰撞分离系统:收集可动碰撞单位 → 纯函数算分离位移 → 钳制并施加(不推入墙;
 * 直推不可行则按 X/Y 单轴滑出,贴着障碍分离而非卡死)。
 */
export function collisionSystem(w: World): void {
  const movers: Unit[] = [];
  for (const u of w.units.values()) {
    if (collides(u)) movers.push(u);
  }
  if (movers.length < 2) return;
  const colliders: Collider[] = movers.map((u) => ({ id: u.id, pos: u.pos, r: u.base.collisionRadius }));
  const offsets = separationOffsets(colliders);
  if (offsets.size === 0) return;

  for (const u of movers) {
    const off = offsets.get(u.id);
    if (!off) continue;
    if (isPlanted(u, w)) continue; // 站桩单位不被位移(仍作为障碍推开他人)
    const step = clampStep(off, MAX_SEPARATION_PER_TICK);
    const np = { x: u.pos.x + step.x, y: u.pos.y + step.y };
    if (w.map.isWalkable(np)) {
      u.pos = np;
      continue;
    }
    // 撞墙:尝试单轴滑出,使单位贴墙分离而非卡死
    const sx = { x: np.x, y: u.pos.y };
    if (w.map.isWalkable(sx)) {
      u.pos = sx;
      continue;
    }
    const sy = { x: u.pos.x, y: np.y };
    if (w.map.isWalkable(sy)) {
      u.pos = sy;
    }
    // 两轴皆不可行(夹角处):本 tick 不分离,留待下 tick(单位移动后重新评估)
  }
}
