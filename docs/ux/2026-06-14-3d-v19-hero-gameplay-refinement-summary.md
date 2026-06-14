# 3D V19 Hero Gameplay Refinement Summary

Date: 2026-06-14
Branch/worktree: `main` at `/Users/taomic/vibecoding/dota_forever`
Feedback source: `docs/ux/2026-06-14-opus-to-codex-feedback-model-quality.md`
Gameplay verification URL: `http://127.0.0.1:<port>/?mode=play&hero=rein&renderer=3d`
Screenshot evidence: `docs/screenshots/ux-3d-v19-hero-gameplay-refinement-clean.png`

## Feedback Read

Opus feedback says the highest-priority pain is the real 3D play route: the player sees `createHero3DModel(...)` static geometry, not the preview-only runtime helper layer. V18 removed the worst paper-box geometry profiles, but the models could still read as a single rounded core with decorative attachments at the default play camera.

V19 therefore adds another layer directly to the classic hero asset contract consumed by `hero3dFactory`: modeled chest plates, crown/crest bevels, weapon-head highlights, shoulder bevels, cloth folds, and inset focus gems. This is still 100% procedural Three.js content and remains presentation-only.

## Changes

- `src/render/hero3dAssets.ts`
  - Adds `gameplayCameraRefinementParts(...)`.
  - Every classic hero now receives at least seven `v19 <heroKey> ...` refinement parts.
  - The parts cover:
    - layered torso plates so bodies no longer read as one smooth block;
    - head/crest bevel detail for far-camera identity;
    - wide weapon/shoulder accents for silhouette readability;
    - cloth/fold and gem inset materials for material contrast.

- `src/render/hero3dFactory.ts`
  - Extends `root.userData.gameplayModelQuality` with:
    - `refinementLayer: "v19-gameplay-camera-detail"`
    - `refinementLayerParts`
    - `coreMaterialContrastBands`
  - Opus can inspect these fields on `hero3d:<heroKey>` roots in the real play route.

- `tests/hero3dAssets.test.ts`
  - Adds a V19 asset contract requiring enough gameplay-camera refinement pieces, material contrast, torso layering, head/crest detail, and wide silhouette detail.

- `tests/hero3dFactory.test.ts`
  - Adds a V19 runtime contract proving the refinement parts are present in `createHero3DModel(...)` output and exposed through root metadata.

## Verification

Red tests before fix:

```text
npm test -- tests/hero3dAssets.test.ts
1 failed:
- rein needs enough gameplay-camera refinement pieces
```

```text
npm test -- tests/hero3dFactory.test.ts
1 failed:
- missing refinementLayer/refinementLayerParts/coreMaterialContrastBands on root.userData.gameplayModelQuality
```

Green after fix:

```text
npm test -- tests/hero3dAssets.test.ts tests/hero3dFactory.test.ts
2 files passed
16 tests passed
```

Focused hero suite:

```text
npm test -- tests/hero3dAssets.test.ts tests/hero3dFactory.test.ts tests/hero3dPreview.test.ts
3 files passed
17 tests passed
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
129 files passed
1260 tests passed
```

Real gameplay route smoke:

```text
URL: http://127.0.0.1:5228/?mode=play&hero=rein&renderer=3d&seed=42&speed=0
Canvas count: 3
Console/page errors: none
Onboarding overlay: dismissed for clean screenshot
Hero root: hero3d:rein found
V19 refinement parts: 7
V19 material bands: metal, leather, energy, cloth, crystal
Screenshot: docs/screenshots/ux-3d-v19-hero-gameplay-refinement-clean.png
```

## Handoff Notes for Opus

- This patch is presentation-only. It does not change `src/sim/**`.
- V19 is designed to merge on top of V18. It keeps the same hero keys and action/texture contracts.
- The most useful integration check is:
  - open `?mode=play&hero=rein&renderer=3d`;
  - inspect `window.__game.renderer.s3d.scene.getObjectByName("hero3d:rein").userData.gameplayModelQuality`;
  - confirm `refinementLayer === "v19-gameplay-camera-detail"` and `refinementLayerParts >= 6`.
- Opus can reuse the same idea for `modelGen.buildHumanoid`: add torso layering, head/crest detail, weapon-head accents, and material contrast before adding runtime-only effects.
