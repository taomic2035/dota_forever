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

## Wave 2 — 确定性与测试护栏(核心不变量)✅ 完成

- [x] **W2.1 端到端确定性测试**(C1):`determinism.test.ts` 顺序跑两遍 5v5 整局(1000 tick),
  逐字段快照在多个检查点完全一致;另测「不同种子→不同轨迹」。
  注:因 `NEXT_ID` 模块级全局,两 world 必须顺序跑(不可交错),测试内已注释此约束。
- [x] **W2.2 sim 纯净性测试**(C2):静态——`import.meta.glob` 扫 sim/core/data,断言无
  `document/window./localStorage/requestAnimationFrame/performance.now/Math.random/Date.now/new Date`;
  动态——发育 200 tick 后,各类只读查询(queryRadius/getUnit/acquireTarget/isVisibleTo/cellVisible)
  不改写世界快照。
- [x] **W2.3 pathfinding 墙钟移除**(B4):`findPath` 去掉 `performance.now` 计时,`PATH_STATS` 去掉 `ms`
  字段(只写不读)。sim/core/data 现已彻底无禁用 token。
- [x] **W2.4 默认种子外显**(B3):`startGame` 打印 `seed=…(replay with ?seed=…)`,并入 `__game.seed`。

提交: `test(sim): determinism + purity guards; chore(sim): drop wall-clock; feat: surface seed`
结果: 625 测试全绿,typecheck 通过。

## Wave 3 — 命令架构(完善架构的核心)🔵 进行中

- [x] **W3.1 目标校验下沉 sim**(B2):目标合法性规则移到 `sim/targeting.ts`(单一真相源);
  `engine/targetFilters.ts` 转为兼容薄出口;`data` 直接指向 sim(去掉 data→engine)。
  `abilities.startCast` 与 `items.useItem` 对单位目标做权威 `targetMatchesFilter` 校验——
  人类/AI/未来网络命令一视同仁。测试:`abilities.test.ts` 「rejects an enemy-only ability cast on an ally」。
  结果:627 测试全绿,证明 112 英雄声明的 `targetTeam/targetKind` 与实际施法一致。
- [x] **W3.2(切片)拒绝原因下沉 sim**(#23 去重):新增 `abilities.abilityCastReason` 与
  `items.itemUseReason`(细分原因枚举);`main.ts` 的 `castRejectReason`/`itemRejectReason` 改为委托,
  不再自行复刻 sim 校验 → 杜绝 UX↔sim 漂移。测试:`abilities.test.ts` 「abilityCastReason …」。
- [ ] **W3.2(余下)main.ts 控制器全量抽取**:把 targeting/preview/cast/item 四条重复回调路径抽到
  `engine/castController.ts`,用统一「可施放物」抽象消重,`main.ts` 回归纯装配。
  **推迟**:体量大且改动 ChatGPT 新建的 UX 装配,需浏览器端验证;当前无症状,列为后续里程碑。
- [ ] **W3.3 预览圈用真实半径**(D6):**推迟/降级**——`AbilityDef`/物品 active 目前无声明 AoE 半径
  字段,精确预览需给 112 英雄逐个补 `aoeRadius`,ROI 低;建议作为独立任务先加可选字段+少量样例。
- [ ] **W3.4 人类输入命令队列**(B1):**推迟为独立里程碑**——人类 `Order` 入每 tick 队列、在 `step()`
  内与 AI 同点排空并记录,以打通 replay/lockstep。体量 medium,当前单机无症状,风险集中在输入边界。

提交: `refactor(sim): target validation + reject reasons as single source of truth`

## Wave 4 — 局部正确性 / 性能 / 清理(打磨)🔵 进行中

- [x] **W4.1** 无光环 holderModifier 失去物品即移除(D1)。用 `__holder` 标记判定(非 `def.aura`),
  既修林肯法球标记永久泄漏,又不误删 `item_bkb` 等限时主动 buff。测试:`holderModifier.test.ts`。
- [x] **W4.2** daynight 先于 vision 安装,消除 isNight 1-tick 滞后(D2)。测试:`daynightVision.test.ts`
  (夜晚起点对齐重算 tick,验证视野当 tick 收缩;旧顺序下回归用例失败已验证)。
- [x] **W4.3** boss_killed 特效用真实巢穴坐标 `PIT_POS`(D3)。
- [x] **W4.4** 渲染热路径:可见单位列表改用复用 scratch 数组(免每帧 spread,D4);小地图静态地标缓存一次(免每帧重建+克隆 Vec2,D5)。行为不变,纯分配优化。
- [x] **W4.5** 英雄 color/glyph 去重(D8):沃斯/崔恩/泰德 三对撞色已分离;`heroArtUnique.test.ts` 守护全局唯一。
- [x] **W4.6(部分)** D7 移除 `main.ts` 死 `pendingItemSlot` 变量与分支(点目标物品走 `onItemKey`,从不赋有效值);
  D10 移除死字段 `RAX_STATS.*.teamGold`(经典设计:兵营摧毁不给金,奖励是超级兵)。
  `purchaseKeyFor` 经核实**非** no-op(正确映射合成件→卷轴 key),保留。
  **D9 余下(孤儿组件、未具名死常量)推迟**:属内容/数据手术,破坏配方不变量与计数断言风险高、收益低,留待独立清理任务(审计已留档)。
- [x] **W4.7** 野怪 leash 重置健壮化(D11):新增 `unit.leashing` 显式回营态;到家(order 已自然结束亦然)满血重置。
  测试:`neutralLeash.test.ts`(含"到家且 order=null 仍重置"的确定性用例,旧逻辑下失败已验证)。

提交: 按主题分多个小提交。

---

## 验证关卡

- 每个 Wave 结束:`npm run typecheck` + `npm test` 全绿。
- Wave 1 / Wave 3 结束:`node scripts/shot.mjs` 跑观战冒烟 + 关键截图归档。
- 全部结束:`npm run batchsim` 多种子平衡回归(确认 AI 改动未破坏「必分胜负」)。
- 完成后更新 `docs/source-map.md` 与本计划勾选状态,刷新审计文档「兑现度」表。
