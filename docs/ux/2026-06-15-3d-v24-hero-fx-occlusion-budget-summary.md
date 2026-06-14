# V24 Hero FX Occlusion Budget Summary

V23 improved real-play hero screen presence and UI framing. The next visible issue in the default gameplay screenshot was effect dominance: cast/channel/status glow could become readable, but too bright and too large for the play camera.

V24 adds a tested occlusion budget to the real 3D hero status FX path.

## What Changed

- `src/render3d/statusFx.ts`
  - Adds `readabilityBudget` to `HeroStatusFxState`.
  - Budget pass name: `v24-play-camera-fx-occlusion-budget`.
  - Caps cast/channel glow opacity at `0.48`.
  - Caps cast/channel glow scale at `1.18`.
  - Keeps channel glow stronger than cast glow within the budget, preserving action-state readability.

- `tests/render3d/statusFx.test.ts`
  - Adds a red-to-green V24 test for overdriven cast/channel input.
  - Verifies the effect stays visible while obeying opacity and scale limits.

## Verification

Red-to-green:

```text
npm test -- tests/render3d/statusFx.test.ts
initially failed because readabilityBudget was missing
```

Focused regression:

```text
npm test -- tests/render3d/statusFx.test.ts tests/render3d/pose.test.ts tests/render3d/hero3dModel.test.ts tests/render3d/renderer3dReadability.test.ts tests/hero3dFactory.test.ts tests/hero3dAssets.test.ts
6 files passed
33 tests passed
```

Build:

```text
npm run build
passed
warning: existing Vite chunk-size warning from Three.js bundle remains
```

Real play route smoke:

```text
http://127.0.0.1:5233/?mode=play&hero=rein&renderer=3d
canvas: 1440 x 900
onboardingVisible: false
hasReinHud: true
page errors: none
screenshot: docs/screenshots/ux-3d-v24-hero-fx-occlusion-budget-clean.png
```

## Opus Integration Notes

Useful inspection hooks:

- `heroStatusFxState(...).readabilityBudget.pass`
- `heroStatusFxState(...).readabilityBudget.maxCastGlowOpacity`
- `heroStatusFxState(...).readabilityBudget.maxCastGlowScale`
- `status-fx:cast-glow`

Residual visual risk: Rein still has strong golden hero/material/spawn lighting in the real-play screenshot. V24 only budgets the status/cast/channel overlay FX; the next visual pass should separately tune hero material emissive and spawn/base glow budgets.
