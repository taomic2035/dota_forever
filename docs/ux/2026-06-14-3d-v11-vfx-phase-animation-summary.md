# 3D V11 VFX Phase Animation Summary

Date: 2026-06-14
Status: V11 runtime VFX phase-animation pass after V10 visible playback layers

## Research Target

Reference documents:

- `docs/ux/2026-06-14-3d-v10-vfx-playback-layers-summary.md`
- `docs/ux/2026-06-14-3d-v9-vfx-audio-sync-summary.md`
- `docs/ux/2026-06-13-dota-unit-fx-research-target.md`

Reference sources:

- Dota 2 official heroes page: `https://www.dota2.com/heroes`
- Dota 2 Wandering Waters page: `https://www.dota2.com/wanderingwaters`
- Valve Source 2 particle documentation: `https://developer.valvesoftware.com/wiki/Dota_2_Workshop_Tools/Particles`

Extracted direction:

- Dota-like VFX should communicate source and danger over time, not only through static shapes.
- The previous V10 playback roots need phase-driven movement: windup/readability, impact/burst, linger/residue, fade/cleanup.
- This pass stays runtime-visual only: no combat, targeting, pathing, balance, authored audio, or GPU particle system changes.

## Player-Facing Changes

- Adds `updateResourceVfxPlayback(root, elapsedMs)` in `src/render/resource3dFactory.ts`.
- Runtime VFX playback groups now track:
  - `resourceRuntimeVfxPlaybackAnimated`
  - `activePhase`
  - `phaseCursorMs`
  - `phaseProgress`
- V10 layer meshes now animate opacity and scale by their assigned phase roles.
- V10 light hints now pulse by active phase and configured `pulseHz`.
- V10 ground-residue decals now rise on impact/linger and fade during cleanup.
- Resource preview now calls `updateResourceVfxPlayback(...)` every frame.
- Resource preview smoke now exposes:
  - `window.__resource3dPreview.activeRuntime.vfxPlaybackAnimated`
  - `window.__resource3dPreview.activeRuntime.vfxAnimatedLayers`

## Runtime Evidence

Resource preview screenshot:

- `docs/screenshots/ux-3d-v11-vfx-phase-animation.png`

Smoke data:

```text
Playwright @ http://127.0.0.1:5209/?mode=resource3d-preview
Active category: aoe_indicators
Resource count: 10
VFX/audio roots: 10
VFX/audio sync anchors: 10
VFX playback groups: 10
VFX playback layers: 42
VFX playback light hints: 10
VFX playback decals: 3
Animated playback groups: 10
Animated layers: 42
Console/page errors: none
Screenshot: docs/screenshots/ux-3d-v11-vfx-phase-animation.png
```

## Implementation Notes

- `src/render/resource3dFactory.ts`
  - Exports `updateResourceVfxPlayback(root, elapsedMs)`.
  - Adds active phase calculation from `phaseTimelineMs`.
  - Updates VFX layer opacity/scale by phase role.
  - Updates light hint opacity/scale by phase and pulse rate.
  - Updates decal opacity/scale by windup/impact/linger/fade.
- `src/ui/resource3dPreview.ts`
  - Calls `updateResourceVfxPlayback(res.model, ...)` from the animation loop.
  - Refreshes `window.__resource3dPreview.activeRuntime` during the render loop so smoke checks see animated state.
  - Extends preview smoke with animated group/layer counts.
- Tests:
  - `tests/resource3dFactory.test.ts` locks windup/impact/linger/fade animation behavior.
  - `tests/resource3dPreview.test.ts` locks animated playback smoke aggregation.

## Verification

```text
npm test -- tests/resource3dFactory.test.ts
1 file passed
11 tests passed
```

```text
npm test -- tests/resource3dPreview.test.ts
1 file passed
2 tests passed
```

```text
npm test -- tests/resource3dFactory.test.ts tests/resource3dPreview.test.ts tests/resource3dAssets.test.ts
3 files passed
26 tests passed
```

```text
npm test -- tests/hero3dFactory.test.ts tests/resource3dFactory.test.ts tests/hero3dAssets.test.ts tests/resource3dAssets.test.ts tests/resource3dPreview.test.ts tests/render3d/terrainDressing.test.ts tests/render3d/fx3dVisual.test.ts tests/render3d/fx3dRuntime.test.ts tests/render3d/resourceMotion.test.ts tests/render3d/commandQueue3d.test.ts tests/queuedOrders.test.ts
11 files passed
64 tests passed
```

```text
npm test -- --pool=forks --maxWorkers=1
105 files passed
899 tests passed
```

Note: an earlier parallel fork run reported all 105 files and 899 tests passed, then exited non-zero from Vitest worker RPC shutdown (`Timeout calling "onTaskUpdate"`). The single-worker fork run above is the clean full-suite merge evidence.

```text
npm run build
passed
Vite still reports the existing large chunk warning.
```

## Remaining UX / Integration Debt

- V11 animates procedural placeholder meshes, not authored particle atlas sprites.
- Light hints are still mesh pulses, not real dynamic light volumes.
- Decals are still visible ring meshes, not projected terrain decals.
- Audio cue IDs remain metadata only; real `.ogg` files and audio mixer sync are not included.
- A production GPU particle timeline is still future work.

## Opus Handoff

### What

Turns V10 static playback roots into phase-driven runtime VFX animation.

### Why

Opus can now wire future production particle/audio systems against a live timing contract rather than a static tree. The same keys and names remain stable from V9/V10.

### Tradeoff

- Chose deterministic runtime animation over fake authored particle files.
- Kept animation rules centralized in `updateResourceVfxPlayback(...)`.
- Did not touch sim, combat math, targeting rules, pathing, or balance.

### Next Action

If Opus wires production VFX next, replace V11 mesh opacity/scale updates with real particle timeline playback while preserving `phaseTimelineMs`, `activePhase`, `resource3d:v10-vfx-layer:*`, and `root.userData.runtimeVfxPlayback`.
