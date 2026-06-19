# 战斗日志面板(可 toggle 可滚动)

日期: 2026-06-19
范围: 完整战斗日志面板(L 键开关),补全实时受伤feed 之外的可复盘事件记录。

## 方案

L 键 toggle 的左侧可滚动面板,记录**玩家参与的重要战斗事件** + 时间戳:
- 伤害(收/发),**仅记英雄/塔/Boss 参与**(排除小兵平A 刷屏,与实时受伤feed 互补)——「你 → 防御塔 5」绿 /「防御塔 → 你 61」橙。
- 击杀:「X 击杀 Y」金。
- 控制(施于玩家):「X 对你 眩晕 1.5s」黄。
环形缓冲 cap 60,自动滚到最新。

## 改动

- `src/ui/combatLogModel.ts`(新):`CombatLog`(push/recent/clear,环形)+ `formatClock`(世界时间→m:ss,负为开局前)。纯 + 测试(6)。
- `src/ui/combatLogPanel.ts`(新):toggle 面板 + 渲染(时间戳 + 着色行 + 自动滚底)。
- `src/engine/controlSettings.ts`:新增可改键动作 `combatLog`(默认 `l`)——暂停菜单改键 UI 自动生成按钮。
- `src/engine/input.ts`:`case 'l'` → `onToggleCombatLog`(回调可选)。
- `src/main.ts`:`CombatLog` + `CombatLogPanel` 实例;事件循环 push(英雄/塔/Boss 伤害 + 击杀 + 控制);toggle 回调;render 循环渲染。

## 验证

- typecheck 通过;完整套件 0 失败;`combatLogModel.test`(6);controlSettings 测试不受新动作影响。
- 真实运行:英雄打塔/被塔打 → `#cl-list` 记「0:07 你→防御塔 5 / 防御塔→你 61」等;L 开关正常;无小兵刷屏;0 错误。

## 后续(留档)

- 可选记录技能/物品使用事件。
- 过滤/分类标签(只看击杀 / 只看受到)。
