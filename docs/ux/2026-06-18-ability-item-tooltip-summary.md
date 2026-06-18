# 技能/物品 tooltip 数值增强

日期: 2026-06-18
范围: 技能/物品悬停 tooltip 补当前等级数值(P1「UI 文案/信息」+ DotA tooltip 核心)。

## 问题

技能/物品悬停 tooltip 此前只有名称 + 描述,缺 DotA tooltip 的核心数值——**当前等级的法力、冷却、施法距离、范围**。玩家学技能/出装时无法在悬停时判断耗蓝、冷却、能否够到目标。

## 方案

用原生 `title`(跨 HUD 每帧重建可靠,无需对抗 innerHTML 重建)承载增强文本:

- 技能:`buildAbilityTooltip(def, lvl)` 纯函数——名称(大招标注)+ 当前等级 法力/冷却/施法距离/范围 + 描述;未学(lvl 0)预览 1 级数值并标注「1级」;被动/无目标不显示施法距离;等级超数组长度取末项。
- 物品:主动物品内联补 法力/冷却/施法距离 行。

## 改动

- `src/ui/abilityTooltipModel.ts`(新):纯函数 `buildAbilityTooltip`。
- `src/ui/hud.ts`:`abilitySlot` 的 `title` 改用 `buildAbilityTooltip` + 学习提示 + 神杖说明;`itemSlot` 主动物品 tooltip 内联补数值行。
- 覆盖测试:`tests/abilityTooltipModel.test.ts`(6)——已学/未学预览/大招/被动无距离/等级钳制/缺值不报错。

## 验证

- typecheck 通过;完整套件 0 失败。
- 真实读取 DOM title 端到端:Liya 冰霜新星(2级)悬停显示「冰霜新星 · 法力 120 · 冷却 10s · 施法距离 700 · 范围 400 · 在目标区域引爆寒霜,伤害并减速敌人。」

## 后续(留档)

- 富样式悬停弹窗(替代原生 title)——需先解决 HUD 每帧重建下的悬停态保持。
- 技能/物品当前等级伤害数值(需各技能在 def 暴露伤害表)。
