# 3D V21 Resource Runtime Bridge Summary

Date: 2026-06-14
Branch/worktree: `main` at `~/vibecoding/dota_forever`
Gameplay verification URL: `http://127.0.0.1:<port>/?mode=play&hero=rein&renderer=3d`
Screenshot evidence: `docs/screenshots/ux-3d-v21-resource-runtime-bridge.png`

## Why

V20 wired hero runtime presentation into the real play route. The same class of gap existed for resource3d units: `resource3dFactory` already had the V15 helper `updateResourceRuntimeUnitPresentation(...)`, but the real gameplay bridge in `src/render3d/resource3dModel.ts` only used `resourceMotionState(...)` and `resourcePartMotionState(...)`.

V21 wires the V15 helper into `buildResource3DUnitModel(...).applyPose(...)`, so lane creeps, neutrals, bosses, and mapped support-style units can receive the richer action cue, threat pulse, material animation, and unit presentation metadata in actual gameplay.

## Changes

- `src/render3d/resource3dModel.ts`
  - Imports and calls `updateResourceRuntimeUnitPresentation(...)` in the real `UnitModel.applyPose(...)` path.
  - Maps render pose state to resource runtime state:
    - `walk -> move`
    - `attack -> attack`
    - `cast/channel -> cast`
    - `death -> death`
    - hit status -> `hit`
    - fallback -> `idle`
  - Adds `inner.userData.gameplayRuntimeBridge`:
    - `bridge: "render3d/resource3dModel"`
    - `runtimeHelper: "updateResourceRuntimeUnitPresentation"`
  - Normalizes `runtimeUnitPresentation.baseRootScale` to `[1, 1, 1]` after the cloned resource root is placed under the gameplay scaler, preventing helper pulses from double-applying asset scale.

- `tests/render3d/resource3dModel.test.ts`
  - Adds a red-to-green contract for `dawn_melee_creep`.
  - Proves the real bridge outputs:
    - `runtimeUnitState === "attack"`
    - `runtimeUnitAnimated === true`
    - animated parts/materials
    - action cues
    - threat pulse
    - normalized runtime base scale.

## Verification

Red test before fix:

```text
npm test -- tests/render3d/resource3dModel.test.ts
1 failed:
- expected gameplayRuntimeBridge to match updateResourceRuntimeUnitPresentation
```

Green after fix:

```text
npm test -- tests/render3d/resource3dModel.test.ts tests/resource3dPreview.test.ts
2 files passed
8 tests passed
```

Build:

```text
npm run build
build passed
warning: Three.js keeps the output chunk above 500 kB
```

Real gameplay route smoke:

```text
URL: http://127.0.0.1:5230/?mode=play&hero=rein&renderer=3d&seed=42&speed=0
Console/page errors: none
Injected unit: kind=creep, team=Dawn, name=近战兵
Scene root: resource3d:dawn_melee_creep found
gameplayRuntimeBridge.runtimeHelper: updateResourceRuntimeUnitPresentation
runtimeUnitState: attack
runtimeUnitAnimated: true
runtimeUnitAnimatedParts: 12
runtimeUnitAnimatedMaterials: 35
runtimeUnitActionCues: 1
runtimeUnitThreatPulse: 0.17
Screenshot: docs/screenshots/ux-3d-v21-resource-runtime-bridge.png
```

## Handoff Notes for Opus

- This patch is presentation-only and does not change `src/sim/**`.
- This complements V20: heroes now consume `updateHeroRuntimePresentation(...)`; mapped resource units now consume `updateResourceRuntimeUnitPresentation(...)`.
- For merge validation, open the real play route, spawn or wait for a mapped creep, and inspect:

```js
window.__game.renderer.s3d.scene
  .getObjectByName('resource3d:dawn_melee_creep')
  .userData.gameplayRuntimeBridge
```

Expected:

```json
{
  "bridge": "render3d/resource3dModel",
  "runtimeHelper": "updateResourceRuntimeUnitPresentation"
}
```
