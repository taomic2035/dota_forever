# 死亡回顾 V2:伤害来源拆解

日期: 2026-06-18
范围: 死亡面板的伤害来源拆解(对应 UX 路线图 P1「Death recap 还不能完整解释伤害和控制来源」)。

## 问题

V1 死亡回顾只用 `hero.lastAttackerId` 显示「被 X 击杀」一行,无伤害拆解——玩家无法区分「被某英雄连招秒」与「被塔+兵磨死」,死亡学习价值低。

## 方案

在 **UX 层**累积玩家英雄受到的伤害(数据来自 sim 已有的 `unit_damaged` 事件),不进 sim 状态 → **不影响确定性**(determinism snapshot 不含事件/日志,已核实)。

recap 锚定在「最近一次伤害」(即致命一击)向前回看 ~10s 聚合——无论死了多久,展示的始终是把你打死的那段爆发,而非随当前时间滑走。

**聚合粒度**:英雄按个体(各自一行 + 队色),通用单位按类型(多兵多塔各自合并为「小兵」「防御塔」一行)→ 避免刷屏,符合 DotA 死亡总结的可读性。

## 改动

- `src/sim/world.ts`:`unit_damaged` 事件增 `damageType: 'physical'|'magical'|'pure'`(必填)。
- `src/sim/combat.ts`:emit 时由 `flags`(pure/spell)推导 `damageType`。
- `src/ui/deathRecapModel.ts`(新):纯模型——`DamageInstance`/`DeathRecapEntry`/`aggregateRecap`(锚定致命一击、窗口过滤、按 `groupKey` 聚合、降序截断、byType 拆分)/`DamageLog`(环形缓冲 push/clear/recap)。
- `src/main.ts`:维护 `DamageLog`,step() 从事件喂入(英雄 groupKey=`h<id>`+队色,通用单位 groupKey=类型名);复活(dead→alive)清空;render() 死亡时把 `recap(10)` 填入 `hud.deathRecapEntries`。
- `src/ui/hud.ts`:死亡面板渲染拆解——每来源一行(名字 + 总伤 + 物理橙/魔法紫/纯粹白分段条,按总伤比例宽)。
- 覆盖测试:`tests/deathRecapModel.test.ts`(9);修 `tests/fxlayer.test.ts` 事件 fixture 加 `damageType`。

## 验证

- typecheck 通过;完整套件 0 失败。
- 真实致死端到端(雷恩 hold 挨敌塔+兵):死亡面板 DOM 显示「被 防御塔 击杀 · 致命前伤害来源:防御塔 322 / 小兵 61」,多塔多兵已各自合并;截图确认橙色分段条按比例渲染 + 买活行。

## 后续(留档)

- 控制来源拆解(眩晕/沉默来自谁、持续多久)——当前仅伤害,控制时间线为 V3。
- 伤害类型在含魔法/纯粹混合时的图例(当前靠颜色,可加 hover 明细)。
