# 第四轮机制保真审计 + 下阶段计划(对照经典 DotA 1)

日期: 2026-06-13 · 方法: 8 簇并行只读审计(攻击节奏 / 技能引擎 / 物品 / 地图建筑 / 兵线野区 / 经济复活信使 / 视野昼夜移动 / 英雄属性幻象)
范围: **玩法规则正确性与完整性**;名称原创(IP 安全),只审机制/数值。基线: [前三轮审计](2026-06-12-core-mechanics-gaps.md)(M1–M12 已收口),本轮为**净新发现**。

> 结论速览:核心数值常数(19血/13蓝/护甲公式/魔抗/XP表)仍精确对齐。本轮揪出 **2 个 P0、约 20 个 P1、约 20 个 P2** 净新缺口,集中在:**信使缺失**、**符文/兵线/塔数值与触发条件偏差**、**技能控制收口漏洞(嘲讽/引导/法球互斥)**、**关键物品主动机制缺失**。下面按执行批次组织。

---

## P0 — 影响对局正确性

- **[P0-1] 信使(courier)完全缺失** — `src/sim/` 零实现(渲染层有美术占位)。经典每队一只:运送储藏物品、可升级飞行、可被击杀(赏金+30s 重生)。**大体量**,单独立项。
- **[P0-2] 防御塔对英雄伤害类型存疑** — `buildings.ts:47` 塔 `attackType:'normal'` → 经矩阵对英雄 ×0.75。审计称应 100%。**balance 敏感 + 版本存疑**,需核实经典塔攻击/护甲表后再定,先留档勿盲改。

---

## P1 — 保真缺口(按执行批次)

### 批次 A — 低风险清晰修复(数值/触发/收口)✅ 已完成(2026-06-13)
- ✅ **[A1] 恢复符文 6s→30s** `runes.ts`:改读 `RUNE_EFFECTS.regen.duration`(30s),渐进恢复至满 HP/MP(rate=maxHp/30),受击中断。
- ✅ **[A2] 一血 +200 金** `economy.ts`:`firstBloodTaken` 标记,首杀额外 `FIRST_BLOOD_BOUNTY=200` 可靠金 + `first_blood` 事件。
- ✅ **[A3] 攻城车每 5 波 + 超级兵波每波出车** `balance.ts SIEGE_EVERY_N_WAVES 7→5`;`creeps.spawnWave` tier≥1 每波必出 siege。
- ✅ **[A4] 精英兵触发** `creeps.superTierFor`:改为该路近战+远程两营皆破 → tier 2;对应兵种营破 → tier 1。
- ✅ **[A5] 嘲讽尊重无敌 + 中断引导** 新增 `combat.applyTaunt`(无敌跳过 + breakChannel);batch4/batch17 改用之。(魔免交互因技而异,狂战吼原型穿魔免,故不一刀切按魔免拦。)
- ⏭️ **[A6] 强驱散中断引导** —— **甄别后跳过**:纯驱散/对自身 BKB 在经典 DotA 不中断引导(中断源=眩晕/沉默/妖术/嘲讽/死亡/移动,均已覆盖)。非真实行为,不改。
- ✅ **[A7] hex 移速固定 100 + muted** `items.ts` 物品 hex + `batch6/batch19` 英雄 hex:`setMoveSpeed:100` + `muted`。
- ✅ **[A8] 加速符文固定 522 无视减速** 新增 `StatMods.setMoveSpeed`(fold 取最严格非零值);`runes` haste 用 `setMoveSpeed:522`。
- ✅ **[A9] Basher/Abyssal 近战25%/远程10%** `items.ts`:按 `attacker.calc.attackRange>200` 分支触发率。
- ✅ **[A10] 破营全队团队金** `economy.ts` 加 rax 分支 + `RAX_STATS.teamGold=100`(全队可靠金)。
- ⏸️ **[A-defer] 首波时机 FIRST_WAVE_TIME=90→0** `balance.ts:104`:经典首波 0:00;影响早期节奏 + 多处测试引用,**暂缓**,与其他 balance 项一并核实回归。
> balance 相关(A1/A3/A4/A2/A10)集中跑 batchsim 复验。

### 批次 B — 中等体量修复(B3/B4 ✅ 已完成 2026-06-13)
- **[B1] 劈砍以原始攻击值为基数** `abilities.ts:286`:cleave 用主目标**经护甲后** `dealt` 应改用前摇掷骰的**原始伤害**;`attackHitHooks` 加 `rawAmount` 参数。(待做)
- **[B2] 远程攻击前摇不因目标超距取消** `combat.ts:278`:语义存疑(经典前摇期超距亦取消),**降级复核**后再定。
- ✅ **[B3] 升级即时补 HP/MP** `economy.addXp`:升级前记 maxHp/maxMp,升级后 recalcUnit 取正增量加到当前 hp/mp(战斗中升级的"免费血")。
- ✅ **[B4] 英雄攻塔→塔转火该英雄** `buildings.buildingsSystem`:新增分支,敌方英雄直接攻塔时该塔立即锁定攻击者(dive 仇恨)。
- **[B5] 法球/UAM 互斥** `abilities.ts:263`:多 `orbOnHit` 英雄(batch5/7/16)全部触发;一次攻击只应触发一个法球。
- **[B6] Pipe 护盾仅挡魔法** `combat.ts:133`:护盾无类型区分;Pipe 应仅吸魔法,Lotus/Eternal 全类型(需护盾加 type 标记)。
- **[B7] Orchid/Bloodthorn Soul Burn** `items.ts:678/1234`:沉默到期应爆发"期间承魔法伤害×?%"纯伤;modifier onExpire 累计。
- **[B8] Mask of Madness 自沉默** `items.ts:1556`:开启期间自身 silenced(核心代价)。
- **[B9] Mjollnir 反弹改闪电** `combat.ts:156`:Static Shield 应受击发链状闪电(魔法)而非物理反弹。

### 批次 C — 较大特性/框架(部分需单独立项)
- **[C1] 防御符文 Glyph** — 全缺失;己方建筑 10s 护盾 + ~5min CD。需 world 状态 + UI 触发。
- **[C2] Backdoor 保护** — 全缺失;无友军小兵时攻建筑减伤 + 快速回血。核心地图博弈。
- **[C3] 堆野 + 拉野** `neutrals.ts`/`creeps.ts`:堆野(:53–:55 引出)、拉野(兵线引入营地)。辅助核心。
- **[C4] 转身率逐英雄** `balance.ts:49`(全局 TURN_RATE):`HeroDef.turnRate` + 各处读;消除背刺/转向博弈缺失。schema 变更。
- **[C5] 高地随机揭雾** `vision.ts:65`:低地对高台硬性 0 视野;经典有 ~25% 概率偷看高台格(上坡 miss 姊妹机制)。
- **[C6] 关键物品主动** — Power Treads 三属性切换、Bloodstone 充能/死亡爆炸/法术吸命、Silver Edge Break、Heart 脱战%回血、Shiva 被动减速光环、Diffusal 充能限制。逐件内容量。
- **[C7] 瞬发攻击工具** `combat.ts`:`grantInstantAttack(u)` 供大招/分身重置普攻 CD。

---

## P2 — 次要 / 版本存疑 / 有意简化(留档,多数不改)
- 攻击伤害浮点非整数(`combat.ts:253`);多暴击取 max 非独立概率(`modifiers.ts:239`,与 PRD 并列)。
- 远程/攻城小兵前摇按比例偏长(`creeps.ts:35`);兵线 leash 用 1200 非常量 600(`creeps.ts:131`)。
- 中立攻击/护甲类型单一 medium/normal(`neutrals.ts:44`);远古未限"仅英雄可清";野怪无技能;上路侧野区缺营地。
- 守卫视野 1600(经典 6.x 约 1200)、真视 900(经典 700)— 版本存疑。
- 昼夜 5+5min(经典 4+4)— 可能有意,改动影响节奏,需验证(`balance.ts:143`)。
- 死亡掉金无上限(后期偏重,版本存疑);助攻无金(早期 DotA 1 一致,已留档);起始金 603 vs 625。
- 泉水回血百分比非固定值、泉水无真视光环、塔无微量回血、边路商店缺失、TP 目标模式 point 非 unit。
- 睡眠可被强驱散移除(应不可);恐惧无逃跑行为(降级为沉默+缴械);幻象不继承被动暴击(描述≠实现 `batch5.ts:61`)。
- 神杖 castRange 覆盖无运行时函数(`abilityCastRange` 缺)、施法后摇缺失、昼夜机制回调缺、phased 不消费。

---

## 执行计划

1. **批次 A(本阶段)**:低风险清晰修复,逐项 TDD + 提交;balance 相关(A1/A3/A4/A10)集中后跑 batchsim 复验。
2. **批次 B**:中等修复,含护盾类型/法球互斥等需小重构,逐项测试提交。
3. **批次 C**:较大特性按价值排期 —— Glyph/Backdoor(地图博弈)、堆野拉野(辅助)、转身率(schema)、高地揭雾;**信使(P0-1)单独立项**。物品主动(C6)逐件随需补。
4. **P0-2 塔伤类型 / P2 版本存疑项**:核实经典数据后定夺,勿盲改;balance 项一律 batchsim 回归。

> 原则:清晰 bug 即修;版本/平衡敏感项先核实再动且回归;大特性立项。遵「机制保真优先、忠实 DotA 1 而非自创」。
