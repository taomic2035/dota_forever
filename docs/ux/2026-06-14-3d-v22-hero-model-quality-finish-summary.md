# V22 Hero Model Quality Finish Summary

Feedback source: `docs/ux/2026-06-14-opus-to-codex-feedback-model-quality.md`

Real-play evidence screenshot: `docs/screenshots/ux-3d-v22-hero-model-quality-real-play-clean.png`

## Why

Opus' feedback identifies the first-order user pain as in-game 3D hero model quality in `?mode=play&hero=rein&renderer=3d`. V18 removed the worst paper-box geometry profiles and V19 added a first gameplay-camera detail layer, but the default play camera still needed stronger anatomy and material-depth reads.

V22 adds a second finish pass to the actual `createHero3DModel(...)` asset path, not only the preview route.

## What Changed

- `src/render/hero3dAssets.ts`
  - Adds `playCameraFinishingParts(...)` to every classic hero:
    - left/right leg greaves so the lower body stops reading as one torso block;
    - near/far forearm guards for arm and weapon-side anatomy;
    - face highlight bevel for a stable head focal point at play zoom;
    - rear depth vane so silhouettes are not flat from the 56 degree camera;
    - hip cloth folds and front hem bevel for foreground material layers;
    - shoulder rim crown for an upper-body highlight read.
  - Each hero now gets at least 10 `v22` finishing parts with at least four material bands.

- `src/render/hero3dFactory.ts`
  - Extends `root.userData.gameplayModelQuality` with:
    - `finishingLayer: "v22-play-camera-anatomy-and-material-depth"`;
    - `finishingLayerParts`;
    - `anatomyReadableParts`;
    - `playCameraDepthLayers`;
    - `materialFinishLayers`.
  - Tags runtime parts with:
    - `obj.userData.playCameraDepthLayer`;
    - `obj.userData.playCameraAnatomyRead`.

- `tests/hero3dAssets.test.ts`
  - Locks V22 asset coverage for all 10 classic heroes.

- `tests/hero3dFactory.test.ts`
  - Locks V22 real-model root metadata and runtime part tags.

## Verification

Red-to-green:

```text
npm test -- tests/hero3dAssets.test.ts tests/hero3dFactory.test.ts
initially failed on missing V22 parts and missing gameplayModelQuality fields
```

Final focused tests:

```text
npm test -- tests/hero3dAssets.test.ts tests/hero3dFactory.test.ts
2 files passed
18 tests passed
```

Bridge smoke:

```text
npm test -- tests/render3d/hero3dModel.test.ts tests/hero3dPreview.test.ts
2 files passed
2 tests passed
```

Build:

```text
npm run build
passed
warning: existing Vite chunk-size warning from Three.js bundle remains
```

Real play route smoke:

```text
http://127.0.0.1:5231/?mode=play&hero=rein&renderer=3d
canvas: 1440 x 900
onboardingVisible: false
hasReinHud: true
page errors: none
screenshot: docs/screenshots/ux-3d-v22-hero-model-quality-real-play-clean.png
```

## Opus Integration Notes

Use these hooks to verify the real play route is consuming the improved model:

- `root.userData.gameplayModelQuality.finishingLayer`
- `root.userData.gameplayModelQuality.finishingLayerParts`
- `root.userData.gameplayModelQuality.anatomyReadableParts`
- `root.userData.gameplayModelQuality.playCameraDepthLayers`
- `root.userData.gameplayModelQuality.materialFinishLayers`
- runtime children whose `obj.userData.partName` starts with `v22 `
- `obj.userData.playCameraDepthLayer`
- `obj.userData.playCameraAnatomyRead`

Residual visual risk: in the default gameplay camera, the hero is still small and can be partly dominated by HUD health bars, selection glow, and nearby base glow. If the user still says "not refined enough", the next highest-value pass should tune hero screen occupancy, healthbar/selection-light occlusion, and real-play model contrast together.
