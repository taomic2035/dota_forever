# 3D V20 Hero Runtime Bridge Summary

Date: 2026-06-14
Branch/worktree: `main` at `~/vibecoding/dota_forever`
Gameplay verification URL: `http://127.0.0.1:<port>/?mode=play&hero=rein&renderer=3d`
Screenshot evidence: `docs/screenshots/ux-3d-v20-hero-runtime-bridge.png`

## Why

V18 and V19 improved the static hero model body in the real 3D play route. The next visible gap was motion and surface life: `createHero3DModel(...)` already shipped the V14 helper `updateHeroRuntimePresentation(...)`, but the real gameplay bridge in `src/render3d/hero3dModel.ts` only drove Three.js `AnimationMixer` clips.

V20 wires the V14 runtime helper into the real play-route `UnitModel.applyPose(...)` bridge. This makes the hero root update action state, part motion metadata, material pulses, glints, invisible/stunned/death response, and surface shader intent during actual gameplay rendering instead of only inside preview tooling.

## Changes

- `src/render3d/hero3dModel.ts`
  - Imports and calls `updateHeroRuntimePresentation(...)` from the real `applyPose(...)` path.
  - Maps gameplay `AnimState` and status flags to canonical hero action names:
    - `walk`
    - `attack`
    - `cast_q`
    - `channel`
    - `hit`
    - `stunned`
    - `invisible`
    - `death`
    - `idle`
  - Adds `built.root.userData.gameplayRuntimeBridge`:
    - `bridge: "render3d/hero3dModel"`
    - `runtimeHelper: "updateHeroRuntimePresentation"`
  - Resets `built.root.userData.baseScale` to `[1, 1, 1]` after the root is normalized for gameplay placement, preventing helper-driven scale pulses from double-applying the asset scale.

- `tests/render3d/hero3dModel.test.ts`
  - Adds a red-to-green contract proving the real play-route unit bridge calls the runtime presentation helper.
  - Locks that `cast` pose updates:
    - `runtimeAction.activeAction === "cast_q"`
    - `runtimeActionAnimated === true`
    - `runtimeSurfaceAnimated === true`
    - animated parts/material counts are non-zero
    - `baseScale` remains normalized.

## Verification

Red test before fix:

```text
npm test -- tests/render3d/hero3dModel.test.ts
1 failed:
- expected gameplayRuntimeBridge to match runtimeHelper updateHeroRuntimePresentation
```

Green after fix:

```text
npm test -- tests/render3d/hero3dModel.test.ts tests/hero3dFactory.test.ts tests/hero3dPreview.test.ts
3 files passed
9 tests passed
```

Build:

```text
npm run build
build passed
warning: Three.js keeps the output chunk above 500 kB
```

Real gameplay route smoke:

```text
URL: http://127.0.0.1:5229/?mode=play&hero=rein&renderer=3d&seed=42&speed=0
Console/page errors: none
Hero root: hero3d:rein found
gameplayRuntimeBridge.runtimeHelper: updateHeroRuntimePresentation
runtimeAction: cast_q
runtimeActionState: cast
runtimeActionAnimated: true
runtimeSurfaceAnimated: true
runtimeActionAnimatedParts: 32
runtimeSurfaceAnimatedMaterials: 106
maxRuntimePulse: 1.152091528901121
Screenshot: docs/screenshots/ux-3d-v20-hero-runtime-bridge.png
```

## Handoff Notes for Opus

- This patch is presentation-only and does not change `src/sim/**`.
- The bridge keeps the existing `AnimationMixer` clip playback. `updateHeroRuntimePresentation(...)` is layered after the mixer so the real play route gets the same surface/material/part response that the preview smoke checks already validated.
- For merge validation, open the real play route and inspect:

```js
window.__game.renderer.s3d.scene
  .getObjectByName('hero3d:rein')
  .userData.gameplayRuntimeBridge
```

Expected:

```json
{
  "bridge": "render3d/hero3dModel",
  "runtimeHelper": "updateHeroRuntimePresentation"
}
```
