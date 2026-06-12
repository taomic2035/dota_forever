# 工程加固计划 — 架构与代码逻辑

日期: 2026-06-12 · 来源: [架构现状与审计](../../2026-06-12-architecture-and-audit.md)
目标: 把 ChatGPT 完善的 UX 之上,补齐**代码逻辑正确性、确定性护栏、命令架构**三块短板。
原则: 每个改动先红测(可行处)→ 实现 → 全绿 → 逻辑分组提交。非必要不停。

---

## Wave 1 — 影响对局的正确性 bug(先做,低风险高价值)✅ 完成

- [x] **W1.1 中立/Boss 经验分配**(A1, `sim/economy.ts`)
  中立/Boss 的经验圈改按 `killer.team` 算(小兵仍按 `victim.team` 的敌方);新增 `heroesOnTeamNear`。
  测试:`economy.test.ts` 「neutral kill shares xp with the killer team only」。
- [x] **W1.2 AI 撤退被补刀打断**(A2, `sim/ai/bots.ts`)
  `microLastHit` 接收 `st`,`st.mode==='retreat'` 时直接返回。
  测试:`botBehavior.test.ts` 「does not interrupt a retreating bot」。
- [x] **W1.3 魔抗逐项 clamp**(A3, `sim/modifiers.ts` + `sim/items.ts` + `sim/combat.ts` + `balance.ts`)
  两个 fold 只累加 `bonusMagicResist`,`recalcUnit` 末尾用 `MAGIC_RESIST_CAP` 统一 clamp 一次。
  测试:`modifiers.test.ts` 「magic resist folds additively with one clamp (order-independent)」。
- [x] **W1.4 AI 储藏物品取出**(A4, `sim/ai/bots.ts`)
  `shopping()` 开头排空储藏到背包空位(`takeFromStash`)。
  测试:`botBehavior.test.ts` 「pulls stranded stash items into free inventory slots」。

提交: `fix(sim): correct neutral xp share, ai retreat, magic resist fold, stash retrieval`
结果: 621 测试全绿(+5),typecheck 通过,零回归。

## Wave 2 — 确定性与测试护栏(核心不变量)

- [ ] **W2.1 端到端确定性测试**(C1):同种子跑 N tick,对两个独立 World 的状态做哈希,逐 tick 相等。
- [ ] **W2.2 sim 纯净性测试**(C2):跑一局后断言 sim 模块未 import DOM;渲染一帧后 world 状态哈希不变(渲染不改 sim)。
- [ ] **W2.3 pathfinding 墙钟移除**(B4):`PATH_STATS.ms` 计时移出 sim(默认关闭或注入式计时器)。
- [ ] **W2.4 默认种子外显**(B3):`__game.seed` + 控制台日志;不再隐藏 `Math.random` 种子。

提交: `test(sim): add determinism + sim-purity guards; chore: remove wallclock from sim`

## Wave 3 — 命令架构(完善架构的核心)

- [ ] **W3.1 目标校验下沉 sim**(B2):`abilities`/`items` 施法执行复检 `targetTeam`/`targetKind`,
  非法目标拒绝;UI 校验保留为「预拒绝」体验层,但 sim 成为单一真相源。红测覆盖。
- [ ] **W3.2 main.ts 控制器抽取**(god-object):把 reject 映射、targeting、preview、cast/item 四条
  重复路径抽到 `engine/playerController.ts`(或 `castController`),用统一「可施放物」抽象消重。
  `main.ts` 回归纯装配。
- [ ] **W3.3 预览圈用真实半径**(D6):预览 AoE 用技能/物品定义的实际半径,去掉 220/180 魔数;
  点目标技能用对应提示而非伪 area 环;清理 renderer 死 `line` 模式或接通。
- [ ] **W3.4 (可选/评估)人类输入命令队列**(B1):人类 `Order` 入每 tick 队列,在 `step()` 内
  与 AI 同点排空。体量 medium,若 W3.1/W3.2 已让校验与时序足够清晰,可拆为后续里程碑。

提交: `refactor(engine): sim-side target validation + player command controller`

## Wave 4 — 局部正确性 / 性能 / 清理(打磨)

- [ ] **W4.1** Linken 类 holderModifier 失去物品即移除(D1)。
- [ ] **W4.2** daynight 先于 vision 安装,消除 isNight 1-tick 滞后(D2)。
- [ ] **W4.3** boss_killed 特效用真实巢穴坐标(D3)。
- [ ] **W4.4** 渲染热路径:可见单位列表/静态地标缓存,避免每帧重建(D4, D5)。
- [ ] **W4.5** 英雄 color/glyph 去重(D8)。
- [ ] **W4.6** 数据清理:孤儿组件、死 balance 常量、`purchaseKeyFor` no-op、死 `pendingItemSlot` 分支、rax 金币确认(D7, D9, D10)。
- [ ] **W4.7** 野怪 leash 重置健壮化(D11)。

提交: 按主题分多个小提交。

---

## 验证关卡

- 每个 Wave 结束:`npm run typecheck` + `npm test` 全绿。
- Wave 1 / Wave 3 结束:`node scripts/shot.mjs` 跑观战冒烟 + 关键截图归档。
- 全部结束:`npm run batchsim` 多种子平衡回归(确认 AI 改动未破坏「必分胜负」)。
- 完成后更新 `docs/source-map.md` 与本计划勾选状态,刷新审计文档「兑现度」表。
