# Hero3D Preview Handoff for Opus

Date: 2026-06-13
Current update: 2026-06-14 V20 hero runtime bridge in real play route
Current branch/worktree: `main` at `/Users/taomic/vibecoding/dota_forever`
Preview URL: `http://127.0.0.1:<port>/?mode=hero3d-preview`
Gameplay verification URL: `http://127.0.0.1:<port>/?mode=play&hero=rein&renderer=3d`
Latest screenshot: `docs/screenshots/ux-3d-v20-hero-runtime-bridge.png`
V20 summary: `docs/ux/2026-06-14-3d-v20-hero-runtime-bridge-summary.md`
V19 summary: `docs/ux/2026-06-14-3d-v19-hero-gameplay-refinement-summary.md`
Previous gameplay screenshot: `docs/screenshots/ux-3d-v19-hero-gameplay-refinement-clean.png`
V18 gameplay screenshot: `docs/screenshots/ux-3d-v18-hero-gameplay-model-quality.png`
Previous hero runtime screenshot: `docs/screenshots/ux-3d-v14-hero-runtime-presentation.png`
Legacy screenshot: `docs/screenshots/ux-hero3d-preview.png`

## What

This branch adds a Three.js in-game hero asset preview for the first 10 classic heroes.

Changed files:

- `package.json`, `package-lock.json`
  - Adds `three` and `@types/three`.
- `src/main.ts`
  - Adds a preview-only route: `?mode=hero3d-preview`.
  - Existing menu/play/spectate behavior is unchanged.
- `src/render/hero3dAssets.ts`
  - New data contract for 10 hero asset specs.
  - Heroes: `rein`, `liya`, `zola`, `aili`, `gorm`, `grosh`, `kai`, `chenblade`, `olan`, `morphis`.
  - Each hero has model parts, texture channels, action clips, silhouette metadata, and preview camera metadata.
  - V19 adds `gameplayCameraRefinementParts(...)` so every classic hero gets modeled far-camera detail:
    - layered chest plates;
    - crown/crest bevels;
    - weapon-head highlights;
    - shoulder bevels;
    - cloth folds;
    - focus gem insets.
- `src/render/hero3dFactory.ts`
  - New procedural Three.js model factory.
  - Builds low-poly meshes, generated canvas textures, emissive/glow shells, outlines, and animation clips.
  - V14 adds `root.userData.runtimeAction`, `root.userData.runtimeSurface`, and `updateHeroRuntimePresentation(root, actionName, elapsedMs)`.
  - V14 tags hero parts and materials with runtime metadata for action/surface response and future GLB/PBR replacement.
  - V18 answers Opus model-quality feedback by improving the actual in-game `createHero3DModel(...)` path:
    - body parts use rounded/capsule geometry instead of box-like placeholders;
    - Rein-style shields/books/plates use bevel-enabled extruded plates;
    - capes and banners use curved cloth panels;
    - core materials use smooth shading for better play-camera volume;
    - each runtime part is tagged with `gameplayGeometryProfile`, `gameplaySilhouetteWeight`, and `gameplayCameraRead`.
  - V18 adds `root.userData.gameplayModelQuality` for the real play-camera contract: `fov=40`, `defaultZoom=0.62`, `pitch=Math.PI * 0.31`, `heroModelScale=1.5`.
  - V19 extends `root.userData.gameplayModelQuality` with `refinementLayer`, `refinementLayerParts`, and `coreMaterialContrastBands`.
- `src/render3d/hero3dModel.ts`
  - Bridges the fine hero assets into the real 3D play-route `UnitModel` contract.
  - V20 keeps existing `AnimationMixer` clip playback and also calls `updateHeroRuntimePresentation(...)` from `applyPose(...)`.
  - V20 adds `built.root.userData.gameplayRuntimeBridge` so Opus can inspect whether the real play route is consuming the runtime helper.
  - V20 normalizes `built.root.userData.baseScale` to `[1, 1, 1]` after gameplay placement, preventing helper scale pulses from double-applying the asset scale.
- `src/ui/hero3dPreview.ts`
  - New full-screen Three.js hero showcase.
  - Includes a hero-selection-stage layout, action buttons, nameplates, lighting, fog, ground stage, background columns, and per-hero pads/light columns.
  - V14 calls `updateHeroRuntimePresentation(...)` every frame and exposes `window.__hero3dPreview.runtimePresentation`.
- `tests/hero3dAssets.test.ts`
  - New asset contract tests.
  - Locks the first 10 hero keys, texture/action contract, unique silhouettes, and minimum art-detail thresholds.
  - V19 locks gameplay-camera refinement coverage: enough `v19` parts, torso layering, head/crest detail, wide silhouette detail, and material contrast.
- `tests/hero3dFactory.test.ts`
  - Locks V14 runtime action/surface contracts, material tags, non-drifting cast pulses, invisible/stunned/death states, and surface profile terms.
  - V18 adds red-to-green checks that classic heroes no longer ship paper-box gameplay geometry profiles, and that Rein's `heavy cuirass`, `tower shield`, and `royal back banner` use rounded/extruded/curved gameplay geometry.
  - V19 locks that `createHero3DModel(...)` actually outputs the refinement parts and exposes them through `root.userData.gameplayModelQuality`.
- `tests/render3d/hero3dModel.test.ts`
  - V20 locks that the real gameplay `buildHero3DUnitModel(...).applyPose(...)` path routes through `updateHeroRuntimePresentation(...)`.
  - Verifies `cast` pose produces `runtimeAction.activeAction === "cast_q"`, runtime animated parts/materials, normalized base scale, and `gameplayRuntimeBridge` metadata.
- `tests/hero3dPreview.test.ts`
  - Locks V14 preview smoke aggregation for runtime action/surface handoff checks.
- `docs/screenshots/ux-hero3d-preview.png`
  - Current visual evidence screenshot for review.
- `docs/screenshots/ux-3d-v14-hero-runtime-presentation.png`
  - Latest V14 runtime presentation evidence for review.

No `src/sim/**` files were changed.

## Why

The previous direction using separate generated images was rejected. The requirement is game-ready, in-project assets adapted for Three.js: model, texture, and actions, with a direct preview instead of separate concept images.

This implementation creates a working preview and an asset contract now, so Opus can merge it without waiting for final GLB production. It also gives a clear future seam for replacing procedural geometry with real GLB assets while preserving:

- hero keys,
- texture channel names,
- action names,
- preview route,
- validation tests.

V18 specifically responds to Opus feedback from `docs/ux/2026-06-14-opus-to-codex-feedback-model-quality.md`: the user judged the real 3D play route, not the hero preview route. The high-value fix is therefore the static base hero geometry in `hero3dFactory`, not another preview-only runtime helper.

V19 continues that same feedback response. V18 removed the worst box-placeholder geometry profiles; V19 adds visible modeled detail on top of the base volumes so the ten classic heroes do not read as a single rounded body with small decorative attachments in the default play camera.

V20 handles the next real-play gap: V14 runtime material/part response previously existed as a helper and preview smoke contract, but the production `render3d/hero3dModel` bridge only drove `AnimationMixer` clips. The real play route now consumes both, so cast/channel/status/death reads get the richer surface pulse and part response.

## Tradeoff

Chosen approach: procedural Three.js prototype with strict asset metadata.

Why this approach:

- Fast to review in the browser.
- Does not depend on external art files yet.
- Keeps hero identity and animation contracts explicit.
- Avoids touching main simulation logic while Opus is working on core game flow.

Alternatives considered:

- Generate standalone bitmap hero images.
  - Rejected because the user specifically asked for game assets and direct preview, not separate pictures.
- Create final GLB/FBX assets immediately.
  - Deferred because this branch is for UX/art-direction validation and integration contract. Final GLB production needs a separate asset pipeline.
- Integrate the 3D models directly into gameplay rendering now.
  - Deferred to avoid colliding with Opus mainline logic. This branch keeps the work as a route-gated preview.

Known cost:

- Importing Three.js in `src/main.ts` currently increases the main Vite bundle and triggers the existing chunk-size warning.
- Recommended follow-up: lazy-load `hero3dPreview.ts` behind `mode=hero3d-preview` before merging into a production gameplay path.

## Open Questions

1. Should `chenblade` stay as the visual key for `辰/刃舞者`, or should it be renamed to the simulation key if Opus has standardized it differently?
2. Should this preview route remain a developer-only query mode, or become a real hero gallery/asset browser later?
3. Should the procedural assets remain in repo as fallback/debug assets after GLB assets arrive?
4. What final art pipeline should own real assets: `public/assets/heroes/<heroKey>/model.glb` plus PBR textures, or an imported source-art directory with build-time processing?
5. Should Three.js be split into a separate lazy chunk before merge, or is the current preview branch acceptable as an intermediate handoff?

## Next Action

Suggested Opus merge flow:

1. Merge dependencies first and resolve `package-lock.json` normally.
2. Check `src/main.ts` for conflicts with any new mode-routing or boot changes.
3. Keep `src/sim/**` untouched from this branch unless Opus intentionally wires hero assets into gameplay.
4. Run:

```bash
npm test -- tests/hero3dFactory.test.ts tests/hero3dPreview.test.ts tests/hero3dAssets.test.ts
npm run build
npm test -- --pool=forks --maxWorkers=1
```

5. Open the preview:

```text
http://127.0.0.1:<port>/?mode=hero3d-preview
```

6. Open the real gameplay verification route:

```text
http://127.0.0.1:<port>/?mode=play&hero=rein&renderer=3d
```

7. Review these integration points:

- `CLASSIC_HERO3D_ASSETS.map(asset => asset.key)` matches the hero registry keys Opus wants to expose.
- `REQUIRED_HERO3D_ACTIONS` stays compatible with future GLB animation clip names:
  - `idle`
  - `walk`
  - `attack`
  - `cast_q`
  - `cast_w`
  - `cast_e`
  - `cast_r`
  - `hit`
  - `stunned`
  - `invisible`
  - `death`
- `REQUIRED_HERO3D_TEXTURES` stays compatible with future material pipeline:
  - `albedo`
  - `normal`
  - `orm`
  - `emissive`
- V14 runtime hooks stay compatible with future animation/material integration:
  - `root.userData.runtimeAction`
  - `root.userData.runtimeSurface`
  - `updateHeroRuntimePresentation(root, actionName, elapsedMs)`
  - `obj.userData.heroRuntimePart`
  - `material.userData.heroRuntimeSurfaceMaterial`
  - `window.__hero3dPreview.runtimePresentation`
- V18 gameplay-camera model-quality hooks for real play-route validation:
  - `root.userData.gameplayModelQuality`
  - `obj.userData.gameplayGeometryProfile`
  - `obj.userData.gameplaySilhouetteWeight`
  - `obj.userData.gameplayCameraRead`
- V19 gameplay-camera refinement hooks for real play-route validation:
  - `root.userData.gameplayModelQuality.refinementLayer`
  - `root.userData.gameplayModelQuality.refinementLayerParts`
  - `root.userData.gameplayModelQuality.coreMaterialContrastBands`
  - runtime parts whose `obj.userData.partName` starts with `v19 `
- V20 real-play runtime bridge hooks:
  - `root.userData.gameplayRuntimeBridge`
  - `root.userData.runtimeAction.activeAction`
  - `root.userData.runtimeActionAnimated`
  - `root.userData.runtimeSurfaceAnimated`
  - `root.userData.runtimeActionAnimatedParts`
  - `root.userData.runtimeSurfaceAnimatedMaterials`

## Verification Evidence

Latest verified commands in this worktree:

```text
npm test -- tests/render3d/hero3dModel.test.ts tests/hero3dFactory.test.ts tests/hero3dPreview.test.ts
3 files passed
9 tests passed
```

```text
npm run build
build passed
warning: Three.js keeps the output chunk above 500 kB
```

V20 red-to-green evidence:

```text
npm test -- tests/render3d/hero3dModel.test.ts
Before fix: 1 failed
- expected gameplayRuntimeBridge to match runtimeHelper updateHeroRuntimePresentation
```

Real play-route V20 evidence:

```text
URL: http://127.0.0.1:5229/?mode=play&hero=rein&renderer=3d&seed=42&speed=0
Console/page errors: none
Hero root: hero3d:rein found
gameplayRuntimeBridge.runtimeHelper: updateHeroRuntimePresentation
runtimeAction: cast_q
runtimeActionState: cast
runtimeActionAnimated: true
runtimeSurfaceAnimated: true
runtimeActionAnimatedParts: 32
runtimeSurfaceAnimatedMaterials: 106
maxRuntimePulse: 1.152091528901121
Screenshot: docs/screenshots/ux-3d-v20-hero-runtime-bridge.png
```

```text
npm test -- tests/hero3dAssets.test.ts tests/hero3dFactory.test.ts
2 files passed
16 tests passed
```

```text
npm test -- tests/hero3dAssets.test.ts tests/hero3dFactory.test.ts tests/hero3dPreview.test.ts
3 files passed
17 tests passed
```

```text
npm run build
build passed
warning: Three.js keeps the output chunk above 500 kB
```

```text
npm test -- --run
129 files passed
1260 tests passed
```

V19 red-to-green evidence:

```text
npm test -- tests/hero3dAssets.test.ts
Before fix: 1 failed
- rein needs enough gameplay-camera refinement pieces

npm test -- tests/hero3dFactory.test.ts
Before fix: 1 failed
- missing V19 refinement metadata on root.userData.gameplayModelQuality
```

Real play-route V19 evidence:

```text
URL: http://127.0.0.1:5228/?mode=play&hero=rein&renderer=3d&seed=42&speed=0
Canvas count: 3
Console/page errors: none
Onboarding overlay: dismissed for clean screenshot
Hero root: hero3d:rein found
V19 refinement parts: 7
V19 material bands: metal, leather, energy, cloth, crystal
Screenshot: docs/screenshots/ux-3d-v19-hero-gameplay-refinement-clean.png
```

```text
npm test -- tests/hero3dFactory.test.ts tests/hero3dPreview.test.ts tests/hero3dAssets.test.ts
3 files passed
15 tests passed
```

```text
npm run build
build passed
warning: Three.js keeps the output chunk above 500 kB
```

```text
npm test -- --run
106 files passed
925 tests passed
```

V18 red-to-green evidence:

```text
npm test -- tests/hero3dFactory.test.ts
Before fix: 2 failed
- missing root.userData.gameplayModelQuality
- missing gameplayGeometryProfile on Rein body/shield/cape

After fix:
1 file passed
6 tests passed
```

Real play-route evidence:

```text
URL: http://127.0.0.1:5216/?mode=play&hero=rein&renderer=3d
Canvas: 1440 x 900, WebGL context present
Screenshot: docs/screenshots/ux-3d-v18-hero-gameplay-model-quality.png
```

```text
npm test -- tests/hero3dFactory.test.ts tests/hero3dPreview.test.ts tests/hero3dAssets.test.ts tests/resource3dFactory.test.ts tests/resource3dAssets.test.ts tests/resource3dPreview.test.ts tests/render3d/terrainDressing.test.ts tests/render3d/fx3dVisual.test.ts tests/render3d/fx3dRuntime.test.ts tests/render3d/resourceMotion.test.ts tests/render3d/commandQueue3d.test.ts tests/queuedOrders.test.ts
12 files passed
76 tests passed
```

Preview smoke evidence:

```json
{
  "count": 10,
  "keys": ["rein", "liya", "zola", "aili", "gorm", "grosh", "kai", "chenblade", "olan", "morphis"],
  "actions": ["idle", "walk", "attack", "cast_q", "cast_w", "cast_e", "cast_r", "channel", "hit", "stunned", "invisible", "death"],
  "textureChannels": ["albedo", "normal", "orm", "emissive"],
  "runtimePresentation": {
    "runtimeActionRoots": 10,
    "runtimeSurfaceRoots": 10,
    "animatedRoots": 10,
    "actionReactiveParts": 232,
    "surfaceMaterials": 819,
    "glintLayers": 347,
    "actionStates": { "cast": 10 },
    "shaderIntents": {
      "hero-armor-rim-sweep": 3,
      "hero-arcane-fresnel": 3,
      "hero-cloth-breathe": 1,
      "hero-stone-weight": 1,
      "hero-shadow-veil": 2
    }
  }
}
```

## Merge Notes

- Main collision risk: `src/main.ts`.
- Dependency collision risk: `package.json` / `package-lock.json`.
- Bundle warning is expected because Three.js is currently statically imported.
- V18 remains visual-only; no simulation combat/pathing/balance logic changed.
- Opus feedback also calls out `src/render3d/modelGen.ts` for the remaining 102 heroes plus small units/neutrals. Codex V18 covers the 10 classic `hero3dFactory` assets; Opus can apply the same rounded/extruded/profile pattern to `modelGen.buildHumanoid`.
- The screenshot is intentional evidence and should stay under `docs/screenshots/`.
