/**
 * 单位美术描述符(纯逻辑,无 DOM):由单位静态属性推导轮廓 / 配色 / 武器。
 * renderer.drawUnit 据此分层绘制矢量造型,使 112 个英雄与各类单位各具辨识度。
 * 英雄主体色取自 heroDef.color(此前渲染器忽略此字段,所有英雄都画成阵营色圆圈)。
 */

export type BodyShape =
  | 'bulk'      // 力量/坦克:魁梧厚重
  | 'blade'     // 敏捷近战:精瘦带刃
  | 'robe'      // 智力:法袍尖帽
  | 'beast'     // 野怪/Boss:兽形
  | 'grunt'     // 近战小兵
  | 'archer'    // 远程小兵
  | 'siege'     // 攻城器械
  | 'wisp';     // 守卫/微型

export type WeaponKind = 'sword' | 'staff' | 'bow' | 'claw' | 'hammer' | 'spear' | 'none';
export type UnitVisualRole =
  | 'tank'
  | 'mage'
  | 'rangedCarry'
  | 'meleeCarry'
  | 'support'
  | 'assassin'
  | 'creepMelee'
  | 'creepRanged'
  | 'creepSiege'
  | 'neutralSmall'
  | 'neutralLarge'
  | 'neutralAncient'
  | 'boss'
  | 'ward'
  | 'building';

export interface UnitArt {
  shape: BodyShape;
  /** 主体色 */
  primary: string;
  /** 装饰/武器色 */
  accent: string;
  /** 基础绘制半径(世界单位,带可见下限) */
  radius: number;
  weapon: WeaponKind;
  role: UnitVisualRole;
  weight: 'light' | 'medium' | 'heavy' | 'boss';
  glyph?: string;
}

export interface ArtInput {
  kind: 'hero' | 'creep' | 'neutral' | 'boss' | 'tower' | 'building' | 'ward' | 'illusion' | 'courier';
  team: number;
  name: string;
  attackRange: number;
  collisionRadius: number;
  heroDef?: {
    primary: 'str' | 'agi' | 'int';
    color: string;
    glyph: string;
    aiRole: 'carry' | 'support' | 'ganker' | 'tank';
  };
}

const MIN_R = 12;

export function unitArt(u: ArtInput): UnitArt {
  if (u.kind === 'ward') {
    return { shape: 'wisp', primary: u.team === 0 ? '#7ad6a0' : '#d98a8a', accent: '#fff7c8', radius: 10, weapon: 'none', role: 'ward', weight: 'light' };
  }
  if (u.kind === 'hero' || u.kind === 'illusion') {
    return heroArt(u);
  }
  if (u.kind === 'boss') {
    return { shape: 'beast', primary: '#6d4030', accent: '#ffca5a', radius: Math.max(40, u.collisionRadius * 0.7), weapon: 'claw', role: 'boss', weight: 'boss' };
  }
  if (u.kind === 'neutral') {
    const role = neutralRole(u);
    return {
      shape: 'beast',
      primary: '#5d6b4a',
      accent: '#c9b07a',
      radius: Math.max(16, u.collisionRadius * 0.85),
      weapon: 'claw',
      role,
      weight: role === 'neutralAncient' ? 'heavy' : role === 'neutralLarge' ? 'medium' : 'light',
    };
  }
  if (u.kind === 'courier') {
    // 信使:小型随身坐骑,队色微差(晨曦棕/永夜蓝)
    return { shape: 'beast', primary: u.team === 0 ? '#8a6b48' : '#5676a8', accent: '#ffd782', radius: 15, weapon: 'none', role: 'neutralSmall', weight: 'light' };
  }
  if (u.kind === 'creep') {
    return creepArt(u);
  }
  // tower/building 在 renderer 单独绘制;给个兜底
  return { shape: 'bulk', primary: '#777', accent: '#aaa', radius: Math.max(MIN_R, u.collisionRadius), weapon: 'none', role: 'building', weight: 'heavy' };
}

function heroArt(u: ArtInput): UnitArt {
  const d = u.heroDef;
  const color = d?.color ?? (u.team === 0 ? '#4caf50' : '#e53935');
  const ranged = u.attackRange > 350;
  let shape: BodyShape;
  let weapon: WeaponKind;
  let role: UnitVisualRole;
  if (d?.aiRole === 'tank' || d?.primary === 'str') {
    shape = 'bulk';
    weapon = ranged ? 'staff' : 'hammer';
    role = 'tank';
  } else if (d?.primary === 'int') {
    shape = 'robe';
    weapon = 'staff';
    role = d.aiRole === 'support' ? 'support' : 'mage';
  } else if (d?.aiRole === 'ganker') {
    shape = 'blade';
    weapon = ranged ? 'bow' : 'sword';
    role = 'assassin';
  } else {
    // 敏捷
    shape = 'blade';
    weapon = ranged ? 'bow' : 'sword';
    role = ranged ? 'rangedCarry' : 'meleeCarry';
  }
  return {
    shape,
    primary: color,
    accent: lighten(color, 60),
    radius: Math.max(18, u.collisionRadius),
    weapon,
    role,
    weight: role === 'tank' ? 'heavy' : 'medium',
    glyph: d?.glyph,
  };
}

function creepArt(u: ArtInput): UnitArt {
  const teamCol = u.team === 0 ? '#5a8f4e' : '#b14e46';
  const accent = u.team === 0 ? '#cfe8b0' : '#f0c4b0';
  const isSuper = u.name.startsWith('超级');
  const lower = u.name.toLowerCase();
  if (u.name.includes('投石车') || u.name.includes('攻城') || lower.includes('siege')) {
    return { shape: 'siege', primary: '#6b5436', accent: '#cdb079', radius: 24, weapon: 'none', role: 'creepSiege', weight: 'heavy' };
  }
  const ranged = u.attackRange > 200 || u.name.includes('远程') || u.name.includes('弓') || lower.includes('ranged') || lower.includes('caster') || lower.includes('archer');
  if (ranged) {
    return { shape: 'archer', primary: teamCol, accent, radius: isSuper ? 17 : 14, weapon: 'bow', role: 'creepRanged', weight: isSuper ? 'medium' : 'light' };
  }
  return { shape: 'grunt', primary: teamCol, accent, radius: isSuper ? 18 : 15, weapon: 'sword', role: 'creepMelee', weight: isSuper ? 'medium' : 'light' };
}

function neutralRole(u: ArtInput): UnitVisualRole {
  const n = u.name.toLowerCase();
  if (n.includes('ancient') || u.name.includes('远古')) return 'neutralAncient';
  if (n.includes('large') || n.includes('giant') || n.includes('golem') || u.collisionRadius >= 24) return 'neutralLarge';
  return 'neutralSmall';
}

/** 提亮十六进制色,delta 0-255。 */
export function lighten(hex: string, delta: number): string {
  if (hex[0] !== '#' || hex.length < 7) return hex;
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + delta);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + delta);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + delta);
  return `rgb(${r},${g},${b})`;
}

/** 压暗十六进制色,delta 0-255。 */
export function darken(hex: string, delta: number): string {
  if (hex[0] !== '#' || hex.length < 7) return hex;
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - delta);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - delta);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - delta);
  return `rgb(${r},${g},${b})`;
}
