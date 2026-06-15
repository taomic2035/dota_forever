# UX Consolidated Roadmap

日期: 2026-06-15
范围: Dota1/WC3 核心 UX 复盘、当前偏离检查、下一阶段功能清单、修改项、优化项。

## 结论

当前主线没有偏离。项目最需要继续补的是 UI 和操控闭环,不是继续堆英雄、数值、美术或外围系统。

已经完成的部分说明项目不再是毛坯状态: 右键命令、A 点、QWER、物品热键、TP、商店、背包、储藏、买活、小地图、计分板、施法模式、Shift 队列、按键配置、命令反馈、2D/3D 可读性都已经有基础。真正仍然不像 Dota1 的地方,集中在 Warcraft III 式 RTS 操控外壳还没有完全闭环。

后续应统一按这个目标推进:

1. 能选中正确单位。
2. 能看懂当前选中对象。
3. 能向可控单位发命令。
4. 能用 Shift 队列和控制组做连续操作。
5. 能从 HUD/命令卡预测下一个点击会发生什么。
6. 能在小地图和战斗画面读懂命令结果。
7. 能把商店、背包、储藏处和信使串成物品物流闭环。

## 当前阶段复盘

### 已具备的 UX 基础

- 输入: 右键移动/攻击、A 点攻击移动、S 停止、H 保持、QWER 技能、1-6 物品、TP、商店、Glyph、暂停、Esc 取消。
- 施法: normal / quick / smart cast、单槽覆盖、Alt 自施、pending target、拒绝原因、目标合法性反馈。
- 命令反馈: 光标意图、世界脉冲、Shift 队列路线、HUD slot flash、拒绝消息。
- HUD: 顶栏、底部英雄面板、血蓝、技能、物品、背包、TP、状态、低血量反馈、死亡/买活入口。
- 小地图: 2D/3D 小地图、迷雾、单位/建筑/地标、镜头跳转、右键移动、ping。
- 商店/物品: 分类购买、价格、储藏处、背包、出售、配方文本、秘密商店语义。
- 3D: 英雄/单位/资源模型、动作姿态、状态 FX、地形 dressing、命令队列、3D 小地图。

### 最大缺口

Dota1 的核心不是只有英雄可控,而是英雄优先的 RTS 控制面。当前项目仍存在这些关键断点:

- 选择状态仍在向完整 selection set 过渡,历史上以单个 `selectedUnitId` 为主。
- 框选、Shift 加选/减选、控制组、双击居中还没有完整接入输入层。
- 命令分发仍需要从“主英雄优先”升级到“可控选择集优先,主英雄 fallback”。
- 命令卡不完整,很多命令只有热键,缺少可视按钮和当前绑定显示。
- 信使、召唤物、幻象、受控单位还没有形成可选、可命令、可反馈的完整闭环。

### 当前已开始落地的 P0-A 工作

已完成或已进入代码的部分:

- 新增 `src/engine/selection.ts`: 纯选择状态模型、可命令判断、控制组槽位、inspect-only 选择。
- 新增 `tests/selection.test.ts`: 覆盖自方英雄、敌方 inspect-only、召唤物加选/减选、控制组绑定和恢复。
- 扩展 `src/engine/controlSettings.ts`: 增加 `selectHero`、`selectCourier`、`selectAllControlled` 默认绑定。
- 新增 `tests/controlKeyBinds.test.ts`: 保护 1-6 物品热键不被选择类热键覆盖。
- 扩展 `src/sim/pick.ts`: 新增矩形世界选取 `pickUnitsInWorldRect`。
- 扩展 `tests/pick.test.ts`: 覆盖框选排序,可控单位优先。
- 新增 `src/engine/selectionCommandRouting.ts`: 多单位命令分发 helper,支持 commandable selection 优先和英雄 fallback。
- 新增 `tests/selectionCommandRouting.test.ts`: 覆盖多单位分发、Shift 队列、inspect-only fallback、丢失单位过滤。
- 扩展 `src/ui/uxFeedback.ts`: 增加 `selectedUnitIds`、`commandableSelectedIds`、`inspectUnitId` 和 `setSelectionSnapshot()`。
- 扩展 `tests/uxFeedback.test.ts`: 覆盖完整 selection snapshot 同步。
- 扩展 `src/engine/input.ts`: F1/F2/F3 选择回调、Shift 左键 additive、左键拖拽框选分流。
- 新增 `tests/inputSelectionHotkeys.test.ts`: 覆盖 F1/F2/F3、Shift 左键、拖拽框选。
- 更新 `src/main.ts`: 使用 `SelectionState` 作为选择事实来源,移动/攻击/攻击移动/停止/保持分发到可控选择集。
- 新增 `src/render/selectionVisual.ts`: 统一主选和多选成员视觉状态判断。
- 更新 `src/render/renderer.ts`: Canvas2D 主选强环、多选弱环。
- 新增 `src/ui/commandCard.ts`: 命令卡按钮数据和多单位选择摘要数据。
- 更新 `src/ui/hud.ts`: 底部 HUD 显示 3x3 命令卡和多选摘要,热键跟随当前 `ControlSettings`。
- 新增 `src/render/selectionBox.ts`: 框选矩形规范化。
- 扩展 `src/ui/uxFeedback.ts` 与 `src/render/renderer.ts`: 左键拖拽时显示 Canvas2D 框选矩形。
- 新增 `tests/commandCard.test.ts` 与 `tests/selectionBox.test.ts`: 覆盖命令卡热键、多选摘要和框选矩形。
- 新增 `src/render3d/selection3d.ts`: 3D 主选/多选 marker ID helper。
- 扩展 `src/render3d/renderer3d.ts`: 3D 主选强环保留,其他可命令选中单位显示弱绿色 secondary ring。
- 新增 `tests/render3d/selection3d.test.ts`: 覆盖 primary/secondary marker、inspect-only、legacy fallback。
- 扩展 `src/engine/controlSettings.ts`: 增加 `numberRowMode` 设置,默认保留 `items`,可切换为 `controlGroups`。
- 扩展 `src/engine/input.ts`: `Ctrl+1..6` 绑定控制组;当 `numberRowMode='controlGroups'` 时 `1..6` 选择控制组,二次按键请求居中。
- 扩展 `src/main.ts`: 控制组绑定/选择接入 `SelectionState`,组内死亡/丢失单位会被过滤,二次选择居中到 primary。
- 扩展 `src/ui/menu.ts`: 暂停菜单增加“数字行 物品/控制组”切换按钮。

尚未完成的部分:

- `src/ui/inspectPanel.ts` 还需要更明确区分 inspect-only 与 commandable selection。
- 命令卡按钮已可见,但点击动作还需要接入。

## 统一优先级

前面文档中有两类 P0: 一类是 UI/操控闭环,一类是 2D/3D 渲染器奇偶性。结合用户当前目标,统一优先级如下。

### P0-A: 选择系统、控制组、命令卡

这是下一阶段最高优先级,因为它直接决定项目像不像 Dota1/WC3。

功能:

- 左键单选。
- 框选己方可控单位。
- Shift 左键加选/减选。
- 选择敌方/不可控友军时进入 inspect-only。
- Ctrl + 数字绑定控制组。
- 数字或可配置组合键选择控制组。
- 双击控制组居中。
- F1 选择英雄、F2 选择信使、F3 全选可控单位。
- 多单位命令分发: move、attack、attack-move、stop、hold、queued move。
- 命令卡显示: Move、Attack、Stop、Hold、Follow/Patrol、Select Hero、Select Courier、Shop、Glyph。
- 命令卡热键显示跟随当前 key binding。

修改项:

- `src/engine/input.ts`: 鼠标拖拽阈值、选择回调、Shift/Ctrl 修饰键、控制组热键。
- `src/main.ts`: 持有 `SelectionState`,统一同步到 `UxFeedback`,命令分发给 commandable selection。
- `src/ui/uxFeedback.ts`: 增加 `selectedUnitIds`、`commandableSelectedIds`、`inspectUnitId`、selection snapshot。
- `src/ui/hud.ts`: 增加命令卡和多单位选择摘要。
- `src/ui/inspectPanel.ts`: 区分 inspect-only 与可命令选择。
- `src/render/renderer.ts`: 2D 框选矩形、多单位选择环、主选高亮。
- `src/render3d/renderer3d.ts`: 3D 多单位选择 marker 和主选 marker。
- `tests/uxFeedback.test.ts`, `tests/queuedOrders.test.ts`, `tests/commandMode.test.ts`: 增加命令分发和选择状态测试。

优化项:

- 暂不默认抢占 1-6 物品键。先保留 1-6 物品,控制组选择使用可配置方案,后续增加 classic number-row mode。
- 框选矩形要轻,不能遮挡战斗。
- 多单位摘要要紧凑,不能挤压技能和物品槽。
- inspect-only 选择不能误发命令;玩家选敌方英雄时右键仍应 fallback 到自方英雄或明确进入命令状态。

验收:

- 能框选英雄 + 召唤物并一起移动。
- 能 Shift 移除已选单位。
- 能选择敌方英雄查看信息,但不会命令敌方。
- 控制组能绑定、恢复、过滤死亡/丢失单位。
- 2D/3D 都能看到多选反馈。

### P0-B: 信使和物品物流闭环

功能:

- HUD 信使按钮: 状态、选择、配送、返回、加速。
- 信使状态: idle / retrieving / delivering / returning / dead。
- 商店购买结果显示物品去向: 英雄、背包、储藏处、信使。
- 储藏处/背包/信使/英雄物品统一可视化。
- 信使路径和小地图标记。
- 配送失败原因提示。

修改项:

- `src/sim/courier.ts`: 暴露任务状态、目标、路径、死亡/复活事件。
- `src/ui/hud.ts`: 信使按钮、物流 lane、配送状态。
- `src/ui/shop.ts`: 购买结果、quickbuy/stash/courier 去向提示。
- `src/main.ts`: 信使命令回调和 HUD/Shop 装配。
- `src/render/minimap.ts`: 信使图标与配送路径。
- `src/audio/director.ts`: 信使死亡、配送、失败音频。

优化项:

- 信使不应只藏在商店里,战斗时也要一眼可读。
- 配送失败必须说明原因,不能只显示 failed。
- 默认流程可比 Dota1 更易懂,但手动驾驶/死亡风险要保留。

### P0-C: 施法预览模型 V2

功能:

- 统一 `TargetPreviewModel`。
- 支持 unit、point、circle、line、cone、no-target。
- 统一拒绝原因: team、kind、fog、range、mana、cooldown、immune、dead、invulnerable、path。
- out-of-range 显示走近施法意图。
- quick/smart/normal cast 共用一套预览和拒绝逻辑。
- 2D/3D 共用同一份预览数据。

修改项:

- `src/data/heroes/types.ts`: 增加 preview shape metadata。
- `src/data/items.ts`: active item preview metadata。
- `src/sim/targeting.ts`: 拒绝原因 taxonomy。
- `src/ui/uxFeedback.ts`: 当前预览状态扩展。
- `src/render/renderer.ts`: 2D 预览渲染。
- `src/render3d/renderer3d.ts`: 3D 预览渲染。
- `src/engine/commandMode.ts`: pending state metadata。

优化项:

- 不再只说 invalid target,而要告诉玩家如何修正。
- 路径不可达时不能显示“会走近施法”。
- AoE/线/锥形颜色与合法性联动。

### P0-D: 渲染器奇偶性补洞

这个阶段不是纯视觉,而是让 UI 反馈在 2D/3D 一致。

功能:

- 2D 施法/引导进度条与 3D 对齐。
- 3D 地面战争迷雾与 2D 对齐。
- 2D/3D 血条刻度、状态点、选择环规则一致。

修改项:

- `src/render/castBar.ts`
- `src/render/statusPips.ts`
- `src/render/fog.ts`
- `src/render/renderer.ts`
- `src/render3d/renderer3d.ts`
- `src/render3d/terrain3d.ts`

优化项:

- 共享纯 helper,不要两个渲染器各写一套判断。
- 任何渲染器独有反馈都要进入奇偶性清单。

## P1 功能清单

### HUD 信息密度和布局定版

- XP 条和下一级提示。
- 状态图标体系: 控制、减益、增益、免疫、隐身、沉默、缴械。
- 敌方英雄信息摘要: 等级、血蓝、装备、状态。
- HUD scale。
- 1280x720、1440x900、1920x1080 截图验收。
- 商店/计分板/inspect panel 打开时不遮挡关键 HUD。

### 小地图沟通系统

- 普通 ping、危险 ping、撤退 ping。
- ping 音效和限频。
- Alt-click 广播 HP/MP、技能、物品、买活、Glyph、Boss/符文计时。
- 小地图防误触、尺寸、位置、透明度、英雄图标模式。
- ping 日志或短消息流。

### Shop v2 和 Quickbuy

- 搜索。
- 推荐装。
- quickbuy 目标物品。
- buy next / buy all affordable。
- 合成树图形化。
- 组件状态: 已拥有、背包、储藏处、信使、缺少、可购买。
- 拖拽物品换位、移动到背包/储藏处/信使、出售范围反馈。

### 自动攻击和经典模式设置

- 自动攻击 Never / Standard / Always。
- number row mode: items / controlGroups。
- Legacy hotkey preset。
- 改键冲突提示和测试覆盖。

## P2 功能清单

- 计分板: 净值、装备图标、买活、复活时间、等级进度、团队目标行。
- Death recap: 最近伤害、控制来源、击杀者、助攻来源、买活提示。
- 观战控制: 倍速、暂停、视角、跟随英雄。
- 教学模式 `?mode=tutorial`。
- 首局热键提示和命令失败历史。
- 可访问性: 色盲队伍色、字体大小、HUD scale、小地图简化色。
- 3D 真实游玩 QA: lane、river、base、pit、shop、teamfight 固定截图路线。
- 音频反馈合同: command、reject、combat、alert、shop、courier、death、buyback、ping。

## 暂不优先

- 不继续优先堆新英雄。
- 不优先全量替换美术资产。
- 不优先做大而全设置页。
- 不把 Dota2 当主目标。Dota2 可以借鉴现代设置,但 Dota1/WC3 的 RTS 操控模型是主目标。
- 不优先做聊天/MIA/轮盘等多人沟通系统,除非 AI 队友或多人模式开始消费这些信号。

## 下一步执行顺序

1. 补 inspect panel 的 inspect-only 与 commandable selection 文案/布局区分。
2. 接入命令卡按钮点击动作。
3. 更新 P0-A summary 并补截图/smoke 记录。
4. 聚焦验证: `selection`, `pick`, `uxFeedback`, `inputSelectionHotkeys`, `selectionCommandRouting`, `selectionVisual`, `selectionBox`, `selection3d`, `commandCard`, `controlSettings`, `queuedOrders`, `commandMode`。
5. 进入信使/物品物流闭环。

## 阶段交付标准

每个 UX 阶段都必须交付:

- 设计或总结文档。
- 聚焦单元测试。
- 2D/3D 行为一致性检查。
- 至少一张运行态截图或脚本化 smoke 证据。
- `npm test` 或明确列出的聚焦测试。
- `npm run build`。
- 更新 `docs/ux/README.md`。
