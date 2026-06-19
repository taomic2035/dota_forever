# 观战 / 对局变速 HUD 反馈总结

日期: 2026-06-19
范围: UX / HUD / spectator controls

## What

- 顶栏现在会在非 `1x` 速度或暂停时显示速度状态 chip。
- `=` / `-` 仍沿用既有 `SPEED_STEPS = [0.5, 1, 2, 4, 8]` 档位。
- `1x` 且未暂停时隐藏 chip,避免常态信息噪音。
- 暂停状态优先显示 `暂停`,tooltip 保留当前速度档。

## Files

- `src/ui/gameSpeedHudModel.ts`
  - 新增纯模型 `buildGameSpeedHudModel(...)`。
  - 统一 slow / fast / paused / hidden 规则。
- `src/ui/hud.ts`
  - `Hud.update(...)` 接收 `loopState`。
  - 顶栏在时间旁渲染速度状态 chip。
- `src/main.ts`
  - 每帧把 `{ speed: loop.speed, paused: loop.paused }` 传给 HUD。
- `tests/gameSpeedHudModel.test.ts`
  - 覆盖正常速度隐藏、慢速/快速显示、暂停优先。

## Opus 合入注意

- 这是纯 UX 可见性补丁,不改变模拟步进、暂停、速度档位或 replay/spectate 逻辑。
- 如果 Opus 改 `Hud.update(...)` 签名,请保留最后的 `loopState` 可选参数或等价输入。
- 如果后续做正式观战面板,可以直接复用 `buildGameSpeedHudModel(...)`。

## Verification

- `npm test -- tests/gameSpeedHudModel.test.ts`

