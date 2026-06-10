/** 兵线单位面板:由 balance 常量构建,含周期成长与超级/精英倍率。 */
import {
  CREEP_STATS, CREEP_UPGRADE_HP, CREEP_UPGRADE_DMG,
  ACQUIRE_RANGE_MELEE, ACQUIRE_RANGE_RANGED,
  CREEP_VISION_DAY, CREEP_VISION_NIGHT, UNIT_RADIUS,
} from './balance';
import type { UnitStats } from '../sim/unit';

export type CreepRole = 'melee' | 'ranged' | 'siege';
export type SuperTier = 0 | 1 | 2; // 0 普通 1 超级 2 精英

export function creepStats(role: CreepRole, upgrades: number, tier: SuperTier): UnitStats {
  const c = CREEP_STATS[role];
  let hp = c.hp + upgrades * CREEP_UPGRADE_HP[role];
  let dmgMin = c.dmg[0] + upgrades * CREEP_UPGRADE_DMG[role];
  let dmgMax = c.dmg[1] + upgrades * CREEP_UPGRADE_DMG[role];
  let bountyMin = c.bounty[0];
  let bountyMax = c.bounty[1];
  let xp = c.xp;
  if (tier > 0) {
    const f = tier === 1 ? CREEP_STATS.superFactor : CREEP_STATS.megaFactor;
    hp *= f.hp;
    dmgMin *= f.dmg;
    dmgMax *= f.dmg;
    bountyMin *= f.bounty;
    bountyMax *= f.bounty;
    xp *= f.xp;
  }
  return {
    maxHp: Math.round(hp), hpRegen: 0.25,
    maxMp: 0, mpRegen: 0,
    dmgMin: Math.round(dmgMin), dmgMax: Math.round(dmgMax),
    attackType: c.attackType, armorType: c.armorType, armor: c.armor,
    magicResist: 0,
    attackRange: c.range, attackPoint: 0.4, bat: c.bat,
    projectileSpeed: role === 'melee' ? 0 : role === 'ranged' ? 900 : 800,
    moveSpeed: c.ms,
    collisionRadius: UNIT_RADIUS[role],
    visionDay: CREEP_VISION_DAY, visionNight: CREEP_VISION_NIGHT,
    acquireRange: role === 'melee' ? ACQUIRE_RANGE_MELEE : ACQUIRE_RANGE_RANGED,
    bountyMin: Math.round(bountyMin), bountyMax: Math.round(bountyMax),
    xpBounty: Math.round(xp),
  };
}

export const CREEP_NAME: Record<CreepRole, [string, string]> = {
  melee: ['晨曦战士', '永夜武士'],
  ranged: ['晨曦法师', '永夜巫师'],
  siege: ['晨曦投石车', '永夜投石车'],
};
export const SUPER_PREFIX: Record<SuperTier, string> = { 0: '', 1: '超级', 2: '精英' };
