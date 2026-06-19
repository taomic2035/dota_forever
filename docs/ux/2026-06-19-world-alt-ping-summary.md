# World Alt Ping

日期: 2026-06-19
范围: 主战场画布 Alt-click 战术信号 + ping 音效。UX/input/audio only, 不改变移动、攻击、施法、视野、AI 或 sim 规则。

## 问题

小地图已经支持 Alt/Ctrl/Shift 信号,但主战场画布的 Alt+左键仍会进入普通选择流程。玩家在战斗中想直接标记地面位置、危险点或撤退点时,需要移到小地图,反馈不够像 Dota 的“就地点信号”。

## 方案

- 复用现有 `mapPingKindFromModifiers(...)`:
  - `Alt + 左键` = 普通信号;
  - `Alt + Ctrl + 左键` = 危险信号;
  - `Alt + Shift + 左键` = 撤退信号。
- 主画布无待确认命令时,Alt+左键只发 ping,不触发单选/框选。
- 发出 world pulse 的同时回写小地图 pulse,让两套视图同步。
- 新增程序化 ping 音效,普通/危险/撤退三种音色不同,与移动确认音区分。

## 改动

- `src/engine/input.ts`
  - `InputCallbacks` 新增 `onPing(world, kind)`。
  - 主画布左键流程在普通选择前识别 Alt ping。
- `src/main.ts`
  - `onPing` 写入 `UxFeedback` world pulse。
  - 同步调用 `minimap.ping(...)`。
  - 调用 `audio.ping(kind)`。
  - 小地图 ping 也复用同一音效。
- `src/audio/director.ts`
  - 新增 `ping(kind)` 程序化音效。
- `tests/inputSelectionHotkeys.test.ts`
  - 覆盖 Alt+左键普通 ping 与 Alt+Ctrl+左键危险 ping,并确认不会触发选择。

## Verification

Red-to-green:

```text
npm test -- tests/inputSelectionHotkeys.test.ts
Before fix: onPing was not called
After fix: 1 file passed, 9 tests passed
```

Focused regression:

```text
npm test -- tests/inputSelectionHotkeys.test.ts tests/mapPingModel.test.ts
2 files passed
14 tests passed
```

Build:

```text
npm run build
passed
warning: existing Vite chunk-size warning remains
```

## Opus Integration Notes

Useful hooks:

- `InputCallbacks.onPing(world, kind)`
- `AudioDirector.ping(kind)`
- Existing map ping kinds: `ping`, `dangerPing`, `retreatPing`

Boundary note: pending casts/items/move/attack-move still consume left-click as before. This pass only diverts Alt+left-click when no target confirmation is pending, so it should not perturb spell targeting or queued command behavior.
