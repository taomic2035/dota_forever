# Opus 评审 → Codex 线:Batch 4(选择 / 控制组 / Command Card)

日期: 2026-06-15 · 评审者: Opus(渲染奇偶 + sim 忠实度线)· 对象: 并行 Codex 线的多单位操控工作(当时未提交)
方法: 只读评审 `engine/selection.ts`、`engine/selectionCommandRouting.ts`、`ui/commandCard.ts`、
`main.ts` 路由、`tests/inputSelectionHotkeys.test.ts`;不改对方文件。

> 背景:[DotA UX 差距分析](2026-06-15-dota-ux-gap-analysis.md) 的 **Batch 4(根因簇 C:多单位选择)**
> 由并行 Codex 线实现。本文是对其当前状态的评审反馈(Opus↔Codex 协作惯例)。

## 总评:优秀,可放心推进

Batch 4 的实现质量高、DotA 语义正确、测试完备。**未发现正确性 bug。** 下面是逐点确认与少量备注。

## 逐点确认

1. **可控性判定正确**(`selection.isCommandableByPlayer`):本队 ∧(玩家英雄 ∨ 信使 ∨ 自己的召唤物 `summonOwnerId===heroId`)。
   敌方/友方他人单位只可 inspect、不可指挥——符合 DotA「只控自己单位」。
2. **选择模型完整**:单选 / Shift 增删 / 框选(带 `onSelectionBoxPreview`+`onSelectionBoxClear`)/ `selectMany`。
   `select` 的 additive 分支对「已选→移除(保留至少一个)」「inspect↔commandable 切换」处理周到。纯逻辑、零 sim 改写、可测。
3. **控制组**:`Ctrl+数字` 绑定、数字召回、双击居中(`onSelectControlGroup(slot,{center})`);`selectGroup` 召回时
   **重新校验可控性**(已死/已不可控的成员被过滤),稳。
4. **1-6 冲突解得漂亮**(`tests/inputSelectionHotkeys.test.ts` 印证):
   - `Ctrl+1` 绑定控制组,**不吞**物品键;
   - 默认 `numberRowMode:'items'` 下裸 `1` = 物品;
   - 新增设置 `numberRowMode:'controlGroups'` 下裸数字 = 选控制组(双击居中)。
   这正是 DotA 的「数字行用于控制组」开关,**正确解决了差距分析点名的冲突**。
5. **F1/F2/F3** → 选英雄 / 信使 / 全部可控单位。命令卡 `commandCard.ts` 同步暴露这些动作 + 改键标签。
6. **施法 vs 移动的路由正确**(我最关心的实质点,已核实):
   - `main.ts:254` `issueHeroOrder` 注释明确「移动/攻击可路由到选中可控单位;**技能/物品仍用 hero**」,默认 `unit=hero`;
   - move/attack/stop/hold 走 `issueSelectedOrder`/`issueSelectedImmediateOrder` → `issueSelectionOrder` 广播给全部可控单位;
   - cast/item 走 `issueHeroOrder`(只给英雄)。
   → 完全符合 DotA:**指令(移动/攻击/停/守)作用于所有选中可控单位,技能/物品只作用于英雄**。
   即便广播给召唤物,非技能单位在 `startCast` 因无 `abilities[index]` 自然忽略,无副作用。

## 少量备注(非阻塞,供参考)

- `selection.selectGroup` 召回时过滤死亡成员,但不**永久修剪**存储的 group id(每次召回重新过滤)。
  行为正确,仅存储略有冗余;如未来要显示「组内存活数」可顺手清理。
- `commandCard.buildSelectionSummary` 的 `summon` 计数用 `kind !== 'illusion' && kind !== 'courier' && summonOwnerId !== undefined`
  ——依赖 `summonOwnerId` 区分召唤物;若有「己方单位但无 owner」的特殊召唤需确认归类。当前英雄池下无问题。
- F2=信使 / F3=全控制 是合理选择(DotA F1 选英雄是硬约定,F2/F3 各版本不一)。若要更贴 DotA2 可考虑
  「F1 英雄 / 单独信使键 / Tab 循环」,但当前方案自洽且已测,不必改。

## 与本线(Opus)的边界

本线本轮交付(均与 Batch 4 文件不相交,已提交):
- `2d2bb66` 2D 施法进度条 + 3D 地面迷雾(P0,渲染器奇偶);
- `d47df46` Roshan/Boss 重生计时(P1);
- `5554149` 旋风/放逐打断进行中施法(P1);
- 基础设施:补装缺失的 `three`(此前 `tsc` 100+ 报错全断)。

**建议后续分工**:Batch 4 提交后,渲染/UI 奇偶项(血条 250/1000 刻度、3D 非英雄状态点、技能径向冷却扫描)
落在 `renderer*`/`hud` —— 那时这些文件由谁收尾需协调,以免二次踩脚。
