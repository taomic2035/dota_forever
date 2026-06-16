# UX Master Recap And Next Stage Plan

日期: 2026-06-15
范围: Dota1/WC3 核心 UX 主线复盘、差距收敛、下一阶段功能/修改/优化项。

## 结论

没有偏离主线。当前最该继续投入的仍然是 UI 和操控闭环,不是继续堆英雄、数值、剧情、美术资产或外围系统。

项目已经不再是早期毛坯状态: 右键命令、A 点、QWER、物品热键、TP、商店、背包、储藏处、买活、小地图、计分板、施法模式、Shift 队列、按键配置、命令反馈、2D/3D 可读性都已经有基础。真正还不像 Dota1 的地方,集中在 Warcraft III 式 RTS 控制外壳还没有完全闭环。

下一阶段必须围绕一条主线推进:

1. 选中正确单位。
2. 看懂当前选中对象。
3. 向可控单位发出命令。
4. 用 Shift 队列和控制组做连续操作。
5. 从 HUD/命令卡预测下一次点击会发生什么。
6. 在战斗画面、小地图、音效和 HUD 里读懂命令结果。
7. 把商店、背包、储藏处和信使串成完整物品物流。

## 真实 Dota1 UX 原则

Dota1 本质上是 Warcraft III 自定义地图,所以核心 UX 不是 Dota2 风格的现代独立客户端,而是 Warcraft III RTS 交互语法:

- 左键选择单位或 UI 按钮。
- 右键发出上下文命令: 移动、攻击、跟随、交互、商店相关目标。
- 命令卡是可见操作面,攻击、移动、停止、保持、巡逻/跟随、技能都应有清晰按钮和热键。
- Shift 代表队列命令。
- 多单位选择、框选、控制组是操控上限的一部分。
- 英雄是主角,但信使、召唤物、幻象、守卫、被控制单位也必须能被选择、理解、命令或 inspect。
- 小地图不只是显示器,也是镜头、移动、施法、TP、ping 和态势沟通入口。

当前项目可以保持更现代、更原创的视觉风格。需要复刻的是控制语义、信息节奏和战斗可读性,不是复制旧素材。

## 当前已完成的核心 UX

### 输入与施法

- 右键移动/攻击。
- A 点攻击移动。
- S 停止、H 保持。
- QWER 技能、1-6 物品、TP、商店、Glyph、暂停、Esc 取消。
- normal / quick / smart cast。
- 单槽施法模式覆盖。
- Alt 自施。
- pending target、目标合法性、拒绝原因、命令 cursor、世界脉冲。
- Shift 队列命令和路线可视化。
- 可配置按键绑定的基础模型。

### HUD 与反馈

- 顶栏时间、昼夜、团队击杀、金币、符文/Glyph 信息。
- 底部英雄面板: 等级、血蓝、属性、技能、物品、TP、背包、状态。
- 低血量反馈、死亡/买活入口、部分死亡来源信息。
- inspect panel 可展示非主英雄单位信息。
- 计分板、killfeed、endscreen 框架存在。
- 新增 3x3 命令卡和多单位选择摘要。

### 小地图

- 2D/3D 小地图。
- 地形缩略、迷雾、单位、建筑、地标、符文、野点、Boss、视野框。
- 左键跳转镜头、右键移动命令、Alt ping。

### 商店和物品

- 商店分类、价格、购买失败提示、范围校验、秘密商店语义。
- 储藏处、背包、TP 槽、出售、配方文本。
- 信使底层系统和测试存在。

### 3D 可读性

- 3D 英雄、单位、资源、地形 dressing、动作姿态、状态 FX、命令队列、小地图。
- 多轮模型质量、资源运行时桥接、VFX 分层、FX 遮挡预算、战斗可读性文档已经存在。

## 当前 P0-A 已落地内容

这部分是这轮最重要的 UI/操控推进,已经进入代码:

- `src/engine/selection.ts`: 选择状态模型、可命令判断、控制组槽位、inspect-only 选择。
- `src/engine/selectionCommandRouting.ts`: 多单位命令分发,优先 commandable selection,无可命令选择时 fallback 到英雄。
- `src/sim/pick.ts`: 框选世界矩形拾取。
- `src/engine/input.ts`: F1/F2/F3 选择入口、Shift 左键加选/减选、左键拖拽框选分流。
- `src/ui/uxFeedback.ts`: selection snapshot、inspectUnitId、commandableSelectedIds、selectionBox。
- `src/render/selectionVisual.ts`: 主选与多选成员视觉状态 helper。
- `src/render/selectionBox.ts`: 框选矩形规范化。
- `src/render/renderer.ts`: 2D 主选强环、多选弱环、拖拽框选矩形。
- `src/render3d/selection3d.ts`: 3D 主选/多选 marker ID helper。
- `src/render3d/renderer3d.ts`: 3D 主选强环和其他可命令选中单位弱绿色 secondary ring。
- `src/engine/controlSettings.ts`: `numberRowMode` 默认 `items`,可切换 `controlGroups`。
- `src/engine/input.ts`: `Ctrl+1..6` 绑定控制组,classic 控制组模式下 `1..6` 选择控制组并支持二次居中。
- `src/main.ts`: 控制组绑定/选择接入 `SelectionState`,死亡/丢失单位过滤后再恢复选择。
- `src/ui/menu.ts`: 暂停菜单新增“数字行 物品/控制组”切换。
- `src/ui/commandCard.ts`: 命令卡按钮数据、多单位选择摘要数据。
- `src/ui/hud.ts`: 3x3 命令卡、多选摘要、热键跟随当前 `ControlSettings`,并将按钮点击接入命令路径。
- `src/engine/commandMode.ts` / `src/engine/input.ts`: 命令卡 Move 进入 forced move pending,Attack 进入 attack-move pending,Stop/Hold/Hero/Courier/All/Glyph/Shop 复用热键回调。
- `src/ui/inspectPanelModel.ts` / `src/ui/inspectPanel.ts`: inspect 面板新增 `COMMANDABLE` / `VIEW ONLY` 状态条,明确当前单位是否吃命令。
- 覆盖测试: `selection`, `selectionCommandRouting`, `inputSelectionHotkeys`, `commandMode`, `pick`, `uxFeedback`, `selectionVisual`, `selectionBox`, `selection3d`, `commandCard`, `inspectPanelModel`, `controlKeyBinds`。

这说明 P0-A 已经完成了约 95%。剩余是 P0-A summary 截图/smoke 收口。

## 当前已完成的预览契约接入

反馈文件 `2026-06-15-opus-to-codex-handoff-next.md` 的 AoE/线形真实预览已接入第一版:

- `src/engine/abilityPreviewShape.ts`: 统一输出 ability/item 的 `unit`、`point`、`area`、`line` 预览形状。
- `src/main.ts`: `previewCast`/`previewItem` 不再硬编码 `220/180`,改为消费真实预览几何。
- `src/data/heroes/types.ts`: `TargetMode` 纳入 `'line'`,技能可明确声明线形点目标。
- `src/data/items.ts`: active 侧新增 `activeAoeRadius?: number`。
- 行为决策: 未声明真实 AoE 的点目标只显示点标记,不显示假的大圈。
- 覆盖测试: `tests/abilityPreviewShape.test.ts`。

## 主要差距

### P0 缺口

1. P0-A summary 和固定 smoke 截图还未收口。
2. 命令卡已经可见,但按钮点击动作还需要接入。
3. 信使仍未形成可见、可选、可命令、可配送、可失败解释的完整闭环。
4. 施法预览 V1 已接入真实 area/line/point/unit 几何;V2 仍缺 cone/vector、走近施法、不可达路径、fog/immune/dead 等更完整状态表达。

### P1 缺口

1. XP 条、状态图标体系、敌方英雄摘要和 HUD scale 需要定版。
2. 小地图 ping 类型太少,缺危险/撤退/状态广播/防误触。
3. Shop 缺搜索、quickbuy、推荐装、图形化合成树、组件状态。
4. 计分板缺净值、装备图标、买活、复活时间、团队目标摘要。
5. Death recap 还不能完整解释伤害和控制来源。
6. UI 文案和编码显示需要统一清理。

### P2 缺口

1. 教学模式和首局提示。
2. 拒绝原因历史。
3. 观战控制。
4. 可访问性: 色盲队伍色、字体大小、HUD scale、小地图简化色。
5. 音频反馈合同和音量分类。
6. 3D 真实游玩截图 QA 脚本。

## 下一阶段执行清单

### Slice 1: 完成选择、控制组和命令卡

目标: 完成 Dota1/WC3 RTS 控制外壳的第一闭环。

功能:

- 3D 多选 marker: 主选强 marker,其他可命令选中单位弱 marker。已完成。
- 控制组绑定: Ctrl + 组键绑定当前 commandable selection。已完成。
- 控制组选择: 组键恢复选择,过滤死亡/丢失单位。已完成。
- 控制组双击/二次触发居中。已完成。
- number row mode: 默认 `items`,后续可切 `controlGroups`。已完成。
- 命令卡按钮点击: Move、Attack、Stop、Hold、Hero、Courier、All、Glyph、Shop。已完成。
- inspect panel 明确显示“只查看/不可命令”状态。

修改项:

- `src/render3d/renderer3d.ts`: 增加多选 marker 池或共享 marker helper。
- `src/render3d/selection3d.ts`: 增加纯 helper,测试 primary/secondary 选中 ID。
- `src/engine/controlSettings.ts`: 增加 `numberRowMode` 和控制组相关 action。
- `src/engine/input.ts`: 接入控制组 bind/select、双击组键居中。
- `src/main.ts`: 组绑定、组选择、镜头居中、命令卡点击回调。
- `src/ui/hud.ts`: 命令卡按钮从静态可见升级为可点击命令入口。
- `src/ui/inspectPanel.ts`: 区分 inspect-only 与 commandable selection。已完成。

优化项:

- 保留 1-6 物品热键为默认,避免破坏当前肌肉记忆。
- 控制组 first pass 可使用 Ctrl+F5/F6 或可配置组键,再加 classic number row mode。
- 框选矩形和多选 marker 必须轻,不能遮挡团战单位身份。
- 多选摘要不能挤压技能/物品区。

验收:

- 框选英雄 + 召唤物后可以一起移动。
- Shift 左键可以加选/移除。
- 选择敌方英雄只查看,不会误发命令。
- 控制组可绑定、恢复、过滤死亡单位。
- 2D 和 3D 都能看到主选/多选反馈。
- 命令卡按钮和热键都能触发同一套命令。

### Slice 2: 信使和物品物流闭环

目标: 把商店、背包、储藏处、信使和英雄物品串成 Dota 式物流。

功能:

- HUD 信使按钮: 选择、配送、返回、加速、死亡/复活状态。
- 信使状态: idle / retrieving / delivering / returning / dead。
- 商店购买结果显示物品去向: 英雄、背包、储藏处、信使。
- 储藏处/背包/信使/英雄物品 lane。
- 信使路径和小地图标记。
- 配送失败原因: 信使死亡、背包满、物品不存在、目标不可达、状态不允许。

修改项:

- `src/sim/courier.ts`: 暴露任务状态、目标、路径、死亡/复活事件。
- `src/ui/hud.ts`: 信使按钮、物流状态、配送反馈。
- `src/ui/shop.ts`: 购买结果、quickbuy/stash/courier 去向。
- `src/main.ts`: 信使命令回调和 UI 装配。
- `src/render/minimap.ts`: 信使图标和配送路径。
- `src/audio/director.ts`: 信使事件音频。

优化项:

- 信使信息必须战斗中一眼可读,不能只藏在商店里。
- 默认流程可以比原版更易懂,但保留手动驾驶和死亡风险。
- 所有失败都要给可修正原因。

验收:

- 购买物品后能明确看到物品在哪里。
- 点击配送后能看到信使状态、路径和小地图标记。
- 信使死亡会进入 cooldown/复活状态并提示。

### Slice 3: 施法预览模型 V2

目标: 让技能/物品在施放前就能被准确预判。

功能:

- 统一 `TargetPreviewModel`。
- 支持 unit、point、circle、line、cone、no-target。
- 支持 range、walk-to-cast、path invalid、fog、team、kind、mana、cooldown、immune、dead、invulnerable。
- normal / quick / smart cast 共用同一套合法性和预览模型。
- 2D/3D 共用同一份预览数据。

修改项:

- `src/data/heroes/types.ts`: 增加 preview shape metadata。
- `src/data/items.ts`: active item preview metadata。
- `src/sim/targeting.ts`: 拒绝原因 taxonomy。
- `src/ui/uxFeedback.ts`: 当前目标预览状态。
- `src/render/renderer.ts`: 2D 预览。
- `src/render3d/renderer3d.ts`: 3D 预览。
- `src/engine/commandMode.ts`: pending state metadata。

优化项:

- 不再只显示 invalid target,要说玩家能怎么修正。
- 不可达路径不能误显示“会走近施法”。
- AoE/线/锥形预览颜色与合法性联动。

验收:

- 合法目标、错误队伍、超距离、不可达、魔免、无蓝、冷却中都有明确反馈。
- 2D/3D 截图里的预览语义一致。

### Slice 4: HUD 和小地图沟通

目标: 提高战斗中信息密度和可扫描性。

功能:

- XP 条和下一级提示。
- 状态图标体系: 控制、减益、增益、免疫、隐身、沉默、缴械。
- 敌方英雄摘要: 等级、血蓝、装备、状态。
- 普通/危险/撤退 ping。
- Alt-click 广播 HP/MP、技能、物品、买活、Glyph、符文/Boss 计时。
- 小地图防误触、尺寸、位置、透明度、英雄图标模式。

修改项:

- `src/ui/hud.ts`
- `src/ui/inspectPanel.ts`
- `src/render/minimap.ts`
- `src/ui/uxFeedback.ts`
- `src/audio/director.ts`
- `src/engine/controlSettings.ts`

优化项:

- 尽量减少文字块,优先图标、颜色、位置记忆。
- 小地图点击不能误触商店或 HUD。
- ping 需要限频,危险/撤退必须比普通 ping 更清晰。

验收:

- 1280x720、1440x900、1920x1080 下关键 HUD 不互相遮挡。
- ping 类型、音效、地图显示和短消息一致。

### Slice 5: Shop v2 和 Quickbuy

目标: 让买装备变成高压战斗中的快速规划工具。

功能:

- 搜索。
- 推荐装。
- quickbuy 目标物品。
- buy next / buy all affordable。
- 图形化合成树。
- 组件状态: 已拥有、背包、储藏处、信使、缺少、可购买。
- 拖拽物品换位、移动到背包/储藏处/信使、出售范围反馈。

修改项:

- `src/ui/shop.ts`
- `src/data/items.ts`
- `src/sim/items.ts`
- `src/ui/hud.ts`
- `tests/items*.test.ts`
- `tests/itemHardening.test.ts`

优化项:

- 打开商店时仍能看到小地图和英雄状态。
- recipe 不能只靠 tooltip 文本。
- 搜索和 quickbuy 都要支持键盘优先。

## 不应优先做的事

- 不继续优先堆新英雄。
- 不优先全量替换美术资产。
- 不优先做大而全设置页。
- 不把 Dota2 当主目标。Dota2 可以借鉴现代设置,但主目标仍是 Dota1/WC3 操控模型。
- 不优先做聊天、MIA、轮盘等多人沟通系统,除非 AI 队友或多人模式开始消费这些信号。

## 下一步推荐顺序

1. P0-A summary 截图和文档收口。
2. 进入信使和物品物流闭环。

## 每阶段交付标准

- 更新 UX 设计/总结文档。
- 增加聚焦单元测试。
- 2D/3D 行为一致性检查。
- 至少一次脚本化 smoke 或截图证据。
- `npm test` 或明确列出的聚焦测试。
- `npm run build`。
- 更新 `docs/ux/README.md`。

## 参考资料

- Blizzard Warcraft III: Hot Keys and Special Commands, Unit Commands, Unit Control, Hero Control, Spell Basics.
- Liquipedia Warcraft: Custom Hotkeys Guide.
- Dota 2 Wiki Controls/Hotkeys 仅作为现代演化参考,不作为主目标。

## 2026-06-15 Codex Continuation Addendum

Mainline check: still focused on UI, controls, and playability. No new hero, balance, art-volume, or sim ownership work was added.

Completed after the Opus handoff:

- P0-A closure summary added: `2026-06-15-p0a-selection-command-courier-hud-summary.md`.
- Inspect panel authority now distinguishes selected-commandable units from inspect-only units.
- Courier HUD status first pass is implemented above the command card:
  - `missing`
  - `dead`
  - `ready`
  - `delivering`
  - `returning`
- The courier strip is clickable and routes through the existing `selectCourier` command-card action.
- The courier strip now shows visible action labels for the current state: `No courier`, `Wait respawn`, `F2 select`, `F2 select / stash ready`, `F2 follow delivery`, or `F2 follow return`.
- Implementation is deliberately UI-read-only: it consumes existing `world.units`, courier order state, courier HP/alive state, fountain proximity, and hero stash count.
- Shop destination preview now appears directly in item rows:
  - `Hero`, `Backpack`, `Stash`, and `TP` indicate where the purchase will land.
  - `Secret`, `Shop`, `Gold`, and `Full` indicate the first actionable blocked reason.
  - The implementation is preview-only and does not mutate or fork `buyItem`.
- Shop search now has a first-pass keyboard-friendly input:
  - empty search respects the selected category tab.
  - active search scans across categories.
  - item key, name, category, and description all participate in matching.
  - no-result state displays a clear empty message.
- HUD XP progress is now visible in the bottom hero panel:
  - `src/ui/heroXpHudModel.ts` maps hero level + cumulative XP to current-level progress.
  - `tests/heroXpHudModel.test.ts` covers early level, cumulative threshold, and max-level states.
  - `src/ui/hud.ts` renders a thin gold XP bar under HP/MP with remaining-XP tooltip.
- Inspect inventory summary is now visible for selected enemy or non-primary heroes:
  - `inspectInventorySummary()` in `src/ui/inspectPanelModel.ts` converts current inventory + TP slot to compact item chips.
  - `tests/inspectPanelModel.test.ts` covers populated and empty item states.
  - `src/ui/inspectPanel.ts` renders compact item chips without changing item effects or visibility rules.
- Scoreboard net worth is now visible in the Tab scoreboard:
  - `src/ui/scoreboardModel.ts` computes read-only gold + item value summaries.
  - `tests/scoreboardModel.test.ts` covers inventory, backpack, stash, TP charges, and non-stack item handling.
  - `src/ui/scoreboard.ts` adds an `NW` column and includes backpack/stash/TP items in the scoreboard item row.
- Scoreboard death/buyback status is now visible in the Tab scoreboard:
  - `scoreboardHeroSummary().status` mirrors existing respawn and buyback fields.
  - `tests/scoreboardModel.test.ts` covers alive, buyback-ready, buyback-cooldown, and not-enough-gold states.
  - `src/ui/scoreboard.ts` adds a status column with respawn/cost/cooldown details.
- Shop owned-location badges are now visible in item rows:
  - `src/ui/shopOwnershipModel.ts` summarizes matching owned items across inventory, backpack, stash, and TP slot.
  - `tests/shopOwnershipModel.test.ts` covers hidden, lane-count, TP-charge, and stackable-charge states.
  - `src/ui/shop.ts` renders compact `Owned` badges below the purchase destination preview.
- Shop recipe progress is now visible in combined item rows:
  - `src/ui/shopRecipeModel.ts` summarizes total owned components, hero-ready components, and missing components.
  - `tests/shopRecipeModel.test.ts` covers duplicate requirements and missing component cases.
  - `src/ui/shop.ts` renders `Recipe x/y`, `Hero x/y`, and missing component labels below the ownership badges.
- Shop keyboard-buy first pass is now visible in the shop search flow:
  - `src/ui/shopQuickActionModel.ts` selects the first visible buyable row for the current filter.
  - `tests/shopQuickActionModel.test.ts` covers buyable, blocked, empty-list, next-component, blocked-component, and batch-component states.
  - `src/ui/shop.ts` renders an `Enter: Buy <item>` strip and pressing Enter in search buys through the existing purchase path.
  - Recipe rows now show `Next <component>`, and Shift+Enter buys the next missing component through the existing purchase path.
  - Ctrl+Enter buys the current recipe row's currently buyable missing components in one pass, still through the existing purchase path.
- Shop stash retrieval first pass is visible in the stash area:
  - `src/ui/shopStashActionModel.ts` describes take-all, partial-room, away-from-home, and full-inventory states.
  - `tests/shopStashActionModel.test.ts` covers the stash action states.
  - `src/ui/shop.ts` renders a `Take all` action above stash rows and repeatedly calls the existing `takeFromStash` path.
- Courier minimap marker first pass is visible on the core minimap:
  - `src/render/minimapCourierMarker.ts` builds a pure marker model from existing unit position, team, HP, alive state, and order type.
  - `tests/minimapCourierMarker.test.ts` covers allied through-fog visibility, enemy vision gating, dead courier hiding, and danger/busy tone priority.
  - `src/render/minimap.ts` renders couriers as distinct diamond markers instead of generic unit dots.
  - This does not add courier path preview, manual courier commands, or item transfer logic.
- Courier low-health HUD danger feedback is implemented:
  - live couriers at or below 35% HP keep their current task status but upgrade the courier strip to danger tone.
  - detail text becomes `Low HP / ...`.
  - action text becomes `F2 select / save courier`.
  - This does not add retreat commands, sim behavior, sound, or toast yet.
- Courier death announcement first pass is implemented:
  - `src/ui/announceModel.ts` builds pure central announcement data from existing event batches.
  - `tests/announceModel.test.ts` covers allied courier death, enemy courier death, non-courier filtering, and one courier announcement per batch.
  - `src/ui/announce.ts` reuses the central announcement component and calls alert/announce audio cues based on allied/enemy semantics.
  - This does not change courier death, bounty, respawn, AI, or item delivery behavior.
- Courier death location pulse first pass is implemented:
  - `src/ui/courierEventFeedback.ts` builds pure world-pulse data from existing event batches.
  - `tests/courierEventFeedback.test.ts` covers allied courier death, enemy courier death, non-courier filtering, missing-position filtering, and allied-priority batching.
  - `src/main.ts` adds a short existing `ping` pulse at the courier death location, so 2D, 3D, and minimap feedback stay aligned.
  - This does not change courier death, bounty, respawn, AI, or item delivery behavior.
- Map ping type first pass is implemented:
  - `src/ui/mapPingModel.ts` maps minimap ping modifiers and shared visual colors.
  - `tests/mapPingModel.test.ts` covers regular, danger, retreat, no-Alt rejection, and Ctrl-over-Shift priority.
  - `src/render/minimap.ts`, `src/render/renderer.ts`, and `src/render3d/renderer3d.ts` now render regular/danger/retreat pings consistently.
  - This does not add chat, multiplayer broadcast, vision reveals, or sim-side communication logic.
- Automatic danger ping first pass is implemented:
  - allied courier death now emits `dangerPing`, while enemy courier death stays regular `ping`.
  - `src/ui/buildingAttackAlertModel.ts` models allied-building-under-enemy-hero-attack alerts as `dangerPing`.
  - `tests/buildingAttackAlertModel.test.ts` covers hero-source filtering and per-building cooldown.
  - This does not change combat, building damage, courier death, AI, vision, or economy.

Next UI/control tasks:

1. Add courier logistics controls once sim contract is stable: deliver, return, transfer/stash lanes.
2. Expand shop v2 into persistent quickbuy queue, drag/click component transfer lanes, and richer queue editing.
3. Add scoreboard icon polish, hero portrait polish, and team objective rows.
4. Add courier path preview and route-exposure danger semantics without duplicating Opus-owned sim logic.
