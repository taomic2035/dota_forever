/** 野怪定义(原创生物,三档营地 + 远古)。 */
import type { UnitStats } from '../sim/unit';

export interface NeutralSpec {
  name: string;
  hp: number;
  dmg: [number, number];
  armor: number;
  range: number;        // 100 = 近战
  ms: number;
  bounty: [number, number];
  xp: number;
  magicResist?: number;
}

export const CAMP_ROSTERS: Record<'small' | 'medium' | 'large' | 'ancient', NeutralSpec[]> = {
  small: [
    { name: '嚎风狼', hp: 450, dmg: [18, 23], armor: 1, range: 100, ms: 330, bounty: [22, 30], xp: 35 },
    { name: '嚎风狼', hp: 450, dmg: [18, 23], armor: 1, range: 100, ms: 330, bounty: [22, 30], xp: 35 },
    { name: '嚎风头狼', hp: 600, dmg: [26, 32], armor: 2, range: 100, ms: 330, bounty: [35, 45], xp: 55 },
  ],
  medium: [
    { name: '石脊蜥蜴', hp: 550, dmg: [22, 28], armor: 2, range: 500, ms: 310, bounty: [28, 36], xp: 45 },
    { name: '石脊蜥蜴', hp: 550, dmg: [22, 28], armor: 2, range: 500, ms: 310, bounty: [28, 36], xp: 45 },
    { name: '石脊长者', hp: 850, dmg: [34, 42], armor: 3, range: 100, ms: 310, bounty: [45, 58], xp: 75 },
  ],
  large: [
    { name: '岩肤巨魔', hp: 950, dmg: [38, 46], armor: 4, range: 100, ms: 300, bounty: [52, 66], xp: 90 },
    { name: '岩肤巨魔', hp: 950, dmg: [38, 46], armor: 4, range: 100, ms: 300, bounty: [52, 66], xp: 90 },
    { name: '巨魔祭司', hp: 700, dmg: [30, 38], armor: 2, range: 550, ms: 300, bounty: [40, 52], xp: 65 },
  ],
  ancient: [
    { name: '远古玄龟', hp: 1500, dmg: [55, 68], armor: 9, range: 100, ms: 280, bounty: [80, 100], xp: 140, magicResist: 0.75 },
    { name: '远古玄龟', hp: 1500, dmg: [55, 68], armor: 9, range: 100, ms: 280, bounty: [80, 100], xp: 140, magicResist: 0.75 },
    { name: '远古龟王', hp: 2100, dmg: [70, 85], armor: 11, range: 100, ms: 280, bounty: [110, 140], xp: 200, magicResist: 0.75 },
  ],
};

export function neutralStats(spec: NeutralSpec): UnitStats {
  return {
    maxHp: spec.hp, hpRegen: 0.5,
    maxMp: 0, mpRegen: 0,
    dmgMin: spec.dmg[0], dmgMax: spec.dmg[1],
    attackType: 'normal', armorType: 'medium', armor: spec.armor,
    magicResist: spec.magicResist ?? 0,
    attackRange: spec.range, attackPoint: 0.4, bat: 1.6,
    projectileSpeed: spec.range > 200 ? 900 : 0,
    moveSpeed: spec.ms, collisionRadius: 26,
    visionDay: 800, visionNight: 800,
    acquireRange: 500,
    bountyMin: spec.bounty[0], bountyMax: spec.bounty[1],
    xpBounty: spec.xp,
  };
}
