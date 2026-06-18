# 死亡回顾 V3:控制来源时间线

日期: 2026-06-18
范围: 死亡面板的控制来源拆解(P1「Death recap 还不能完整解释伤害和控制来源」的控制部分)。

## 问题

死亡回顾 V2 已拆解伤害来源,但缺**控制**——DotA 里被秒往往不是单纯伤害,而是被**连控**(晕→再晕→沉默)锁住无法反应。不显示控制链,玩家无法理解「为什么我什么都没做出来就死了」。

## 方案

复用 V2 的 UX 层日志思路:从 sim 新增的 `unit_controlled` 事件累积控制记录(不进 sim 状态 → 不影响确定性),死亡面板在伤害拆解下方显示**控制时间线**:致命前 ~10s 内,被谁、什么控制、持续多久,**按时间顺序**(顺序本身就是死因故事)。

## 改动

- `src/sim/world.ts`:新增 `unit_controlled` 事件(unitId/sourceId/control/duration)。
- `src/sim/modifiers.ts`:`applyModifier` 收口处——敌方来源、`isBuff!==true`、有限时长、且 `states` 含控制(晕/缚/默/缴/禁/升空)时 emit;`controlKindOf` 按严重度映射控制种类。
- `src/ui/deathRecapModel.ts`:新增 `ControlKind`/`ControlInstance`/`controlTimeline`(锚定最近控制回看窗口,保序取最近 N 条)/`ControlLog`。
- `src/main.ts`:`controlLog` 从 `unit_controlled` 事件喂入(玩家英雄),复活清空;死亡时 `hud.deathControlEntries = controlLog.timeline(10)`。
- `src/ui/hud.ts`:`deathControlTimeline()` 渲染控制链(晕黄/缚绿/默紫/缴红/禁棕/升空青 chip + 时长 + 来源名,`›` 连接表顺序)。
- 覆盖测试:`tests/deathRecapModel.test.ts` +5(控制时间线);`tests/modifiers.test.ts` +3(`unit_controlled` emit:敌方控制 emit / 种类映射 / 友方·buff·无限·非控制不 emit)。

## 验证

- typecheck 通过;完整套件 0 失败。
- sim emit 确定性单测(敌方控制→事件、buff/友方/无限/减速→不 emit)。
- 真实致死端到端:注入「斯凯 晕 / 斯凯 晕 / 格罗什 沉默」后致死,死亡面板显示「控制链 晕 1.6s 斯凯 › 晕 1.2s 斯凯 › 默 3.0s 格罗什」+ 伤害拆解,截图确认 chip 着色与顺序。

## 更新:V4 总锁定时长(2026-06-18)

控制链标题旁显示「共被控 X.Xs」:`controlLockdownSeconds` 取窗口内控制区间 `[at, at+duration]` 的**并集**长度(合并重叠,避免同时眩晕+缠绕被重复计)。纯函数 + `ControlLog.lockdownSeconds`,测试 +6(求和/重叠并集/包含/窗口裁剪/延入)。真实验证:同时施加两个 2s 控制(晕+缚)→ 正确显「共被控 2.0s」(并集),而非朴素 4.0s。

## 后续(留档)

- 净化/驱散打断控制的时间线标注(并集会扣除被驱散后的剩余)。
