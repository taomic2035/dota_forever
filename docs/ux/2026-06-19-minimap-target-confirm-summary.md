# 小地图施法 / TP 目标确认总结

日期: 2026-06-19
范围: UX / input / minimap 接缝

## What

- 小地图左键现在可以确认已 armed 的地面目标技能和物品目标。
- TP 专属槽沿用现有 item slot 6 / `onItemKey` 路径,不新增 sim 规则。
- Shift+小地图左键确认目标时会并入 queued 选项,与主画布点击一致。
- 若没有待确认技能/物品,小地图左键仍保持原行为:移动镜头并关闭 camera follow。
- Alt+小地图点击仍优先发送 ping,不被 pending target 抢走。
- 小地图防误触 120ms 悬停保护仍对普通左键/右键生效,ping 继续即时生效。

## Files

- `src/engine/input.ts`
  - 新增 `InputManager.confirmPendingTarget(world, shiftKey?)`。
  - 主画布左键 pending cast/item 也复用该方法,避免 canvas 与 minimap 行为漂移。
  - 暴露 `pendingItem` getter,便于外部命令面板/调试读取状态。
- `src/render/minimap.ts`
  - `MiniMap` 构造函数新增 `onTargetCommand` 回调。
  - 左键在 recenter 前先尝试确认 pending target。
- `src/main.ts`
  - `MiniMap` 接到 `input.confirmPendingTarget(...)`。
  - 回调闭包通过提前声明 `input` 保持初始化安全。
- `tests/inputSelectionHotkeys.test.ts`
  - 覆盖外部命令面确认 pending cast/item 的世界坐标和 Shift queued 合并。

## Opus 合入注意

- 这是 UX 输入桥接,不改变 `useItem`、`cast`、冷却、蓝耗、TP 规则。
- 如果 Opus 同时改了 `MiniMap` 构造参数,请保留新回调顺序:
  `onPing`, `onMoveCommand`, `onTargetCommand`。
- 如果 Opus 同时改了 `InputManager` pending 命令逻辑,请让 canvas 点击和 minimap 点击都继续走
  `confirmPendingTarget(...)`,不要复制两套 pending cast/item 分支。

## Verification

- `npm test -- tests/inputSelectionHotkeys.test.ts`

