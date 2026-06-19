# HUD Cooldown Radial Scan Model

日期: 2026-06-19
范围: HUD 技能/物品冷却显示。Presentation-only, 不改变技能、物品、冷却、法力、施法、购买或战斗规则。

## 问题

技能格和物品格已经有径向冷却遮罩,但冷却比例、读秒、兜底和临近就绪状态散在 `hud.ts` 的 HTML 字符串里。继续做 Dota-like HUD 打磨时,这会让技能/物品视觉漂移,也缺少测试保护。

## 方案

- 抽共享纯模型 `buildCooldownOverlayModel(...)`。
- 技能槽和物品槽都消费同一个模型:
  - ready: 不显示遮罩;
  - cooldown: 显示黑色 conic radial sweep + 秒数;
  - readying: 最后 2 秒保留径向遮罩,加轻量金色内辉,帮助玩家预判技能/物品即将可用;
  - total cooldown 缺失时回落为 full sweep,避免 NaN/跳动。
- HUD 尺寸不变,只增强现有格子内部反馈。

## 改动

- `src/ui/cooldownOverlayModel.ts`
  - 新增 `buildCooldownOverlayModel({ now, cooldownUntil, totalCooldown })`。
  - 输出 `active`, `label`, `remainingSeconds`, `progress`, `sweepDegrees`, `tone`。
- `src/ui/hud.ts`
  - 技能槽移除本地 `cdFrac/cdLeft` 计算,改用共享模型。
  - 物品槽移除本地 `itemCdFrac` 计算,改用共享模型。
  - 新增 `cooldownOverlay(...)` 私有渲染 helper,保证技能/物品视觉一致。
- `tests/cooldownOverlayModel.test.ts`
  - 覆盖 ready、普通冷却、临近就绪、缺失 total cooldown 兜底。

## 验证

Red-to-green:

```text
npm test -- tests/cooldownOverlayModel.test.ts
Before fix: failed because src/ui/cooldownOverlayModel was missing
After fix: 1 file passed, 4 tests passed
```

Focused regression:

```text
npm test -- tests/cooldownOverlayModel.test.ts tests/abilityTooltipModel.test.ts tests/shopQuickActionModel.test.ts tests/courierHudModel.test.ts
4 files passed
26 tests passed
```

Build:

```text
npm run build
passed
warning: existing Vite chunk-size warning remains
```

## Opus Integration Notes

Useful hooks:

- `buildCooldownOverlayModel(...)`
- `CooldownOverlayModel.tone`
- HUD DOM marker: `data-cooldown-tone="cooldown"` or `data-cooldown-tone="readying"`

Follow-up: `docs/ux/2026-06-19-hud-ability-badges-summary.md` adds passive/orb/ultimate/scepter badges from existing AbilityDef data. True toggle/autocast on/off markers still need a separate AbilityDef/sim contract.
