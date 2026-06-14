# 3D V15 Unit Runtime Presentation Summary

Date: 2026-06-14
Status: V15 non-hero unit runtime presentation after V14 hero runtime presentation

## Research Target

Reference documents:

- `docs/ux/2026-06-14-3d-v5-lane-unit-readability-summary.md`
- `docs/ux/2026-06-14-3d-v5-neutral-boss-readability-summary.md`
- `docs/ux/2026-06-14-3d-v5-summon-ward-readability-summary.md`
- `docs/ux/2026-06-14-3d-v13-runtime-surface-summary.md`
- `docs/ux/2026-06-14-3d-v14-hero-runtime-presentation-summary.md`

Reference sources:

- Dota 2 official heroes page: `https://www.dota2.com/heroes`
- Valve Source 2 particle documentation: `https://developer.valvesoftware.com/wiki/Dota_2_Workshop_Tools/Particles`

Extracted direction:

- Non-hero units need readable action grammar: lane-unit attacks, neutral camp threat, boss impact, summon ownership, ward/trap lifetime, and expiration cues.
- Unit presentation should stay lower priority than heroes but more alive than static props.
- Runtime hooks must be stable enough for Opus to replace procedural fallbacks with authored GLB/PBR units and real animation clips.
- This pass stays visual-only: no combat, aggro, pathing, fog, targeting, ward vision, balance, or authoritative state changes.

## Player-Facing Changes

- Adds `root.userData.runtimeUnitPresentation` to the 50 unit-like Resource3D samples:
  - 10 `lane_units`
  - 10 `neutral_units`
  - 10 `boss_objectives`
  - 10 `couriers_summons`
  - 10 `wards_traps`
- Adds `resourceRuntimeUnitPresentationUserData(asset)` and `updateResourceRuntimeUnitPresentation(root, actionState, elapsedMs)` in `src/render/resource3dFactory.ts`.
- Unit runtime states now normalize preview behavior into:
  - `idle`
  - `move`
  - `attack`
  - `cast`
  - `hit`
  - `death`
  - `expire`
- Unit classes now split non-hero assets into runtime-readable families:
  - lane: `lane-melee`, `lane-ranged`, `lane-siege`, `lane-utility`
  - wild: `wild-fodder`, `wild-leader`, `wild-caster`, `wild-ancient`
  - objective: `boss-objective`
  - support: `support-courier`, `support-summon`, `support-ward`, `support-trap`, `support-illusion`, `support-totem`
- Adds named runtime action cue meshes:
  - `resource3d:v15-unit-action-cue:<assetKey>`
- Runtime unit presentation updates root posture, part offsets, action-cue opacity/scale, material opacity, emissive intensity, roughness, and env intensity from cached base values.
- Resource preview now calls `updateResourceRuntimeUnitPresentation(...)` every frame and exposes V15 smoke data.

## Runtime Evidence

Resource preview screenshot:

- `docs/screenshots/ux-3d-v15-unit-runtime-presentation.png`

Playwright smoke at `http://127.0.0.1:5213/?mode=resource3d-preview`:

```text
Global runtime unit roots: 50
Global animated roots: 50
Global animated parts: 620
Global animated materials: 1693
Global action cues: 50
Global action states: attack=50
Threat bands: low=25, medium=9, high=16
Lane active runtime: runtimeUnitRoots=10, runtimeUnitParts=120, runtimeUnitMaterials=339, runtimeUnitActionCues=10
Neutral active runtime: runtimeUnitRoots=10, runtimeUnitParts=130, runtimeUnitMaterials=384, runtimeUnitActionCues=10
Summon active runtime: runtimeUnitRoots=10, runtimeUnitParts=120, runtimeUnitMaterials=320, runtimeUnitActionCues=10
Console/page errors: none
```

## Implementation Notes

- `src/render/resource3dFactory.ts`
  - Adds `ResourceRuntimeUnitPresentationUserData`.
  - Adds unit class and threat-band classification for lane, wild, boss/objective, summon, ward, and trap resources.
  - Adds `resource3d:v15-unit-action-cue:<assetKey>` meshes with stable inspection metadata.
  - Adds deterministic action pulses for attack, cast, hit, death, expire, move, and idle.
  - Updates unit root transforms, resource parts, action cues, and runtime-surface materials from cached base values.
- `src/ui/resource3dPreview.ts`
  - Calls `updateResourceRuntimeUnitPresentation(...)` from the animation loop.
  - Exports `resourceRuntimeUnitPresentationSmokeForModels(...)`.
  - Extends global and active `window.__resource3dPreview` smoke data with runtime unit counts.
- Tests:
  - `tests/resource3dFactory.test.ts` locks V15 root contracts, action-cue metadata, non-drifting lane attack behavior, support expiration, and boss threat pulses.
  - `tests/resource3dPreview.test.ts` locks V15 smoke aggregation.

## Verification

```text
npm test -- tests/resource3dFactory.test.ts
1 file passed
20 tests passed
```

```text
npm test -- tests/resource3dPreview.test.ts
1 file passed
5 tests passed
```

```text
npm test -- tests/hero3dFactory.test.ts tests/hero3dPreview.test.ts tests/hero3dAssets.test.ts tests/resource3dFactory.test.ts tests/resource3dAssets.test.ts tests/resource3dPreview.test.ts tests/render3d/terrainDressing.test.ts tests/render3d/fx3dVisual.test.ts tests/render3d/fx3dRuntime.test.ts tests/render3d/resourceMotion.test.ts tests/render3d/commandQueue3d.test.ts tests/queuedOrders.test.ts
12 files passed
80 tests passed
```

```text
npm run build
build passed
warning: Three.js keeps the output chunk above 500 kB
```

## Open Notes

- This is still procedural runtime presentation, not final authored unit animation.
- V15 intentionally does not apply to items, terrain, UI, pure VFX, projectiles, or buildings unless they already carry lane/wild/support readability contracts.
- The helper is deterministic and recalculates from base transforms/material values, so it is safe as a fallback/debug driver while production assets land.

## Opus Merge Notes

Treat the following as stable handoff hooks:

- `resource unit asset -> root.userData.runtimeUnitPresentation`
- `resource unit asset -> updateResourceRuntimeUnitPresentation(root, actionState, elapsedMs)`
- `resource unit cue -> resource3d:v15-unit-action-cue:<assetKey>`
- `resource unit cue -> object.userData.resourceRuntimeUnitActionCue`
- `resource material -> material.userData.runtimeUnitAnimated`
- `resource material -> material.userData.runtimeUnitEmissiveIntensity`
- preview smoke -> `window.__resource3dPreview.runtimeUnitPresentation`
- current category smoke -> `window.__resource3dPreview.activeRuntime.runtimeUnit*`

When authored unit assets land, keep the same keys and map V15 states to real clip names, shader uniforms, particle emitters, or UI/debug overlays. Keep V15 visual-only unless Opus explicitly moves one of these contracts into authoritative gameplay state.
