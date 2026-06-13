# 3D V2 UX Polish Summary

日期: 2026-06-13
状态: V2 视觉表现增量,范围限定为 3D 模型 / 程序纹理 / 动作姿态 / 状态效果

## Player-Facing Changes

- 首批 10 个经典英雄的 3D asset 进入 V2 表现层:
  - 每个英雄至少 18 个模型部件。
  - 每个部件带 `material` 与 `detail` 元数据,用于区分 cloth / leather / metal / crystal / energy 等材质。
  - 每个纹理通道增加 `detailLevel` 和多层 `overlays`,程序纹理会画出边饰、噪声、符文、热区和材质遮罩。
- 动作集扩展:
  - 保留 idle / walk / attack / QWER cast / hit / death。
  - 新增 channel / stunned / invisible 动作 clip。
- 程序化姿态扩展:
  - cast 暴露 `castGlow`。
  - channel 暴露 `channelPulse`。
  - hit / stunned / invisible 暴露可渲染状态字段。
- 3D runtime 状态视觉升级:
  - 受击短闪白。
  - 眩晕琥珀色脉冲。
  - 隐身紫色微光与半透明。
- 3D 出生点/泉水重叠单位现在会做渲染层视觉散开,避免多个英雄在同一 sim 坐标上互相遮挡。
- 3D 模式现在镜像 Shift 队列路线:
  - 当前命令和 queued 命令使用同一份 `commandQueuePath` 数据源。
  - 路线以贴地绿色光带表现,终点有脉冲节点和小旗标。
  - 只在选中单位存在 queued orders 时显示,不污染普通移动状态。
- 施法/眩晕状态增加独立 Three 挂件:
  - `status-fx:cast-glow`
  - `status-fx:stun-ring`
  - `status-fx:invis-shell`

## Implementation Notes

- `src/render/hero3dAssets.ts`
  - 扩展 `Hero3DPartSpec`、`Hero3DTextureSpec`、`Hero3DActionSpec`。
  - 为 polish parts 自动补齐 V2 材质与细节元数据。
  - 增加 universal trim / clasp / battle-wear parts,让所有首批英雄达到更高模型密度。
- `src/render/hero3dFactory.ts`
  - 根据 `material` 选择 roughness / metalness / emissiveIntensity。
  - 根据 texture overlays 生成多层 CanvasTexture。
  - 支持 channel/status 动作 clip。
- `src/render3d/pose.ts`
  - 新增 cast/channel/status 输出字段,保持纯数据可测。
- `src/render3d/visualState.ts`
  - 新增纯函数 `visualStateFor3D`,统一受击 / 眩晕 / 隐身的 emissive 与 opacity。
- `src/render3d/renderer3d.ts`
  - 只读 sim 状态,把 `visualStateFor3D` 输出应用到模型材质。
  - 把 hit/stun/invisible 状态传给模型姿态。
- `src/render3d/statusFx.ts`
  - 新增状态挂件的纯状态计算与 Three 对象创建/应用函数。
- `src/render3d/stackOffset.ts`
  - 新增渲染层重叠单位视觉散开,只影响模型显示位置,不改 sim 坐标。
- `src/render3d/commandQueue3d.ts`
  - 新增 3D 队列路线纯状态计算与 pooled Three 对象应用函数。
  - 复用 `src/render/commandQueuePath.ts`,保证 2D/3D 对 queued order 的解释一致。
- `src/render3d/hero3dModel.ts`
  - 精细英雄素材优先播放 hit / stunned / invisible / channel 动作。
- `src/render3d/unitModel.ts`
  - 程序化人形模型消费 `torsoTwist`,让攻击/施法更有身体方向感。

## Verification

Automated tests:

```text
npm test -- tests/hero3dAssets.test.ts tests/render3d/pose.test.ts tests/render3d/visualState.test.ts
3 files passed
16 tests passed
```

```text
npm test -- tests/hero3dAssets.test.ts tests/resource3dAssets.test.ts tests/render3d/modelParts.test.ts tests/render3d/pose.test.ts tests/render3d/visualState.test.ts
5 files passed
31 tests passed
```

```text
npm test -- tests/render3d/stackOffset.test.ts tests/hero3dAssets.test.ts tests/render3d/statusFx.test.ts tests/render3d/pose.test.ts tests/render3d/visualState.test.ts
5 files passed
23 tests passed
```

```text
npm test -- tests/render3d/commandQueue3d.test.ts tests/commandQueuePath.test.ts tests/render3d/statusFx.test.ts tests/render3d/stackOffset.test.ts
4 files passed
11 tests passed
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
98 files passed
851 tests passed
```

Runtime smoke:

```text
Playwright @ http://127.0.0.1:5185/?mode=spectate&renderer=3d&seed=42&speed=2
Renderer: Renderer3D
Models: 10
Units: 48
Console/page errors: none
Screenshot: docs/screenshots/ux-3d-v2-visual-polish.png
```

```text
Playwright @ http://127.0.0.1:5185/?mode=play&hero=zola&renderer=3d&seed=42&speed=0
Renderer: Renderer3D
Selected hero: 佐拉
Models: 10
Visual stack spread: 5 allied fountain heroes are render-offset around the spawn point.
Console/page errors: none
Screenshot: docs/screenshots/ux-3d-v2-hero-polish.png
```

```text
Playwright forced cast + stun preview @ http://127.0.0.1:5185/?mode=play&hero=zola&renderer=3d&seed=42&speed=0
status-fx:stun-ring visible
status-fx:cast-glow visible
Console/page errors: none
Screenshot: docs/screenshots/ux-3d-v2-status-fx.png
```

```text
Playwright forced Shift-queue route @ http://localhost:5186/?mode=play&hero=zola&renderer=3d&seed=42&speed=0
Renderer: Renderer3D
Queued orders: 2
3D queue root visible: true
Visible segments: 3
Visible nodes: 3
Console/page errors: none
Screenshot: docs/screenshots/ux-3d-shift-queue-route.png
```

## Remaining UX Debt

- V2 目前强化首批 10 个精细英雄;后续 102 个参数化英雄还需要同等级个性化部件密度。
- 眩晕星环 / 施法光球已经有独立 mesh 挂件;后续可以升级为粒子池 / 技能族专属 FX。
- Terrain 3D 的高台 / 树 / 地标完整表现仍属于 V4。
- 默认渲染器仍保持 2D,3D 继续通过 `?renderer=3d` 验证。
- 队列路线节点目前用几何旗标而不是文字编号;如果 3D 后续需要完全复刻 2D 编号,建议改成 CanvasTexture billboard。

## Opus Handoff

### What

This slice improves the second-pass 3D UX layer:

- richer hero model part density for the first 10 classic heroes;
- material/detail metadata for every hero part;
- higher-density procedural texture overlays;
- expanded action clips for channel / stunned / invisible;
- richer pure pose outputs for cast/channel/hit/stun/invisibility;
- unified renderer-side 3D visual state for hit/stun/invisibility.
- render-only spread for visually stacked units.
- independent status FX objects for cast glow, stun ring, and invisible shell.
- 3D Shift-queue route preview using the shared 2D/3D command queue path source.

### Why

The first 3D pass proved that the renderer and asset pipeline work, but the models still needed stronger material language and animation feedback to feel like game-ready assets. This batch turns "more beautiful" into explicit asset contracts and keeps the implementation renderer-only so opus can merge without touching mainline gameplay logic.

### Tradeoff

- Chose metadata-driven procedural polish instead of importing external models or textures, preserving the original IP boundary and build simplicity.
- Chose CanvasTexture overlays over a full material authoring pipeline; good enough for current low-poly style and easy to test.
- Chose material emissive/status clips for V2 effects; full independent particle/mesh status effects remain a later V3/V4 layer.
- Chose geometric 3D route ribbons and flag nodes instead of text billboards, keeping the route readable from an angled camera without adding font/texture lifecycle.

### Open Questions

- Should V3 extend this V2 material/detail contract to all resource3d assets, or first finish the remaining 102 hero silhouettes?
- Should the 3D runtime expose a debug toggle for forcing hit/stun/invisible/cast screenshots?
- Should 3D become the default after V3 full-unit coverage, or wait until V4 terrain/fx/mini-map parity?

### Next Action

Please review and merge as a UI/asset/controls-adjacent visual slice. Recommended review focus:

- `src/render/hero3dAssets.ts` asset contract changes.
- `src/render/hero3dFactory.ts` procedural texture overlay generation.
- `src/render3d/pose.ts` and `src/render3d/visualState.ts` pure data outputs.
- `src/render3d/renderer3d.ts` status application remains read-only against sim state.
- `src/render3d/stackOffset.ts` only changes visual placement for stacked models, not unit positions.
- `src/render3d/commandQueue3d.ts` and `src/render/commandQueuePath.ts` keep Shift-queue visuals renderer-only and shared across 2D/3D.
