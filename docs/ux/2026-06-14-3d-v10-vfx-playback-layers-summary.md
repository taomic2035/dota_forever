# 3D V10 VFX Playback Layers Summary

Date: 2026-06-14
Status: V10 visible VFX playback pass after V9 VFX/audio sync contracts

## Research Target

Reference documents:

- `docs/ux/2026-06-14-3d-v9-vfx-audio-sync-summary.md`
- `docs/ux/2026-06-13-dota-unit-fx-research-target.md`
- `docs/ux/2026-06-13-dota-map-elements-research-target.md`

Reference sources:

- Dota 2 official heroes page: `https://www.dota2.com/heroes`
- Dota 2 Wandering Waters page: `https://www.dota2.com/wanderingwaters`

Extracted direction:

- Dota-like VFX need readable shape language in the world: radius warnings, projectile paths, ambient loops, phase timing, and lingering ground residue.
- V9 metadata should now become visible runtime layers so Opus can inspect playback readiness from the actual Three.js resource tree.
- This remains a UX/asset runtime pass: no gameplay math, targeting, pathing, balance, real audio playback, or real GPU particle system changes.

## Player-Facing Changes

- VFX/audio resources now get a visible playback root:
  - `resource3d:v10-vfx-playback:<assetKey>`
- Every V9 particle layer now gets a visible representative mesh:
  - `resource3d:v10-vfx-layer:<assetKey>:<role>`
- Every VFX playback root now gets a scene-light hint mesh:
  - `resource3d:v10-vfx-light:<assetKey>`
- VFX contracts with non-`none` decals now get a visible ground-residue mesh:
  - `resource3d:v10-vfx-decal:<assetKey>`
- Generated roots now expose:
  - `root.userData.runtimeVfxPlayback`
- Resource preview now exposes V10 current-category smoke data through:
  - `window.__resource3dPreview.activeRuntime.vfxPlaybackGroups`
  - `window.__resource3dPreview.activeRuntime.vfxPlaybackLayers`
  - `window.__resource3dPreview.activeRuntime.vfxPlaybackLights`
  - `window.__resource3dPreview.activeRuntime.vfxPlaybackDecals`

## Runtime Evidence

Resource preview screenshot:

- `docs/screenshots/ux-3d-v10-vfx-playback-layers.png`

Smoke data:

```text
Playwright @ http://127.0.0.1:5208/?mode=resource3d-preview
Active category: aoe_indicators
Resource count: 10
VFX/audio roots: 10
VFX/audio sync anchors: 10
Audio cue contracts: 30
Particle layer contracts: 42
VFX playback groups: 10
VFX playback layers: 42
VFX playback light hints: 10
VFX playback decals: 3
Console/page errors: none
Screenshot: docs/screenshots/ux-3d-v10-vfx-playback-layers.png
```

## Implementation Notes

- `src/render/resource3dFactory.ts`
  - Adds `ResourceRuntimeVfxPlaybackUserData`.
  - Exports `resourceRuntimeVfxPlaybackUserData(vfxAudio)`.
  - Adds V10 playback roots, layer meshes, light hints, and decal meshes.
  - Keeps all V10 playback meshes as visual/inspection hooks; no sound playback or sim state changes.
- `src/ui/resource3dPreview.ts`
  - Adds `resourceVfxPlaybackSmokeForModels(...)`.
  - Extends `activeRuntime` with V10 playback group/layer/light/decal counts.
- Tests:
  - `tests/resource3dFactory.test.ts` locks V10 visible playback roots, layer roles, phase timelines, light hints, and radius decals.
  - `tests/resource3dPreview.test.ts` locks V10 preview smoke aggregation from generated runtime models.

## Verification

```text
npm test -- tests/resource3dFactory.test.ts
1 file passed
9 tests passed
```

```text
npm test -- tests/resource3dPreview.test.ts
1 file passed
2 tests passed
```

```text
npm test -- tests/resource3dFactory.test.ts tests/resource3dPreview.test.ts tests/resource3dAssets.test.ts
3 files passed
24 tests passed
```

```text
npm test -- tests/hero3dFactory.test.ts tests/resource3dFactory.test.ts tests/hero3dAssets.test.ts tests/resource3dAssets.test.ts tests/resource3dPreview.test.ts tests/render3d/terrainDressing.test.ts tests/render3d/fx3dVisual.test.ts tests/render3d/fx3dRuntime.test.ts tests/render3d/resourceMotion.test.ts tests/render3d/commandQueue3d.test.ts tests/queuedOrders.test.ts
11 files passed
62 tests passed
```

```text
npm test -- --run --pool=forks
105 files passed
897 tests passed
```

```text
npm run build
passed
Vite still reports the existing large chunk warning.
```

## Remaining UX / Integration Debt

- V10 makes VFX contracts visible in Three.js, but it still does not include authored particle atlas textures.
- V10 light hints are visible meshes, not real dynamic scene lights.
- V10 decals are visible rings, not projected ground decals.
- Audio cue IDs and `.ogg` paths are still metadata only; no real audio files or audio mixer sync are included.
- A true playback timeline that animates phase opacity/scale over time is still future work.

## Opus Handoff

### What

Moves V9 VFX/audio contracts from metadata-only into visible generated Three.js playback layers.

### Why

Opus can now inspect `root.userData.runtimeVfxPlayback` and `resource3d:v10-vfx-*` children to wire the future particle atlas loader, timeline playback, light binding, decal projection, and audio mixer.

### Tradeoff

- Chose visible lightweight meshes instead of fake authored particles.
- Kept the pass deterministic and testable.
- Did not touch sim, combat math, targeting rules, pathing, or balance.

### Next Action

If Opus wires the production VFX stack next, consume `resource3d:v10-vfx-playback:*`, `resource3d:v10-vfx-layer:*`, `resource3d:v10-vfx-light:*`, and `resource3d:v10-vfx-decal:*` as the bridge from procedural previews to real atlas/timeline/audio playback.
