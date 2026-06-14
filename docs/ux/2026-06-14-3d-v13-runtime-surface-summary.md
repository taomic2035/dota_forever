# 3D V13 Runtime Surface Summary

Date: 2026-06-14
Status: V13 runtime surface-material animation after V12 all-resource motion

## Research Target

Reference documents:

- `docs/ux/2026-06-14-3d-v12-runtime-motion-summary.md`
- `docs/ux/2026-06-14-3d-v11-vfx-phase-animation-summary.md`
- `docs/ux/2026-06-13-dota-unit-fx-research-target.md`

Reference sources:

- Dota 2 official heroes page: `https://www.dota2.com/heroes`
- Dota 2 Wandering Waters page: `https://www.dota2.com/wanderingwaters`
- Valve Source 2 particle documentation: `https://developer.valvesoftware.com/wiki/Dota_2_Workshop_Tools/Particles`

Extracted direction:

- Dota-like readability is not only mesh motion. Items, projectiles, runes, cloth banners, water, and metal surfaces need live rim light, emissive pulse, roughness shimmer, and readable glints.
- Runtime surface state must be inspectable so Opus can replace procedural material changes with real shader graphs, texture atlases, or authored material animation later.
- This pass stays visual-only: no gameplay collision, targeting, combat, pathing, or balance behavior changes.

## Player-Facing Changes

- Adds `root.userData.runtimeSurface` to all 408 Resource3D samples.
- Adds `resourceRuntimeSurfaceUserData(asset)` and `updateResourceRuntimeSurface(root, elapsedMs)` in `src/render/resource3dFactory.ts`.
- Runtime shader intents now classify resources into Dota-readable surface families:
  - `energy-fresnel-pulse`
  - `metal-rim-sweep`
  - `cloth-dye-breathe`
  - `water-caustic-flow`
  - `foliage-leaf-sheen`
  - `stone-wear-shadow`
  - `shadow-ink-bloom`
- Resource part materials now cache base roughness, emissive intensity, opacity, env intensity, and normal intensity.
- Surface animation recalculates from base material values each frame, so repeated calls do not accumulate drift.
- Resource preview now calls `updateResourceRuntimeSurface(...)` every frame and exposes runtime surface smoke counts.

## Runtime Evidence

Resource preview screenshot:

- `docs/screenshots/ux-3d-v13-runtime-surface.png`

Playwright smoke at `http://127.0.0.1:5211/?mode=resource3d-preview`:

```text
Active category: items
Resource count: 10
Runtime surface roots: 10
Runtime surface animated roots: 10
Runtime surface animated materials: 190
Runtime surface reactive materials: 190
Runtime surface glints: 180
Global runtime surface roots: 408
Global animated roots: 408
Global animated materials: 9649
Global reactive materials: 9649
Global glint layers: 8889
Shader intents: cloth-dye-breathe=108, water-caustic-flow=9, metal-rim-sweep=196, energy-fresnel-pulse=95
Console/page errors: none
```

## Implementation Notes

- `src/render/resource3dFactory.ts`
  - Adds `ResourceRuntimeSurfaceUserData`.
  - Tags runtime surface materials with stable part/material metadata and base material values.
  - Adds deterministic surface pulse and fresnel helpers for all shader intents.
  - Updates `MeshStandardMaterial` roughness, emissive intensity, env intensity, normal scale, and opacity from base values.
  - Updates `MeshBasicMaterial` glow/glint/outline opacity from base values.
- `src/ui/resource3dPreview.ts`
  - Calls `updateResourceRuntimeSurface(res.model, ...)` from the animation loop.
  - Exports `resourceRuntimeSurfaceSmokeForModels(...)`.
  - Extends `window.__resource3dPreview.runtimeSurface` and current-category `activeRuntime` with runtime surface counts.
- Tests:
  - `tests/resource3dFactory.test.ts` locks V13 root contracts, non-drifting material animation, and V12/V13 pulse composition.
  - `tests/resource3dPreview.test.ts` locks V13 runtime surface smoke aggregation.

## Verification

```text
npm test -- tests/resource3dFactory.test.ts
1 file passed
17 tests passed
```

```text
npm test -- tests/resource3dPreview.test.ts
1 file passed
4 tests passed
```

```text
npm test -- tests/resource3dPreview.test.ts tests/resource3dFactory.test.ts
2 files passed
21 tests passed
```

```text
npm test -- tests/hero3dFactory.test.ts tests/resource3dFactory.test.ts tests/hero3dAssets.test.ts tests/resource3dAssets.test.ts tests/resource3dPreview.test.ts tests/render3d/terrainDressing.test.ts tests/render3d/fx3dVisual.test.ts tests/render3d/fx3dRuntime.test.ts tests/render3d/resourceMotion.test.ts tests/render3d/commandQueue3d.test.ts tests/queuedOrders.test.ts
11 files passed
72 tests passed
```

```text
npm run build
build passed
warning: Three.js keeps the output chunk above 500 kB
```

```text
npm test -- --pool=forks --maxWorkers=1
105 files passed
907 tests passed
```

## Remaining UX / Integration Debt

- V13 is still procedural material animation, not final authored shader graphs.
- No real GLB/FBX, PBR texture files, material parameter curves, or GPU particles are included.
- Texture atlas animation remains metadata-only except for existing procedural VFX playback meshes.
- Runtime surface animation is visual-only and does not drive gameplay collision, targeting, projectile math, or ability timing.

## Opus Handoff

### What

Adds a unified runtime surface-material layer for all 408 Resource3D samples.

### Why

V12 made resources move. V13 makes their surfaces feel alive: energy pulses, item metals sweep, cloth breathes, water glints, and glows react without needing final production assets yet.

### Tradeoff

Chose deterministic procedural material updates over fake authored shader files.

This keeps the branch mergeable and inspectable, but does not replace the final production shader/texture pipeline.

### Open

- Which shader intent names should become production material graph IDs?
- Should `updateResourceRuntimeSurface(...)` remain a fallback/debug path after GLB/PBR assets land?
- Should real texture atlas animation be owned by the VFX runtime or the production `tree3d.js` loader?

### Next

When authored GLB/PBR assets land, map `shaderIntent`, `runtimeSurfaceGlintLayer`, `productionTexturePaths`, and cached base material values onto real shader graph parameters or material animation clips while keeping `updateResourceRuntimeSurface(...)` as the procedural fallback/debug driver.
