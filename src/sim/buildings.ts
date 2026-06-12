/**
 * 建筑系统:塔/兵营/主建筑/泉水的生成、仇恨规则、主建筑保护、泉水光环、摧毁结算。
 * 规则:主建筑在本方两座高台塔(T4)存活期间无敌;塔被敌英雄攻击本方英雄时转火。
 */
import { V } from '../core/vec2';
import {
  TOWER_STATS, RAX_STATS, ANCIENT_STATS, FOUNTAIN_STATS,
  TOWER_VISION, TOWER_TRUE_SIGHT, FOUNTAIN_AURA_RADIUS, TOWER_HERO_DEFENSE_RADIUS,
  UNIT_RADIUS,
} from '../data/balance';
import type { BuildingKind } from '../data/mapLayout';
import { Team } from './map';
import { applyModifier } from './modifiers';
import type { World } from './world';
import type { Unit, UnitStats } from './unit';

function towerTier(kind: BuildingKind): 't1' | 't2' | 't3' | 't4' | null {
  switch (kind) {
    case 'tower1': return 't1';
    case 'tower2': return 't2';
    case 'tower3': return 't3';
    case 'tower4': return 't4';
    default: return null;
  }
}

const BUILDING_NAME: Record<BuildingKind, string> = {
  tower1: '一塔', tower2: '二塔', tower3: '高地塔', tower4: '基地塔',
  rax_melee: '近战兵营', rax_ranged: '远程兵营',
  ancient: '主基地', fountain: '圣坛',
};

export function buildingStats(kind: BuildingKind): UnitStats {
  const common = {
    maxMp: 0, mpRegen: 0, magicResist: 0,
    attackPoint: 0.3, moveSpeed: 0,
    visionDay: TOWER_VISION, visionNight: TOWER_VISION,
    bountyMin: 0, bountyMax: 0, xpBounty: 0,
  };
  const tier = towerTier(kind);
  if (tier) {
    const t = TOWER_STATS[tier];
    return {
      ...common,
      maxHp: t.hp, hpRegen: 0,
      dmgMin: t.dmg[0], dmgMax: t.dmg[1],
      attackType: 'normal', armorType: 'fortified', armor: t.armor,
      attackRange: t.range, bat: t.bat, projectileSpeed: 1100,
      collisionRadius: UNIT_RADIUS.tower,
      acquireRange: t.range,
      bountyMin: t.bounty, bountyMax: t.bounty, xpBounty: 0,
    };
  }
  if (kind === 'rax_melee' || kind === 'rax_ranged') {
    const r = kind === 'rax_melee' ? RAX_STATS.melee : RAX_STATS.ranged;
    return {
      ...common,
      maxHp: r.hp, hpRegen: 0, dmgMin: 0, dmgMax: 0,
      attackType: 'normal', armorType: 'fortified', armor: r.armor,
      attackRange: 0, bat: 1, projectileSpeed: 0,
      collisionRadius: UNIT_RADIUS.building, acquireRange: 0,
    };
  }
  if (kind === 'ancient') {
    return {
      ...common,
      maxHp: ANCIENT_STATS.hp, hpRegen: ANCIENT_STATS.regen,
      dmgMin: 0, dmgMax: 0,
      attackType: 'normal', armorType: 'fortified', armor: ANCIENT_STATS.armor,
      attackRange: 0, bat: 1, projectileSpeed: 0,
      collisionRadius: UNIT_RADIUS.ancient, acquireRange: 0,
      visionDay: 2600, visionNight: 2600,
    };
  }
  // fountain
  return {
    ...common,
    maxHp: 99999, hpRegen: 999,
    dmgMin: FOUNTAIN_STATS.dmg[0], dmgMax: FOUNTAIN_STATS.dmg[1],
    attackType: 'pierce', armorType: 'fortified', armor: 30,
    attackRange: FOUNTAIN_STATS.range, bat: FOUNTAIN_STATS.bat, projectileSpeed: 1400,
    collisionRadius: UNIT_RADIUS.building, acquireRange: FOUNTAIN_STATS.range,
    visionDay: 1800, visionNight: 1800,
  };
}

export function spawnBuildings(w: World): void {
  for (const b of w.map.buildings) {
    const u = w.spawnUnit({
      kind: b.kind === 'tower1' || b.kind === 'tower2' || b.kind === 'tower3' || b.kind === 'tower4' ? 'tower' : 'building',
      team: b.team,
      pos: V.clone(b.pos),
      name: `${b.team === Team.Dawn ? '晨曦' : '永夜'}${b.lane ? laneName(b.lane) : ''}${BUILDING_NAME[b.kind]}`,
      stats: buildingStats(b.kind),
    });
    u.buildingKind = b.kind;
    u.lane = b.lane;
    // 防御塔自带真视(经典:塔周围约 900 揭示隐身,使塔下隐身无效)。
    if (u.kind === 'tower') {
      applyModifier(w, u, { key: 'tower_truesight', isBuff: true, stats: { trueSightRadius: TOWER_TRUE_SIGHT } }, u.id);
    }
  }
  updateAncientProtection(w);
}

function laneName(lane: string): string {
  return lane === 'top' ? '上路' : lane === 'mid' ? '中路' : '下路';
}

function updateAncientProtection(w: World): void {
  for (const team of [Team.Dawn, Team.Night]) {
    const t4Alive = [...w.units.values()].some(
      (u) => u.alive && u.team === team && u.buildingKind === 'tower4',
    );
    for (const u of w.units.values()) {
      if (u.team === team && u.buildingKind === 'ancient') {
        u.invulnerable = t4Alive;
      }
    }
  }
}

/** 建筑系统 tick:仇恨保护 / 泉水光环 / 摧毁结算 / 主建筑保护刷新。 */
export function buildingsSystem(w: World): void {
  // 周期刷新主建筑保护(事件可能在 step 之外产生)
  if (w.tick % 15 === 0) updateAncientProtection(w);
  // 塔的保护性转火:敌方英雄攻击塔旁本方英雄
  for (const e of w.events) {
    if (e.kind !== 'attack_launched') continue;
    const attacker = w.getUnit(e.unitId);
    const victim = w.getUnit(e.targetId);
    if (!attacker || !victim) continue;
    if (!attacker.isHero() || !victim.isHero()) continue;
    if (attacker.team === victim.team) continue;
    for (const tower of w.units.values()) {
      if (!tower.alive || tower.kind !== 'tower' || tower.team !== victim.team) continue;
      if (V.dist(tower.pos, victim.pos) > TOWER_HERO_DEFENSE_RADIUS) continue;
      if (V.dist(tower.pos, attacker.pos) > tower.calc.attackRange + tower.base.collisionRadius + attacker.base.collisionRadius) continue;
      tower.attackTargetId = attacker.id;
      tower.windupTargetId = 0; // 立刻换目标
    }
  }

  // 泉水回复光环(百分比)
  if (w.tick % 6 === 0) {
    const dt6 = w.dt * 6;
    for (const f of w.units.values()) {
      if (!f.alive || f.buildingKind !== 'fountain') continue;
      for (const ally of w.queryRadius(f.pos, FOUNTAIN_AURA_RADIUS, (u) => u.team === f.team && !u.isBuilding())) {
        ally.hp = Math.min(ally.calc.maxHp, ally.hp + ally.calc.maxHp * FOUNTAIN_STATS.hpRegenPct * dt6);
        ally.mp = Math.min(ally.calc.maxMp, ally.mp + ally.calc.maxMp * FOUNTAIN_STATS.mpRegenPct * dt6);
      }
    }
  }

  // 摧毁结算
  for (const e of w.events) {
    if (e.kind !== 'unit_died') continue;
    const u = w.getUnit(e.unitId);
    if (!u || !u.buildingKind) continue;
    openFootprint(w, u);
    const killer = w.getUnit(e.killerId);
    const byTeam = killer ? killer.team : (u.team === Team.Dawn ? Team.Night : Team.Dawn);
    if (u.kind === 'tower') {
      w.emit({ kind: 'tower_fell', unitId: u.id, team: u.team, byTeam });
    } else if (u.buildingKind === 'rax_melee' || u.buildingKind === 'rax_ranged') {
      w.emit({ kind: 'rax_fell', unitId: u.id, team: u.team });
    } else if (u.buildingKind === 'ancient') {
      const winner = u.team === Team.Dawn ? Team.Night : Team.Dawn;
      w.gameOver = winner;
      w.emit({ kind: 'game_over', winner });
    }
    updateAncientProtection(w);
  }
}

/** 建筑摧毁后开放占地格。 */
function openFootprint(w: World, u: Unit): void {
  const r = u.base.collisionRadius + 8;
  const { cx, cy } = w.map.cellOf(u.pos);
  const cells = Math.ceil(r / w.map.CELL);
  for (let dy = -cells; dy <= cells; dy++)
    for (let dx = -cells; dx <= cells; dx++) {
      const x = cx + dx, y = cy + dy;
      if (!w.map.inBounds(x, y)) continue;
      if (V.dist(w.map.cellCenter(x, y), u.pos) <= r) {
        const i = w.map.cellIndex(x, y);
        if (!w.map.trees.has(i) && x >= 2 && y >= 2 && x < w.map.GW - 2 && y < w.map.GH - 2) {
          w.map.walkable[i] = 1;
        }
      }
    }
}
