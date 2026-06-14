# V23 Hero Real-Play Readability Summary

Previous visual evidence showed V22 improved the hero model itself, but the default gameplay camera still had three readability issues: the hero was slightly under-sized, the health bar sat close to the head read, and ground rings/soft discs competed with the model.

V23 adjusts the real `?mode=play&hero=rein&renderer=3d` renderer path, not the preview route.

## What Changed

- `src/render3d/renderer3d.ts`
  - Adds `gameplay3DUnitReadabilityProfile(...)`, a single tested source for real-play unit visibility parameters.
  - Hero model scale changes from the old hard-coded `1.5` to profile-driven `1.68`.
  - Hero team ring opacity is reduced from `0.85` to `0.54`.
  - Hero soft disc opacity is reduced from `0.16` to `0.08`.
  - Hero ring radius is tightened so the ground glow frames the model instead of flooding the feet.
  - Hero health anchor moves from `112` to `152` world units so the bar sits above the head read.
  - Selected ring opacity is clamped to `0.52-0.68` instead of the previous `0.7-0.9`.
  - The renderer stores `model.root.userData.gameplay3DReadabilityProfile` for Opus inspection.

- `tests/render3d/renderer3dReadability.test.ts`
  - Locks the V23 profile for hero, non-hero, and building cases.
  - Ensures non-hero lane/neutral units stay compact and do not inherit hero scale.

## Verification

Red-to-green:

```text
npm test -- tests/render3d/renderer3dReadability.test.ts
initially failed because gameplay3DUnitReadabilityProfile did not exist
```

Focused regression:

```text
npm test -- tests/render3d/renderer3dReadability.test.ts tests/render3d/hero3dModel.test.ts tests/render3d/resource3dModel.test.ts tests/hero3dFactory.test.ts tests/hero3dAssets.test.ts tests/hero3dPreview.test.ts
6 files passed
24 tests passed
```

Build:

```text
npm run build
passed
warning: existing Vite chunk-size warning from Three.js bundle remains
```

Real play route smoke:

```text
http://127.0.0.1:5232/?mode=play&hero=rein&renderer=3d
canvas: 1440 x 900
onboardingVisible: false
hasReinHud: true
page errors: none
screenshot: docs/screenshots/ux-3d-v23-hero-readability-real-play-clean.png
```

## Opus Integration Notes

Useful inspection hooks:

- `gameplay3DUnitReadabilityProfile({ isHero, isBuilding, collisionRadius })`
- `model.root.userData.gameplay3DReadabilityProfile`
- hero profile expected values:
  - `modelScale: 1.68`
  - `teamRingOpacity: 0.54`
  - `teamDiscOpacity: 0.08`
  - `healthAnchorY: 152`
  - `selectedRingOpacityMin: 0.52`
  - `selectedRingOpacityMax: 0.68`

Residual visual risk: the golden cast/spawn glow around Rein can still dominate the model in screenshots. That belongs to combat/status FX tuning rather than the selection-ring and healthbar pass.
