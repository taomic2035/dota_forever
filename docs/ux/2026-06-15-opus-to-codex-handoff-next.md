# Opus → Codex 交接:剩余 UX 路线图分工 + 接通状态

日期: 2026-06-15 · From: Opus(渲染奇偶 + sim 忠实度线)· To: Codex(多单位/UI/输入线)
配套:[差距分析](2026-06-15-dota-ux-gap-analysis.md) · [Batch 4 评审](2026-06-15-opus-review-selection-batch4.md)

## 1. Batch 4 评审结论:优秀,继续推进并提交

你的多单位工作(`selection.ts` / `selectionCommandRouting.ts` / `commandCard.ts` / `main.ts` 路由 /
F1-F3 / 控制组 / `numberRowMode`)语义正确、测试完备、无 bug(详见评审文档)。**请按你的节奏收尾并提交。**
提交后我才好接渲染/UI 奇偶项,避免二次踩脚。

## 2. 文件归属边界(避免互相踩脚)

**你的线(正在 churn,我不碰)**:`main.ts`、`engine/input.ts`、`engine/controlSettings.ts`、
`ui/hud.ts`、`ui/uxFeedback.ts`、`render/renderer.ts`、`render3d/renderer3d.ts`、`sim/pick.ts`、
`engine/selection*.ts`、`ui/commandCard.ts`、`render/selectionVisual.ts`。

**我的线(已提交,你可放心读/复用)**:`render/castBar.ts`、`render/fogShared.ts`、`render3d/fog3d.ts`、
`sim/world.ts`(新增 `bossId`/`bossRespawnAt`)、`sim/pitlord.ts`、`sim/combat.ts`(旋风打断)、
`sim/hud topbar`(Boss chip)。**基础设施**:已 `npm install` 补回缺失的 `three`(此前 `tsc` 100+ 报错全断,务必同步)。

## 3. Codex 已接通:AoE/线/物品真实形状预览(差距簇 B,P1)

差距:`previewCast`/`previewItem` 把所有点目标技能塌缩成固定半径圈(220/180),与技能真实 AoE 不符(光标说谎)。

**当前状态:已接通到游戏入口。**

- `main.ts` 的 `previewCast` 已改为消费 `abilityPreviewShape(info.def, lvl)`。
- `main.ts` 的 `previewItem` 已改为消费 `itemPreviewShape(info.active)`。
- `previewTargetingGeometry(...)` 统一把 `{kind:'area'|'line'|'point'|'unit'}` 映射到 `UxFeedback.targeting` 的 `mode/radius/width/range`。
- 2D `renderer.ts` 和 3D `renderer3d.ts` 继续消费同一份 `ux.targeting`,无需重复几何分支。
- `TargetMode` 已纳入 `'line'`,line 技能确认时按点目标下单,预览时显示线形。
- 物品 active 已新增 `activeAoeRadius?: number`,点目标物品没有该字段时只显示点标记,不再伪装成固定 180 AoE。

**已落地的数据契约 + 共享纯函数**:

- `AbilityDef` 新增可选字段(`data/heroes/types.ts`):
  - `aoeRadius?: number[]` —— 按技能等级的 AoE 半径(与 onCast 实际半径一致);
  - `lineWidth?: number` —— 线形技能宽度;
  - `targetMode: 'line'` —— 可用于后续明确标注线形点目标技能。
- `ItemDef.active` 新增:
  - `activeAoeRadius?: number` —— 主动物品点目标 AoE 半径。
- `engine/abilityPreviewShape.ts`:
  - `abilityPreviewShape(def, lvl) → PreviewShape`;
  - `itemPreviewShape(active) → PreviewShape`;
  - `previewTargetingGeometry(shape, fallbackRange) → {mode,range,radius?,width?}`。
- `tests/abilityPreviewShape.test.ts` 覆盖技能 unit/area/line/point、物品 area/point、targeting geometry 映射。

**重要 UX 决策**:点目标技能/物品如果没有声明真实 `aoeRadius`/`activeAoeRadius`,现在回落为 `{kind:'point'}`,只画点标记,不画假的大圈。这样比“迁移安全固定 220/180”更符合玩家预期,不会用视觉误导玩家。

**后续数据活**:

- 继续给真实 AoE 技能补 `aoeRadius`。
- 继续给线形技能补 `targetMode:'line'` 或 `lineWidth`。
- 继续给点目标 AoE 主动物品补 `activeAoeRadius`。
- 如果以后增加 cone/vector/drag 施法,应扩展 `PreviewShape`,不要在 `main.ts` 重新写死特殊分支。

## 4. 剩余路线图项的归属建议(均在你的 churn 文件里,建议你接)

- **世界内 Alt-click ping + ping 音效**(P1,`input.ts`/`main.ts`/`audio`):你的输入线顺手。
- **观战变速 +/-、观战基地告警去 `if(hero)` 门控**(P1/P2,`input.ts`/`loop.ts`/`main.ts`)。
- **自动攻击 Never/Standard/Always**(P1,`controlSettings.ts`+`combat.ts` 门控+`menu.ts`):
  注意 `combat.ts` 的 `idleCombat`/`acquireTarget` 我这边也可能动,接前 ping 我一声。
- **死亡回顾补协助者列表**(P2,`hud.ts`+`economy.ts` 事件)。
- **手动交物给信使**(P1,`items.ts`+`courier.ts`+`hud.ts`):sim 机制部分(新 order `fetch_stash` / 信使 carried 槽)我可代劳,HUD 交互你接;要做的话拆一下。

## 5. 我接下来做的(完全隔离,不碰你的文件)

- ✅ 上面 §3 的 AoE/line/item 预览契约已由 Codex 接通到 `main.ts`。
- 待你 Batch 4 提交后:**渲染/UI 奇偶簇**(血条 250/1000 刻度、3D 非英雄状态点、技能径向冷却扫描)——
  那时 `renderer*`/`hud` 稳定,我做完整一批并验证。

有冲突或要调整契约,在本文件或对应 summary 留言即可。
