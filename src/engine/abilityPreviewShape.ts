/**
 * 技能预览形状:把 AbilityDef 映射为光标下要画的预览几何,取代 main.ts 里写死的固定半径(220/180)。
 *
 * 单一真相源:sim 用 targetMode 决定怎么施法;预览层用本函数决定怎么画——两者读同一份 AbilityDef,
 * 杜绝「光标圈与技能真实 AoE 不符」。线形技能用 `point + lineWidth` 表示(不动 TargetMode 联合)。
 *
 * 迁移安全:未声明 `aoeRadius` 的点目标技能回落到 DEFAULT_AREA_RADIUS(= 现状),不产生回归;
 * 增量给各技能填 `aoeRadius` 后,预览逐步收敛到真实半径。
 */
import type { AbilityDef } from '../data/heroes/types';

/** 未声明 aoeRadius 时的回落半径(保持迁移前的预览观感)。 */
export const DEFAULT_AREA_RADIUS = 220;

export type PreviewShape =
  | { kind: 'unit' }
  | { kind: 'point' }                                   // 无范围的纯点(none/passive),不画 area 圈
  | { kind: 'area'; radius: number }                    // AoE 圆
  | { kind: 'line'; width: number; length: number };    // 线形

/** 取按等级的值(越界钳到最后一档);lvl 从 1 起。 */
function atLevel(arr: number[] | undefined, lvl: number): number | undefined {
  if (!arr || arr.length === 0) return undefined;
  return arr[Math.min(arr.length - 1, Math.max(0, lvl - 1))];
}

export function abilityPreviewShape(def: AbilityDef, lvl: number): PreviewShape {
  if (def.targetMode === 'unit') return { kind: 'unit' };
  if (def.targetMode === 'point') {
    if (def.lineWidth) {
      return { kind: 'line', width: def.lineWidth, length: atLevel(def.castRange, lvl) ?? 700 };
    }
    return { kind: 'area', radius: atLevel(def.aoeRadius, lvl) ?? DEFAULT_AREA_RADIUS };
  }
  // none / passive:无地面目标,不画范围圈
  return { kind: 'point' };
}
