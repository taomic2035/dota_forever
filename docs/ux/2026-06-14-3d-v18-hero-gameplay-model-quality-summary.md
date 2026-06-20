# 3D V18 Hero Gameplay Model Quality Summary

Date: 2026-06-14
Branch/worktree: `codex/dota-shift-queue` at `~/vibecoding/dota_forever-shift-queue`
Feedback source: `~/vibecoding/dota_forever/docs/ux/2026-06-14-opus-to-codex-feedback-model-quality.md`
Gameplay verification URL: `http://127.0.0.1:<port>/?mode=play&hero=rein&renderer=3d`
Screenshot evidence: `docs/screenshots/ux-3d-v18-hero-gameplay-model-quality.png`

## Feedback Read

Opus feedback classifies the remaining top pain as in-game 3D model quality, not preview quality. The user judged `?mode=play&hero=rein&renderer=3d`, where heroes are rendered through `createHero3DModel(...)` static base geometry. V10-V17 helper layers are useful contracts, but they do not fix the paper-box look because the game renderer does not consume those preview/runtime helpers per frame.

## Changes

- `src/render/hero3dFactory.ts`
  - Replaced box-placeholder hero part geometry with gameplay-camera profiles:
    - `tapered-rounded-body` uses `CapsuleGeometry`.
    - `extruded-beveled-plate` uses bevel-enabled `ExtrudeGeometry`.
    - `curved-cloth-panel` uses an open curved `CylinderGeometry` panel.
    - heads/orbs use higher segment spheres; weapons/sigils/auras use denser rounded primitives.
  - Added `root.userData.gameplayModelQuality` for the real play camera contract:
    - `cameraFov: 40`
    - `defaultZoom: 0.62`
    - `pitchRadians: Math.PI * 0.31`
    - `heroModelScale: 1.5`
    - `runtimeHelper: createHero3DModel`
  - Tagged every runtime part with:
    - `gameplayGeometryProfile`
    - `gameplaySilhouetteWeight`
    - `gameplayCameraRead`
  - Set hero core materials to smooth shading so the upgraded primitives read as rounded volumes instead of faceted placeholders.

- `tests/hero3dFactory.test.ts`
  - Added a V18 red-to-green contract that fails if classic heroes ship box-placeholder gameplay pieces.
  - Added a Rein-specific regression check for:
    - `heavy cuirass` -> `tapered-rounded-body`
    - `tower shield` -> `extruded-beveled-plate`
    - `royal back banner` -> `curved-cloth-panel`

## Verification

Red test before fix:

```text
npm test -- tests/hero3dFactory.test.ts
2 failed:
- missing root.userData.gameplayModelQuality
- missing Rein gameplayGeometryProfile on body/shield/cape
```

Green after fix:

```text
npm test -- tests/hero3dFactory.test.ts
1 file passed
6 tests passed
```

Focused hero suite:

```text
npm test -- tests/hero3dAssets.test.ts tests/hero3dFactory.test.ts tests/hero3dPreview.test.ts
3 files passed
15 tests passed
```

Build:

```text
npm run build
build passed
warning: Three.js keeps the output chunk above 500 kB
```

Full suite:

```text
npm test -- --run
106 files passed
925 tests passed
```

Real gameplay route screenshot:

```text
URL: http://127.0.0.1:5216/?mode=play&hero=rein&renderer=3d
Canvas: 1440 x 900, WebGL context present
Screenshot: docs/screenshots/ux-3d-v18-hero-gameplay-model-quality.png
```

## Handoff Notes for Opus

- This patch is presentation-only. It does not change `src/sim/**`.
- The fix lands on the real gameplay model path (`createHero3DModel`) instead of only improving preview/runtime helper contracts.
- Opus can inspect `root.userData.gameplayModelQuality` to confirm a hero model is using the V18 play-camera geometry contract.
- Remaining known gap: non-classic heroes, creeps, and neutrals still need the corresponding `modelGen.buildHumanoid` refinement on the Opus side, as called out in the feedback.
