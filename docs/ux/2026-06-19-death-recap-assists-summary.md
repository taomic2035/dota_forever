# Death Recap Assist Summary

日期: 2026-06-19
范围: HUD 死亡回放协助者摘要。Presentation-only, 不改变击杀、助攻、经济、复活、买活或伤害规则。

## 问题

死亡回放已有致命前伤害来源和控制链,但缺少 Dota 式的击杀参与者信息。玩家能看到“被谁击杀”,却不能在死亡面板里快速知道还有哪些英雄参与了击杀。

## 方案

- 新增纯模型 `buildDeathAssistSummary(...)`。
- 读取现有 `hero_kill.assists` 事件,只在玩家英雄死亡时显示。
- HUD 在击杀者标题下方显示协助英雄芯片。
- 协助者超过 3 个时显示 `+N`,tooltip 保留完整名单。
- 玩家复活或新一次死亡开始时清空上一条命的协助摘要。

## 改动

- `src/ui/deathRecapModel.ts`
  - 新增 `DeathAssistSource` / `DeathAssistSummary`。
  - 新增 `buildDeathAssistSummary(sources, maxVisible)`。
- `src/ui/hud.ts`
  - 新增 `deathAssistSources` 字段。
  - 死亡回放新增协助芯片行,位于击杀者标题和伤害来源之间。
- `src/main.ts`
  - 消费现有 `hero_kill.assists`。
  - 只把 UI 所需的 id/name/color 写入 HUD,不改变 sim 事件或结算。
- `tests/deathRecapModel.test.ts`
  - 覆盖空列表、去重、颜色保留、截断、完整 tooltip。

## Verification

Red-to-green:

```text
npm test -- tests/deathRecapModel.test.ts
Before fix: failed because buildDeathAssistSummary was missing
After fix: 1 file passed, 24 tests passed
```

Focused regression:

```text
npm test -- tests/deathRecapModel.test.ts tests/killAssist.test.ts tests/announceModel.test.ts
3 files passed
29 tests passed
```

Build:

```text
npm run build
passed
warning: existing Vite chunk-size warning remains
```

## Opus Integration Notes

Useful hooks:

- `buildDeathAssistSummary(...)`
- `Hud.deathAssistSources`
- Existing event contract: `hero_kill.assists?: EntityId[]`

Boundary note: this pass assumes Opus keeps assist attribution in the existing `hero_kill` event. If the main logic later changes assist semantics, only `src/main.ts` mapping should need adjustment; HUD and the pure summary model can stay stable.
