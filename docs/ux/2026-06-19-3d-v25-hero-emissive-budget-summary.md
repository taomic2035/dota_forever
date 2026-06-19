# V25 Hero Emissive Budget Summary

V24 capped cast/channel status FX so the hero was no longer covered by action glow. The remaining real-play readability issue was the persistent hero material glow: idle glint shells, energy cores, and runtime emissive pulses could still read too hot in the default 3D gameplay camera.

V25 adds a tested play-camera emissive budget to the actual hero model factory path used by `createHero3DModel(...)`.

## What Changed

- `src/render/hero3dFactory.ts`
  - Adds `root.userData.gameplayModelQuality.emissiveBudget`.
  - Budget pass name: `v25-play-camera-emissive-budget`.
  - Caps idle glow/glint layer opacity at `0.22`.
  - Caps runtime glow/glint layer opacity at `0.46`.
  - Caps energy core opacity at `0.62`.
  - Caps runtime `MeshStandardMaterial.emissiveIntensity` at `2.35`.
  - Keeps orb/sigil glints visible, but prevents them from becoming constant golden bloom in the play camera.

- `tests/hero3dFactory.test.ts`
  - Adds a V25 contract test across all 10 classic heroes.
  - Verifies idle glints, energy core materials, cast runtime glints, and runtime emissive intensity all stay under the play-camera budget.

## Verification

Red-to-green:

```text
npm test -- tests/hero3dFactory.test.ts
initially failed because gameplayModelQuality.emissiveBudget was missing
passed after the V25 budget implementation
```

Focused regression:

```text
npm test -- tests/hero3dFactory.test.ts tests/hero3dAssets.test.ts tests/render3d/hero3dModel.test.ts tests/render3d/statusFx.test.ts tests/render3d/renderer3dReadability.test.ts tests/hero3dPreview.test.ts
6 files passed
28 tests passed
```

Build:

```text
npm run build
passed
warning: existing Vite chunk-size warning from Three.js bundle remains
```

Visual note:

```text
V25 screenshot was not captured in this pass because the Playwright browser escalation was rejected.
Use the V24 real-play screenshot as the current visual baseline, then re-smoke the V25 route locally:
http://127.0.0.1:<port>/?mode=play&hero=rein&renderer=3d
```

## Opus Integration Notes

Useful inspection hooks:

- `root.userData.gameplayModelQuality.emissiveBudget.pass`
- `root.userData.gameplayModelQuality.emissiveBudget.maxIdleGlowOpacity`
- `root.userData.gameplayModelQuality.emissiveBudget.maxRuntimeGlowOpacity`
- `root.userData.gameplayModelQuality.emissiveBudget.maxEnergyCoreOpacity`
- `root.userData.gameplayModelQuality.emissiveBudget.maxRuntimeEmissiveIntensity`
- `material.userData.surfaceRole === "emissive-glow"`
- `material.userData.surfaceRole === "rim-glint"`
- `material.userData.heroRuntimeGlintLayer`

Residual visual risk: this pass budgets hero material glow and runtime emissive intensity, but does not replace the procedural placeholder art with final GLB/PBR assets. The next high-value polish pass should use the same budget pattern for high-impact hero silhouettes, lane creeps, neutral monsters, summons, and map objective FX.
