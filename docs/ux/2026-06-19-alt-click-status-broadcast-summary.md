# Alt-click 槽位状态广播总结

日期: 2026-06-19
范围: UX / HUD / command message

## What

- HUD 技能槽与物品槽支持 `Alt+点击` 播报当前槽位状态。
- 技能状态覆盖:
  - 未学习
  - 被动
  - 冷却剩余秒数
  - 法力不足
  - 就绪
- 物品状态覆盖:
  - 空槽
  - 被动
  - 冷却剩余秒数
  - 法力不足
  - 就绪 + 充能次数
- 新增 `info` command-message tone,区别于操作拒绝(`reject`)和建筑警报(`alert`)。
- `Alt+点击` 不会触发学习技能、移入背包或右键出售,避免状态查看误操作。

## Files

- `src/ui/statusBroadcastModel.ts`
  - 新增 `abilityStatusBroadcastLabel(...)` 与 `itemStatusBroadcastLabel(...)` 纯模型。
- `src/ui/hud.ts`
  - 技能/物品槽写入 `data-status-broadcast`。
  - 底部 HUD mousedown 分支优先处理 `Alt+点击` 状态广播。
  - 普通点击继续保持学习、背包转移、出售、命令卡行为。
- `src/ui/uxFeedback.ts`
  - `CommandMessageKind` 增加 `info`。
- `src/ui/commandCursorTheme.ts`
  - `info` 消息使用蓝色信息 tone。
- `src/main.ts`
  - `hud.onStatusBroadcast` 接入 `UxFeedback.setCommandMessage(...)`。
- `tests/statusBroadcastModel.test.ts`
  - 覆盖技能/物品状态标签优先级。
- `tests/commandCursorTheme.test.ts`
  - 覆盖 `info` command message 视觉 tone。

## Opus 合入注意

- 这是本地 UX 反馈,不改变技能、物品、AI、聊天或队友通信逻辑。
- 真正 toggle/autocast on/off 仍需要 `AbilityDef` 与 sim 状态契约;本批没有伪造开关状态。
- 如果 Opus 后续新增正式聊天/队伍广播层,可把 `onStatusBroadcast` 的输出从 command-message 转接过去。
- HUD 属性值已做 attribute escaping,但技能/物品名称仍建议保持短文本,避免底部槽位 tooltip 过长。

## Verification

- `npm test -- tests/statusBroadcastModel.test.ts tests/commandCursorTheme.test.ts`
