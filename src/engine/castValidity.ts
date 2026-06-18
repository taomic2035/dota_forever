import { V, type Vec2 } from '../core/vec2';

/**
 * 施法预览状态(与 sim 的「走近施法」语义一致):
 * - ready   合法且在射程内 → 立即施放
 * - walk    合法但超出射程 → 英雄走近到射程后再施放(sim/abilities 的射程检查与走位)
 * - invalid 目标非法(单位目标处无合法可施单位)→ 不会施放
 */
export type CastStatus = 'ready' | 'walk' | 'invalid';

export interface CastStatusInput {
  origin: Vec2;
  /** 有效瞄准点:单位目标传目标中心,点/范围/线传光标。 */
  aim: Vec2;
  /** 当前等级施法距离;<=0 表示自身/无距离限制,不触发走近。 */
  range: number;
  /** 是否为单位目标技能(需要合法目标才能施放)。 */
  requiresTarget: boolean;
  /** 单位目标技能:光标处是否有合法可施目标(队伍/类型/存活/可指向)。非单位目标忽略。 */
  hasTarget?: boolean;
}

export function castStatus(input: CastStatusInput): CastStatus {
  if (input.requiresTarget && !input.hasTarget) return 'invalid';
  if (input.range > 0 && V.dist(input.origin, input.aim) > input.range) return 'walk';
  return 'ready';
}

/** 渲染器读 TargetingState 时:优先 status,回落旧 valid 布尔(false→invalid,否则 ready)。 */
export function resolveCastStatus(status: CastStatus | undefined, valid: boolean | undefined): CastStatus {
  if (status) return status;
  return valid === false ? 'invalid' : 'ready';
}

/** 预览三态主色 RGB 分量,供 2D(rgba 字符串)与 3D(hex)共用,保证两端语义一致。 */
export const CAST_STATUS_RGB: Record<CastStatus, [number, number, number]> = {
  ready: [80, 170, 255], // 蓝:就绪
  walk: [255, 183, 77], // 琥珀:走近施法
  invalid: [255, 70, 86], // 红:非法
};

export function castStatusHex(status: CastStatus): number {
  const [r, g, b] = CAST_STATUS_RGB[status];
  return (r << 16) | (g << 8) | b;
}
