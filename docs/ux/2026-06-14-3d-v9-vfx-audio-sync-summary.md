# 3D V9 VFX / Audio Sync Contract Summary

Date: 2026-06-14
Status: V9 VFX/audio sync contract pass after V8 resource runtime consumption

## Research Target

Reference documents:

- `docs/ux/2026-06-14-3d-v8-resource-runtime-consumption-summary.md`
- `docs/ux/2026-06-13-dota-unit-fx-research-target.md`
- `docs/ux/2026-06-13-dota-map-elements-research-target.md`

Reference sources:

- Dota 2 official heroes page: `https://www.dota2.com/heroes`
- Dota 2 Wandering Waters page: `https://www.dota2.com/wanderingwaters`

Extracted direction:

- Dota-like combat readability needs more than visible geometry: spell, projectile, AoE, ambient, and UI cue assets need phase timing, danger shape, particle layers, and audio cue IDs.
- VFX/audio contracts should be model-adjacent for Opus integration, but they should not pretend to be final authored audio, GPU particles, or production texture atlases.
- Runtime hooks must stay inspection-friendly and non-invasive: no sim, combat, targeting, pathing, or balance changes in this UX asset slice.

## Player-Facing Changes

- `Resource3DAssetSpec.vfxAudio` now exists for 55 VFX/audio-facing resources:
  - `spell_fx`: 10
  - `projectiles`: 10
  - `aoe_indicators`: 10
  - `environment_fx`: 15
  - `sound_cue_markers`: 10
- Each VFX/audio contract includes:
  - `family`: visual/audio family, such as `fire`, `frost`, `physical`, `ambient`, or `ui`.
  - `dangerShape`: readability shape, such as `point`, `line`, `radius`, `path`, `ambient`, or `ui`.
  - `particleLayers`: future atlas/sprite layer specs.
  - `audioCues`: future `.ogg` cue IDs and production paths.
  - `phaseSync`: `windup`, `impact`, `linger`, and `fade` timing.
  - `light` and `decal`: future scene-light/decal binding hints.
- `createResource3DModel(asset)` now writes V9 runtime data onto generated roots:
  - `root.userData.vfxAudio`
  - `root.userData.runtimeVfxAudio`
- VFX/audio resources get named runtime sync anchors:
  - `resource3d:v9-vfx-audio-sync:<assetKey>`
- Resource preview exposes contract smoke data through:
  - `window.__resource3dPreview.vfxAudio`
  - `window.__resource3dPreview.activeRuntime.vfxAudioRoots`
  - `window.__resource3dPreview.activeRuntime.vfxAudioSyncAnchors`
  - `window.__resource3dPreview.activeRuntime.audioCues`
  - `window.__resource3dPreview.activeRuntime.particleLayers`
  - `window.__resource3dPreview.activeRuntime.phaseSynced`

## Runtime Evidence

Resource preview screenshot:

- `docs/screenshots/ux-3d-v9-vfx-audio-contract.png`

Smoke data:

```text
Playwright @ http://127.0.0.1:5207/?mode=resource3d-preview
VFX/audio contracts: 55
By category: spell_fx=10, projectiles=10, aoe_indicators=10, environment_fx=15, sound_cue_markers=10
Families covered: physical, frost, lightning, earth, holy, shadow, fire, poison, arcane, objective, water, ambient, wind, ui
Danger shapes covered: point, line, radius, path, ambient, ui
Audio cue contracts: 126
Particle layer contracts: 177
Phase-synced resources: 55
Active category: projectiles
Runtime VFX/audio roots: 10
Runtime VFX/audio sync anchors: 10
Active category audio cues: 21
Active category particle layers: 34
Console/page errors: none
Screenshot: docs/screenshots/ux-3d-v9-vfx-audio-contract.png
```

## Implementation Notes

- `src/render/resource3dAssets.ts`
  - Adds `ResourceVfxAudioSpec` and related family/danger/particle/audio/phase types.
  - Adds deterministic VFX/audio contracts for spell FX, projectiles, AoE indicators, environment FX, and sound cue markers.
  - Uses production-path conventions such as `public/assets/tree3d/audio/resources/<category>/<assetKey>/<event>.ogg`.
- `src/render/resource3dFactory.ts`
  - Adds `ResourceRuntimeVfxAudioUserData`.
  - Exports `resourceRuntimeVfxAudioUserData(vfxAudio)`.
  - Adds V9 sync-anchor meshes to generated resource roots when `asset.vfxAudio` exists.
- `src/ui/resource3dPreview.ts`
  - Exposes `resourceVfxAudioSmokeForAssets(...)`.
  - Adds V9 preview smoke data to `window.__resource3dPreview.vfxAudio`.
  - Extends `activeRuntime` with VFX/audio root, anchor, cue, layer, and phase-sync counts.
- Tests:
  - `tests/resource3dAssets.test.ts` locks V9 contract coverage and Dota-like danger/cue semantics.
  - `tests/resource3dFactory.test.ts` locks generated root and sync-anchor consumption.
  - `tests/resource3dPreview.test.ts` locks preview smoke aggregation for Opus handoff checks.

## Verification

```text
npm test -- tests/resource3dPreview.test.ts
1 file passed
1 test passed
```

```text
npm test -- tests/resource3dFactory.test.ts tests/resource3dAssets.test.ts tests/resource3dPreview.test.ts
3 files passed
21 tests passed
```

```text
npm test -- tests/hero3dFactory.test.ts tests/resource3dFactory.test.ts tests/hero3dAssets.test.ts tests/resource3dAssets.test.ts tests/resource3dPreview.test.ts tests/render3d/terrainDressing.test.ts tests/render3d/fx3dVisual.test.ts tests/render3d/fx3dRuntime.test.ts tests/render3d/resourceMotion.test.ts tests/render3d/commandQueue3d.test.ts tests/queuedOrders.test.ts
11 files passed
59 tests passed
```

```text
npm test -- --run --pool=forks
105 files passed
894 tests passed
```

```text
npm run build
passed
Vite still reports the existing large chunk warning.
```

## Remaining UX / Integration Debt

- This pass defines and consumes VFX/audio contracts; it does not include authored `.ogg` files.
- This pass defines particle layer and atlas paths; it does not include GPU particles, authored atlas textures, sprite flipbooks, or final particle sequences.
- Runtime sync anchors are inspection hooks; they do not yet drive the real audio mixer, real particle renderer, or timeline playback.
- Light and decal specs are binding hints; scene light pulses and decal projection are still future runtime work.

## Opus Handoff

### What

Adds model-adjacent VFX/audio contracts and runtime smoke hooks for spell, projectile, AoE, environment, and audio-cue resources.

### Why

This gives Opus a stable bridge from procedural samples to the future `tree3d.js` production loader: resource keys can now map to visual family, danger shape, phase timing, particle layer IDs, and audio cue IDs.

### Tradeoff

- Chose metadata and lightweight sync anchors instead of faking real playback.
- Kept the pass limited to UX/asset contracts and preview smoke data.
- Did not touch sim, combat math, targeting rules, pathing, or balance.

### Next Action

If Opus wires production VFX/audio next, consume `asset.vfxAudio`, `root.userData.runtimeVfxAudio`, and `resource3d:v9-vfx-audio-sync:*` as the bridge into the audio mixer, particle atlas loader, phase timeline, and scene-light/decal binding.
