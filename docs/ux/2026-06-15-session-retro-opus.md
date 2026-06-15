# 会话复盘 — DotA UX 差距分析 + Opus↔Codex 协作落地

日期: 2026-06-15 · 线: Opus(渲染奇偶 + sim 忠实度 + 评审/集成)· 配套并行线: Codex(多单位/输入/UI)
配套文档:[差距分析](2026-06-15-dota-ux-gap-analysis.md) · [Batch 4 评审](2026-06-15-opus-review-selection-batch4.md) · [交接](2026-06-15-opus-to-codex-handoff-next.md)

## 1. 背景与目标

承接「ChatGPT 完善 UX → 工程加固(确定性/命令架构)」之后,本次目标:**调研真实 DotA 的 UX 设计,
全面梳理差距,继续优化完善**。过程中演进为 **Opus 与 Codex 双线并行**:Codex 实现多单位/输入/UI,
Opus 负责调研、铺数据契约/共享函数、评审、集成,以及落在 sim/渲染独立文件里的项。

## 2. 方法

- **9 维度研究 + 差距分析工作流**(27 agent):每维度「真实 DotA UX 网络调研 ∥ 当前代码勘察」→ 对抗式差距综合。
  产出 48 项已验证差距,按 `P0-P3` × `dota1-core / dota2-refined / dota2-only-qol` 分级,聚成 **4 个根因簇**。
- **执行原则**:每改动先红测(可行处)→ 实现 → 全绿 → 逻辑分组提交;**先读码再动手**;**双线靠文件归属边界零冲突**。

## 3. 交付清单(归类)

### 根因簇收敛
| 簇 | 状态 | 关键提交 |
|---|---|---|
| **A 渲染器奇偶** | ✅ 基本完成 | 2D 施法条+3D 迷雾 `2d2bb66`;血条刻度+3D 非英雄状态点+径向冷却扫描 `5d34132` |
| **B AbilityDef 数据契约** | ✅ 完成 | 契约+helper `e1ef0c9`;26 技能填充 `1f2566a`;Codex 接通 `d3f52f4` |
| **C 多单位选择** | ✅ 完成 | Codex Batch 4;Opus 评审 `52c8e8c` + 集成 `d3f52f4` |
| **D 沟通** | ⏸ 正确推迟 | 单机 vs Bot,指向不存在的人类队友 |

### sim 忠实度修复(纯 sim,与并行线零重叠)
- **旋风/放逐(untargetable)打断进行中施法** `5554149`(P1 dota1-core)——此前仅眩晕打断。
- **Roshan/Boss 重生计时** `d47df46`(P1)——`world` 暴露 `bossId/bossRespawnAt`,顶栏 ☠ chip。

### 共享纯函数(双渲染器/sim-UI 同源,杜绝奇偶漂移)
`render/castBar.ts`(施法进度)· `render/fogShared.ts`(迷雾 RGBA)· `render3d/fog3d.ts`(3D 迷雾纱罩)·
`render/healthBar.ts`(血条刻度)· `engine/abilityPreviewShape.ts`(预览形状)。

### 基础设施
- **补装缺失的 `three`/`@types/three`**:node_modules 相对 package.json 过期,致 `tsc` 此前 100+ 报错全断、3D 测试/`build` 跑不起来。`npm install` 修复。

### 评审 + 集成
- 评审 Codex Batch 4(选择/控制组/command card):优秀、语义正确、无 bug `52c8e8c`。
- 集成 Codex Batch 4 + AoE 预览接通 `d3f52f4`(38 文件 +3546 行,集成前 1327 全绿)。

## 4. Opus↔Codex 协作复盘

**有效的做法:**
- **文件归属边界**:明确「你的 churn 文件 / 我的独立文件」,双线 10+ 提交零冲突。
- **共享纯函数作为接口契约**:Opus 铺 `abilityPreviewShape`/数据字段,Codex 几分钟内接通消费侧。
  契约用纯函数表达,双方各自消费,既解耦又防漂移。
- **评审 → 交接 → 集成** 的流水:Opus 评审 Codex 成果、写前瞻交接(分工 + 待接通契约)、最后集成提交建立干净基线。
- **分钟级闭环**:Opus 提交契约 → Codex 立即扩写 `abilityPreviewShape.ts`(加 `itemPreviewShape`/`'line'`/`activeAoeRadius`)。

**注意点:**
- 共享文件(如 `abilityPreviewShape.ts`)一旦被双方编辑即「共享」,需靠归属约定 + 频繁提交划清 delta。
- 并发改写期间全树 `tsc`/测试可能处于对方 in-flight 的临时失败态;判断错误归属(我的文件 vs 对方文件)再决策。

## 5. 经验教训

- **「先读码再动手」两次避免坏改动**:① 旋风打断是真缺口(已修);② 「魔免挡指向」经核码发现
  `applyModifier` 已有 M1 拦截(效果已正确阻断,穿透用 per-modifier `piercesSpellImmunity`),
  在 ability 层加拦截反而会误挡穿透技能 → **不改**。研究 agent 看注释下结论,读码才看到真实约定。
- **奇偶问题的根治是共享纯函数**,不是两边各写一遍——`castBar`/`fogShared`/`healthBar`/`statusPips` 皆此模式。
- **基础设施先于功能**:缺 `three` 让整个 3D 子系统 `tsc` 全断却被忽略;动手前先确认 `tsc`/`build` 基线。
- **3D 迷雾用世界空间 mesh** 而非屏幕叠加:放进场景后透视投影天然正确,且贴合地形高度避免穿模。

## 6. 剩余工作(长尾单项,多在 input/main 线)

世界内 Alt-ping + 音效 · 自动攻击 Never/Standard/Always · 死亡回顾补协助者 · 手动交物给信使 ·
观战变速 · 剩余英雄 `aoeRadius`/线形 `lineWidth` 增量填充 · 魔免挡指向的 UX 预拒绝文案。

## 7. 验收

- `tsc --noEmit` 0 错;全量 **1331 测试绿**(147 文件);工作树干净。
- Opus 线本会话 11 个提交,全部与并行线零文件冲突(集成提交除外,系有意合入 Codex 成果)。
