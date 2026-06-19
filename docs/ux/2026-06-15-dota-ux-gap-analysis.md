# 真实 DotA UX 调研 + 差距分析(更新版)

日期: 2026-06-15 · 方法: 9 维度并行(真实 DotA UX 网络调研 ∥ 当前代码勘察)→ 逐维度对抗式差距综合(27 agent)
取代/更新: [2026-06-13 UI 控制差距审计](2026-06-13-ui-control-dota-gap-audit.md)(其多数「未完成」项已于 06-14/15 落地)

> **结论先行**:当前 UX 已相当成熟——9 个维度中 **8 个 STRONG、1 个 ADEQUATE**。
> 真正打断核心战斗闭环的只有 **4 个 P0**,且多为「2D/3D 渲染器奇偶性」缺口。
> 共 **48 项差距**:P0×4 / P1×12 / P2×16 / P3×16;按忠实度:**dota1-core 26 / dota2-refined 15 / dota2-only-qol 7**。

---

## 1. 真实 DotA UX 是怎样设计的(调研提炼)

DotA 的 UI/操控不是一堆按钮,而是**高压战斗下的一套闭环**:命令可预期、目标可预览、信息可扫描、设置可个性化、多单位可控、沟通可表达、观战可复盘。关键认识:

**DotA1 = Warcraft III 的 RTS 接口**。所以 DotA1 的操控语法就是 WC3 的语法,这部分是**忠实度核心(dota1-core)**;DotA2 在同一概念语法上做了打磨(dota2-refined)和现代便利(dota2-only-qol)。复刻 DotA1 必须先吃满 dota1-core,DotA2 的便利按价值取舍。

### 各维度的真实 DotA 设计要点(按忠实度标注)

| 维度 | dota1-core(必须忠实) | dota2-refined(同概念的打磨) | dota2-only-qol(可选便利) |
|---|---|---|---|
| **命令/输入** | 右键智能指令;A 攻击移动 + 强攻反补;S/H/Patrol;单选/框选/双击同类全选;Ctrl+数字控制组(双击居中);Shift 队列 | Alt/双击自施;强攻反补的标准绑定 | Quick Cast/Quick Attack/Quick Move(按键即放);Smart Double Tap;控制全部单位;云同步绑定;Legacy Keys |
| **目标/施法反馈** | AoE 真实半径蓝圈、线/向量法术起点+宽度+方向;施法前摇可被任意控制打断(非仅眩晕);魔免阻挡单体指向;走近施法 | 敌方施法进度条读条打断 | — |
| **HUD/状态** | 血蓝数值条;技能栏径向冷却扫描+读秒、蓝耗、等级点、被动/自动施法/开关标记;6 格背包+TP 专属槽+储藏;buff/debuff 计时图标;血条每 250/1000 刻度 | 中立物品槽;Break 状态 | — |
| **商店/物品/信使** | 分类+合成树+秘密商店+储藏;**手动驾驶信使取送**(被拦截=核心张力);拖拽换位/拆解 | 侧边商店 | quickbuy/推荐装;**自动投送(Auto-Deliver)**;搜索 |
| **镜头/小地图** | 边缘平移/拖拽/缩放/回英雄;F1 选英雄+双击居中;**小地图即指令面**(右键移动、左键地面施法/TP、Alt ping、英雄图标);小地图误触延迟 | — | 保存镜头位;3D 透视视锥框 |
| **沟通** | 世界内 + 小地图 Alt ping(带**声音**);危险/撤退区分 ping;打字 ss/miss MIA 文化 | — | Alt 点击广播状态(CD/蓝/符文/买活);轮盘快捷语;画线 |
| **记分板/观战** | 记分板(等级/KDA/补反/净值/复活/买活/图标装备);**Roshan/Boss 重生计时**;死亡回顾(击杀者/协助者/伤害来源/控制链);观战变速 | — | 录像 seek/导演视角 |
| **设置/上手** | 选人(技能/属性/成长);Legacy 预设=DotA1 肌肉记忆 | 自动攻击 Never/Standard/Always | 色盲/HUD 缩放/本地化;交互式教程 |
| **3D 世界可读性** | 地面战争迷雾(黑/灰雾/明)、高低地遮断;选取环;头顶队色血条+状态;技能地面贴花;小地图同步 | 血条 250/1000 刻度;非英雄单位状态点 | 透视视锥框 |

---

## 2. 维度健康度总览

| 维度 | 健康度 | 一句话 |
|---|---|---|
| 命令/输入 | **STRONG** | 单位 RTS 命令语法忠实且有测试;缺口集中在**多单位控制原语**(控制组、框选、召唤物施法) |
| 目标/施法反馈 | **STRONG** | 闭环扎实、光标基本不说谎;三处核心忠实漏洞:**AoE 占位圈、仅眩晕打断前摇、魔免不挡单体** |
| HUD/状态 | **STRONG** | 信息广而成熟;技能/物品径向冷却扫描与 passive/orb/ultimate/scepter 徽标已模型化;仍缺真正 toggle/autocast on/off 状态 |
| 商店/物品/信使 | **STRONG** | 商店/合成/储藏/TP槽/背包/信使均完整;手动派送已接 HUD;仍缺侧边商店与更完整的手动转运细节 |
| 镜头/小地图 | **STRONG** | 自由镜头、F1 双击回英雄、小地图指令面核心都在;已补小地图误触保护与小地图地面施法/TP |
| 沟通 | STRONG | 世界内/小地图 Alt ping、危险/撤退信号和声音已成体系;Alt 点击技能/物品状态已接本地信息提示;聊天/MIA 类因单机贬值暂不投入 |
| 记分板/观战 | STRONG | 记分板/播报/顶栏/结算扎实;Boss 计时、死亡回顾、观战/对局变速与速度反馈、建筑受击警报已覆盖 |
| 设置/上手 | **STRONG** | 改键/施法模式/镜头/持久化优秀,已超 DotA1 基线;缺**自动攻击开关、可访问性、教程门控、改键测试** |
| 3D 世界可读性 | **STRONG** | 与 2D 近乎奇偶对齐;一个核心漏洞:**3D 地面无战争迷雾** + 两处打磨 |

---

## 3. 根因簇(一次重构解开一片)

这 48 项差距高度聚合在四个根因上,按簇推进远比逐条修高效:

### 簇 A — 2D/3D 渲染器奇偶性
一批差距是「功能只在一个渲染器实现,另一个缺」:
- **2D 无施法/引导进度条**(3D 有 `renderer3d.ts:552-566`)→ 2D 下无法读条打断 = **P0**。
- **3D 地面无战争迷雾**(2D 有 `fog.ts`;3D 地形永远全亮,泄漏「哪里没探索/雾线在哪」)= **P0**。
- 3D 状态点仅画给英雄、非英雄单位缺(2D 有)= P2。
- 血条无 250/1000 刻度(两个渲染器都缺)= P2。
> 解法:把这些读条/迷雾/刻度逻辑抽成**渲染器共享纯函数/helper**(如 `statusPips.ts` 已是的模式),两个渲染器消费同一份 → 奇偶性根除。

### 簇 B — AbilityDef 数据契约缺空间/语义字段
多处「光标说谎」源于技能数据缺字段:
- 无 `aoeRadius`/`lineWidth` → `previewCast` 把所有点目标技能塌缩成固定 220 半径圈(`main.ts:332-348`),AoE 无法照圈瞄 = **P1**。
- 无 `piercesImmunity` → 单体指向技能对魔免(BKB)目标显示为合法,放进去打空 = **P1**。
- 无 autocast/toggle 语义 → 法球/开关技能的「已开启」状态不可见 = P2。
> 解法:给 `AbilityDef`(`data/heroes/types.ts`)加 `aoeRadius?:number[]` / `lineWidth?` / `'line'` 模式 / `piercesImmunity?` / autocast 标记;在 112 英雄数据上回填;预览与 sim 校验读真实值。**一处契约扩展解开一串。**

### 簇 C — 多单位选择基础缺失(依赖链)
`ux.selectedUnitId` 是单标量(`uxFeedback.ts:65`),无法持多个单位 → 阻断整条链:
**选择 Set 化 → 框选/Shift 增减/双击同类全选 → Ctrl+数字控制组 → 召唤物/信使施法**。
> 解法:先把选择升级为 `Set<number>`(保留主选用于信息卡),再依次接框选、控制组、多单位施法。这是 P1-P2 一组的共同前置。

### 簇 D — 单机 vs Bot 使沟通类贬值
聊天/MIA/队友广播都指向**不存在的人类队友**,Bot 不消费 → P3「现在别投入」。仅**自我信号**类(世界内 ping + ping 音效、Alt 点击槽位状态自检)有价值,且属高压战斗下的可读闭环,应做。

---

## 4. 完整差距清单(按优先级)

### P0 — 打断核心战斗/可读闭环(4)

| 维度 | 差距 | 现状 → 修法 | 忠实度/体量 |
|---|---|---|---|
| 3D 可读性 | **3D 地面无战争迷雾** | 3D 地形永远全亮(`renderer3d.ts:354-367` 无迷雾合成);2D 有 `fog.ts`。vision 数据已存在(`vision.grids/explored`)→ 加世界空间迷雾纱罩,按 0.25s 节奏从 `world.vision` 驱动 | core/M |
| 通信·HUD | **2D 无施法/引导进度条** | 2D 仅脉冲光晕(`renderer.ts:656-664`),3D 有真读条(`renderer3d.ts:552-566`)→ 抽共享 helper,2D 在血蓝条下画同款蓝(施法)/金(引导)进度条 | core/S |
| 镜头/小地图 | ✅ **小地图左键地面施法/TP** | `MiniMap` 左键先尝试 `InputManager.confirmPendingTarget(...)`,把已 armed 的技能/物品/TP 经 `onCastKey/onItemKey` 路由到小地图世界坐标;无 pending 时仍 recenter | core/M |

### P1 — 重要缺失的 DotA 标配(12,摘要)

- **目标反馈**:AoE/线技能用真实形状预览(簇 B);**仅眩晕打断前摇** → 扩到 hex/sleep/root(`combat.ts:299`);**魔免不挡单体指向**(簇 B)。〔均 dota1-core〕
- **命令/输入**:控制组 Ctrl+数字(`input.ts` 加 Ctrl 分支,注意与 1-6 物品键冲突);框选/双击同类全选/Shift 增减(选择 Set 化,簇 C)。〔dota1-core〕
- **镜头/小地图**:世界内 Alt 点击 ping(`input.ts` 左键加 altKey 分支);**ping 加音效**(`onPing` 处接 `audio`)。〔dota1-core〕✅ 已完成 2026-06-19
- **记分板/观战**:**Roshan/Boss 重生计时**与观战运行时变速均已完成;速度 chip 已在非 `1x` / 暂停时显示。〔core / refined〕✅ 已完成 2026-06-19
- **商店/信使**:手动「交物给信使」指令链已起步:HUD 可请求信使送储藏,手动移近也触发交付;仍可后续补更细的信使背包/取回/转交语义。〔dota1-core〕✅ 已完成 2026-06-19 起步版
- **设置**:自动攻击 Never/Standard/Always(保护补刀;`combat.ts:393` idleCombat 按设置门控)。〔dota2-refined〕
- **3D**:仅 10/112 英雄有独特 3D 剪影,其余靠 archetype+染色 → 高人气英雄优先补精模 + 强化程序化剪影差异。〔dota2-refined/L〕

### P2 — 有意义的打磨(16,摘要)

真正 toggle/autocast on/off 图标标记、上手门控+Legacy 预设、改键逻辑测试。

### P3 — 锦上添花 / 单机低价值(16,摘要)

聊天/MIA/轮盘/队友广播(单机贬值,不投入)、Ctrl 画线、3D 透视视锥框等。

---

## 5. 建议路线图(继续优化的顺序)

按「价值 × 忠实度 ÷ 风险」,且优先解根因簇:

- **Batch 1 — 渲染器读条/迷雾奇偶(P0,簇 A)**:① 2D 施法/引导进度条(抽共享 helper)② 3D 地面战争迷雾。两项各自有界,各关一个「渲染器说谎」漏洞。**最高优先**。
- **Batch 2 — 技能数据契约 + 施法忠实(P1,簇 B)**:`AbilityDef` 加 `aoeRadius/lineWidth/piercesImmunity` → 真实 AoE/线预览 + 魔免挡单体;前摇打断扩到 hex/sleep/root。机制忠实度大提升,且解一串。
- **Batch 3 — 宏观可读(P1)**:Roshan/Boss 顶栏计时、世界内 ping + ping 音效、小地图地面施法/TP、Alt 点击技能/物品状态自检已完成;后续可转向更多观战/复盘提示。
- **Batch 4 — 多单位(P1-P2,簇 C)**:选择 Set 化 → 框选/同类全选 → 控制组 → 召唤物/信使施法。一条依赖链顺次推。
- **Batch 5 — 设置/QoL(P1-P2)**:自动攻击开关(保护补刀)→ 改键测试 + Legacy/默认预设 → 径向冷却扫描 + autocast 标记。
- **不做(现阶段)**:聊天/MIA/队友广播/画线(簇 D,单机贬值);录像 seek;3D 透视视锥框。

每个 batch 沿用既有验收:`tsc` 0 + `npm test` 全绿 + 2D/3D 实机截图 + 文档勾选。

---

## 6. 文档同步(顺带发现的债)

- `README.md` 操作表已**漂移**:未含 shift-queue / 改键 / Glyph(G)/ 选中单位 / 控制信使;「有意简化」里「无信使」与近期信使提交矛盾;测试数 741/722/1352 三处不一致。建议随 Batch 1 一并校正。

## 6.5 实现进度

**Batch 1 — 渲染器读条/迷雾奇偶(P0,簇 A)✅ 完成(2026-06-15)**
- 2D 施法/引导进度条:抽 `render/castBar.ts`(`castBarInfo` 共享纯函数,2D `renderer.drawBars` 新增进度条、
  3D `renderer3d` 重构复用同源,杜绝奇偶漂移)。测试 `castBar.test.ts`。
- 3D 地面战争迷雾:`render3d/fog3d.ts`(贴合地形高度的半透明纱罩 + vision DataTexture,透视下天然正确);
  vision→RGBA 抽 `render/fogShared.ts` 与 2D `FogRenderer` 共用。测试 `fogShared.test.ts` + `render3d/fog3d.test.ts`。
- 基础设施:补装缺失的 `three`/`@types/three`(node_modules 相对 package.json 过期,致 `tsc` 此前 100+ 报错)。
- 结果:`tsc` 0 错;全量 1293 测试绿(+8 新测试)。注:3D 迷雾的视觉调校(纱罩浓度/边界柔化)建议后续浏览器实机过一遍。

**Batch 3(部分)— Roshan/Boss 重生计时(P1,dota1-core)✅ 完成(2026-06-15)**
- `world` 暴露 `bossId`/`bossRespawnAt`(此前为 `pitlord` 闭包局部变量,HUD 读不到);`pitlord` 写入;
  `hud` 顶栏新增 ☠ 计时 chip(在世=绿/重生倒计时=琥珀,仿 Glyph chip)。测试 `bossTimer.test.ts`。
  只碰 `world.ts`/`pitlord.ts`/`hud.ts`(与并行线零重叠)。

> 注:Batch 4(多单位选择/控制组/command card)由并行 Codex 线推进中(`engine/selection.ts` 等),本线不重叠。
> 为避免与并行线冲突,本线优先做落在 `sim`/`hud`/`render` 等他们不碰的文件里的项。

**Sub-batch C — 战斗/施法忠实度(纯 sim)进度(2026-06-15)**
- ✅ **旋风/放逐(untargetable)打断进行中的施法**(`combat.ts`,P1 dota1-core):此前仅 `stunned` 打断前摇,
  旋风(`rooted+silenced+disarmed+untargetable`,无 stun)敌方读条放不掉。改为 `stunned || untargetable` 打断。
  测试 `castInterrupt.test.ts`。提交 `5554149`。
- ⚠️ **魔免(BKB)挡单体指向 — 经深读判定「核心已实现,不再贸然改」**:差距分析据 `combat.ts:163` 注释判断
  「魔免从不挡」,但深读发现 `applyModifier` 已有 **M1 拦截**:魔免/无敌单位**免疫敌方控制/减益 modifier**
  的施加,穿透由 **per-modifier `data.piercesSpellImmunity`** 表达(见 `spellImmunity.test.ts`)。故技能的
  **效果已被正确拦截**;仅余「不浪费蓝/CD + 光标拒绝文案」的 UX 余量。**不做**在 ability 层加 `piercesImmunity`
  的目标时拦截——会与现有 per-modifier 穿透约定冲突、误挡本应穿透的技能。若要补 UX 余量,应在 UI 层
  (`main.ts` 预拒绝)读 `stateOf(target).magicImmune` 给提示,留待与并行 input 线协调后做。

**Sub-batch HUD — 径向冷却扫描模型化(2026-06-19)**
- ✅ 技能/物品槽的径向冷却遮罩抽为共享纯模型 `ui/cooldownOverlayModel.ts`。
- ✅ HUD 技能槽与物品槽统一消费 `buildCooldownOverlayModel(...)`,不再各自内联 `cdFrac`/读秒计算。
- ✅ 最后 2 秒标记 `tone:"readying"` 并在 HUD 内给轻量金色就绪提示。
- ✅ 测试 `cooldownOverlayModel.test.ts`;总结 `docs/ux/2026-06-19-hud-cooldown-radial-summary.md`。

**Sub-batch HUD — 技能状态徽标模型化(2026-06-19)**
- ✅ passive/orb/ultimate/scepter 技能格徽标抽为共享纯模型 `ui/abilitySlotBadgeModel.ts`。
- ✅ HUD 输出 `data-ability-badge`,方便 Opus smoke check。
- ✅ 未学习技能隐藏 passive/orb,但保留 ultimate 身份。
- ⚠️ 真正 toggle/autocast on/off 仍需后续 AbilityDef/sim 契约,本批不伪造。

**Sub-batch HUD — 死亡回顾协助者摘要(2026-06-19)**
- ✅ 死亡回顾新增 `buildDeathAssistSummary(...)` 纯模型,覆盖去重、截断、完整 tooltip。
- ✅ `main.ts` 读取现有 `hero_kill.assists` 并写入 `Hud.deathAssistSources`,不改变 sim 事件或经济结算。
- ✅ HUD 在击杀者标题下方显示协助英雄芯片,与已有伤害来源/控制链组成完整死因故事。
- ✅ 总结 `docs/ux/2026-06-19-death-recap-assists-summary.md`。

**Sub-batch Input/Audio — 世界内 Alt ping + 音效(2026-06-19)**
- ✅ 主战场画布 `Alt+左键` 发普通 ping,`Alt+Ctrl` 发危险 ping,`Alt+Shift` 发撤退 ping。
- ✅ 无待确认命令时 Alt ping 不再触发单选/框选,避免误选。
- ✅ world pulse、小地图 pulse、程序化 ping 音效三者同步。
- ✅ 总结 `docs/ux/2026-06-19-world-alt-ping-summary.md`。

**Sub-batch Minimap — 防误触延迟(2026-06-19)**
- ✅ 小地图非 ping 操作增加 `120ms` 悬停预热保护。
- ✅ 左键镜头跳转与右键移动命令受保护;Alt ping 立即生效。
- ✅ 纯模型 `ui/minimapClickGuard.ts` 覆盖保护窗内/外与 ping 绕过。
- ✅ 总结 `docs/ux/2026-06-19-minimap-misclick-guard-summary.md`。

**Sub-batch Input/Camera — F1 双击回英雄(2026-06-19)**
- ✅ `F1` 单按选择英雄,500ms 内二次按下选择并居中英雄。
- ✅ 居中时恢复 `camera.follow = true`,方便团战后找回主体。
- ✅ 命令卡 `Hero` 保持只选择英雄,不抢镜头。
- ✅ 总结 `docs/ux/2026-06-19-f1-doubletap-center-summary.md`。

**Sub-batch Minimap/Input — 小地图施法 / TP 目标确认(2026-06-19)**
- ✅ `InputManager.confirmPendingTarget(world, shiftKey?)` 抽出 pending cast/item 确认路径,主画布与小地图共用。
- ✅ 小地图左键在 recenter 前先尝试确认 armed 技能/物品/TP 的世界坐标。
- ✅ Shift 小地图确认会并入 queued;Alt 小地图 ping 仍优先且不被 pending target 抢走。
- ✅ 总结 `docs/ux/2026-06-19-minimap-target-confirm-summary.md`。

**Sub-batch Spectator/HUD — 观战 / 对局变速反馈(2026-06-19)**
- ✅ `loop.speed` 运行时变速已由 `=` / `-` 驱动,并通过 HUD 顶栏变速 chip 可见。
- ✅ 非 `1x` 速度显示 `0.5x/2x/4x/8x`;`1x` 常态隐藏,避免信息噪音。
- ✅ 暂停状态优先显示 `暂停`,tooltip 保留当前速度档。
- ✅ 总结 `docs/ux/2026-06-19-game-speed-hud-summary.md`。

**Sub-batch Alert/HUD — 己方建筑受击短警报(2026-06-19)**
- ✅ 复用既有建筑受击 danger ping 模型,扩展为 `pulse + message` 反馈。
- ✅ 敌方英雄攻击己方建筑时,显示 `高地塔/基地塔/兵营/基地遭受攻击` 短文本。
- ✅ 每建筑 6 秒冷却仍保留;小兵伤害、友方伤害、敌方建筑受击不触发。
- ✅ `alert` command-message tone 独立于 `reject`,不再把宏观警报伪装成操作拒绝。
- ✅ 总结 `docs/ux/2026-06-19-building-attack-alert-toast-summary.md`。

**Sub-batch HUD/Communication — Alt 点击技能/物品状态自检(2026-06-19)**
- ✅ 技能槽 `Alt+点击` 显示未学习/被动/冷却/法力不足/就绪。
- ✅ 物品槽 `Alt+点击` 显示空槽/被动/冷却/法力不足/就绪与充能次数。
- ✅ 新增 `info` command-message tone,与 `reject`/`alert` 分离。
- ✅ `Alt+点击` 不触发学技能、移背包或右键出售,避免查看状态时误操作。
- ⚠️ 这不是联网聊天/队友广播;当前只做本地 UX 反馈。真正 toggle/autocast on/off 仍需 AbilityDef/sim 契约。
- ✅ 总结 `docs/ux/2026-06-19-alt-click-status-broadcast-summary.md`。

**Sub-batch Input/Combat — A-click 反补忠实细则(2026-06-19)**
- ✅ `canDenyTarget(...)` 抽为共享纯规则,主画布 A-click 与 combat 执行同源。
- ✅ 己方小兵低于 50% 生命可反补,保留原规则。
- ✅ 己方建筑/防御塔低于 10% 生命可反补。
- ✅ 己方英雄低于 25% 生命且存在敌方来源 DoT 时可反补;无 DoT 时拒绝。
- ⚠️ 本批不新增建筑/友方英雄反补奖励或经济结算,只收敛操控门控。
- ✅ 总结 `docs/ux/2026-06-19-deny-rules-fidelity-summary.md`。

**Sub-batch HUD/Status — Break 状态芯片(2026-06-19)**
- ✅ `statusChips(...)` 将 `states.broken` 映射为具名 `破` 芯片,不再退化成普通 debuff。
- ✅ HUD 与选中信息卡共用该模型,两处同步获得 Break 可读性。
- ✅ 总结 `docs/ux/2026-06-19-break-status-chip-summary.md`。

**Sub-batch Inspect/HUD — 信息卡施法 / 引导读条(2026-06-19)**
- ✅ `inspectCastProgress(...)` 复用共享 `castBarInfo(...)`,信息卡、2D、3D 的读条进度同源。
- ✅ 选中非受控单位时,左侧信息卡在血蓝条下显示 `施法中` / `引导中`、技能名、剩余秒数与青/金进度条。
- ✅ 新增 `data-inspect-cast-progress="cast|channel"` 供 Opus smoke check。
- ✅ 总结 `docs/ux/2026-06-19-inspect-cast-progress-summary.md`。

**Sub-batch Settings/HUD — 可访问性色盲友好模式(2026-06-19)**
- ✅ `ControlSettings.accessibilityMode` 新增 `standard` / `colorblind`,随既有设置持久化链路保存。
- ✅ 暂停菜单新增 `可访问性` 切换按钮,与 HUD 缩放同属于可访问性入口。
- ✅ `hudAccessibilityPalette(...)` 提供标准与色盲友好 HP/MP/低血暗角配色,HUD 实际消费该 palette。
- ✅ 总结 `docs/ux/2026-06-19-accessibility-mode-summary.md`。

**Sub-batch Input/Multi-unit — 主选可控单位施法 / 用物品(2026-06-19)**
- ✅ `selectedCastSubject(...)` 把 QWER 与物品热键的执行主体从硬编码英雄改为“当前主选可控单位优先,否则英雄回落”。
- ✅ inspect-only 选中敌方/中立单位时仍回落英雄,避免查看信息卡时丢失玩家操控。
- ✅ 移动/攻击/停止/保持的多选路由保持不变;本批只收敛技能/物品主体选择。
- ⚠️ 不新增信使交物、召唤物技能数据或 sim 物品规则,只补输入 UX 路由。
- ✅ 总结 `docs/ux/2026-06-19-selected-cast-subject-summary.md`。

**Sub-batch Courier/HUD — 手动信使送储藏(2026-06-19)**
- ✅ `requestCourierDelivery(world, hero)` 提供玩家请求信使送储藏的最小 sim 接口。
- ✅ 信使被手动移动到有储藏物的己方英雄身边时,也会触发交付,不再只依赖内部自动 `targetId`。
- ✅ Courier HUD 有储藏物且信使可用时主操作显示 `Deliver stash`;低血/返航/送货中仍优先选择/保命语义。
- ✅ 总结 `docs/ux/2026-06-19-manual-courier-delivery-summary.md`。

## 6.9 四大根因簇收敛状态(2026-06-15 末)

| 簇 | 内容 | 状态 |
|---|---|---|
| **A 渲染器奇偶** | 2D 施法条 / 3D 迷雾 / 血条 250-1000 刻度 / 3D 非英雄状态点 / 技能径向冷却扫描 | ✅ **基本完成**(Opus:`2d2bb66`/`5d34132`,均抽共享纯函数双渲染器同源) |
| **B AbilityDef 数据契约** | `aoeRadius`/`lineWidth`/`activeAoeRadius` + `abilityPreviewShape`/`itemPreviewShape` + main 接通 + 26 技能填充 | ✅ **完成**(Opus 铺契约 `e1ef0c9`+填充 `1f2566a`,Codex 接通 `d3f52f4`) |
| **C 多单位选择** | 选择 Set / 框选 / 控制组 / F1-F3 / command card / numberRowMode | ✅ **完成**(Codex Batch 4,Opus 评审 + 集成 `d3f52f4`) |
| **D 沟通(单机贬值)** | 聊天/MIA/队友广播/画线;本地 ping 与槽位状态自检 | ✅ 本地自我信号已做;队友通信正确推迟 |

> 另:旋风打断施法(`5554149`)、Roshan/Boss 计时(`d47df46`)两个 P1 dota1-core 缺口已修。
> 剩余为长尾单项(真正 toggle/autocast on/off、上手门控/Legacy、侧边商店等),多在 input/main 线,按需协调推进。

## 7. 收敛检查

- 否决理由 → ADR?无。本文件为研究 + 审计清单。
- 操作规则 → 指引?无新增强制规则;本文件作为后续 UX 路线图,取代 2026-06-13 审计。
