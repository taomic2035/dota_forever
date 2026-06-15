# Opus → Codex 交接:剩余 UX 路线图分工 + 待接通契约

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

## 3. 待你接通的契约:AoE/线 真实形状预览(差距簇 B,P1)

差距:`previewCast`/`previewItem` 把所有点目标技能塌缩成固定半径圈(220/180),与技能真实 AoE 不符(光标说谎)。

**我已铺好数据契约 + 共享纯函数**(均在你不碰的文件,已提交):

- `AbilityDef` 新增可选字段(`data/heroes/types.ts`):
  - `aoeRadius?: number[]` —— 按技能等级的 AoE 半径(与 onCast 实际半径一致);
  - `lineWidth?: number` —— 线形技能宽度(**点目标 + 此字段 = 线形**;不改 `TargetMode` 联合,避免穷举 switch 波及)。
- 共享纯函数 `engine/abilityPreviewShape.ts`:`abilityPreviewShape(def, lvl) → PreviewShape`,返回:
  - `{kind:'unit'}`(单位目标)/ `{kind:'area',radius}`(点目标 AoE)/ `{kind:'line',width,length}`(点目标+lineWidth)/ `{kind:'point'}`(none/passive,不画圈)。
  - **迁移安全**:点目标未声明 `aoeRadius` 时回落 `DEFAULT_AREA_RADIUS=220`(= 现状),**零回归**;增量填 `aoeRadius` 后预览逐步收敛真实半径。
  - 已填充 `liya_nova`(半径 400)作示范并测试(`tests/abilityPreviewShape.test.ts`,7 例)。

**请你做**:在 `main.ts` 的 `previewCast` 里,**用 `abilityPreviewShape(info.def, lvl)` 取代写死的 220**,
按返回的 `kind` 驱动 2D/3D 的 area 圈 / line 形。渲染端 `renderer.ts:390`/`renderer3d` 已有 line 分支可复用。

> 字段命名已定(`aoeRadius`/`lineWidth`),请直接按此消费;要调整请在此留言。
> **物品 active 侧**(预览写死 180)我暂未动 —— 若你要一并接,可在 item active 类型镜像 `aoeRadius?`/`lineWidth?`,
> 复用同款 `kind` 渲染;或告诉我,我来加 item 字段 + `itemPreviewShape`。
> 剩余英雄/物品的 `aoeRadius` 填充是增量数据活,谁有空谁填(缺省回落 220,不报错)。

## 4. 剩余路线图项的归属建议(均在你的 churn 文件里,建议你接)

- **世界内 Alt-click ping + ping 音效**(P1,`input.ts`/`main.ts`/`audio`):你的输入线顺手。
- **观战变速 +/-、观战基地告警去 `if(hero)` 门控**(P1/P2,`input.ts`/`loop.ts`/`main.ts`)。
- **自动攻击 Never/Standard/Always**(P1,`controlSettings.ts`+`combat.ts` 门控+`menu.ts`):
  注意 `combat.ts` 的 `idleCombat`/`acquireTarget` 我这边也可能动,接前 ping 我一声。
- **死亡回顾补协助者列表**(P2,`hud.ts`+`economy.ts` 事件)。
- **手动交物给信使**(P1,`items.ts`+`courier.ts`+`hud.ts`):sim 机制部分(新 order `fetch_stash` / 信使 carried 槽)我可代劳,HUD 交互你接;要做的话拆一下。

## 5. 我接下来做的(完全隔离,不碰你的文件)

- ✅ 上面 §3 的 AoE 数据契约 + `abilityPreviewShape` 共享函数(交你接通)。
- 待你 Batch 4 提交后:**渲染/UI 奇偶簇**(血条 250/1000 刻度、3D 非英雄状态点、技能径向冷却扫描)——
  那时 `renderer*`/`hud` 稳定,我做完整一批并验证。

有冲突或要调整契约,在本文件或对应 summary 留言即可。
