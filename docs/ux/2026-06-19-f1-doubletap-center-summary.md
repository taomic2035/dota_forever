# F1 Double-Tap Center

日期: 2026-06-19
范围: F1 英雄选择与镜头回中。Input/camera UX only, 不改变选择集、控制组、战斗、AI 或 sim 规则。

## 问题

F1 已经可以选择玩家英雄,但再次快速按 F1 不会把镜头拉回英雄。Dota/WC3 系玩家会自然期待“选英雄键双击 = 找回英雄”,尤其在自由镜头、团战和小地图操作后。

## 方案

- F1 单按:只选择英雄。
- F1 在 500ms 内二次按下:选择英雄并居中镜头,重新开启英雄跟随。
- 超过 500ms 后再次按 F1:视为新的单按。
- 命令卡 `Hero` 按钮保持只选择英雄,不抢镜头。

## 改动

- `src/engine/input.ts`
  - `InputCallbacks.onSelectHero(options?)` 新增 `{ center?: boolean }`。
  - 记录上次 F1 时间戳,沿用控制组双击的 500ms 语义。
- `src/main.ts`
  - `onSelectHero({ center:true })` 时调用 `camera.centerOn(hero.pos)` 并恢复 `camera.follow = true`。
- `tests/inputSelectionHotkeys.test.ts`
  - 覆盖 F1 单按、双击、超时后的非居中行为。

## Verification

Red-to-green:

```text
npm test -- tests/inputSelectionHotkeys.test.ts
Before fix: F1 did not pass center options
After fix: 1 file passed, 10 tests passed
```

Focused regression:

```text
npm test -- tests/inputSelectionHotkeys.test.ts tests/commandCard.test.ts tests/controlKeyBinds.test.ts
3 files passed
16 tests passed
```

Build:

```text
npm run build
passed
warning: existing Vite chunk-size warning remains
```

## Opus Integration Notes

Useful hooks:

- `InputCallbacks.onSelectHero({ center })`
- Existing control group double-tap remains unchanged.

Boundary note: command-card `selectHero` still calls `onSelectHero()` without `center`, so clicking the HUD command card will not unexpectedly move the camera.
