# 己方建筑受击警报 Toast 总结

日期: 2026-06-19
范围: UX / alert feedback / minimap danger ping

## What

- 己方建筑被敌方英雄攻击时,现有 `dangerPing` 之外会同步显示短文本警报。
- 文案按建筑类型区分:
  - `高地塔遭受攻击`
  - `基地塔遭受攻击`
  - `近战兵营遭受攻击`
  - `基地遭受攻击`
- 仍沿用既有每建筑 6 秒冷却,避免推塔时刷屏。
- 小兵伤害、友方英雄伤害、敌方建筑受击仍不触发警报。
- 新增 `alert` command-message tone,不再把建筑警报伪装成拒绝操作。

## Files

- `src/ui/buildingAttackAlertModel.ts`
  - 新增 `buildBuildingAttackAlertFeedback(...)`,一次产出 `pulse + message`。
  - 保留 `buildBuildingAttackAlertPulses(...)` 兼容旧调用方。
- `src/ui/uxFeedback.ts`
  - `CommandMessageKind` 增加 `alert`。
- `src/ui/commandCursorTheme.ts`
  - `alert` 消息使用独立 warning tone。
- `src/main.ts`
  - 建筑受击反馈消费 `buildBuildingAttackAlertFeedback(...)`,同步 danger pulse、短文本和 alert 音效。
- `tests/buildingAttackAlertModel.test.ts`
  - 覆盖 tower/ancient 文案与原有过滤/冷却规则。
- `tests/commandCursorTheme.test.ts`
  - 覆盖 `alert` command message 视觉 tone。

## Opus 合入注意

- 这是 UX 层反馈,不改变建筑仇恨、伤害、后门保护、经济或 AI。
- 如果 Opus 修改建筑事件或 `buildingKind`,请继续给 `buildBuildingAttackAlertFeedback(...)` 传入 `buildingKind`,否则会回落为通用 `防御塔/建筑` 文案。
- 如果后续有正式中央 announcer 队列,可以把 `message` 转接过去;当前先复用轻量 command-message 层,避免与一血/连杀中央播报竞争。

## Verification

- `npm test -- tests/buildingAttackAlertModel.test.ts tests/commandCursorTheme.test.ts`

