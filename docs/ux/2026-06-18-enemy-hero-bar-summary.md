# 敌方英雄顶栏:常驻威胁评估

日期: 2026-06-18
范围: 屏幕顶部常驻敌方英雄状态条(对应 UX 路线图 P1.1「敌方英雄摘要」+ DotA 顶栏核心)。

## 问题

此前顶栏只有 晨曦/永夜 队名、时间、昼夜、神符/Glyph/Boss 计时、双方击杀数。**没有常驻的敌方英雄状态**——玩家无法一眼判断「敌方中单几级、残血没」「对面大哥死了多久、能不能推」,而这是 DotA 每次交战/推进/gank 决策的核心信息。

## 方案

顶栏正下方居中一排敌方英雄 chip。遵循 DotA 迷雾原则:

- **等级 + 复活倒计时是公开信息**,常显(与计分板一致)。
- **血/蓝只在玩家视野内显示**(`isVisibleTo` 门控)——不透雾偷看敌方实时血量;雾中显「迷雾」,死亡显「复活 Ns」。

## 改动

- `src/ui/enemyHeroBarModel.ts`(新):纯模型 `buildEnemyHeroBar(heroes, now)` → `EnemyHeroChip[]`。`showBars = alive && visible`;hpFrac/mpFrac 钳制 0..1;respawnIn = `ceil(respawnAt - now)` 且 ≥0。视野判断由 HUD 预先用 `isVisibleTo` 填入 `visible`,模型保持纯/可测。
- `src/ui/hud.ts`:新增 `enemyBar` DOM(顶栏下 32px 居中横排)+ `renderEnemyBar(world, hero)`——提取敌方英雄、`isVisibleTo` 判定视野、渲染 chip(色边框 + 字形 + 等级徽章 + 血绿/蓝条 或「迷雾」/「复活 Ns」)。
- 覆盖测试:`tests/enemyHeroBarModel.test.ts`(6)——视野显血蓝、迷雾不泄露、死亡倒计时、钳制、字段透传。

## 验证

- typecheck 通过;完整套件 0 失败。
- 真实运行端到端:开局/远距 5 敌全显「迷雾」(13000+ 距离,fog 门控正确);进入兵线视野后混合态——time 57 截图显示「妖/狙/岩 血蓝条(可见)+ 仇/夜 迷雾」,等级常显。无透雾血量泄露。

## 更新:补全双方顶栏(2026-06-18)

`renderEnemyBar` → `renderHeroBars`:友军(左,血蓝常显——同队 `isVisibleTo` 恒真)+ `VS` 分隔 + 敌方(右,迷雾门控),DotA 式 both-teams 常驻总览。自己英雄 chip 描金边标注「(你)」。复用 `buildEnemyHeroBar`(团队无关)。`heroChipHtml` 提取共享。真实验证:友军 盾(自己)/蛊/裂/磁/蹄 显血蓝条;敌方 岩/熊/妖/霜/翼 显「迷雾」;VS 分隔。

## 更新:chip 点击居中镜头(2026-06-18)

点击顶栏英雄 chip → 镜头跳到该英雄(DotA 点头像居中)。`chip` 加 `data-hero-id` + `pointer-events:auto`;`heroBar` mousedown 委托(HUD 每帧重建,用 mousedown);`onCenterUnit` 回调由 main 注入,**视野门控**:友军/可见敌方才跳,雾中敌方不跳(避免透雾定位)。居中后 `camera.follow=false` 停在该处(空格可重新跟随)。真实验证(未暂停):点友军 chip → 镜头从 (1370,13603) 跳到 ≈ 友军位 (5740,13712),follow→false,0 错误。
> 排错记录:验证时一度失败,根因是 `Esc` 同时**切换暂停菜单**(main.ts:461),暂停菜单 z-120/inset:0/pointer-events:auto 模态盖住全屏拦截点击——是测试用 Esc 关引导的假象,非功能 bug(dispatch 直发事件证明 wiring 正确)。

## 后续(留档)

- chip 点击敌方雾中时跳「上次可见位置」(需 last-known 追踪)。
- 关键道具图标(BKB/跳刀就绪)提示——需敌方道具可见性规则,V2。
