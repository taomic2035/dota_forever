# 3D V14 Hero Runtime Presentation Summary

Date: 2026-06-14
Status: V14 hero runtime action/surface presentation after V13 resource runtime surface animation

## Research Target

Reference documents:

- `docs/ux/2026-06-14-3d-v5-hero-readability-summary.md`
- `docs/ux/2026-06-14-3d-v6-surface-realism-summary.md`
- `docs/ux/2026-06-13-dota-unit-fx-research-target.md`
- `docs/ux/2026-06-14-3d-v13-runtime-surface-summary.md`

Reference sources:

- Dota 2 official heroes page: `https://www.dota2.com/heroes`
- Valve Source 2 particle documentation: `https://developer.valvesoftware.com/wiki/Dota_2_Workshop_Tools/Particles`

Extracted direction:

- Heroes need to read as active game units, not only as static preview statues.
- Attack, cast, channel, hit, status, invisibility, and death states should be visible through posture, part motion, opacity, glints, and emissive response.
- Runtime hooks must be stable enough for Opus to replace procedural fallback meshes with authored GLB/PBR clips later.
- This pass stays visual-only: no gameplay combat, targeting, balance, pathing, or authoritative state changes.

## Player-Facing Changes

- Adds `root.userData.runtimeAction` and `root.userData.runtimeSurface` to all 10 Hero3D roots.
- Adds `heroRuntimeActionUserData(asset)`, `heroRuntimeSurfaceUserData(asset, root)`, and `updateHeroRuntimePresentation(root, actionName, elapsedMs)` in `src/render/hero3dFactory.ts`.
- Runtime hero action states now normalize action clips into readable families:
  - `idle`
  - `locomotion`
  - `attack`
  - `cast`
  - `channel`
  - `status`
  - `hit`
  - `death`
- Runtime hero shader intents now split the first 10 heroes into Dota-readable surface families:
  - `hero-armor-rim-sweep`
  - `hero-arcane-fresnel`
  - `hero-cloth-breathe`
  - `hero-shadow-veil`
  - `hero-stone-weight`
- Hero parts now cache base transforms and expose `heroRuntimePart`, `partKind`, `partMaterial`, `partDetail`, and `runtimeActionReactive`.
- Hero materials now cache base opacity, roughness, emissive intensity, env intensity, and normal intensity, then recalculate from base values each frame.
- Hero preview calls `updateHeroRuntimePresentation(...)` every frame and refreshes `window.__hero3dPreview.runtimePresentation`.

## Runtime Evidence

Hero preview screenshot:

- `docs/screenshots/ux-3d-v14-hero-runtime-presentation.png`

Playwright smoke at `http://127.0.0.1:5212/?mode=hero3d-preview` after dispatching `cast_r`:

```text
Runtime action roots: 10
Runtime surface roots: 10
Animated roots: 10
Action reactive parts: 232
Surface materials: 819
Glint layers: 347
Action states: cast=10
Shader intents: hero-armor-rim-sweep=3, hero-arcane-fresnel=3, hero-cloth-breathe=1, hero-stone-weight=1, hero-shadow-veil=2
Console/page errors: none
```

## Implementation Notes

- `src/render/hero3dFactory.ts`
  - Adds `HeroRuntimeActionUserData` and `HeroRuntimeSurfaceUserData`.
  - Tags generated hero part roots and materials with stable runtime metadata.
  - Adds deterministic posture, scale, status jitter, death fall, and cast/attack/channel action pulses.
  - Updates `MeshStandardMaterial` roughness, emissive intensity, env intensity, normal scale, and opacity from base values.
  - Updates `MeshBasicMaterial` glow/glint/outline opacity from base values.
- `src/ui/hero3dPreview.ts`
  - Tracks `activeAction` per preview hero.
  - Calls `updateHeroRuntimePresentation(...)` from the animation loop.
  - Exports `heroRuntimePresentationSmokeForModels(...)`.
  - Extends `window.__hero3dPreview.runtimePresentation` with runtime action/surface counts.
- Tests:
  - `tests/hero3dFactory.test.ts` locks V14 root contracts, non-drifting material animation, invisible/stunned/death state behavior, and material tags.
  - `tests/hero3dPreview.test.ts` locks V14 runtime action/surface smoke aggregation.

## Verification

```text
npm test -- tests/hero3dFactory.test.ts
1 file passed
4 tests passed
```

```text
npm test -- tests/hero3dPreview.test.ts
1 file passed
1 test passed
```

```text
npm test -- tests/hero3dFactory.test.ts tests/hero3dPreview.test.ts tests/hero3dAssets.test.ts
3 files passed
13 tests passed
```

```text
npm test -- tests/hero3dFactory.test.ts tests/hero3dPreview.test.ts tests/hero3dAssets.test.ts tests/resource3dFactory.test.ts tests/resource3dAssets.test.ts tests/resource3dPreview.test.ts tests/render3d/terrainDressing.test.ts tests/render3d/fx3dVisual.test.ts tests/render3d/fx3dRuntime.test.ts tests/render3d/resourceMotion.test.ts tests/render3d/commandQueue3d.test.ts tests/queuedOrders.test.ts
12 files passed
76 tests passed
```

```text
npm run build
build passed
warning: Three.js keeps the output chunk above 500 kB
```

## Open Notes

- This is still procedural runtime presentation, not final authored GLB/PBR animation.
- `AnimationMixer` clips and `updateHeroRuntimePresentation(...)` currently run together in preview. Opus can map the helper to real animation blend states later.
- The helper is deterministic and recalculates from cached base transforms/material values, so it is safe as a fallback/debug driver while production assets land.

## Opus Merge Notes

Treat the following as stable handoff hooks:

- `hero asset -> root.userData.runtimeAction`
- `hero asset -> root.userData.runtimeSurface`
- `hero asset -> updateHeroRuntimePresentation(root, actionName, elapsedMs)`
- `hero part -> obj.userData.heroRuntimePart`
- `hero material -> material.userData.heroRuntimeSurfaceMaterial`
- `hero material -> material.userData.runtimeHeroSurfaceShaderIntent`
- preview smoke -> `window.__hero3dPreview.runtimePresentation`

When authored hero assets land, keep the same keys and action names from `REQUIRED_HERO3D_ACTIONS`, then map V14 action states onto real animation clips, shader parameters, material animation tracks, or particle emitters.
