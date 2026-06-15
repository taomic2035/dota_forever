# Next Stage UX Summary

日期: 2026-06-15
范围: Dota1/WC3 核心 UX 总结、下一阶段功能清单、修改项、优化项。

## 总结判断

项目已经从早期毛坯状态进入“核心体验可继续打磨”的阶段。当前最重要的结论是:

- 基础玩法不是主要短板。兵线、英雄、技能、物品、塔、野怪、Boss、视野、经济、买活、AI 对局等系统已经存在。
- 基础 UI/操控也不再是空白。右键、A 点、QWER、物品热键、TP 槽、商店、计分板、小地图、施法模式、Shift 队列、按键配置、状态反馈、3D 可读性都已有实现。
- 真正的 Dota1 差距集中在 RTS 操控外壳是否闭环: 选择多个单位、命令卡、控制组、信使、物品物流、可预期施法、小地图沟通、战斗后复盘。
- 视觉方向可以继续保持当前原创、更现代的风格。下一阶段不应该优先复制旧素材,而应该让交互语义和信息节奏更像 Dota1 / Warcraft III。

换句话说,下一阶段主线仍然是 UI 和操控,不是继续堆英雄、数值或新机制。

## 已完成的核心 UX 基础

### 操控和施法

已具备:

- 右键移动/攻击。
- A 点攻击移动与反补语义。
- QWER 技能、物品热键、TP 热键、S 停止、H 保持、F 商店、G Glyph、P 暂停、Tab 计分板、Esc 取消。
- normal / quick / smart cast。
- 技能和物品单槽施法模式覆盖。
- Alt 自施。
- Shift 队列命令与路线可视化。
- 可配置按键绑定的基础模型和暂停菜单入口。
- pending target、目标合法性、拒绝反馈、命令 cursor、世界脉冲。

仍不足:

- 没有完整 RTS 选择集。
- 没有框选、Shift 加选/减选、控制组。
- 没有多单位命令分发。
- 命令卡还不完整,很多命令只存在于热键。
- 双击自施、右键反补策略、quick attack / quick move 等细节还未完整。

### HUD 和信息反馈

已具备:

- 顶栏显示时间、昼夜、团队击杀、金币、符文/Glyph 信息。
- 底部 HUD 显示英雄、等级、血蓝、属性、技能、物品、TP、背包、状态、低血量反馈。
- 死亡状态、买活、死亡来源、冷却、魔法消耗、技能点反馈。
- inspect panel 可以看非主英雄单位信息。
- 计分板、killfeed、endscreen 架构存在。

仍不足:

- XP 条、状态图标语言、敌方英雄信息摘要还不够完整。
- 计分板缺少净值、买活、装备图标化、目标/建筑/Boss 状态。
- 语言和编码显示需要统一清理。
- HUD 在不同分辨率、2D/3D、商店打开态下仍缺少系统化布局验收。

### 小地图和沟通

已具备:

- 2D/3D 小地图。
- 地形缩略、迷雾、单位、建筑、地标、符文、野点、Boss、视野框。
- 左键跳转镜头、右键移动命令、Alt 点击 ping。

仍不足:

- ping 类型太少。
- 缺少危险/撤退/缺人/路线上报。
- 缺少 Alt-click 状态播报: 血蓝、买活、技能、物品、计时器。
- 缺少小地图防误触、尺寸、位置、英雄图标模式、透明度设置。

### 商店、物品、信使

已具备:

- 商店分类、价格、购买、失败提示、范围校验、秘密商店语义。
- 储藏处、背包、TP 槽、出售、配方文本。
- 买活和部分经济系统。
- 信使系统和测试已存在于底层。

仍不足:

- 信使还不是完整可见、可选、可命令的 UI/操控闭环。
- 缺少 quickbuy、sticky item、搜索、推荐装、合成树图形化。
- 缺少拖拽物品换位、拆解、锁定合成、物品物流可视化。
- 玩家无法一眼判断物品在英雄、背包、储藏处、信使还是配送途中。

### 3D 可读性

已具备:

- 3D 英雄模型、单位模型、资源模型、动作姿态、状态 FX、地形 dressing、命令队列、小地图。
- 多轮真实游玩截图和状态/FX 遮挡预算。

仍不足:

- 3D 真实游玩 QA 还不够系统,需要固定场景截图脚本。
- 地图语义还需强化: 河道、坡道、高低地、树林、阻挡、塔区、野点盒。
- FX、英雄材质、血条、选择环仍需要按战斗噪声预算继续收敛。

## 下一阶段总目标

下一阶段目标不是“再加一堆功能”,而是把现有功能串成 Dota1 式闭环:

1. 选中单位。
2. 看懂单位。
3. 发出命令。
4. 队列命令。
5. 看到命令结果。
6. 买到物品。
7. 通过信使送达。
8. 在战斗中读懂技能、状态和目标。
9. 通过小地图和 HUD 沟通状态。

## 下一阶段功能清单

### P0-A: 选择系统、控制组、命令卡

必须实现:

- `SelectionState`: 当前主选择、选择集、可命令单位集、只查看单位。
- 左键选择单位。
- 左键拖拽框选己方可控单位。
- Shift + 左键添加/移除选择。
- 选择敌方/友方不可控单位时进入 inspect-only 状态。
- Ctrl + 数字绑定控制组。
- 数字键选择控制组,双击数字居中。
- 选择英雄、选择信使、全选可控单位、全选其他单位。
- 命令分发到选择集,不再只发给主英雄。
- 迷你命令卡: 移动、攻击、停止、保持、巡逻/跟随、选择英雄、选择信使、Glyph、商店。
- 命令卡热键显示必须跟随当前 key binding。

需要修改:

- `src/engine/input.ts`: 鼠标拖拽、Shift 选择、控制组热键、选择命令回调。
- `src/main.ts`: 选择状态装配、命令分发边界、主英雄 fallback。
- `src/ui/hud.ts`: 命令卡区域、多单位选择摘要。
- `src/ui/inspectPanel.ts`: inspect-only 与 commandable selection 区分。
- `src/engine/controlSettings.ts`: 控制组/选择类按键配置。
- `src/sim/unit.ts`: 确认单位归属、是否可控、是否可编队。
- `tests/`: selection、control group、command routing、fog pick 覆盖。

优化项:

- 框选矩形需要低干扰,不能遮挡战斗。
- 多单位选择摘要要紧凑,不要挤压技能和物品区域。
- 控制组和物品热键冲突必须给出明确方案: 默认保留当前 1-6 物品,控制组可使用 Ctrl+F1/F2 或提供经典模式切换。

验收:

- 玩家能框选召唤物并 Shift 队列移动。
- 玩家能选择敌方英雄查看状态,但不会误发命令。
- 控制组绑定后可选中、居中、下达攻击移动。
- 2D 和 3D 都能看到选择环、队列线、命令反馈。

### P0-B: 信使和物品物流闭环

必须实现:

- HUD 信使按钮: 状态、选择、配送、返回、加速。
- 信使当前任务: idle / retrieving / delivering / returning / dead。
- 储藏处、背包、信使、英雄物品区统一可视化。
- 购买结果明确显示: 到英雄、到背包、到储藏处、到信使。
- 信使路径/小地图标记。
- 信使死亡/复活/配送失败提示。

需要修改:

- `src/sim/courier.ts`: 暴露任务状态、路径/目标、死亡/复活事件。
- `src/ui/hud.ts`: 信使按钮和物品物流状态。
- `src/ui/shop.ts`: 购买到 quickbuy/stash/courier 的状态提示。
- `src/main.ts`: 信使命令回调、HUD/Shop 装配。
- `src/render/minimap.ts`: 信使图标和配送路径。
- `src/audio/director.ts`: 信使事件提示音。

优化项:

- 信使按钮必须能在战斗中一眼读懂,不要藏在商店深层。
- 配送失败要说明原因: 信使死亡、物品不存在、背包满、距离/状态不允许。
- 默认流程要比真实 Dota 更易懂,但保留 Dota 的物流深度。

验收:

- 玩家购买物品后能看见物品位置。
- 玩家点击配送后能看见信使状态和地图路径。
- 信使死亡会进入冷却/复活状态并提示。

### P0-C: 施法预览模型 V2

必须实现:

- `TargetPreviewModel`: 技能/物品预览的唯一模型。
- 目标形状: unit / point / circle / line / cone / no-target。
- 目标合法性: team、kind、fog、range、mana、cooldown、immune、dead、invulnerable。
- out-of-range 时显示走近施法意图。
- quick/smart/normal cast 使用同一预览模型。
- 2D/3D 共用同一预览数据。

需要修改:

- `src/data/heroes/types.ts`: preview shape metadata。
- `src/data/items.ts`: item active preview metadata。
- `src/sim/targeting.ts`: 拒绝原因 taxonomy。
- `src/ui/uxFeedback.ts`: 当前预览状态扩展。
- `src/render/renderer.ts`: 2D 预览。
- `src/render3d/renderer3d.ts`: 3D 预览。
- `src/engine/commandMode.ts`: pending state metadata。
- `tests/target*.test.ts`, `tests/uxFeedback.test.ts`: 预览覆盖。

优化项:

- 文案不能只写 invalid target,必须解释玩家能修正的原因。
- 走近施法需要避免误导: 如果路径不可达,就不显示会走近。
- AoE/线性/锥形预览颜色要与目标合法性联动。

验收:

- 玩家在施法前能看出范围、形状、目标是否合法。
- 错误目标不会清掉 pending,并给出明确原因。
- 2D 和 3D 截图中预览语义一致。

## P1 功能清单

### P1-A: HUD 信息密度和布局定版

功能:

- XP 条和下一级提示。
- 状态图标体系: 控制、减益、增益、免疫、隐身、沉默、缴械。
- 敌方英雄选中信息: 等级、血蓝、装备摘要、状态。
- HUD scale 设置。
- 1280x720 / 1440x900 / 1920x1080 布局截图验收。

修改:

- `src/ui/hud.ts`
- `src/ui/inspectPanel.ts`
- `src/render/statusChips.ts`
- `src/ui/menu.ts`
- `tests/statusChips.test.ts`

优化:

- 减少文字块,优先图标、色彩、位置记忆。
- 中文/英文统一。
- 商店、计分板、inspect panel 打开时不能遮挡关键 HUD。

### P1-B: 小地图沟通系统

功能:

- 普通 ping、危险 ping、撤退 ping。
- Alt-click HUD 状态广播: HP/MP、技能、物品、买活、Glyph、符文/Boss 时间。
- 小地图防误触设置。
- 小地图大小、位置、透明度、英雄图标模式。
- ping 日志/短消息流。

修改:

- `src/render/minimap.ts`
- `src/ui/uxFeedback.ts`
- `src/ui/hud.ts`
- `src/ui/announce.ts`
- `src/audio/director.ts`
- `src/engine/controlSettings.ts`

优化:

- ping 不能过亮或过吵,需要限频。
- 危险/撤退必须比普通 ping 更明显。
- 小地图点击不能误触商店或 HUD。

### P1-C: Shop v2 和 Quickbuy

功能:

- 搜索。
- 推荐装。
- quickbuy 目标物品。
- buy next / buy all affordable。
- 合成树图形化。
- 组件状态: 已拥有、背包、储藏处、信使、缺少、可购买。

修改:

- `src/ui/shop.ts`
- `src/data/items.ts`
- `src/sim/items.ts`
- `src/ui/hud.ts`
- `tests/items*.test.ts`
- `tests/itemHardening.test.ts`

优化:

- 商店应该支持键盘搜索和鼠标快速购买。
- 玩家打开商店时仍能看见小地图和英雄状态。
- recipe 不能只靠 tooltip 文本。

## P2 功能清单

### P2-A: 计分板、死亡回放、观战控制

功能:

- 计分板装备图标、净值、买活、死亡时间、等级进度。
- 团队目标行: 塔、Boss、Glyph、符文。
- death recap: 最近伤害、控制来源、击杀者、助攻来源、买活提示。
- 观战控制: 倍速、暂停、视角、跟随英雄。

修改:

- `src/ui/scoreboard.ts`
- `src/ui/killfeed.ts`
- `src/ui/endscreen.ts`
- `src/sim/world.ts`
- `src/sim/combat.ts`

### P2-B: 教学和可访问性

功能:

- `?mode=tutorial`。
- 首局热键提示。
- 拒绝原因历史。
- F1 / ? 控制说明 overlay。
- 色盲队伍色、字体大小、HUD scale、小地图简化色。

修改:

- `src/ui/onboarding.ts`
- `src/ui/menu.ts`
- `src/ui/uxFeedback.ts`
- `src/engine/controlSettings.ts`

## P3 优化清单

### 3D 真实游玩 QA

功能:

- 固定截图路线: lane、river、base、pit、shop、teamfight。
- 自动检查: canvas 非空、HUD 可见、小地图可见、英雄尺寸、血条重叠、FX 亮度预算。
- 3D 地图语义 overlay: 高低地、坡、树墙、阻挡、塔范围、野点盒。

修改:

- `scripts/shot.mjs`
- `src/render3d/renderer3d.ts`
- `src/render3d/terrain3d.ts`
- `src/render3d/fx3d.ts`
- `tests/render3d/*`

### 音频反馈体系

功能:

- `AudioEventKind`: command、reject、combat、alert、shop、courier、death、buyback、ping。
- 音频优先级和限频。
- UI / command / combat / alert / ambience 音量分类。

修改:

- `src/audio/director.ts`
- `src/ui/menu.ts`
- `src/engine/controlSettings.ts`
- `tests/audio*.test.ts`

## 不应优先做的事

- 不要先继续堆新英雄。当前更缺的是控制这些单位和读懂状态。
- 不要先追求完全替换美术资产。当前原创风格可用,交互闭环更重要。
- 不要先做大而全设置页。设置要跟随具体闭环落地,否则会变成空壳。
- 不要把 Dota2 当作主目标。Dota2 可参考现代选项,但 Dota1/WC3 的 RTS 操作模型才是核心。

## 下一阶段推荐执行顺序

1. `P0-A 选择系统、控制组、命令卡`
2. `P0-B 信使和物品物流闭环`
3. `P0-C 施法预览模型 V2`
4. `P1-A HUD 信息密度和布局定版`
5. `P1-B 小地图沟通系统`
6. `P1-C Shop v2 和 Quickbuy`
7. `P2-A 计分板、死亡回放、观战控制`
8. `P2-B 教学和可访问性`
9. `P3 3D 真实游玩 QA 和音频体系`

## 每个阶段的交付标准

每个阶段必须交付:

- 至少一个设计/总结文档。
- 至少一组单元测试。
- 2D 和 3D 都可运行,除非该功能明确只属于 UI 面板。
- 至少一张运行态截图或脚本化 smoke 证据。
- `npm test` 或聚焦测试。
- `npm run build`。
- 对 `docs/ux/README.md` 或本文件的更新。

## 下一步建议

直接进入 `P0-A 选择系统、控制组、命令卡`。这是最能补齐 Dota1 原生体验的阶段,也是后续信使、召唤物、幻象、队列命令、商店物流的基础。
