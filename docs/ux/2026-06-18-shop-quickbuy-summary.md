# 商店 Quickbuy:目标装备预购

日期: 2026-06-18
范围: 商店快速购买(对应 UX 路线图 P1.3「Shop 缺 quickbuy」)。

## 问题

商店此前能单买、买配方下一组件、批量买可买组件,但缺 DotA 标志性的 **quickbuy**:标记下一件想要的装备,**离开商店后仍能在屏幕顶部随时看到「还差多少金」**,够钱时一键买齐。这是 DotA 补刀/对线时的核心 QoL——不必反复开商店查进度。

## 方案

- **设置**:商店内 **Shift 点击**任意物品 → 设为 quickbuy 目标(不立即购买)。
- **常驻提醒**:HUD 顶栏(金币旁)+ 商店头部都显示目标装备 + 「还需 N 金」(琥珀)/「可购买」(绿)。顶栏 chip 离店可见 = 核心价值。
- **差额准确**:配方物品扣除已持有组件——remainingCost = 仍缺组件成本 + 卷轴成本;普通物品 = 全额。
- **一键买齐**:够钱时点击商店徽章 → 按缺失组件 + 卷轴顺序买齐并合成;右键徽章取消;买到手后自动清除目标。

## 改动

- `src/ui/quickbuyModel.ts`(新):纯模型 `quickbuyRemainingCost`(配方=缺失组件+卷轴 / 普通=全额)+ `buildQuickbuyModel`(deficit=max(0,remaining-gold),ready=deficit0)。
- `src/ui/shop.ts`:`quickbuyKey` 字段;Shift 点击商店行设置;头部 `quickbuyBadge`(左键买齐/右键取消);`quickbuyState`(算 remainingCost + 缺失组件买单,已拥有自动清除)/`completeQuickbuy`(复用 buyMany);公开 `quickbuyModel(hero)` 供 HUD。
- `src/ui/hud.ts`:`quickbuy` 字段 + 顶栏 `quickbuyChip()`(金币旁,目标 + 还需/可购买)。
- `src/main.ts`:render 每帧 `hud.quickbuy = shop.quickbuyModel(hero)` 桥接。
- 覆盖测试:`tests/quickbuyModel.test.ts`(7)。

## 验证

- typecheck 通过;完整套件 0 失败。
- 真实输入端到端:开商店 Shift 点击「治疗药膏」(115)→ 金 10 时顶栏 + 商店显「还需 105」(琥珀);金足时显「可购买」(绿);配方物品「坚韧护腕」同样正确。截图确认顶栏 chip 与敌方英雄条共存不冲突。

## 后续(留档)

- quickbuy 队列(多目标排队,DotA 只 1 个,够用)。
- 推荐出装(按英雄/局势预设 quickbuy 候选)。
- 离店够钱时可选「自动买」开关(当前需手动点击,避免意外消费,更安全)。
