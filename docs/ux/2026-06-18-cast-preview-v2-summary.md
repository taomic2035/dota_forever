# 施法预览 V2:射程 / 走近施法 / 非法 三态反馈

日期: 2026-06-18
范围: 施法/物品预览的合法性表达(对应 UX 路线图 Slice 3 的「超距离」反馈缺口)。

## 问题

V1(`abilityPreviewShape`)已能输出 unit/point/area/line 的预览几何,但合法性表达不完整:

- `previewCast`/`previewItem` 对 **point/area/line 永远 `valid = true`**,从不检查光标是否在施法距离内。
- 结果:把 AoE/线形技能指向射程外,预览仍显示「合法蓝」,误导玩家——实际 sim 会让英雄**走近到射程后再施放**(`sim/abilities` 的射程检查与走位:超距时 `moveAlongPathTo(aim)` 保持 order)。
- unit 目标只区分「有/无目标」,也不区分「在射程内立即施法」与「超距走近施法」。

## 方案

预览只需**诚实反映 sim 已有的「走近施法」语义**,不改 sim 行为。引入三态:

- `ready`(蓝 `80,170,255`):合法且在射程内 → 立即施放。
- `walk`(琥珀 `255,183,77`):合法但超出射程 → 英雄走近到射程后再施放。
- `invalid`(红 `255,70,86`):单位目标处无合法可施单位 → 不会施放。

## 改动

- `src/engine/castValidity.ts`(新):纯函数 `castStatus({origin,aim,range,requiresTarget,hasTarget})`;`resolveCastStatus`(渲染回落:优先 status,旧 `valid` 兼容);`CAST_STATUS_RGB` + `castStatusHex`(2D rgba 与 3D hex 共用同一色,两端语义一致)。
- `src/ui/uxFeedback.ts`:`TargetingState` 增 `status?: CastStatus`;保留旧 `valid` 兼容。
- `src/main.ts`:`previewCast`/`previewItem` 计算 `status`(unit 模式 aim 取目标中心,否则取光标),写入 targeting;返回 `status !== 'invalid'`。
- `src/render/renderer.ts`(2D)/`src/render3d/renderer3d.ts`(3D):距离环 / AoE / 线形按 status 取三色。
- 覆盖测试:`tests/castValidity.test.ts`(11)——三态边界、单位目标优先级、range<=0 不触发走近、颜色一致性。

## 验证

- typecheck 通过;完整套件 171 文件 / 1461 测试 0 失败。
- 真实输入端到端(Liya 冰霜新星 point/AoE,射程 700):光标 dist 96 → `ready`(蓝);dist 1355 → `walk`(琥珀)。截图确认距离环与 AoE 圆颜色随射程内外切换。

## 后续(V2.1,留档非必修)

- cone/vector 形预览(当前无使用方)。
- unit 目标对 `invulnerable`/`untargetable`/魔免-非穿透-减益 判 `invalid`(当前 sim 会拒,预览暂按 has-target 处理)。
- 不可达路径(寻路失败)的独立提示,区别于单纯超距走近。
