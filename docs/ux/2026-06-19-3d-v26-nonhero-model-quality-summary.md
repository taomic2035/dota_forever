# V26 Non-Hero Model Quality Summary

V25 reduced hero emissive flooding. The next visible real-play rough edge is non-hero model quality: lane creeps, neutrals, and illusions still came from the generic `buildUnitModel(...)` path and could read as stacked boxes in the default 3D gameplay camera.

V26 improves the real renderer's non-hero model path without touching simulation logic.

## What Changed

- `src/render/unitArt.ts`
  - Adds `teamRead` metadata: `dawn`, `night`, or `neutral`.
  - Gives illusions their own low-priority visual role instead of treating them as full-priority heroes.

- `src/render3d/modelParts.ts`
  - Carries `visualRole` and `teamRead` into humanoid model specs.
  - Keeps lane creeps low priority while allowing illusion-specific reads.

- `src/render3d/modelGen.ts`
  - Replaces the main humanoid read pieces with rounded/capsule, sphere, and cylinder geometry.
  - Adds `root.userData.gameplayUnitModelQuality`.
  - Adds play-camera readability layers:
    - `core-volume`
    - `head-read`
    - `team-band`
    - `clone-glint`

- `src/render3d/unitModel.ts`
  - Improves beast/neutral core volumes with ellipsoid geometry.
  - Adds neutral threat metadata on the real `buildUnitModel(...)` path.
  - Adds `threat-horns` readability tags for ancient/boss-style silhouettes.

- `tests/render3d/unitModel.test.ts`
  - Adds V26 red-to-green coverage for lane creeps, ancient neutrals, and illusions.

## Verification

Red-to-green:

```text
npm test -- tests/render3d/unitModel.test.ts
Before fix: 3 failed
- gameplayUnitModelQuality was missing for lane creeps
- gameplayUnitModelQuality was missing for ancient neutrals
- gameplayUnitModelQuality was missing for illusions

After fix:
1 file passed
3 tests passed
```

Focused regression:

```text
npm test -- tests/unitart.test.ts tests/render3d/modelParts.test.ts tests/render3d/unitModel.test.ts tests/render3d/hero3dModel.test.ts tests/render3d/renderer3dReadability.test.ts
5 files passed
33 tests passed
```

Build:

```text
npm run build
passed
warning: existing Vite chunk-size warning from Three.js bundle remains
```

## Opus Integration Notes

Useful inspection hooks:

- `model.root.userData.gameplayUnitModelQuality.pass`
- `model.root.userData.gameplayUnitModelQuality.family`
- `model.root.userData.gameplayUnitModelQuality.teamRead`
- `model.root.userData.gameplayUnitModelQuality.threatRead`
- `obj.userData.playCameraReadabilityLayer`

Expected layer values:

- `core-volume`
- `head-read`
- `team-band`
- `clone-glint`
- `threat-horns`

Scope guard: this pass does not change `src/sim/**`, unit stats, targeting, combat, neutral logic, or spawn rules. It is presentation-only model quality work on the path used by `?mode=play&renderer=3d`.
