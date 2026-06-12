# 架构现状与代码审计 (as-built v0.2)

日期: 2026-06-12 · 状态: 全面梳理定稿,作为后续「架构与代码逻辑」加固的基线
方法: 11 个子系统并行深读 + 对抗式验证(48 agent),已剔除被验证驳回/夸大的发现。

> 配套文档:[原始设计愿景](superpowers/specs/2026-06-10-dota1-remake-design.md) ·
> [工程加固计划](superpowers/plans/2026-06-12-engineering-hardening.md) · [源码地图](source-map.md)

---

## 1. 总体结论

项目处于**成熟、健康**的状态:112 英雄、140+ 物品、616 测试全绿、AI 整局可分胜负。
战斗管线、modifier 系统、英雄/物品数据层质量高(`render`、`data-heroes` 评级 GOOD)。

审计**没有发现任何会崩溃或破坏单机对局的严重 bug**。对抗验证把多条初判 high 的发现
降级为 medium/low——代码本身的不变量守得比表面看上去更稳。真正的改进空间集中在三处:

1. **少量影响对局数值/AI 行为的正确性 bug**(经验分配、AI 撤退、魔抗聚合)。
2. **确定性契约在「接缝处」未完全兑现**(人类输入绕过 tick、目标校验只在 UI 层)——
   今天无症状,但挡住了设计文档承诺的 replay / lockstep 联机。
3. **测试与架构的「护栏」缺失**:核心不变量(确定性、sim 不被渲染层改写)无测试守护;
   `main.ts` 长成 616 行 god-object,承载了本该在 engine/sim 的逻辑。

---

## 2. As-built 架构

### 2.1 分层与依赖方向

```
core/        纯工具:Vec2 · 种子 RNG(mulberry32)· 数学。无副作用、无依赖。
data/        纯数据:balance(数值真相源)· heroes/(112)· items(140+)· map/creep/neutral 布局。
sim/         确定性 30Hz 定步模拟。只依赖 core + data。绝不 import DOM / render / ui。
engine/      输入解释、控制设置、命令模式状态机、目标过滤。桥接 DOM 事件 → sim 指令。
render/      Canvas2D 渲染。只读 sim 状态 + 每 tick 事件流。
ui/          DOM HUD/菜单/商店/反馈。只读 sim,写 DOM。
audio/       WebAudio 程序化合成。只读事件流。
main.ts      装配层:把以上接线在一起。
```

依赖方向单向收敛到 sim/core/data,这是架构的根基,目前**基本守住**(唯一例外见 §3 F)。

### 2.2 模拟 tick 流水线(每 `step()` 的固定顺序)

`world.step()`(`sim/world.ts:99`)按 `systems[]` 顺序执行。实际安装顺序(`sim/setup.ts`)
经 `push` 与 `splice(1,0,…)` 混合,展开后的有效顺序为:

```
recalcSystem(0)              面板重算:base → modifier 折算 → 物品折算 → 英雄属性折算
  └ modifiers(splice@1)      过期/周期 tick/光环授予(紧随重算,保证当 tick 生效)
  └ creeps(splice@1)         兵线生成/行进(后装,故在 modifiers 之前)
[push 顺序的其余系统]         buildings 战斗、economy、respawn、vision、items、runes、
                             daynight、neutrals、pitlord、botAI —— 均 push 到尾部
ordersSystem                 指令执行:移动/追击/前摇/出手/施法
projectileSystem             弹道推进与命中
buildingsSystem              塔仇恨与攻击
cleanupSystem                尸体/召唤物/守卫清理
```

**关键事实(此前隐式,现显式化):**
- tick 顺序由「安装调用顺序 + splice 语义」共同决定,后装的 `splice(1)` 系统反而**更早**执行。
  这是脆弱耦合点(见 §3 finding 架构类)。
- `recalcSystem` 每 tick 全量重算每个单位的 `calc` 面板(base 镜像 → 各 fold)。modifier 与
  物品分属**两个独立 fold**(`modifiers.foldModifiers` 与 `items.itemFold`,经 `recalcExtensions`),
  必须保持聚合语义一致——这是 §3 finding #4 魔抗 bug 的温床。

### 2.3 三条核心不变量(设计承诺)

| 不变量 | 含义 | 当前兑现度 |
|---|---|---|
| **确定性** | 同种子 + 同输入 → 逐 tick 一致;sim 内只用种子 RNG,无墙钟/`Math.random`/DOM | sim 逻辑层守住;**接缝处有泄漏**(人类输入时序、pathfinding 墙钟统计);**无测试守护** |
| **sim/渲染分离** | 渲染/UI 只读 sim;sim 不触 DOM | 守住;**无测试守护** |
| **输入/AI 同构** | 人类输入与 AI 输出产出相同的 Order;天然支持 replay/lockstep | 调用点同构(都 `issueOrder`),但**人类输入从渲染路径直接改 sim、且目标校验只在 UI 层** → 同构在「校验」和「时序」两个维度未完全成立 |

### 2.4 事件流设计(值得保留的亮点)

`world.events` 只活一 tick:`step()` 开始时把上一 tick 的 `pendingEvents` 换入、清空,
系统内 `emit` 当 tick 可见,系统外 `emit` 顺延一 tick(`world.ts:91-120`)。渲染/音频/击杀播报
在 `step()` 后立即消费。这是 sim→渲染解耦的干净边界,无需共享可变结构。

---

## 3. 已验证发现(去重后,按优先级)

> 完整原始清单见审计任务输出;此处为去重 + 验证后保留项。`fix` = 修复体量。

### A 级 — 影响对局的正确性 bug(优先修)

| # | 位置 | 问题 | fix |
|---|---|---|---|
| A1 | `sim/economy.ts:57-62` | 中立/Boss 击杀按 `victim.team(=Neutral)` 算经验圈 → **双方都吃经验**。应按击杀者队伍算。 | small |
| A2 | `sim/ai/bots.ts:78,383` | `microLastHit` 每 tick 跑、仅让位非 move 指令 → 撤退(move 指令)被补刀指令反复打断,**残血 bot 无法撤退**(livelock)。 | trivial |
| A3 | `sim/modifiers.ts:176` + `sim/items.ts:203` | 魔抗在 fold 循环内逐项 `Math.min(0.85,…)` → 遇负值(减魔抗)**丢抗且顺序敏感**。应累加后统一 clamp 一次。 | small |
| A4 | `sim/ai/bots.ts:85-97` + `items.ts` | bot 背包满后续购物进储藏却**从不取出/合成**,白白花金。应在主城顺手 `takeFromStash`。 | small |

### B 级 — 确定性 / 架构契约(挡住 replay/lockstep,今天无症状)

| # | 位置 | 问题 | fix |
|---|---|---|---|
| B1 | `main.ts:597` + `:363-432` | 人类 `issueOrder` 从渲染路径(变帧率)直接改 `hero.order`,落在哪个 tick 不确定、不被记录 → 破坏 replay/同步。应经**每 tick 命令队列**在 `step()` 内定点排空。 | medium |
| B2 | `main.ts:223-447` vs `sim/abilities.ts`/`items.ts` | 队伍/目标种类校验**只在 UI 层**;sim 的施法执行不复检 → AI/未来网络命令可用非法目标施法。校验应下沉到 sim(单一真相源)。 | small |
| B3 | `main.ts:114` | 默认种子用 `Math.random()` 且不外显 → 默认对局不可复现。应外显所选种子(URL/`__game`)。 | trivial |
| B4 | `sim/pathfinding.ts:73,77` | sim 热路径用 `performance.now()` 喂诊断统计 → 违反「sim 无墙钟」。统计应移到 engine 侧或可关。 | trivial |

### C 级 — 测试护栏缺失(架构关键)

| # | 位置 | 问题 | fix |
|---|---|---|---|
| C1 | `tests/world.test.ts` | **无端到端确定性测试**(同种子→逐 tick 一致,仅断言了单个单位终点位置)。 | small |
| C2 | `tests/`(全缺) | 无测试守护「render/ui/engine 不改写 sim」不变量。 | small |
| C3 | `tests/fullgame.test.ts` | 集成覆盖集中在单个 60s 慢测;缺快速聚焦回归。 | small |

### D 级 — 局部正确性 / 性能 / 清理(低风险打磨)

| # | 位置 | 问题 | fix |
|---|---|---|---|
| D1 | `sim/items.ts:148-154` | Linken 类**无光环**的 holderModifier 失去物品后**不移除**(永久泄漏);移除逻辑只删带 `aura` 的。 | small |
| D2 | `sim/setup.ts:42,45` | vision 系统在 daynight 之前跑 → 每 tick 读到**上一 tick 的 `isNight`**(1 tick 滞后)。 | trivial |
| D3 | `render/fx.ts:157` | `boss_killed` 特效画在硬编码坐标,与真实巢穴位置不符。 | trivial |
| D4 | `render/renderer.ts:203-206` | 渲染热路径每帧重建+过滤整张单位数组。 | small |
| D5 | `render/minimap.ts:84` | 小地图每帧重建全部静态地标(含克隆 Vec2)。 | trivial |
| D6 | `main.ts:283-294,335-348` | 预览圈对所有非单位技能伪造固定半径 `area` 环(220/180),**与技能真实 AoE 不符**;renderer 的 `line` 模式是死代码。 | small |
| D7 | `main.ts:164,371-378` | `onLeftClick` 里 `pendingItemSlot` 分支为死代码(从不赋有效值)。 | trivial |
| D8 | `data/heroes/*` | 三对英雄 `color`+`glyph` 完全相同 → 视觉无法区分。 | trivial |
| D9 | `data/items.ts` | 4 个商店件自称某物组件但无配方引用(孤儿组件);3 个 balance 常量为死数据;`purchaseKeyFor` 间接层为 no-op。 | small |
| D10 | `sim/economy.ts:97-107` | 兵营摧毁不给金且 `RAX_STATS.teamGold` 是死数据(需确认是否符合设计)。 | trivial |
| D11 | `sim/neutrals.ts:51-60` | 野怪 leash 回家以 `order?.type==='move'` 为键 → 漏掉/误触满血重置。 | small |

### 被对抗验证驳回/降级(不修,留档)

- 「Bot AI 在 ordersSystem 之后跑会迟一 tick 丢指令」——**驳回**:`u.order` 是持久字段,
  不会每 tick 清空,人类输入路径有同样延迟,且无 replay 基础设施;33ms 延迟不可感知。
- 「EntityId 模块级全局」「splice 顺序脆弱」——降级为 low:仅在多 world 共存时才有影响,
  单 world 对局无症状(但会写进架构文档作为已知约束)。

---

## 4. 根因簇(一次重构解决一组)

- **命令层缺失** 串起 B1 / B2 / D6 / D7 与 `main.ts` god-object:没有「统一的、带校验的命令入口」。
  正确解法是一个 `engine/` 命令层:人类输入与 AI 都产出 `Order`,**校验在 sim**,
  时序经每 tick 队列。这同时收敛 god-object 与同构契约。
- **双 fold 聚合** 串起 A3 与魔抗/属性聚合的可维护性:`modifiers` 与 `items` 两套 fold 必须同义。

---

## 5. 已知架构约束(有意为之,留档)

- 单 world / 单线程假设:`pathfinding.SCR` 复用缓冲、`unit.NEXT_ID` 模块级计数器、
  `PATH_STATS` 全局——均依赖「同一时刻只有一个 World」。多 world 并存需重构(目前无需求)。
- 数值为「经典近似」,集中在 `data/balance.ts`(但仍有少量散落,见 D9)。
- 联机/replay 未实现,架构「预留」但接缝未打通(见 §3 B 级)。
