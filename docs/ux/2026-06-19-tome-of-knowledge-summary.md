# 知识之书(Tome of Knowledge,即时经验)

日期: 2026-06-19
范围: 补 DotA 经济机制——知识之书(gold→XP)。每英雄冷却防滥用,batchsim 平衡验证。

## 方案

- 商店消耗品 `tome_knowledge`(700 金),使用 → 即时 +700 经验。
- **防滥用**:每英雄使用冷却 7 分钟(`heroMeta.tomeReadyAt`)——冷却中使用返回 false(不消耗、不给经验)。可买多本囤着,但用的频率被冷却封顶 → gold→XP 速率受限,不可滥用。

## 改动

- `src/sim/unit.ts`:`HeroMeta.tomeReadyAt`(+ makeHeroMeta 初始化 -Infinity)。
- `src/data/items.ts`:`TOME_XP=700`/`TOME_COOLDOWN=420` + `tome_knowledge` 消耗品(onUse:冷却门控 + `addXp` + 设冷却)。复用现有消耗品/商店/物品栏。
- 测试:`tests/tome.test.ts`(4:使用给经验+设冷却/冷却中失败/到期再用/常量合理)。

## 验证

- typecheck 通过;完整套件 1527 测试 0 失败。
- **batchsim 平衡验证(全 8 局)**:阵营 **晨曦 4 / 永夜 4**(对称)· 决胜 **8/8** · 时长 43/57/81min。平衡未受影响(bot 出装不买书 → 玩家专属收益,阵营对称)。

## 后续(留档)

- 可选:经典递增购买价(每本 +金)替代固定价 + 冷却。
- bot 购买/使用知识之书(当前 bot 是否买取决于其出装 AI)。
