# 3D V7 Resource Integration Contract Summary

Date: 2026-06-14
Status: V7 resource placement / LOD / production-path contract after V6 surface realism

## Research Target

Reference documents:

- `docs/ux/2026-06-13-dota-map-elements-research-target.md`
- `docs/ux/2026-06-13-dota-unit-fx-research-target.md`
- `docs/ux/2026-06-14-3d-v6-surface-realism-summary.md`

Reference sources:

- Dota 2 official heroes page: `https://www.dota2.com/heroes`
- Dota 2 Wandering Waters page: `https://www.dota2.com/wanderingwaters`

Extracted direction:

- Dota-like world assets need rendering data plus gameplay-facing semantics: terrain height, river status, blockers, vision blockers, and placement layer.
- The procedural samples must keep stable keys so real GLB/PBR assets can replace them without gameplay remapping.
- LOD and fallback metadata should exist before Opus starts wiring the final `tree3d.js` production-asset path.

## Player-Facing Changes

- All 408 `RESOURCE3D_SAMPLE_ASSETS` now include:
  - `placement`
  - `lod`
  - `production`
- `placement` defines:
  - `placementLayer`
  - `walkable`
  - `blocker`
  - `visionBlocker`
  - `river`
  - `heightLevel`
  - `footprintRadius`
  - `selectable`
  - `teamScoped`
- `lod` defines:
  - `near`
  - `mid`
  - `far`
  - `impostorAfter`
  - `shadow`
- `production` defines:
  - `fallback: procedural`
  - `modelPath`
  - `texturePaths`
  - `materialPreset`
  - `actionSlots`
  - `notes`
- Production paths follow the replacement-ready convention:
  - `public/assets/tree3d/resources/<category>/<assetKey>/model.glb`
  - `public/assets/tree3d/resources/<category>/<assetKey>/<channel>.png`
- Resource preview now exposes `window.__resource3dPreview.integration` for smoke checks.

## Runtime Evidence

Resource preview screenshot:

- `docs/screenshots/ux-3d-v7-resource-integration-contract.png`

Smoke data:

```text
Playwright @ http://127.0.0.1:5205/?mode=resource3d-preview
productionReady: 408
lodReady: 408
placementLayers:
  unit: 40
  building: 20
  prop: 81
  fx: 85
  projectile: 10
  ui: 130
  marker: 20
  terrain: 22
riverContracts: 11
Screenshot: docs/screenshots/ux-3d-v7-resource-integration-contract.png
Console/page errors: none
Known warnings: Three.Clock and PCFSoftShadowMap deprecation warnings; WebGL ReadPixels performance warning during screenshot capture.
```

## Implementation Notes

- `src/render/resource3dAssets.ts`
  - Adds `Resource3DPlacementSpec`, `Resource3DLODSpec`, and `Resource3DProductionSpec`.
  - Generates placement semantics for all categories.
  - Classifies terrain and map props with Dota-like semantics:
    - river water is river-layer terrain and not walkable;
    - highground plateau and ramp are highground;
    - trees block pathing and vision;
    - fences block pathing but not vision;
    - projectiles are non-blocking projectile-layer resources;
    - sky domes are sky-height FX resources.
  - Generates replacement-ready `tree3d` model and texture paths for every sample.
- `src/ui/resource3dPreview.ts`
  - Exposes V7 integration smoke data through `window.__resource3dPreview.integration`.
- `tests/resource3dAssets.test.ts`
  - Locks V7 placement, LOD, and production metadata for every resource sample.
  - Locks targeted terrain/map-prop semantics.

## Verification

```text
npm test -- tests/resource3dAssets.test.ts
1 file passed
11 tests passed
```

```text
npm test -- tests/hero3dFactory.test.ts tests/resource3dFactory.test.ts tests/hero3dAssets.test.ts tests/resource3dAssets.test.ts tests/render3d/terrainDressing.test.ts tests/render3d/fx3dVisual.test.ts tests/render3d/fx3dRuntime.test.ts tests/render3d/resourceMotion.test.ts tests/render3d/commandQueue3d.test.ts tests/queuedOrders.test.ts
10 files passed
53 tests passed
```

```text
npm run build
passed
Vite still reports the existing large chunk warning.
```

## Remaining UX / Integration Debt

- This still does not load real GLB/FBX files or real PBR textures.
- `tree3d.js` production loading, skeleton retargeting, and asset-bundle packaging are still future work.
- Placement data is defined and tested, but renderer/pathing systems do not yet consume it as authoritative collision.
- LOD data is defined and tested, but runtime LOD switching is not yet implemented.

## Opus Handoff

### What

Adds a V7 resource integration contract for all 408 resource samples.

### Why

The previous phases made assets visible, readable, and more material-rich. This pass makes them consumable by production systems without relying on ad hoc naming guesses.

### Tradeoff

- Chose deterministic metadata generation over hand-editing 408 entries.
- Kept the current procedural preview as fallback.
- Did not change sim, combat, targeting, pathing, or balance.

### Next Action

When Opus wires production assets, preserve `asset.key` and replace only `production.modelPath` / `production.texturePaths` targets with authored GLB/PBR content. If runtime collision moves into these contracts, first consume `placementLayer`, `walkable`, `blocker`, `visionBlocker`, `river`, and `heightLevel` from `Resource3DAssetSpec`.
