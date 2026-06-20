# 3D V17 Combat FX Readability Summary

Date: 2026-06-14
Status: V17 combat FX readability runtime after V16 map runtime ambience
Branch/worktree: `codex/dota-shift-queue` at `~/vibecoding/dota_forever-shift-queue`
Preview route: `?mode=resource3d-preview`

## What Changed

V17 adds a final lightweight readability runtime for combat-facing FX samples:

- `spell_fx`: 10 samples
- `projectiles`: 10 samples
- `aoe_indicators`: 10 samples
- `status_effects`: 10 samples
- `targeting_reticles`: 10 samples
- Total V17 combat FX readability roots: 50

Each eligible root now exposes `root.userData.runtimeFxReadability` with:

- `fxClass`: `spell-burst`, `projectile-path`, `area-telegraph`, `status-aura`, or `targeting-reticle`
- `timingIntent`: `windup-impact-linger`, `travel-impact`, `persistent-aura`, or `target-confirm`
- `dangerRead`: `point`, `path`, `radius`, `unit`, `self`, or `invalid`
- `readabilityPriority`
- `runtimeHelper`: `updateResourceRuntimeFxReadability`

Each eligible root also gets a named visible cue:

```text
resource3d:v17-fx-readability-cue:<assetKey>
object.userData.resourceRuntimeFxReadabilityCue === true
```

## Runtime Behavior

`updateResourceRuntimeFxReadability(root, elapsedMs)` drives deterministic presentation pulses from cached base values:

- Projectile paths get travel/path pulse and material energy response.
- AoE telegraphs get larger radius pulse and readable warning rings.
- Status auras get persistent unit-level pulse.
- Targeting reticles get confirmation pulse and invalid-target emphasis.
- Spell bursts get windup/impact/linger readability without burying units.

The helper writes smoke/debug fields onto the root:

```text
runtimeFxAnimated
runtimeFxClockMs
runtimeFxPathPulse
runtimeFxRadiusPulse
runtimeFxStatusPulse
runtimeFxTargetPulse
runtimeFxBurstPulse
runtimeFxReadabilityPulse
runtimeFxAnimatedMaterials
runtimeFxReadabilityCues
```

## Preview Hooks

`src/ui/resource3dPreview.ts` now calls `updateResourceRuntimeFxReadability(...)` every frame and exposes:

```text
window.__resource3dPreview.runtimeFxReadability
window.__resource3dPreview.activeRuntime.runtimeFxRoots
window.__resource3dPreview.activeRuntime.runtimeFxAnimated
window.__resource3dPreview.activeRuntime.runtimeFxMaterials
window.__resource3dPreview.activeRuntime.runtimeFxReadabilityCues
```

Playwright smoke at `http://127.0.0.1:5215/?mode=resource3d-preview`:

```text
runtimeFxReadability={
  runtimeFxRoots:50,
  animatedRoots:50,
  animatedMaterials:810,
  readabilityCues:50,
  fxClasses:{
    spell-burst:10,
    projectile-path:10,
    area-telegraph:10,
    status-aura:10,
    targeting-reticle:10
  },
  timingIntents:{
    windup-impact-linger:20,
    travel-impact:10,
    persistent-aura:10,
    target-confirm:10
  },
  dangerReads:{
    path:16,
    radius:16,
    point:4,
    unit:12,
    self:1,
    invalid:1
  }
}
```

Active `aoe_indicators` category smoke:

```text
activeRuntime={
  category:aoe_indicators,
  resourceCount:10,
  runtimeFxRoots:10,
  runtimeFxAnimated:10,
  runtimeFxMaterials:140,
  runtimeFxReadabilityCues:10
}
```

Screenshot evidence:

```text
docs/screenshots/ux-3d-v17-combat-fx-readability.png
```

## Files Changed

- `src/render/resource3dFactory.ts`
  - Adds V17 FX readability runtime types.
  - Adds `resourceRuntimeFxReadabilityUserData(asset)`.
  - Adds `updateResourceRuntimeFxReadability(root, elapsedMs)`.
  - Adds `resource3d:v17-fx-readability-cue:<assetKey>` meshes.
  - Adds deterministic FX cue and material response.
- `src/ui/resource3dPreview.ts`
  - Calls the V17 helper each frame.
  - Adds global and active-category FX readability smoke.
- `tests/resource3dFactory.test.ts`
  - Locks V17 root contracts, cue metadata, projectile/AoE drift safety, status pulse, and invalid-target emphasis.
- `tests/resource3dPreview.test.ts`
  - Locks global FX readability smoke aggregation.

## Verification

```text
npm test -- tests/resource3dFactory.test.ts
1 file passed
26 tests passed
```

```text
npm test -- tests/resource3dPreview.test.ts
1 file passed
7 tests passed
```

```text
npm test -- tests/resource3dFactory.test.ts tests/resource3dPreview.test.ts tests/resource3dAssets.test.ts tests/render3d/fx3dVisual.test.ts tests/render3d/fx3dRuntime.test.ts tests/render3d/resourceMotion.test.ts
6 files passed
60 tests passed
```

```text
npm run build
build passed
warning: Three.js keeps the output chunk above 500 kB
```

## Opus Notes

V17 is presentation-only. It does not change damage timing, target validation, projectile collision, status logic, cast rules, or AoE gameplay.

Recommended consumption order:

1. Use `root.userData.runtimeFxReadability` for renderer/debug inspection.
2. Call `updateResourceRuntimeFxReadability(root, elapsedMs)` from the visual frame loop.
3. Keep V17 below hero/unit priority so FX communicates danger without hiding silhouettes.
4. When authored VFX/audio assets land, preserve the same keys and map V17 `fxClass` / `timingIntent` / `dangerRead` into particles, decals, shader uniforms, target overlays, or audio ducking.
