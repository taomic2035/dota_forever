# 3D V12 Runtime Motion Summary

Date: 2026-06-14
Status: V12 runtime motion pass after V11 VFX phase animation

## Research Target

Reference documents:

- `docs/ux/2026-06-14-3d-v11-vfx-phase-animation-summary.md`
- `docs/ux/2026-06-14-3d-v6-surface-realism-summary.md`
- `docs/ux/2026-06-13-dota-unit-fx-research-target.md`

Reference sources:

- Dota 2 official heroes page: `https://www.dota2.com/heroes`
- Dota 2 Wandering Waters page: `https://www.dota2.com/wanderingwaters`
- Valve Source 2 particle documentation: `https://developer.valvesoftware.com/wiki/Dota_2_Workshop_Tools/Particles`

Extracted direction:

- Dota-like assets should feel alive even before final GLB/PBR assets land: banners sway, runes pulse, projectiles spin or bob, and ambient map props breathe subtly.
- Runtime motion needs to be deterministic and inspectable so Opus can replace procedural transforms with production animation clips later.
- This pass stays visual-only: no sim, collision, combat, target, pathing, or balance behavior changes.

## Player-Facing Changes

- Adds `resourceRuntimeMotionUserData(asset)` and `updateResourceRuntimeMotion(root, elapsedMs)` in `src/render/resource3dFactory.ts`.
- All 408 Resource3D samples now expose `root.userData.runtimeMotion`.
- Motion intents now normalize existing preview motion into runtime categories:
  - `idle-breathe`
  - `pulse-energy`
  - `spin-showcase`
  - `float-hover`
  - `impact-hit`
  - `ambient-sway`
- Resource parts now keep base transform data so repeated animation updates do not drift.
- Surface-reactive parts get deterministic scale/rotation/pulse metadata for future authored material animation replacement.
- Resource preview now calls `updateResourceRuntimeMotion(...)` every frame and exposes runtime motion smoke counts.

## Runtime Evidence

Resource preview screenshot:

- `docs/screenshots/ux-3d-v12-runtime-motion.png`

Smoke data:

```text
Playwright @ http://127.0.0.1:5210/?mode=resource3d-preview
Active category: map_props
Resource count: 21
Runtime motion roots: 21
Runtime motion animated roots: 21
Runtime motion animated parts: 189
Runtime motion surface-reactive parts: 147
Global runtime motion roots: 408
Global motion intents: idle-breathe=32, pulse-energy=115, ambient-sway=94, float-hover=68, impact-hit=65, spin-showcase=34
Console/page errors: none
Screenshot: docs/screenshots/ux-3d-v12-runtime-motion.png
```

## Implementation Notes

- `src/render/resource3dFactory.ts`
  - Exports `resourceRuntimeMotionUserData(asset)`.
  - Exports `updateResourceRuntimeMotion(root, elapsedMs)`.
  - Tags resource parts with `basePosition`, `baseRotation`, `baseScale`, `runtimeMotionWeight`, and `runtimeMotionSurfaceReactive`.
  - Updates root transforms from base transforms per runtime motion intent.
  - Updates part transforms from base transforms so repeated calls are deterministic and non-accumulating.
- `src/ui/resource3dPreview.ts`
  - Calls `updateResourceRuntimeMotion(res.model, ...)` from the animation loop.
  - Exports `resourceRuntimeMotionSmokeForModels(...)`.
  - Extends `window.__resource3dPreview.activeRuntime` with current-category runtime motion counts.
- Tests:
  - `tests/resource3dFactory.test.ts` locks V12 root contracts, non-drifting part animation, and distinct impact/spin reads.
  - `tests/resource3dPreview.test.ts` locks V12 runtime motion smoke aggregation.

## Verification

```text
npm test -- tests/resource3dFactory.test.ts
1 file passed
14 tests passed
```

```text
npm test -- tests/resource3dPreview.test.ts
1 file passed
3 tests passed
```

```text
npm test -- tests/resource3dFactory.test.ts tests/resource3dPreview.test.ts tests/resource3dAssets.test.ts
3 files passed
30 tests passed
```

```text
npm test -- tests/hero3dFactory.test.ts tests/resource3dFactory.test.ts tests/hero3dAssets.test.ts tests/resource3dAssets.test.ts tests/resource3dPreview.test.ts tests/render3d/terrainDressing.test.ts tests/render3d/fx3dVisual.test.ts tests/render3d/fx3dRuntime.test.ts tests/render3d/resourceMotion.test.ts tests/render3d/commandQueue3d.test.ts tests/queuedOrders.test.ts
11 files passed
68 tests passed
```

```text
npm run build
build passed
warning: Three.js keeps the output chunk above 500 kB
```

```text
npm test -- --pool=forks --maxWorkers=1
105 files passed
903 tests passed
```

## Remaining UX / Integration Debt

- V12 is still procedural transform animation, not authored animation clips from final GLB rigs.
- Surface pulses are metadata-driven material/transform cues, not final shader graphs.
- No skeleton retargeting, per-resource animation blend tree, or production asset bundle is included.
- Runtime motion is visual-only and does not drive gameplay collision, targeting, projectile math, or ability timing.

## Opus Handoff

### What

Adds a unified runtime motion layer for all 408 Resource3D samples.

### Why

Opus can now wire the future `tree3d.js` production loader against one stable procedural fallback path: `root.userData.runtimeMotion` plus `updateResourceRuntimeMotion(root, elapsedMs)`.

### Tradeoff

- Chose deterministic procedural motion over fake authored clip files.
- Kept action and surface motion isolated from sim/combat/pathing.
- Preserved existing V8/V9/V10/V11 hooks.

### Next Action

When authored GLB/PBR assets land, map `motionIntent`, `actionSlots`, and `runtimeMotionSurfaceReactive` onto real animation clips, blend states, material animation, or particle controls while keeping `updateResourceRuntimeMotion(...)` as the fallback/debug driver.
