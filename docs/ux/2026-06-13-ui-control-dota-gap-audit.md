# UI and Control Dota Gap Audit

日期: 2026-06-13
状态: 当前 worktree 审计版,用于后续 UX / 操控完善排期

## 目标

全面梳理当前 UI 和操控相对 Dota-like 体验的完成度、未完成项和优化项。这里的 Dota 对标不是复制 Valve/暴雪素材,而是对齐 MOBA/RTS 玩家预期的操作语义、信息密度、反馈速度和可配置性。

## 审计证据

本次审计基于当前 `~/vibecoding/dota_forever` worktree,不依赖旧会话记忆。

本地证据:

- `docs/source-map.md`: 当前 UI/操控代码归属图。
- `docs/superpowers/specs/2026-06-10-dota1-remake-design.md`: 初始 HUD/操作目标。
- `docs/ux/2026-06-12-*.md`: 过去 UI/操控批次和 Remaining Debt。
- `src/main.ts`: HUD/输入/商店/记分板/小地图/2D-3D 切换装配。
- `src/engine/input.ts`: 右键、A、QWER、1-6、S/H、空格、Tab、F、P、Esc、镜头输入。
- `src/engine/controlSettings.ts`: normal/quick/smart cast、槽位覆盖、边缘平移、镜头速度。
- `src/ui/hud.ts`, `src/ui/menu.ts`, `src/ui/shop.ts`, `src/ui/scoreboard.ts`: 主要 DOM UI。
- `src/render/minimap.ts`: 2D 小地图、迷雾、地标、ping、镜头框。
- `src/render3d/renderer3d.ts`: 3D 渲染器;当前注明 3D V1 不接入小地图。

运行态截图:

- `docs/screenshots/ux-ui-control-audit-menu.png`
- `docs/screenshots/ux-ui-control-audit-play-2d.png`
- `docs/screenshots/ux-ui-control-audit-play-3d.png`

外部对标资料:

- Dota 2 Wiki Controls: https://dota2.fandom.com/wiki/Controls
- Dota 2 Wiki Hotkeys: https://dota2.fandom.com/wiki/Hotkeys
- Esports.gg Dota 2 settings overview: https://esports.gg/news/dota-2/best-dota-2-video-settings/

## Dota 对标维度

Dota 的 UI/操控核心不是单个按钮,而是一套高压战斗下的闭环:

1. 命令可预期: 右键、A、S/H、施法、物品、队列、控制组、镜头都要有稳定语义。
2. 目标可预览: 施法前就知道范围、目标是否合法、为何不合法。
3. 信息可扫描: HUD、血条、buff、冷却、金钱、买活、商店、记分板、小地图不能互相遮挡。
4. 设置可个性化: 快速施法、智能施法、镜头、按键绑定、迷你地图、Alt 信息层要可配。
5. 多单位可控: 召唤物、幻象、信使、守卫、控制组和队列命令是 Dota 操作深度的一部分。
6. 沟通可表达: ping、Alt-click 状态播报、危险信号、物品/技能/买活状态、路线/缺人提示。
7. 观战/复盘可读: 记分板、击杀播报、死亡回放、经济/等级/装备变化要可追踪。

## 已完成能力

### 1. 基础游戏壳

已完成:

- 主菜单有开始对战和观战 AI 对局入口。
- 英雄选择页存在,支持选择/随机英雄。
- `?mode=play`, `?mode=spectate`, `?renderer=3d` 等调试入口可用。

证据:

- `src/ui/menu.ts`
- `docs/screenshots/ux-ui-control-audit-menu.png`

当前不足:

- 主菜单更像 demo 入口,不是 Dota 主界面:缺少设置入口、训练/调试入口、英雄浏览、热键配置、音量/画面选项。
- 英雄选择缺少阵容信息、技能图标/技能详情面板、属性成长、推荐路线、上手难度、搜索/过滤。

### 2. 核心 HUD

已完成:

- 顶栏显示双方击杀、昼夜、时间、金币。
- 底部 HUD 显示英雄头像/等级/技能点、血蓝、属性、攻击、护甲、补反、4 技能、6 物品。
- 技能和物品有热键、冷却、魔法消耗、等级点、被动标记。
- HUD 槽位有 confirm/reject 闪烁反馈。

证据:

- `src/ui/hud.ts`
- `src/main.ts`
- `docs/screenshots/ux-ui-control-audit-play-2d.png`

当前不足:

- 没有 buff/debuff 条、状态抗性/眩晕/沉默等明确状态栏。
- 没有 TP 专属槽、 neutral item、背包、快捷购买条、信使状态、买活状态、团队 glyph/scan。
- 技能/物品仍以文字块为主,缺少 Dota-like 图标语义和图标冷却读数。
- 底部 HUD 宽度和右侧小地图/商店关系未最终定版;2D 截图中商店面板明显遮挡小地图。
- 3D 模式保留 HUD,但画面空间更大,底部 HUD 没有为 3D 视角做专门重排。

### 3. 输入与施法

已完成:

- 右键移动/攻击。
- A 点地攻击移动和低血友方小兵反补。
- QWER 技能、1-6 物品。
- S 停止、H 保持、空格回英雄、Tab 记分板、F 商店、P 暂停、Esc 取消 pending 或暂停。
- normal / quick / smart cast 全局设置。
- ability / item 单槽 cast override。
- Alt + 技能/物品自施。
- pending target 模式、范围/目标预览、错误目标保留 pending。
- wrong team / wrong target type / no mana / cooldown 等拒绝原因文案。

证据:

- `src/engine/input.ts`
- `src/engine/controlSettings.ts`
- `src/engine/commandMode.ts`
- `src/main.ts`
- `tests/controlSettings.test.ts`
- `tests/commandMode.test.ts`
- `tests/selfCast.test.ts`
- `tests/targetFilters.test.ts`

当前不足:

- 没有完整 key rebinding UI;只能切 cast 模式,不能改 QWER/物品键/命令键。
- 没有 double-tap self-cast;只有 Alt self-cast。
- 没有 Shift-queue 操作链,虽然 sim `Unit.orderQueue` 存在,输入层未接入。
- 没有控制组、框选、选中召唤物/幻象/信使、多单位命令。
- 没有 right-click force attack 设置;当前反补被绑定到 A 命令。
- 没有 quick attack / quick move 选项。
- 没有取消/队列/施法缓冲的完整 UI 状态历史,玩家无法看到下一条排队命令。
- 没有选择敌方/友方单位的信息面板;左键现在基本只清 cursor intent。

### 4. 目标过滤与反馈

已完成:

- team filter 和 kind filter 已成为 sim/UI 共用裁决来源。
- pending hover 可预览合法/非法目标。
- 点击错误目标会给出 wrong team / wrong target type / invalid target。
- 命令 cursor badge 能显示 A-MOVE / CAST / ITEM 和 target hint。

证据:

- `src/sim/targeting.ts`
- `src/ui/cursorTargetHint.ts`
- `src/ui/commandCursor.ts`
- `src/ui/uxFeedback.ts`
- `tests/targetTeamCoverage.test.ts`
- `tests/targetKindMetadata.test.ts`
- `tests/cursorTargetHint.test.ts`

当前不足:

- 目标类型还不够细:英雄/小兵/建筑/守卫/幻象/中立/魔免/无敌/可驱散等还没有全部转成玩家可读预览文案。
- 缺少 Dota-like hover 高亮:盟友/敌人/不可选/可攻击对象应有稳定色彩和轮廓。
- 缺少地面施法的 rangefinder、路径/可达性、走近施法意图反馈。
- 拒绝反馈缺少音效层和 HUD 教学层,只靠短文字/脉冲容易被战斗特效淹没。

### 5. 镜头与小地图

已完成:

- 边缘平移、方向键平移、中键拖拽、滚轮缩放、空格回英雄。
- 镜头速度和 edge-pan 可配置。
- 2D 小地图有地形缩略、迷雾、单位点、建筑、符文、野点、商店、Boss、ping、视野框。
- 左键小地图移动镜头,Alt + 点击小地图 ping。

证据:

- `src/render/camera.ts`
- `src/render/minimap.ts`
- `src/engine/input.ts`
- `docs/screenshots/ux-ui-control-audit-play-2d.png`

当前不足:

- 3D 模式当前 `use3d ? null : new MiniMap(...)`,小地图直接缺席。
- 没有小地图右键移动命令,也没有小地图施法/TP 交互。
- 没有小地图防误触延迟、拖拽镜头、英雄图标/Alt 图标模式、左/右侧位置设置、尺寸设置。
- 没有保存镜头位置、双击/按住选择英雄跟随、死亡/复活镜头行为设置。
- 没有 Alt 显示塔攻击范围、野点刷新盒、临时信息层。

### 6. 商店、背包与经济 UI

已完成:

- F 打开商店。
- 分类页签、物品列表、价格、金币、商店范围提示、秘密商店提示。
- 点击购买,失败有 toast。
- 储藏处和取回逻辑存在。
- 物品合成 tooltip 会显示配方与总价。

证据:

- `src/ui/shop.ts`
- `src/sim/items.ts`
- `docs/screenshots/ux-ui-control-audit-play-2d.png`

当前不足:

- 缺少搜索、推荐装、常用装、合成树图形化、购买路径高亮。
- 缺少 quickbuy / sticky item / queued component / buy remaining。
- 缺少信使购买、取回、配送、信使死亡/复活 UI。
- 缺少背包、TP 专属槽、neutral item 槽、物品拖拽换位、拆分堆叠、拆解、锁定合成。
- 商店打开时遮挡小地图,需要 Dota-like 布局策略:商店与小地图/右侧面板互斥、折叠或重排。

### 7. 记分板与观战信息

已完成:

- Tab 记分板显示双方英雄、等级、KDA、补反、金币、装备短名。
- 顶栏显示团队击杀与时间。
- Killfeed 和结算画面已在架构中存在。

证据:

- `src/ui/scoreboard.ts`
- `src/ui/killfeed.ts`
- `src/ui/endscreen.ts`
- `docs/screenshots/ux-ui-control-audit-play-2d.png`

当前不足:

- 记分板没有头像/图标化装备、死亡倒计时、买活状态、净值、等级进度、技能加点、补刀趋势。
- 没有团队建筑状态、肉山/Boss 计时、符文计时、glyph/scan 计时。
- 没有观战控制条、时间轴、暂停/倍速 UI、战争迷雾视角切换 UI。
- 没有死亡回放/death recap 真实内容,当前仅有资源样例分类。

### 8. 多单位、召唤物和信使操控

已完成:

- 玩法层已有召唤物、幻象、守卫、灵熊等实体。
- Resource3D 资源样例已有 `couriers_summons` 分类。

证据:

- `src/data/heroes/batch*.ts`
- `src/sim/abilities.ts`
- `src/render/resource3dAssets.ts`

当前不足:

- 输入层只操控主英雄;没有选择召唤物/幻象/守卫/信使。
- 没有控制组、全选其他单位、全选所有单位、选择信使、信使快捷键。
- 没有多单位 HUD,也没有独立单位面板。
- 没有队列命令和统一命令给多单位。

### 9. 3D 与 UI 一致性

已完成:

- `?renderer=3d` 可运行,HUD 仍可叠加在 3D 场景上。
- 3D 低多边形单位/建筑已经比 2D 圆符号更接近美术目标。

证据:

- `src/render3d/renderer3d.ts`
- `docs/screenshots/ux-ui-control-audit-play-3d.png`

当前不足:

- 3D 模式无小地图。
- 3D 模式截图中地形大面积单色,地形/坡/河/树林语义还不如 2D 小地图清晰。
- 3D 下商店热键截图未稳定打开,需单独验证焦点/输入事件与 canvas/DOM 叠层。
- 2D/3D 的世界选取、目标高亮、血条遮挡、镜头边界需要同一套验收。
- 3D 资源 manifest/预览资源尚未全部接入实际 runtime。

### 10. 音频、教学和可访问性

已完成:

- `AudioDirector` 已接入战斗事件。
- 部分拒绝/命令反馈有文字和视觉脉冲。

当前不足:

- 拒绝原因、技能就绪、被攻击、危险 ping、买活、商店失败等缺少稳定音频语法。
- 没有新手教学 overlay、训练任务、热键提示渐进显示。
- 没有色盲模式、HUD 缩放、字体大小、对比度、简化小地图等可访问设置。
- 中文/英文文案混用,目前 HUD 上存在 `DAY`, `DEAD`, `STAT`, `Quick` 等英文与中文混排;需决定最终语言策略。

## 优先级路线图

### P0: Dota-like 操控闭环

目标:玩家在紧张团战中不会误解命令状态。

1. Shift-queue:
   - 输入层接 `Shift + right/left/hotkey`,写入 `Unit.orderQueue`。
   - UI 显示绿色队列旗/路径点。
   - 测试: `InputManager` 队列命令 + sim orderQueue 消费。
2. 完整 key rebinding:
   - 设置数据扩展为命令级 keymap。
   - 暂停菜单升级为 Controls 面板。
   - 支持导入/重置默认。
3. 双击/Alt 自施统一:
   - 保留 Alt self-cast。
   - 新增 double-tap self-cast 与 Smart Double Tap 设置。
4. Hover 高亮:
   - 盟友/敌人/不可用目标轮廓。
   - 与 target filter reason 同源。
5. 选择信息面板:
   - 左键选择单位。
   - 敌/友单位面板显示血蓝、状态、装备摘要。

建议落点:

- `src/engine/input.ts`
- `src/engine/controlSettings.ts`
- `src/engine/commandMode.ts`
- `src/main.ts`
- `src/ui/hud.ts`
- `src/ui/menu.ts`
- `tests/commandMode.test.ts`
- `tests/controlSettings.test.ts`

### P1: HUD / 商店 / 小地图定版

目标:Dota 的核心信息入口完整、稳定、不遮挡。

1. HUD composition:
   - 确认小地图位置:左下、右下或嵌入 console。
   - 商店打开时不能遮挡小地图和核心战斗区域。
   - 增加 buff/debuff 条、TP 槽、买活状态、状态图标。
2. Shop v2:
   - 搜索框、推荐/常用、quickbuy、合成树图形化。
   - 右键购买/左键查看关系/Shift 添加 quickbuy。
3. Inventory v2:
   - 背包、TP slot、neutral slot、拖拽换位、出售/拆解菜单。
4. Minimap v2:
   - 3D 模式接入小地图。
   - 右键小地图移动/施法/TP,防误触延迟。
   - Alt hero icons、尺寸/位置设置、危险 ping。

建议落点:

- `src/ui/hud.ts`
- `src/ui/shop.ts`
- `src/render/minimap.ts`
- `src/main.ts`
- `src/render3d/renderer3d.ts`
- `src/engine/controlSettings.ts`

### P2: 多单位与信使

目标:召唤物/幻象/信使不只是 sim 内容,而是玩家可控单位。

1. 选择系统:
   - 框选、Shift 添加/移除、选中非主英雄单位。
   - 允许只控制自己单位,敌方单位只显示信息。
2. 控制组:
   - Ctrl + number 绑定,number 选择,双击居中。
   - Select hero / select all controlled / select all others。
3. 信使:
   - 独立信使实体与 UI。
   - 购买、取物、送物、加速、回泉水。

建议落点:

- `src/engine/input.ts`
- `src/sim/unit.ts`
- `src/main.ts`
- `src/ui/hud.ts`
- `src/ui/shop.ts`

### P3: 观战、沟通与教学

目标:游戏可读、可复盘、可学习。

1. 记分板 v2:
   - 净值、死亡时间、买活、装备图标、Boss/Glyph/Scan 计时。
2. Ping / Alt-click:
   - Alt 点击技能/物品/血蓝/时间/买活/小地图/英雄头像播报状态。
   - Ctrl+Alt 危险/撤退 ping。
3. Death recap:
   - 最近伤害来源、控制来源、击杀者、买活提示。
4. Tutorial:
   - 首局热键提示、目标过滤解释、商店/quickbuy 指引。

建议落点:

- `src/ui/scoreboard.ts`
- `src/ui/killfeed.ts`
- `src/ui/endscreen.ts`
- `src/ui/uxFeedback.ts`
- `src/audio/director.ts`

### P4: 视觉 polish 与可访问性

目标:信息密度更像 Dota,但保持原创美术。

1. 图标系统:
   - 技能/物品/状态/目标类型改为稳定图标,文字只做 tooltip。
2. 一致语言:
   - 中文或英文定版;避免 HUD 中英混排。
3. 可访问设置:
   - 色盲队伍色、HUD 缩放、字体大小、小地图简化色、透明度。
4. 3D readability:
   - 地形材质层、河道/坡/树林/高低地、塔范围/野点盒 Alt overlay。

建议落点:

- `src/ui/*`
- `src/render/*`
- `src/render3d/*`
- `src/render/resource3dAssets.ts`

## 建议下一批实现顺序

如果下一步要直接动手,建议不要先做“大而全设置页”。更顺的路线是:

1. P0-A `Shift-queue + 队列 UI`。
   - 原因:sim 已有 `orderQueue`,对 Dota 操控手感提升最大,范围可控。
2. P1-A `HUD/minimap/shop 遮挡重排`。
   - 原因:当前截图已证明商店遮挡小地图,属于立刻可见的体验问题。
3. P1-B `3D 模式小地图恢复`。
   - 原因:3D 是主线视觉方向,没有小地图不符合 MOBA 基础体验。
4. P0-B `完整 key rebinding 数据模型 + Controls 面板`。
   - 原因:当前只有 cast mode,离 Dota 自定义热键差距最大,但应在队列语义稳定后做。
5. P2-A `选择/控制组基础版`。
   - 原因:召唤物/幻象已经很多,不接操控会限制英雄体验。

## 验收建议

每个 UX/操控批次都应至少提供:

- 单元测试:输入状态机、设置归一化、target filter、UI helper。
- Playwright 运行态证据:2D play、3D play、至少一个面板打开态截图。
- 键鼠脚本:验证对应热键不会被 DOM 焦点、canvas、pause menu 冲掉。
- 文档:更新本文件或新增对应 summary,记录完成项和剩余项。

## 实现进度更新 (2026-06-14)

「等 GPT 视觉版 / 持续完善基础机制 + 操控体验」指令下,按本文件路线图推进。已完成项(均 tsc 0 + 3D 实机端到端验证 + 全量 1254 测试绿):

**P0 Dota-like 操控闭环**:
- ✅ #1 Shift-queue:经核查早已完整接入(input.ts 全程传 `queued: e.shiftKey` → issueHeroOrder 在 queued 时走 `hero.queueOrder`;sim queueOrder/advanceOrder;2D drawCommandQueuePath + 3D updateCommandQueue/queueFx 可视化)。本文件原「输入层未接入」结论已过时。
- ✅ #4 Hover 高亮 `9ef1c49`:onPointerMove 用 `sim/pick.pickUnitAt`(受迷雾约束、英雄优先)算悬停单位写 `ux.hoverUnitId`;2D drawUnit + 3D hovRing 画敌红/友绿/中立黄轮廓(右键预期反馈)。
- ✅ #5 选择信息面板 `326cf4f`:左键 `pickUnitAt` 选中最近可见单位(点空地回受控英雄,永不丢失自己);`ux.selectedUnitId` 驱动 2D 绿椭圆 / 3D selRing 选中环 + 左侧 `ui/inspectPanel` 信息卡(名称/类型/等级/血蓝/攻击/护甲/魔抗/移速/攻击距离);开局默认选英雄,目标死亡/进雾自动回退。
- ⏳ #2 完整 key rebinding(较大,待队列语义稳定后)/ #3 double-tap self-cast(较小):未做。

**P1 HUD/商店/小地图定版**:
- ✅ HUD #1 状态条:`render/statusPips.unitStatusPips` 共享纯函数(控制红>敌减益橙>增益绿,去重/控制优先/时长比例),2D drawStatusStrip 改用之 + 3D drawBars 头顶补 buff/debuff 状态点 `64f7002`。
- ✅ 商店遮挡:商店 bottom 120→420,抬到右下角小地图(bottom180+SIZE232=412)之上,杜绝遮挡 `c1adde9`。
- ✅ Minimap #1 3D 接入:此前会话已恢复(main.ts `new MiniMap` 无条件创建,2D/3D 均启用)。本文件原「3D 无小地图」结论已过时。
- ⏳ Shop v2 / Inventory v2 / Minimap 右键命令:未做。

**§10 音频反馈**:
- ✅ 背景乐(此前会话,A 小调氛围 pad)+ 本次指令音/拒绝音 `a8a4020`:AudioDirector.command(移动柔/攻击脆,80ms 限频)/ reject(下行错误声,130ms 限频);issueHeroOrder 播确认音、showReject 播拒绝音。全程序化零样本。

**新增可测纯函数**:`sim/pick.pickUnitAt`(4 测)、`render/statusPips.unitStatusPips`(4 测)、`ui/uxFeedback` 选择/悬停状态(+1 测)。

剩余高价值项(下阶段候选,无 GPT 依赖):P0#3 double-tap self-cast、HUD 玩家英雄 buff/debuff 行(可复用 unitStatusPips)、inspectPanel 状态行、P0#2 key rebinding、P2 多单位/控制组/信使操控。

## 收敛检查

1. 否决理由 -> ADR? 没有。本次是审计清单,没有否决技术方案。
2. 踩坑教训 -> lessons-learned? 有 -> 已追加到 `docs/lessons-learned.md`。
3. 操作规则 -> 指引文件? 没有新增必须遵守规则;本文件作为 UX/操控后续路线图。
