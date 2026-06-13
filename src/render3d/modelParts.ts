/**
 * 人形单位的 3D 部件规格(纯数据,无 Three.js 依赖,可单测)。
 * 由 1.0 已有的 UnitArt 描述符推导部件尺寸/颜色/武器——112 英雄参数化生成,不逐个建模。
 * modelGen.ts 消费本规格构建 THREE.Group;将来外部 3D 素材也复用同一动作系统。
 */
import type { UnitArt, WeaponKind } from '../render/unitArt';

export interface PartBox { w: number; h: number; d: number; color: string; }
export interface HumanoidSpec {
  scale: number;        // 整体高度系数(由 art.radius 推导)
  torso: PartBox;
  head: PartBox;
  arm: PartBox;         // 单臂(左右对称)
  leg: PartBox;         // 单腿
  weapon: { kind: WeaponKind; length: number; color: string };
  hasRobe: boolean;     // 智力法袍裙摆
  accent: string;
  primary: string;
}

const WEAPON_LEN: Record<WeaponKind, number> = {
  sword: 34, staff: 44, bow: 30, claw: 18, hammer: 30, spear: 50, none: 0,
};

export function humanoidSpec(art: UnitArt): HumanoidSpec {
  const heavy = art.shape === 'bulk' || art.weight === 'heavy' || art.weight === 'boss';
  const slim = art.shape === 'blade' || art.role === 'assassin' || art.role === 'rangedCarry';
  const robe = art.shape === 'robe' || art.role === 'mage' || art.role === 'support';
  const torsoW = heavy ? 26 : slim ? 16 : 20;
  const armW = heavy ? 9 : 6;
  const legW = heavy ? 10 : 7;
  return {
    scale: Math.max(0.8, art.radius / 24),
    torso: { w: torsoW, h: 34, d: 14, color: art.primary },
    head: { w: 16, h: 16, d: 16, color: art.primary },
    arm: { w: armW, h: 28, d: armW, color: art.primary },
    leg: { w: legW, h: 28, d: legW, color: art.accent },
    weapon: { kind: art.weapon, length: WEAPON_LEN[art.weapon], color: art.accent },
    hasRobe: robe,
    accent: art.accent,
    primary: art.primary,
  };
}
