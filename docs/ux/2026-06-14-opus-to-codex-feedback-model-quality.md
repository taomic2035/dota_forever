# Opus → Codex Feedback (2026-06-14): In-game 3D model quality is the #1 user pain

> 给 GPT/Codex 的反馈。TL;DR(中文):用户在 **3D 实战模式**实测,反馈视觉「太糙、基本不可用」。
> 根因是**游戏内英雄/单位模型本体偏方块化(纸盒人)**——不是 V10-V17 的运行时表现层,而是
> hero3dFactory / modelGen 的**基础几何与材质**。请按下文在**真实对局镜头**下精化经典英雄模型。

---

## Status (what's already integrated & working)

- **V6–V17 全部已并入 main**:resource3d/hero3d 契约 + preview + 运行时 helper(motion/surface/
  hero/unit/map/combat-FX),全量 **1243 测试绿**,build 通过。契约/preview 层质量很好,纪律(零 sim 改动)完美。
- **镜头已由 Opus 修好**:3D 默认 zoom 1.4→0.62(显示宽 ~470→~1100 世界单位)、俯角 48.6°→56°,
  现在能看到英雄 + 周边战场。
- **操作反馈/属性/引导/起始物品/BGM** 已由 Opus 补齐(落点脉冲、HUD 魔抗/移速/攻速、onboarding、起始 TP、原创 BGM)。

## The #1 remaining pain (from a live 3D playtest)

用户在 `?mode=play&hero=rein&renderer=3d` 实测,核心抱怨是**视觉太糙**。具体:
- **英雄/单位模型读起来像方块/纸盒**(箱体躯干、平面披风、占位感),在实战镜头下轮廓不清、像 placeholder。
- 这是判断游戏「可玩/商用」与否的第一观感门槛。

## Root analysis (重要 — 别被 preview 误导)

1. **你加的运行时表现 helper(V10-V17)是契约 + preview 层**:`updateResourceRuntimeMotion/Surface/
   MapPresentation/UnitPresentation/FxReadability`、`updateHeroRuntimePresentation`。
   游戏内渲染器 `src/render3d/renderer3d.ts` **并未逐帧调用它们**。
2. 游戏内英雄走 `createHero3DModel`(hero3dFactory)的**静态几何**;非英雄走 `modelGen.buildHumanoid`。
   → **玩家在游戏内看到的 = 基础程序化模型几何/材质**,V10-V17 的运行时脉冲游戏内不显现
   (即便接入,也是细微动效,改不动「方块感」)。
3. 所以 **preview 路由比游戏内好看**;用户判的是游戏内,即基础几何。

## What's needed (highest value, 请按此做)

### 1. 精化「基础」程序化英雄几何(最高优先)
针对 hero3dFactory `BASE_CLASSIC_HERO3D_ASSETS[].model.parts` + 共享部件(`src/render/hero3dAssets.ts`):
- 用**圆角/倒角/锥形/胶囊/车削(lathe)/挤出**形体替代箱体躯干与四肢;给出比例与轮廓。
- **更强的逐英雄剪影辨识度**,要在**对局镜头**下可读(不只是 preview 近景)。
- **更好的材质**(PBR 深度、避免大面积平涂)。

### 2. 按「真实对局镜头」调,而非 preview 近景
游戏内 3D 镜头参数(请据此调模型可读性/比例):
- `THREE.PerspectiveCamera(fov=40)`(`src/render3d/scene.ts:33`)
- 相机距离 `dist = 900 / zoom`,**默认 zoom = 0.62** → 视野约 **1100 世界单位宽**
- 俯角 `pitch = Math.PI * 0.31 ≈ 56°`(`scene.ts:73`)
- 英雄整体缩放约 **1.5×**(`renderer3d.ts` HERO_MODEL_SCALE)
- ⚠️ preview 路由镜头近得多;preview 里好看的模型在对局里会显小/显糙。**请在对局视图验收**。

### 3. 职责划分
- **你(Codex)**:10 个经典英雄的 hero3d 资产(rein/liya/zola/aili/gorm/grosh/kai/chenblade/olan/morphis)
  —— 这是用户实测(rein)看到的,请优先精化。
- **Opus(我)**:`src/render3d/modelGen.ts`(其余 102 英雄 + 小兵/野怪程序化造型,同样偏方块)
  —— 我可同步精化。若你愿一并定个「程序化人形精化规范」我照做,保持风格统一。

### 4.(可选)若想让 V10-V17 运行时表现在游戏内生效
请暴露**一个统一的逐单位入口**,如 `updateUnitRuntime(root, elapsedMs)`,内部分派 motion/surface/
unit-presentation,这样 renderer3d 能在每单位每帧调一次。目前的分子系统 helper 不便接线。

## Constraints (不变)

- 100% 原创程序化内容(IP 安全;无 Blizzard/Valve 资产/命名)。
- Three.js,零手工二进制资产(程序化几何/材质)。
- **不碰 sim/gameplay**(presentation-only)—— 这点你一直做得很好,请保持。

## How to verify it lands

- **别只看 preview**(`?mode=resource3d-preview`)。
- 用 `?mode=play&hero=rein&renderer=3d` 在**默认镜头**下验收 —— 模型必须在**那里**好看。
