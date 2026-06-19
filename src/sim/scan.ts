import type { Vec2 } from '../core/vec2';
import type { World } from './world';
import { applyModifier } from './modifiers';

export const SCAN_COOLDOWN = 90; // 队伍冷却(秒)
export const SCAN_DURATION = 6; // 揭示持续(秒)
export const SCAN_RADIUS = 900; // 揭示半径(视野)

/** 队伍扫描是否就绪。 */
export function scanReady(w: World, team: number): boolean {
  return w.time >= (w.scanReadyAt[team] ?? 0);
}

/**
 * 扫描:在选定点生成一个短时(SCAN_DURATION)隐身视野源,揭示该区域(查敌/反 gank)。
 * 纯信息——不加 power/金/经验,不触碰平衡。复用守卫视野机制。返回是否施放(冷却中返回 false)。
 */
export function castScan(w: World, team: number, pos: Vec2): boolean {
  if (!scanReady(w, team)) return false;
  w.scanReadyAt[team] = w.time + SCAN_COOLDOWN;
  const at = w.map.nearestWalkable(pos);
  const eye = w.spawnUnit({
    kind: 'ward', team, pos: at, name: '扫描',
    stats: {
      maxHp: 1, hpRegen: 0, maxMp: 0, mpRegen: 0, dmgMin: 0, dmgMax: 0,
      attackType: 'normal', armorType: 'unarmored', armor: 0, magicResist: 0,
      attackRange: 0, attackPoint: 0, bat: 1, projectileSpeed: 0,
      moveSpeed: 0, collisionRadius: 8,
      visionDay: SCAN_RADIUS, visionNight: SCAN_RADIUS,
      acquireRange: 0, bountyMin: 0, bountyMax: 0, xpBounty: 0,
    },
  });
  applyModifier(w, eye, { key: 'scan_invis', states: { invisible: true } }, eye.id);
  applyModifier(w, eye, {
    key: 'scan_life', duration: SCAN_DURATION,
    onExpire(world, u) { if (u.alive) { u.alive = false; u.diedAt = world.time; } },
  }, eye.id);
  w.emit({ kind: 'fx', fx: 'images', pos: { x: at.x, y: at.y } });
  return true;
}
