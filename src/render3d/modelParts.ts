/**
 * 人形单位的 3D 部件规格(纯数据,无 Three.js 依赖,可单测)。
 * 由 1.0 已有的 UnitArt 描述符推导部件尺寸/颜色/武器——112 英雄参数化生成,不逐个建模。
 * modelGen.ts 消费本规格构建 THREE.Group;将来外部 3D 素材也复用同一动作系统。
 */
import type { UnitArt, WeaponKind } from '../render/unitArt';

export interface PartBox { w: number; h: number; d: number; color: string; }
/** 头饰:按角色/种子赋予,提升 102 程序化英雄的剪影辨识度。 */
export type HeadGear = 'none' | 'horns' | 'crown' | 'hood' | 'hat' | 'helm';
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
  visualRole: UnitArt['role'];
  teamRead: UnitArt['teamRead'];
  headGear: HeadGear;   // 头饰(仅英雄角色;兵/野怪为 none)
  hasCape: boolean;     // 背披风
  hasShoulders: boolean;// 肩甲
  seed: number;         // 由配色+图腾派生的确定性种子(同桶英雄差异化)
}

/** FNV-1a 字符串哈希(确定性,用于同角色英雄的造型微差异)。 */
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const HERO_ROLES = ['tank', 'mage', 'rangedCarry', 'meleeCarry', 'support', 'assassin', 'illusion'];

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

  const seed = hashStr(`${art.primary}|${art.accent}|${art.glyph ?? ''}`);
  const heroRole = HERO_ROLES.includes(art.role);
  let headGear: HeadGear = 'none';
  if (heroRole) {
    if (art.role === 'tank') headGear = (seed & 1) ? 'horns' : 'helm';
    else if (art.role === 'mage') headGear = 'hat';
    else if (art.role === 'support') headGear = (seed & 1) ? 'hood' : 'hat';
    else if (art.role === 'assassin' || art.role === 'illusion') headGear = 'hood';
    else headGear = (seed & 1) ? 'crown' : 'helm'; // 敏捷核心
  }
  // 披风:法系/辅助/刺客常有,其余按种子;肩甲:魁梧或按种子
  const hasCape = heroRole && (robe || art.role === 'assassin' || art.role === 'illusion' || (seed & 2) === 0);
  const hasShoulders = heroRole && (heavy || (seed & 4) !== 0);

  // 缩放微抖(±6%,仍 ≥0.8),同体型英雄高矮略异;不动 torso.w(保持桶序契约)
  const jitter = 1 + (((seed >> 3) & 7) - 3) * 0.02;
  return {
    scale: Math.max(0.8, (art.radius / 24) * jitter),
    torso: { w: torsoW, h: 34, d: 14, color: art.primary },
    head: { w: 16, h: 16, d: 16, color: art.primary },
    arm: { w: armW, h: 28, d: armW, color: art.primary },
    leg: { w: legW, h: 28, d: legW, color: art.accent },
    weapon: { kind: art.weapon, length: WEAPON_LEN[art.weapon], color: art.accent },
    hasRobe: robe,
    accent: art.accent,
    primary: art.primary,
    visualRole: art.role,
    teamRead: art.teamRead,
    headGear,
    hasCape,
    hasShoulders,
    seed,
  };
}
