/**
 * Bot AI v1:三层决策。
 * 战略(~1s):撤退/回线/分路;战术(同节拍):技能释放/英雄目标;
 * 微操(每 tick):补刀与反补窗口、推塔。
 */
import { V, type Vec2 } from '../../core/vec2';
import type { Lane } from '../../data/mapLayout';
import { Team } from '../map';
import type { World, WorldSystem } from '../world';
import type { Unit, EntityId } from '../unit';
import { isVisibleTo } from '../vision';
import { abilityReady, learnAbility, learnStatBonus, canLearn, canLearnStatBonus } from '../abilities';
import { inAttackRange } from '../combat';

interface BotState {
  lane: Lane;
  nextThink: number;
  mode: 'lane' | 'retreat';
}

const RETREAT_HP = 0.27;
const RECOVER_HP = 0.9;
const CAST_THRESHOLD = 40;

export function installBotAI(w: World, isPlayerControlled: (id: EntityId) => boolean): void {
  const bots = new Map<EntityId, BotState>();
  const laneCounters: Record<number, number> = { [Team.Dawn]: 0, [Team.Night]: 0 };

  const system: WorldSystem = (world) => {
    // 注册新英雄
    for (const u of world.units.values()) {
      if (!u.isHero() || bots.has(u.id) || isPlayerControlled(u.id)) continue;
      bots.set(u.id, {
        lane: assignLane(u, laneCounters[u.team]++),
        nextThink: world.time + (u.id % 10) * 0.1,
        mode: 'lane',
      });
    }
    for (const [id, st] of bots) {
      const u = world.getUnit(id);
      if (!u) { bots.delete(id); continue; }
      if (!u.alive) { st.mode = 'lane'; continue; }
      if (world.time >= st.nextThink) {
        st.nextThink = world.time + 0.9 + (id % 7) * 0.03;
        learnSkills(world, u);
        think(world, u, st);
      }
      microLastHit(world, u);
    }
  };
  w.systems.push(system);
}

/** 固定 2-1-2 分路(安全路=晨曦下/永夜上)。 */
function assignLane(u: Unit, idx: number): Lane {
  const safe: Lane = u.team === Team.Dawn ? 'bot' : 'top';
  const off: Lane = u.team === Team.Dawn ? 'top' : 'bot';
  const pattern: Lane[] = [safe, 'mid', off, safe, off];
  return pattern[idx % pattern.length];
}

function learnSkills(w: World, u: Unit): void {
  if (!u.heroDef || !u.heroMeta) return;
  let guard = 8;
  while (u.heroMeta.skillPoints > 0 && guard-- > 0) {
    let learned = false;
    for (const i of [3, 0, 1, 2]) {
      if (u.heroDef.abilities[i] && canLearn(u, i)) {
        learnAbility(w, u, i);
        learned = true;
        break;
      }
    }
    if (!learned && canLearnStatBonus(u)) learned = learnStatBonus(u);
    if (!learned) break;
  }
}

function fountainPos(w: World, team: number): Vec2 {
  const f = [...w.units.values()].find((b) => b.buildingKind === 'fountain' && b.team === team);
  return f ? f.pos : { x: 7520, y: 7520 };
}

function think(w: World, u: Unit, st: BotState): void {
  const hpFrac = u.hp / u.calc.maxHp;

  // 撤退模式
  if (st.mode === 'retreat') {
    if (hpFrac >= RECOVER_HP) {
      st.mode = 'lane';
    } else {
      orderMove(w, u, fountainPos(w, u.team));
      return;
    }
  }
  if (hpFrac < RETREAT_HP) {
    st.mode = 'retreat';
    orderMove(w, u, fountainPos(w, u.team));
    return;
  }

  // 战斗:可见敌方英雄
  const foes: Unit[] = [];
  for (const v of w.units.values()) {
    if (!v.isHero() || !v.alive || v.team === u.team) continue;
    if (V.dist(u.pos, v.pos) > 1100) continue;
    if (!isVisibleTo(w, u.team, v)) continue;
    foes.push(v);
  }
  if (foes.length) {
    if (castBest(w, u)) return;
    foes.sort((a, b) => a.hp / a.calc.maxHp - b.hp / b.calc.maxHp);
    const t = foes[0];
    const tFrac = t.hp / t.calc.maxHp;
    if (hpFrac > 0.45 && (tFrac < hpFrac + 0.12 || tFrac < 0.35)) {
      orderAttack(u, t);
      return;
    }
  }

  // 对线站位:站在己方兵线前沿后方
  const stand = laneStandPos(w, u.team, st.lane);
  if (V.dist(u.pos, stand) > 280) {
    orderMove(w, u, stand);
  }
}

/** 技能释放:取分数最高且 ≥ 阈值者。 */
function castBest(w: World, u: Unit): boolean {
  if (!u.heroDef) return false;
  let best: { score: number; index: number; pos?: Vec2; targetId?: number } | null = null;
  for (let i = 0; i < u.heroDef.abilities.length; i++) {
    const def = u.heroDef.abilities[i];
    const inst = u.abilities[i];
    if (!def?.aiScore || !inst || inst.level <= 0) continue;
    if (!abilityReady(w, u, i)) continue;
    const s = def.aiScore(w, u, inst.level);
    if (s && s.score >= CAST_THRESHOLD && (!best || s.score > best.score)) {
      best = { score: s.score, index: i, pos: s.pos, targetId: s.targetId };
    }
  }
  if (!best) return false;
  u.issueOrder({ type: 'cast', abilityIndex: best.index, pos: best.pos, targetId: best.targetId });
  return true;
}

/** 兵线前沿:本方该路最前小兵;无兵则取本方最前塔;再无则基地。 */
function laneStandPos(w: World, team: number, lane: Lane): Vec2 {
  const wps = w.map.lanes[lane];
  let front: Vec2 | null = null;
  let frontProg = team === Team.Dawn ? -1 : 2;
  for (const c of w.units.values()) {
    if (!c.alive || c.kind !== 'creep' || c.team !== team || c.lane !== lane) continue;
    const p = laneProgress(wps, c.pos);
    if (team === Team.Dawn ? p > frontProg : p < frontProg) {
      frontProg = p;
      front = c.pos;
    }
  }
  if (!front) {
    // 找本方该路最靠前的塔
    const towers = [...w.units.values()].filter(
      (t) => t.alive && t.kind === 'tower' && t.team === team && t.lane === lane,
    );
    if (towers.length) {
      towers.sort((a, b) => {
        const pa = laneProgress(wps, a.pos);
        const pb = laneProgress(wps, b.pos);
        return team === Team.Dawn ? pb - pa : pa - pb;
      });
      front = towers[0].pos;
    } else {
      front = fountainPos(w, team);
    }
  }
  // 后撤 380:朝己方基地方向
  const home = fountainPos(w, team);
  return w.map.nearestWalkable(V.add(front, V.scale(V.norm(V.sub(home, front)), 380)));
}

/** 位置在路径上的进度参数 0..1(晨曦→永夜方向)。 */
function laneProgress(wps: Vec2[], pos: Vec2): number {
  let bestD = Infinity;
  let bestT = 0;
  let cum = 0;
  let total = 0;
  const lens: number[] = [];
  for (let i = 0; i < wps.length - 1; i++) {
    const l = V.dist(wps[i], wps[i + 1]);
    lens.push(l);
    total += l;
  }
  for (let i = 0; i < wps.length - 1; i++) {
    const a = wps[i], b = wps[i + 1];
    const abx = b.x - a.x, aby = b.y - a.y;
    const l2 = abx * abx + aby * aby;
    let t = l2 === 0 ? 0 : ((pos.x - a.x) * abx + (pos.y - a.y) * aby) / l2;
    t = Math.max(0, Math.min(1, t));
    const px = a.x + abx * t, py = a.y + aby * t;
    const d = Math.hypot(pos.x - px, pos.y - py);
    if (d < bestD) {
      bestD = d;
      bestT = (cum + lens[i] * t) / total;
    }
    cum += lens[i];
  }
  return bestT;
}

/** 微操:补刀/反补/推塔(仅在站桩或移动时打断)。 */
function microLastHit(w: World, u: Unit): void {
  if (u.order && u.order.type !== 'move') return; // 已有战斗指令
  if (u.casting || u.channeling) return;
  const avgDmg = (u.calc.dmgMin + u.calc.dmgMax) / 2;
  const reach = u.calc.attackRange + u.base.collisionRadius + 120;
  let lastHit: Unit | undefined;
  let deny: Unit | undefined;
  let tower: Unit | undefined;
  let enemyCreepNear = false;
  for (const c of w.units.values()) {
    if (!c.alive || V.dist(u.pos, c.pos) > reach) continue;
    if (c.kind === 'creep') {
      if (c.team !== u.team) {
        enemyCreepNear = true;
        if (c.hp <= avgDmg * 0.95 && isVisibleTo(w, u.team, c)) lastHit = c;
      } else if (c.hp / c.calc.maxHp < 0.5 && c.hp <= avgDmg * 0.95) {
        deny = c;
      }
    } else if (c.kind === 'tower' && c.team !== u.team && !c.invulnerable) {
      tower = c;
    }
  }
  if (lastHit) {
    u.issueOrder({ type: 'attack', targetId: lastHit.id });
  } else if (deny) {
    u.issueOrder({ type: 'attack', targetId: deny.id });
  } else if (!enemyCreepNear && tower) {
    // 有兵线掩护才推塔
    const allies = w.queryRadius(tower.pos, 600, (a) => a.team === u.team && a.kind === 'creep');
    if (allies.length >= 2) u.issueOrder({ type: 'attack', targetId: tower.id });
  }
}

function orderMove(w: World, u: Unit, pos: Vec2): void {
  if (u.order?.type === 'move' && u.order.pos && V.dist(u.order.pos, pos) < 120) return; // 避免重复指令抖动
  u.issueOrder({ type: 'move', pos: w.map.nearestWalkable(pos) });
}

function orderAttack(u: Unit, t: Unit): void {
  if (u.order?.type === 'attack' && u.order.targetId === t.id) return;
  u.issueOrder({ type: 'attack', targetId: t.id });
}
