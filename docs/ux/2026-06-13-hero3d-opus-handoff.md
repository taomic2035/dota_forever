# Hero3D Preview Handoff for Opus

Date: 2026-06-13  
Branch/worktree: `codex/hero-ingame-art` at `/Users/taomic/vibecoding/dota_forever-hero-ingame-art`  
Preview URL: `http://127.0.0.1:5182/?mode=hero3d-preview`  
Screenshot: `docs/screenshots/ux-hero3d-preview.png`

## What

This branch adds a Three.js in-game hero asset preview for the first 10 classic heroes.

Changed files:

- `package.json`, `package-lock.json`
  - Adds `three` and `@types/three`.
- `src/main.ts`
  - Adds a preview-only route: `?mode=hero3d-preview`.
  - Existing menu/play/spectate behavior is unchanged.
- `src/render/hero3dAssets.ts`
  - New data contract for 10 hero asset specs.
  - Heroes: `rein`, `liya`, `zola`, `aili`, `gorm`, `grosh`, `kai`, `chenblade`, `olan`, `morphis`.
  - Each hero has model parts, texture channels, action clips, silhouette metadata, and preview camera metadata.
- `src/render/hero3dFactory.ts`
  - New procedural Three.js model factory.
  - Builds low-poly meshes, generated canvas textures, emissive/glow shells, outlines, and animation clips.
- `src/ui/hero3dPreview.ts`
  - New full-screen Three.js hero showcase.
  - Includes a hero-selection-stage layout, action buttons, nameplates, lighting, fog, ground stage, background columns, and per-hero pads/light columns.
- `tests/hero3dAssets.test.ts`
  - New asset contract tests.
  - Locks the first 10 hero keys, texture/action contract, unique silhouettes, and minimum art-detail thresholds.
- `docs/screenshots/ux-hero3d-preview.png`
  - Current visual evidence screenshot for review.

No `src/sim/**` files were changed.

## Why

The previous direction using separate generated images was rejected. The requirement is game-ready, in-project assets adapted for Three.js: model, texture, and actions, with a direct preview instead of separate concept images.

This implementation creates a working preview and an asset contract now, so Opus can merge it without waiting for final GLB production. It also gives a clear future seam for replacing procedural geometry with real GLB assets while preserving:

- hero keys,
- texture channel names,
- action names,
- preview route,
- validation tests.

## Tradeoff

Chosen approach: procedural Three.js prototype with strict asset metadata.

Why this approach:

- Fast to review in the browser.
- Does not depend on external art files yet.
- Keeps hero identity and animation contracts explicit.
- Avoids touching main simulation logic while Opus is working on core game flow.

Alternatives considered:

- Generate standalone bitmap hero images.
  - Rejected because the user specifically asked for game assets and direct preview, not separate pictures.
- Create final GLB/FBX assets immediately.
  - Deferred because this branch is for UX/art-direction validation and integration contract. Final GLB production needs a separate asset pipeline.
- Integrate the 3D models directly into gameplay rendering now.
  - Deferred to avoid colliding with Opus mainline logic. This branch keeps the work as a route-gated preview.

Known cost:

- Importing Three.js in `src/main.ts` currently increases the main Vite bundle and triggers the existing chunk-size warning.
- Recommended follow-up: lazy-load `hero3dPreview.ts` behind `mode=hero3d-preview` before merging into a production gameplay path.

## Open Questions

1. Should `chenblade` stay as the visual key for `辰/刃舞者`, or should it be renamed to the simulation key if Opus has standardized it differently?
2. Should this preview route remain a developer-only query mode, or become a real hero gallery/asset browser later?
3. Should the procedural assets remain in repo as fallback/debug assets after GLB assets arrive?
4. What final art pipeline should own real assets: `public/assets/heroes/<heroKey>/model.glb` plus PBR textures, or an imported source-art directory with build-time processing?
5. Should Three.js be split into a separate lazy chunk before merge, or is the current preview branch acceptable as an intermediate handoff?

## Next Action

Suggested Opus merge flow:

1. Merge dependencies first and resolve `package-lock.json` normally.
2. Check `src/main.ts` for conflicts with any new mode-routing or boot changes.
3. Keep `src/sim/**` untouched from this branch unless Opus intentionally wires hero assets into gameplay.
4. Run:

```bash
npm test -- tests/hero3dAssets.test.ts
npm run build
npm test -- --run
```

5. Open the preview:

```text
http://127.0.0.1:5182/?mode=hero3d-preview
```

6. Review these integration points:

- `CLASSIC_HERO3D_ASSETS.map(asset => asset.key)` matches the hero registry keys Opus wants to expose.
- `REQUIRED_HERO3D_ACTIONS` stays compatible with future GLB animation clip names:
  - `idle`
  - `walk`
  - `attack`
  - `cast_q`
  - `cast_w`
  - `cast_e`
  - `cast_r`
  - `hit`
  - `death`
- `REQUIRED_HERO3D_TEXTURES` stays compatible with future material pipeline:
  - `albedo`
  - `normal`
  - `orm`
  - `emissive`

## Verification Evidence

Latest verified commands in this worktree:

```text
npm test -- tests/hero3dAssets.test.ts
5 tests passed
```

```text
npm run build
build passed
warning: Three.js keeps the output chunk above 500 kB
```

```text
npm test -- --run
80 test files passed
727 tests passed
```

Preview smoke evidence:

```json
{
  "count": 10,
  "keys": ["rein", "liya", "zola", "aili", "gorm", "grosh", "kai", "chenblade", "olan", "morphis"],
  "actions": ["idle", "walk", "attack", "cast_q", "cast_w", "cast_e", "cast_r", "hit", "death"],
  "textureChannels": ["albedo", "normal", "orm", "emissive"]
}
```

## Merge Notes

- Main collision risk: `src/main.ts`.
- Dependency collision risk: `package.json` / `package-lock.json`.
- Bundle warning is expected because Three.js is currently statically imported.
- No simulation logic changed.
- The screenshot is intentional evidence and should stay under `docs/screenshots/`.

