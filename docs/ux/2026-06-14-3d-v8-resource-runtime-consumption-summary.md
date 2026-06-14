# 3D V8 Resource Runtime Consumption Summary

Date: 2026-06-14
Status: V8 runtime consumption pass after V7 resource integration contract

## Research Target

Reference documents:

- `docs/ux/2026-06-14-3d-v7-resource-integration-contract-summary.md`
- `docs/ux/2026-06-13-dota-map-elements-research-target.md`
- `docs/ux/2026-06-13-dota-unit-fx-research-target.md`

Reference sources:

- Dota 2 official heroes page: `https://www.dota2.com/heroes`
- Dota 2 Wandering Waters page: `https://www.dota2.com/wanderingwaters`

Extracted direction:

- A Dota-like map asset should not only look grounded; it needs a runtime footprint that can later drive blocker, river, highground, and LOD systems.
- V7 metadata should be consumed by generated Three.js roots before Opus wires the final `tree3d.js` loader.
- Runtime hooks must stay inspection-friendly and non-invasive: no sim/pathing/balance changes in this UX asset slice.

## Player-Facing Changes

- `createResource3DModel(asset)` now writes V7 metadata onto the returned root:
  - `root.userData.placement`
  - `root.userData.lod`
  - `root.userData.production`
  - `root.userData.runtimeIntegration`
- World-space resource models now get named runtime footprint rings:
  - `resource3d:v8-footprint:<assetKey>`
- Every resource model gets a named LOD / production anchor:
  - `resource3d:v8-lod-anchor:<assetKey>`
- Runtime footprints carry the relevant placement semantics:
  - `placementLayer`
  - `walkable`
  - `blocker`
  - `visionBlocker`
  - `river`
  - `heightLevel`
  - `footprintRadius`
- LOD anchors carry the future production loading route:
  - LOD distances
  - shadow downgrade mode
  - production model path
  - production texture paths
  - action slots
- Resource preview now exposes current-category runtime smoke data:
  - `window.__resource3dPreview.activeRuntime`

## Runtime Evidence

Resource preview screenshot:

- `docs/screenshots/ux-3d-v8-resource-runtime-consumption.png`

Smoke data:

```text
Playwright @ http://127.0.0.1:5206/?mode=resource3d-preview
Active category: terrain_tiles
Resource count: 22
Runtime roots: 22
Footprints: 22
LOD anchors: 22
Blockers: 0
River runtime contracts: 3
Production model paths: public/assets/tree3d/resources/terrain_tiles/.../model.glb
Console/page errors: none
Screenshot: docs/screenshots/ux-3d-v8-resource-runtime-consumption.png
```

## Implementation Notes

- `src/render/resource3dFactory.ts`
  - Adds `ResourceRuntimeIntegrationUserData`.
  - Exports `resourceRuntimeIntegrationUserData(asset)`.
  - Adds V8 footprint and LOD-anchor meshes to generated resource roots.
  - Keeps runtime hooks visual/inspection-only; no authoritative pathing or sim state changes.
- `src/ui/resource3dPreview.ts`
  - Exposes current-category runtime consumption smoke data through `window.__resource3dPreview.activeRuntime`.
- `tests/resource3dFactory.test.ts`
  - Locks runtime consumption for tree blockers / vision blockers.
  - Locks river terrain runtime footprints as non-blocking river terrain.

## Verification

```text
npm test -- tests/resource3dFactory.test.ts
1 file passed
6 tests passed
```

```text
npm test -- tests/resource3dFactory.test.ts tests/resource3dAssets.test.ts
2 files passed
17 tests passed
```

```text
npm test -- tests/hero3dFactory.test.ts tests/resource3dFactory.test.ts tests/hero3dAssets.test.ts tests/resource3dAssets.test.ts tests/render3d/terrainDressing.test.ts tests/render3d/fx3dVisual.test.ts tests/render3d/fx3dRuntime.test.ts tests/render3d/resourceMotion.test.ts tests/render3d/commandQueue3d.test.ts tests/queuedOrders.test.ts
10 files passed
55 tests passed
```

```text
npm run build
passed
Vite still reports the existing large chunk warning.
```

## Remaining UX / Integration Debt

- Runtime footprints are inspection hooks; the map renderer/pathing layer does not yet use them as authoritative collision.
- Runtime LOD anchors are present, but no distance-based LOD switching is active yet.
- This still does not load real GLB/FBX files or real PBR textures.
- `tree3d.js` production loading, skeleton retargeting, and asset-bundle packaging are still future work.

## Opus Handoff

### What

Moves V7 placement / LOD / production contracts into actual generated Three.js resource roots.

### Why

This closes the gap between sample metadata and runtime inspection. Opus can now query generated models for placement, blocker, river, LOD, and production-path data without re-deriving it from asset names.

### Tradeoff

- Chose subtle visual footprint rings and LOD anchors instead of changing map collision or pathing.
- Kept the pass limited to UX/asset runtime hooks.
- Did not touch sim, combat, targeting, pathing, or balance.

### Next Action

If Opus wants collision to become authoritative, consume `root.userData.runtimeIntegration` and `resource3d:v8-footprint:*` from the map/pathing layer. If Opus wires production loading first, consume `resource3d:v8-lod-anchor:*` and `root.userData.production` for model/texture/action-slot lookup.
