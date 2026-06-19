# 小地图 + 英雄条可读性增强

日期: 2026-06-19
范围: 小地图敌我辨识 + 自身定位 + 英雄条 Alt 精确数值(可读性/操作易用性)。

## 改动

### 小地图(`src/render/minimap.ts`,GPT 无撞车)
- **英雄队色环**:英雄色填充 + 队色环(友绿 `#6fe06f` / 敌红 `#ff5a5a`,按 `viewerTeam`)+ 略放大(r=4),一眼辨敌我、突出于小兵方块。此前用英雄色填充,敌我易撞色。
- **自身英雄白环**:`render` 增可选 `selfHeroId`(main 传 `hero.id`),自身额外描白环(r=6),小地图一眼定位自己。

### 英雄条 Alt 精确血蓝(`src/ui/enemyHeroBarModel.ts` + `src/ui/hud.ts`)
- `EnemyHeroChip` 增 `hp/maxHp/mp/maxMp` 整数值。
- **按住 Alt**:可见英雄 chip 显精确血/蓝数值(血绿 + 蓝),替代血蓝条——DotA 击杀计算核心。松开复原条状。读 `ux.altInfo`。

## 验证

- typecheck 通过;完整套件 0 失败;`enemyHeroBarModel.test` +2(hp/mp 整数/四舍五入)。
- 真实运行:小地图英雄带队色环 + 自身白环、无错误;按住 Alt → 自身 chip 显「盾 1 587 182」(HP 587 + MP 182),松开复原。

## 后续(留档)

- 小地图 ward/侦查/神符图标细分。
- Alt 同时显敌方英雄装备/技能冷却(需敌方道具可见性规则)。
