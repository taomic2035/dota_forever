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
import { buyItem, shopAt, useItem, takeFromStash, TP_SLOT } from '../items';
import { purchaseKeyFor } from '../recipes';
import { itemDef } from '../../data/items';

export interface BotState {
  lane: Lane;
  nextThink: number;
  mode: 'lane' | 'retreat' | 'defend';
  buildIndex: number;
}

/** 按定位的出装序列(购买键序列,组件在前;只含基地商店可买件,避免卡序列)。 */
const BUILDS: Record<string, string[]> = {
  carry: [
    'slippers', 'circlet', 'recipe_wraith_band', 'boots', 'gloves_haste', 'belt',
    'morbid_mask', 'broadsword', 'claymore', 'mithril_hammer',
    'hyperstone', 'chainmail', 'platemail', 'recipe_assault',
  ],
  tank: [
    'gauntlet', 'circlet', 'recipe_bracer', 'boots', 'gloves_haste', 'belt',
    'chainmail', 'cloak', 'ring_regen', 'recipe_hood',
    'platemail', 'hyperstone', 'recipe_assault', 'mithril_hammer',
  ],
  ganker: [
    'gauntlet', 'circlet', 'recipe_bracer', 'boots', 'gloves_haste', 'belt',
    'magic_stick', 'branch', 'branch', 'branch', 'recipe_magic_wand',
    'mithril_hammer', 'ogre_axe', 'recipe_bkb', 'claymore',
  ],
  support: [
    'mantle', 'circlet', 'recipe_null_talisman', 'boots', 'sobi_mask',
    'cloak', 'ring_regen', 'recipe_hood', 'staff_wizardry',
    'platemail', 'chainmail', 'hyperstone', 'recipe_assault',
  ],
};

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
        buildIndex: 0,
      });
    }
    for (const [id, st] of bots) {
      const u = world.getUnit(id);
      if (!u) { bots.delete(id); continue; }
      if (!u.alive) { st.mode = 'lane'; continue; }
      if (world.time >= st.nextThink) {
        st.nextThink = world.time + 0.9 + (id % 7) * 0.03;
        learnSkills(world, u);
        shopping(world, u, st);
        think(world, u, st);
      }
      microLastHit(world, u, st);
    }
  };
  w.systems.push(system);
}

/** 在商店范围内按出装序列购买;泉水顺手用治疗品。 */
export function shopping(w: World, u: Unit, st: BotState): void {
  if (!u.heroDef || shopAt(w, u) !== 'home') return;
  // 先取回滞留储藏处的物品(买进储藏后若不取出则永远用不上,白费金钱)
  for (let s = 0; s < u.stash.length; s++) {
    if (u.stash[s]) takeFromStash(w, u, s);
  }
  const build = BUILDS[u.heroDef.aiRole] ?? BUILDS.tank;
  let guard = 6;
  while (st.buildIndex < build.length && guard-- > 0) {
    const key = build[st.buildIndex];
    // 秘密商店物品跳过等待(本版 bot 不绕路秘密商店,直接尝试,失败则等金不卡序列)
    const def = itemDef(key.startsWith('recipe_') ? key.slice(7) : key);
    if (def.secretShop) { st.buildIndex++; continue; }
    const r = buyItem(w, u, purchaseKeyFor(key) === key ? key : key);
    if (r === 'ok' || r === 'ok_stash' || r === 'ok_backpack') st.buildIndex++;
    else break;
  }
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

  // 防守:基地建筑被攻击 → 至多 2 名守军响应(其余继续施压,避免全队缩家死局)
  const threatened = baseUnderAttack(w, u.team);
  if (threatened) {
    const defenders = countTeamHeroesNear(w, u.team, threatened.pos, 1600);
    if (defenders < 2 || V.dist(u.pos, threatened.pos) < 1600) {
      if (V.dist(u.pos, threatened.pos) > 2200) {
        const hasTp = u.tpSlot?.itemKey === 'tp';
        if (hasTp && u.mp >= 75 && !u.modifiers.some((m) => m.key === 'item_tp')) {
          if (useItem(w, u, TP_SLOT, threatened.pos)) return;
        }
        orderMove(w, u, threatened.pos);
        return;
      }
      st.mode = 'defend';
    }
  } else if (st.mode === 'defend') {
    st.mode = 'lane';
  }

  // 终结推进:敌方主基地暴露(保护解除)→ 全队压上斩首
  const enemyAncient = findEnemyAncient(w, u.team);
  if (enemyAncient && !enemyAncient.invulnerable) {
    const d = V.dist(u.pos, enemyAncient.pos);
    if (d < 1500) {
      orderAttack(u, enemyAncient);
      return;
    }
    if (!enemiesNear(w, u, 700).length) {
      orderMove(w, u, enemyAncient.pos);
      return;
    }
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
    // 塔下危险规避:除非目标残血,否则不追进敌塔射程
    const danger = enemyTowerNear(w, u.team, t.pos, 850);
    if (hpFrac > 0.45 && (tFrac < hpFrac + 0.12 || tFrac < 0.35) && (!danger || tFrac < 0.2)) {
      orderAttack(u, t);
      return;
    }
  }

  // 对线站位:常态躲在兵线后;优势/后期/兵线压至敌方建筑时上前压塔。
  // 40 分钟后进入收敛期:全队集结推防御最薄的一路(模拟后期抱团终结)。
  const lateGame = w.time > 2400;
  const advantage = teamAdvantage(w, u.team, lateGame ? 1 : 2);
  const grouping = advantage || lateGame;
  const laneToUse = grouping ? weakestEnemyLane(w, u.team) : st.lane;
  const pressing = grouping || frontAtEnemyBuilding(w, u.team, laneToUse);
  const stand = laneStandPos(w, u.team, laneToUse, pressing ? 130 : 380);
  if (V.dist(u.pos, stand) > 280) {
    orderMove(w, u, stand);
  }
}

/** 敌方存活塔最少的一路(集火目标)。 */
function weakestEnemyLane(w: World, team: number): Lane {
  let best: Lane = 'mid';
  let bestCount = Infinity;
  for (const lane of ['top', 'mid', 'bot'] as Lane[]) {
    let n = 0;
    for (const b of w.units.values()) {
      if (b.alive && b.kind === 'tower' && b.team !== team && b.lane === lane) n++;
    }
    if (n < bestCount) {
      bestCount = n;
      best = lane;
    }
  }
  return best;
}

function findEnemyAncient(w: World, team: number): Unit | null {
  for (const b of w.units.values()) {
    if (b.alive && b.buildingKind === 'ancient' && b.team !== team) return b;
  }
  return null;
}

function enemiesNear(w: World, u: Unit, r: number): Unit[] {
  return w.queryRadius(u.pos, r, (v) => v.team !== u.team && v.isHero() && v.alive);
}

/** 我方存活英雄多于敌方一定数量(打赢了一波)。 */
function teamAdvantage(w: World, team: number, margin = 2): boolean {
  let mine = 0, theirs = 0;
  for (const v of w.units.values()) {
    if (!v.isHero()) continue;
    if (v.alive) v.team === team ? mine++ : theirs++;
  }
  return mine >= theirs + margin;
}

function countTeamHeroesNear(w: World, team: number, pos: Vec2, r: number): number {
  let n = 0;
  for (const v of w.units.values()) {
    if (v.isHero() && v.alive && v.team === team && V.dist(v.pos, pos) <= r) n++;
  }
  return n;
}

/** 本路前沿是否已贴近敌方建筑(可以协助拆塔)。 */
function frontAtEnemyBuilding(w: World, team: number, lane: Lane): boolean {
  const wps = w.map.lanes[lane];
  let front: Vec2 | null = null;
  let frontProg = team === Team.Dawn ? -1 : 2;
  for (const c of w.units.values()) {
    if (!c.alive || c.kind !== 'creep' || c.team !== team || c.lane !== lane) continue;
    const p = laneProgress(wps, c.pos);
    if (team === Team.Dawn ? p > frontProg : p < frontProg) { frontProg = p; front = c.pos; }
  }
  if (!front) return false;
  for (const b of w.units.values()) {
    if (!b.alive || !b.isBuilding() || b.team === team || b.invulnerable) continue;
    if (V.dist(b.pos, front) < 950) return true;
  }
  return false;
}

/** 本方基地建筑近期受袭(兵营/T3/T4/主基地)。 */
function baseUnderAttack(w: World, team: number): Unit | null {
  for (const b of w.units.values()) {
    if (!b.alive || b.team !== team || !b.buildingKind) continue;
    const critical = b.buildingKind === 'ancient' || b.buildingKind === 'tower4' ||
      b.buildingKind === 'rax_melee' || b.buildingKind === 'rax_ranged' || b.buildingKind === 'tower3';
    if (!critical) continue;
    if (w.time - b.lastDamagedAt < 4) return b;
  }
  return null;
}

function enemyTowerNear(w: World, myTeam: number, pos: Vec2, radius: number): boolean {
  for (const b of w.units.values()) {
    if (!b.alive || b.kind !== 'tower' || b.team === myTeam) continue;
    if (V.dist(b.pos, pos) < radius) return true;
  }
  return false;
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
function laneStandPos(w: World, team: number, lane: Lane, pullback = 380): Vec2 {
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
  // 后撤:朝己方基地方向
  const home = fountainPos(w, team);
  return w.map.nearestWalkable(V.add(front, V.scale(V.norm(V.sub(home, front)), pullback)));
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
export function microLastHit(w: World, u: Unit, st: BotState): void {
  if (st.mode === 'retreat') return;              // 撤退中不被补刀/推塔指令打断
  if (u.order && u.order.type !== 'move') return; // 已有战斗指令
  if (u.casting || u.channeling) return;
  const avgDmg = (u.calc.dmgMin + u.calc.dmgMax) / 2;
  const reach = u.calc.attackRange + u.base.collisionRadius + 120;
  let lastHit: Unit | undefined;
  let deny: Unit | undefined;
  let building: Unit | undefined;
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
    } else if (c.team !== u.team && !c.invulnerable && c.isBuilding()) {
      // 塔/兵营/主基地都是推进目标
      if (!building || c.buildingKind === 'ancient') building = c;
    }
  }
  if (lastHit) {
    u.issueOrder({ type: 'attack', targetId: lastHit.id });
  } else if (deny) {
    u.issueOrder({ type: 'attack', targetId: deny.id });
  } else if (!enemyCreepNear && building) {
    // 有兵线掩护才拆建筑
    const allies = w.queryRadius(building.pos, 700, (a) => a.team === u.team && a.kind === 'creep');
    if (allies.length >= 2) u.issueOrder({ type: 'attack', targetId: building.id });
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
