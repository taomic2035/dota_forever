# Minimap Misclick Guard

日期: 2026-06-19
范围: 小地图防误触延迟。UX/input only, 不改变小地图视野、单位显示、移动规则、施法规则或 sim 状态。

## 问题

小地图是 Dota-like 指令面,但它靠近右下角 HUD。战斗中玩家快速点技能、物品、背包或拖镜头时,很容易擦到小地图并立即触发镜头跳转或右键移动命令。

## 方案

- 新增 `shouldAllowMinimapAction(...)` 纯模型。
- 非 ping 的小地图操作需要鼠标悬停预热 `120ms`:
  - 左键镜头跳转受保护;
  - 右键移动命令受保护。
- 明确修饰键的 Alt ping 不受保护窗影响,因为它是有意沟通信号。
- 鼠标离开小地图后重置保护窗。

## 改动

- `src/ui/minimapClickGuard.ts`
  - 新增 `MINIMAP_MISCLICK_GUARD_MS = 120`。
  - 新增 `shouldAllowMinimapAction(...)`。
- `src/render/minimap.ts`
  - 监听 `mouseenter` / `mouseleave` 维护悬停起点。
  - `mousedown` 时先走防误触模型。
  - 过早的非 ping 点击会被吞掉并停止传播。
- `tests/minimapClickGuard.test.ts`
  - 覆盖保护窗内拦截、保护窗后放行、Alt ping 立即放行。

## Verification

Red-to-green:

```text
npm test -- tests/minimapClickGuard.test.ts
Before fix: failed because src/ui/minimapClickGuard was missing
After fix: 1 file passed, 3 tests passed
```

Focused regression:

```text
npm test -- tests/minimapClickGuard.test.ts tests/mapPingModel.test.ts tests/minimapCourierMarker.test.ts tests/abilitySlotBadgeModel.test.ts
4 files passed
17 tests passed
```

Build:

```text
npm run build
passed
warning: existing Vite chunk-size warning remains
```

## Opus Integration Notes

Useful hooks:

- `shouldAllowMinimapAction(...)`
- `MINIMAP_MISCLICK_GUARD_MS`

Boundary note: this pass intentionally does not add a settings toggle yet. If Opus later adds minimap customization, this constant can become a control setting without changing `MiniMap` behavior semantics.
