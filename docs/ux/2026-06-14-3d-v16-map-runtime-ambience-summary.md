# 3D V16 Map Runtime Ambience Summary

Date: 2026-06-14
Status: V16 map/terrain ambience runtime after V15 non-hero unit runtime presentation
Branch/worktree: `codex/dota-shift-queue` at `~/vibecoding/dota_forever-shift-queue`
Preview route: `?mode=resource3d-preview`

## What Changed

V16 adds a visual-only runtime ambience contract for map-facing Resource3D samples:

- `terrain_tiles`: 22 samples
- `map_props`: 21 samples
- `environment_fx`: 15 samples
- Total V16 map ambience roots: 58

Each eligible root now exposes `root.userData.runtimeMapPresentation` with:

- `mapClass`: `flat-ground`, `tree-wall`, `grass-flower`, `highground-edge`, `fence-blocker`, `slope-ramp`, `river-corridor`, `sky-atmosphere`, `ambient-fx`, or `map-prop`
- `biomeIntent`: `radiant`, `dire`, `river`, `sky`, `jungle`, `highground`, or `neutral`
- `ambienceIntent`: `ground-dust`, `canopy-sway`, `grass-bloom`, `highground-shadow`, `fence-depth`, `slope-parallax`, `river-flow`, `sky-haze`, or `ambient-particles`
- `runtimeHelper`: `updateResourceRuntimeMapPresentation`

Each eligible root also gets a named visible cue:

```text
resource3d:v16-map-ambience-cue:<assetKey>
object.userData.resourceRuntimeMapAmbienceCue === true
```

## Runtime Behavior

`updateResourceRuntimeMapPresentation(root, elapsedMs)` drives deterministic map ambience from cached base values:

- River assets get flow pulses, light shimmer, and material response.
- Sky assets get haze-scale pulses and raised ambience cue placement.
- Tree-wall assets get occlusion/canopy pulse.
- Highground and ramp assets get depth pulses.
- Grass/flower assets get bloom/sway ambience.
- Fence/blocker assets get depth/blocking readability.
- Generic terrain and props get low ground-dust ambience.

The helper writes smoke/debug fields onto the root:

```text
runtimeMapAnimated
runtimeMapClockMs
runtimeMapFlowPulse
runtimeMapDepthPulse
runtimeMapOcclusionPulse
runtimeMapAmbientPulse
runtimeMapAnimatedMaterials
runtimeMapAmbienceCues
```

## Preview Hooks

`src/ui/resource3dPreview.ts` now calls `updateResourceRuntimeMapPresentation(...)` every frame and exposes:

```text
window.__resource3dPreview.runtimeMapPresentation
window.__resource3dPreview.activeRuntime.runtimeMapRoots
window.__resource3dPreview.activeRuntime.runtimeMapAnimated
window.__resource3dPreview.activeRuntime.runtimeMapMaterials
window.__resource3dPreview.activeRuntime.runtimeMapAmbienceCues
```

Playwright smoke at `http://127.0.0.1:5214/?mode=resource3d-preview`:

```text
runtimeMapPresentation={
  runtimeMapRoots:58,
  animatedRoots:58,
  animatedMaterials:1156,
  ambienceCues:58,
  mapClasses:{
    river-corridor:9,
    tree-wall:9,
    ambient-fx:4,
    sky-atmosphere:6,
    highground-edge:10,
    grass-flower:7,
    map-prop:4,
    fence-blocker:2,
    flat-ground:7
  },
  ambienceIntents:{
    river-flow:9,
    canopy-sway:9,
    ambient-particles:4,
    sky-haze:6,
    highground-shadow:10,
    grass-bloom:7,
    ground-dust:11,
    fence-depth:2
  },
  biomeIntents:{
    river:9,
    jungle:7,
    neutral:13,
    sky:6,
    dire:3,
    highground:10,
    radiant:10
  }
}
```

Active `environment_fx` category smoke:

```text
activeRuntime={
  category:environment_fx,
  resourceCount:15,
  runtimeMapRoots:15,
  runtimeMapAnimated:15,
  runtimeMapMaterials:210,
  runtimeMapAmbienceCues:15
}
```

Screenshot evidence:

```text
docs/screenshots/ux-3d-v16-map-runtime-ambience.png
```

## Files Changed

- `src/render/resource3dFactory.ts`
  - Adds V16 map runtime types.
  - Adds `resourceRuntimeMapPresentationUserData(asset)`.
  - Adds `updateResourceRuntimeMapPresentation(root, elapsedMs)`.
  - Adds `resource3d:v16-map-ambience-cue:<assetKey>` meshes.
  - Adds deterministic map material and cue response.
- `src/ui/resource3dPreview.ts`
  - Calls the V16 helper each frame.
  - Adds global and active-category map ambience smoke.
- `tests/resource3dFactory.test.ts`
  - Locks root contracts, cue metadata, river/sky drift safety, tree-wall occlusion, and highground depth pulses.
- `tests/resource3dPreview.test.ts`
  - Locks global map ambience smoke aggregation.

## Verification

```text
npm test -- tests/resource3dFactory.test.ts
1 file passed
23 tests passed
```

```text
npm test -- tests/resource3dPreview.test.ts
1 file passed
6 tests passed
```

```text
npm test -- tests/render3d
10 files passed
53 tests passed
```

```text
npm run build
build passed
warning: Three.js keeps the output chunk above 500 kB
```

## Opus Notes

V16 is still presentation-only. It does not change pathing, collision, highground rules, fog of war, or authoritative map state.

Recommended consumption order:

1. Use `root.userData.runtimeMapPresentation` for renderer/debug inspection.
2. Call `updateResourceRuntimeMapPresentation(root, elapsedMs)` from the visual frame loop.
3. Keep V16 visual-only until Opus explicitly maps `placement`, `blocker`, `visionBlocker`, `river`, or `heightLevel` into authoritative gameplay systems.
4. When authored GLB/PBR terrain props land, preserve the same keys and map V16 `mapClass` / `ambienceIntent` to shader uniforms, particles, decals, or authored animation clips.
