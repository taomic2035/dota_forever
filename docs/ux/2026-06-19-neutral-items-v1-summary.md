# 中立物品系统 V1

日期: 2026-06-19
范围: 核心 DotA 机制——野怪掉落分层中立物品。V1 小范围 + batchsim 平衡验证。

## 设计(低风险 V1)

- **复用现有物品基础设施**(数值/HUD 槽位/折叠),不新增中立专属槽、不改核心 stat-calc → 零核心系统风险。
- **6 件 IP-safe 原创中立物品**,3 层各 2 件,**温和数值**(约中端物品价值):
  - T1: 磨刃石(+14 攻击)、活力护环(+130 生命 +2 回血)
  - T2: 秘能碎片(+12 智力 +2.5 法力回)、铁木护符(+12 力量 +2 护甲)
  - T3: 相位棱镜(+16 敏捷 +6% 移速)、余烬核心(+280 生命 +18 攻击)
- **掉落**:野怪被英雄击杀 → 5min 后、12% 概率、按时间解锁的最高 tier(<18min=T1 / <33min=T2 / ≥33min=T3)→ 掉给击杀者。
- **每英雄上限 1 件**(DotA 忠实 + 限制 power 增长 + 防刷屏)。
- **不进商店**(`neutral` 标记,shopListModel 过滤)。
- 确定性:掉落用 `w.rng`(sim 系统,可复现)。

## 改动

- `src/data/items.ts`:`ItemDef.neutral?:{tier}` + 6 件中立物品(加入首个 ITEMS 字面数组 → 入 ITEM_BY_KEY)。
- `src/sim/items.ts`:`grantItem(w,hero,key)`(无偿授予,复用 空槽→背包→储藏 落位)。
- `src/sim/neutralItems.ts`(新):`installNeutralItems` 掉落系统 + `unlockedTier`/`holdsNeutralItem`。
- `src/sim/setup.ts`:creeps 模式下 install(依赖野营)。
- `src/ui/shop.ts`:商店列表过滤 `neutral` 物品。
- 测试:`tests/neutralItems.test.ts`(4,分层/持有/掉落+上限/5min前不掉)。

## 验证

- typecheck 通过;完整套件 177 文件 / 1516 测试 0 失败。
- **batchsim 平衡验证(全 8 局)**:阵营胜场 **晨曦 4 / 永夜 4**(完美对称)· 决胜 **8/8** · 时长 43/62/86min · 击杀 48-136。与基线(4/4、8/8、47/65/87)几乎一致 → **中立物品未破坏对称平衡**(掉落温和、对称、每英雄上限 1 件;bot 极少 jungle 时多数对局与基线相同)。
- 掉落机制由单测严谨覆盖(不依赖浏览器时序):startTime 360 / 120 次击杀 → 恰 1 件(掉落 + 上限);startTime 60 → 0 件(5min 门槛)。
- 商店排除浏览器确认:磨刃石/余烬核心不在商店列表。

## 后续(留档)

- 中立物品专属槽(需扩库存 + stat-calc,故 V1 暂用普通槽)。
- 含主动效果的中立物品 / 更多层与物品。
- bot 主动 jungle 取中立物品(当前掉落依赖谁击杀野怪)。
