/**
 * Quickbuy(目标装备预购)纯 UX 模型。
 *
 * 核心价值:标记下一件想要的装备后,即使离开商店也能在 HUD 顶栏随时看到「还差多少金」,
 * 够钱时一键买齐。remainingCost 由调用方算好(配方物品需扣除已持有组件),本模型只做
 * 差额/就绪格式化,保持纯/可测。
 */
export interface QuickbuyRemainingInput {
  recipe: boolean;
  /** 普通物品:本体全额成本。 */
  fullCost: number;
  /** 配方物品:仍缺组件的成本之和(已持有组件不计)。 */
  missingComponentCost: number;
  /** 配方卷轴成本(配方物品)。 */
  recipeCost: number;
}

/** 完成该物品还需的总金(配方物品 = 缺失组件 + 卷轴;普通物品 = 全额)。 */
export function quickbuyRemainingCost(input: QuickbuyRemainingInput): number {
  return input.recipe ? input.missingComponentCost + input.recipeCost : input.fullCost;
}

export interface QuickbuyModelInput {
  quickbuyKey: string | null;
  label: string;
  glyph: string;
  remainingCost: number;
  gold: number;
}

export interface QuickbuyModel {
  active: boolean;
  label: string;
  glyph: string;
  /** 还差多少金(≥0)。 */
  deficit: number;
  /** 是否够钱完成。 */
  ready: boolean;
}

export function buildQuickbuyModel(input: QuickbuyModelInput): QuickbuyModel {
  if (!input.quickbuyKey) {
    return { active: false, label: '', glyph: '', deficit: 0, ready: false };
  }
  const deficit = Math.max(0, Math.round(input.remainingCost - input.gold));
  return {
    active: true,
    label: input.label,
    glyph: input.glyph,
    deficit,
    ready: deficit === 0,
  };
}
