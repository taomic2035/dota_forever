# 赏金符文(早期经济机制)

日期: 2026-06-19
范围: 补 DotA 标志性早期经济机制——赏金符文(拾取得金)。batchsim 平衡验证。

## 背景

符文系统此前 5 种(加速/双倍/恢复/隐身/幻象),缺 **赏金符**(DotA 拾取得金的经济符)。这是地图争夺的核心早期机制。

## 方案(最小 V1)

- 把 `bounty` 加入河道符文随机池(复用既有双点刷新);拾取 → 英雄获**非可靠金**,金额随时间小幅成长。
- 金额:`bountyRuneGold(t) = 50 + floor(t/60)*6`(开局 50,每分钟 +6;10min=110)。温和,远低于一次击杀。
- 对称(双方争同一河道符)→ 平衡中性;batchsim 验证。

## 改动

- `src/data/balance.ts`:`RUNE_TYPES` 加 `bounty`;`RUNE_EFFECTS.bounty` + `bountyRuneGold(t)`。
- `src/sim/runes.ts`:`RUNE_NAME.bounty='赏金符文'`;`applyRune` 显式化 illusion 分支 + 新增 bounty 分支(`addGold` 非可靠金 + gold fx)。
- 测试:`tests/bountyRune.test.ts`(3:金额公式/已注册/拾取得金)。

## 验证

- typecheck 通过;完整套件 178 文件 / 1519 测试 0 失败(determinism/rune/fullgame 全过——bounty 入池改变随机序列但仍可复现)。
- **batchsim 平衡验证(全 8 局)**:阵营 **晨曦 4 / 永夜 4**(完美对称)· 决胜 **8/8** · 时长 43/57/81min · 击杀 53-147。对比基线(4/4、8/8、~62-65)→ **平衡中性**;均时长略降(62→57,额外经济使出装稍快、对局稍早收尾,健康区间内,非平衡破坏)。

## 后续(留档)

- 可选:DotA2 式独立赏金符点位(不稀释能量符池)+ 团队分金。
- 赏金符小地图图标 / 拾取播报。
