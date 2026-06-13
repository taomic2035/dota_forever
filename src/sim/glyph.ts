/**
 * 防御符文 Glyph(经典 DotA1):激活后己方所有建筑短时免疫一切伤害(GLYPH_DURATION),
 * 长冷却(GLYPH_COOLDOWN)。玩家手动(键 g)或 AI 自动(建筑被 dive 时)触发。
 * 仅设建筑 glyphUntil(combat.applyDamage 读),不触碰战斗数值。
 */
import { V } from '../core/vec2';
import { Team } from './map';
import { GLYPH_DURATION, GLYPH_COOLDOWN } from '../data/balance';
import type { World, WorldSystem } from './world';

/** 激活某队 Glyph(冷却中返回 false);给该队所有存活建筑施加免疫护盾。 */
export function activateGlyph(w: World, team: Team): boolean {
  if (w.time < w.glyphReadyAt[team]) return false;
  w.glyphReadyAt[team] = w.time + GLYPH_COOLDOWN;
  for (const u of w.units.values()) {
    if (u.alive && u.isBuilding() && u.team === team) u.glyphUntil = w.time + GLYPH_DURATION;
  }
  return true;
}

/** Glyph 是否就绪(供 UI/AI)。 */
export function glyphReady(w: World, team: Team): boolean {
  return w.time >= w.glyphReadyAt[team];
}

/** AI 自动护塔:己方建筑正被攻击 + 血量偏低 + 敌方英雄逼近(dive)且 Glyph 就绪 → 自动激活。 */
export function installGlyph(w: World): void {
  const system: WorldSystem = (world) => {
    if (world.tick % 15 !== 0) return;
    for (const team of [Team.Dawn, Team.Night]) {
      if (!glyphReady(world, team)) continue;
      for (const b of world.units.values()) {
        if (!b.alive || !b.isBuilding() || b.team !== team) continue;
        if (world.time - b.lastDamagedAt > 1.5) continue;       // 正被攻击
        if (b.hp > b.calc.maxHp * 0.45) continue;                // 血量偏低才值得开
        const enemyHeroNear = [...world.units.values()].some((e) =>
          e.alive && e.isHero() && e.team !== team && V.dist(e.pos, b.pos) < 900);
        if (!enemyHeroNear) continue;                            // 有敌方英雄逼近(dive 风险)
        activateGlyph(world, team);
        break;
      }
    }
  };
  w.systems.push(system);
}
