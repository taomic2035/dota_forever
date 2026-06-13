# 3D V3 Resource Polish Summary

日期: 2026-06-13
状态: V3 非英雄资源视觉增量,范围限定为 3D 素材规格 / 程序纹理 / 实战动作表现

## Player-Facing Changes

- 非英雄 resource3d 样本进入 V3 表现层:
  - 每个资源部件带 `material` 元数据,区分 cloth / leather / wood / stone / metal / crystal / energy / water / foliage / paper / shadow。
  - 每个资源部件带 `detail` 元数据,区分 trim / rune / edgeWear / scalePattern / leafVein / circuit / bannerGlyph / liquidRipple / sparkCore。
  - 每个资源资产带 `texture.detailLevel` 和多层 `texture.overlays`。
- 程序纹理升级:
  - 统一增加 micro grain、motif ink、rim trim、edge wear、emissive hotspots、material mask。
  - priority 资源类别至少 detail level 4,覆盖兵线单位、野怪、Boss、建筑、召唤物、地图元素、地形块、技能 FX、弹道、状态效果。
- 非英雄实战动作升级:
  - `pulse` 资源会呼吸式缩放并增强发光。
  - `spin` 资源会围绕 Y 轴缓慢旋转。
  - `float` 资源有更明显的悬浮起伏。
  - `impact` 资源攻击时前扑、压缩和发光增强。
  - `ambient` 资源有轻微浮动、摆动和环境发光。
- 部件级动作升级:
  - 旗帜/布料部件会独立摆动。
  - 符文环部件会独立旋转和轻微脉冲。
  - 能量梁/电路线部件会拉伸、轻摆并增强发光。
  - 宝珠/核心部件会悬浮和脉冲。
  - 武器部件在攻击进度中会有额外前扑和倾斜。
- 3D 战斗 FX 升级:
  - `Fx3D` 从单一球/环/柱升级为多层 group: core / glow / accent / particle / trail。
  - 火系生成 ember spark,冰系生成 shard,雷系生成 jagged beam + spark trail,毒/自然生成 cloud field,圣光生成 halo,奥术生成 rune。
  - 技能弹道读取 `Projectile.style`,普攻和技能弹道都会使用多层发光体和 trail。

## Implementation Notes

- `src/render/resource3dAssets.ts`
  - 新增 `Resource3DMaterialKind`、`Resource3DDetailKind`、`Resource3DTextureOverlay`、`Resource3DTextureSpec`。
  - 所有 `RESOURCE3D_SAMPLE_ASSETS` 自动补齐 V3 `texture`、part `material`、part `detail`。
  - priority 资源类别统一提升到 higher detail texture contract。
- `src/render/resource3dFactory.ts`
  - 新增 `resourceMaterialProfile(material, hasEmissive)` 纯函数。
  - 新增 `resourcePartAnimationUserData(part)` 纯函数,把 part 元数据写入 Three `userData` 供 runtime 识别。
  - 根据材质设置 roughness / metalness / emissiveIntensity。
  - `drawTexture` 消费 `texture.overlays` 和 `detailLevel`,在 CanvasTexture 中绘制微颗粒、边饰、磨损、符号墨线和热点。
- `src/render3d/resourceMotion.ts`
  - 新增纯函数 `resourceMotionState`,把 `Resource3DMotion` + 当前动画状态转换为 bob / rotate / scale / squash / emissive pulse。
  - 新增纯函数 `resourcePartMotionState`,按 part kind/detail/material 输出局部 bob / rotate / scale / emissive boost。
- `src/render3d/resource3dModel.ts`
  - 实战 resource3d 单位模型消费 `resourceMotionState`。
  - 收集 `resourcePart` userData,记录初始 transform,每帧叠加部件级局部动作。
  - 该变化只影响模型局部变换和材质发光强度,不改变 sim 坐标、碰撞、指令或战斗逻辑。
- `src/render3d/fx3dVisual.ts`
  - 新增纯函数 `fx3DVisualState`,把 `FxStyle.family/pattern/motion` 转换为 3D FX 图层合同。
  - 覆盖 burst / beam / aoe / projectile 四类几何入口。
- `src/render3d/fx3d.ts`
  - 消费 `fx3DVisualState`,为实战技能事件创建多层 Three.js group。
  - 递归 fade/dispose 特效对象,避免遗留 geometry/material。
  - 弹道池由单球升级为多层 group,技能弹道读取 `Projectile.style`。

## Verification

Automated tests:

```text
npm test -- tests/resource3dAssets.test.ts tests/resource3dFactory.test.ts
2 files passed
8 tests passed
```

```text
npm test -- tests/render3d/resourceMotion.test.ts
1 file passed
5 tests passed
```

```text
npm test -- tests/render3d/resourceMotion.test.ts tests/resource3dFactory.test.ts tests/resource3dAssets.test.ts
3 files passed
14 tests passed
```

```text
npm test -- tests/render3d/resourceMotion.test.ts tests/resource3dFactory.test.ts tests/resource3dAssets.test.ts tests/render3d/commandQueue3d.test.ts tests/render3d/statusFx.test.ts
5 files passed
19 tests passed
```

```text
npm test -- tests/render3d/fx3dVisual.test.ts tests/fxstyle.test.ts tests/fxlayer.test.ts
3 files passed
40 tests passed
```

```text
npm run typecheck
passed
```

```text
npm run build
passed
Vite still reports the existing large bundle warning.
```

```text
npm test -- --run
101 files passed
867 tests passed
```

Runtime preview:

```text
Playwright @ http://localhost:5187/?mode=resource3d-preview
Canvas rendered: true
Console/page errors: none
Screenshot: docs/screenshots/ux-3d-v3-resource-material-motion.png
```

```text
Playwright @ http://localhost:5188/?mode=resource3d-preview
Canvas rendered: true
Resource labels visible: 8
Console/page errors: none
Screenshot: docs/screenshots/ux-3d-v3-resource-part-motion.png
```

```text
Playwright @ http://127.0.0.1:5189/?mode=play&hero=zola&renderer=3d&seed=42&speed=0
Injected FX: fireblast, frostnova, lightning, miasma, purification, arcanebolt
Scene objects: 2075
Canvas count: 2
Console/page errors: none
Screenshot: docs/screenshots/ux-3d-v3-fx-polish.png
```

## Remaining UX Debt

- V3 仍是程序化低多边形资产;未来如果引入 GLB/PBR 资源,这些 `material/detail/texture` 字段可作为导入映射合同。
- resource3d 预览页目前主要展示分类样本,还没有专门的 before/after 纹理检查面板。
- 部件级动作现在已有通用规则;Boss 爪击、攻城车投射臂、旗帜布料飘带等家族专属动画仍可继续细化。
- 3D FX 现在已有多层几何语言;真正的 GPU particle、贴图序列、光照体积和音频同步仍是后续生产管线。

## Opus Handoff

### What

This slice upgrades non-hero 3D resources for V3:

- V3 material/detail metadata on every resource3d part.
- Higher-density procedural texture overlays for every resource asset.
- PBR-ish material profile mapping in the factory.
- Pure resource motion state for pulse / spin / float / impact / ambient.
- Runtime application of resource motion to lane creeps, neutrals, bosses, buildings-backed resources, couriers, summons, map props, projectiles, and FX samples.
- Part-level motion for banners, rings, beams, orbs, foliage, liquid, and weapon-like parts.
- Runtime 3D battle FX layers for burst / beam / AoE / projectile, driven by existing `fxStyle` family and pattern metadata.

### Why

Hero V2 polish made the first 10 heroes feel richer, but the surrounding world assets still used a flatter V1/V2 resource language. V3 raises the baseline for creeps, neutrals, summons, map elements, projectiles, and UI-adjacent resource samples so the scene reads as one cohesive game art direction.

### Tradeoff

- Chose metadata-driven procedural polish instead of external asset imports, preserving current repo simplicity and original-IP boundaries.
- Chose metadata-driven part-level animation instead of skeleton animation, keeping runtime lightweight while giving models more local motion and detail.
- Chose layered geometry FX instead of external particle atlases, so the current repo stays self-contained and easy for Opus to merge.
- Kept all changes renderer/asset-side; no sim, combat, pathing, targeting, or Opus mainline behavior is changed.

### Open Questions

- Should V4 prioritize family-specific part animation, such as boss claw swipes and siege arm throws, or extend V3 metadata to remaining non-preview runtime-only effects first?
- Should resource3d preview expose an art-review toggle for material/detail overlays?
- Should priority categories get handcrafted per-family texture recipes instead of the current motif-derived recipe?

### Next Action

Please review and merge as a UI/asset/controls-adjacent visual slice. Recommended review focus:

- `src/render/resource3dAssets.ts` V3 asset contract.
- `src/render/resource3dFactory.ts` material profile and CanvasTexture overlay generation.
- `src/render3d/resourceMotion.ts` pure resource animation state.
- `src/render3d/resource3dModel.ts` runtime application remains visual-only.
- `src/render3d/fx3dVisual.ts` 3D FX layer contract.
- `src/render3d/fx3d.ts` runtime 3D FX group creation.
- Screenshot evidence: `docs/screenshots/ux-3d-v3-resource-material-motion.png`.
- Part-motion screenshot evidence: `docs/screenshots/ux-3d-v3-resource-part-motion.png`.
- FX screenshot evidence: `docs/screenshots/ux-3d-v3-fx-polish.png`.
