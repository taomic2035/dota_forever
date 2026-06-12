# Core UX Readability Batch Summary

Date: 2026-06-12

## Player-Facing Changes

- Added transient world command pulses for move, attack, attack-move, stop, hold, reject, cast confirmation, and ping.
- Rebuilt the bottom HUD as a fixed-size hero console with stable ability and inventory cells.
- Added HUD slot flash feedback for rejected and confirmed ability actions.
- Added targeting feedback overlays for range, area, and line preview states.
- Strengthened selection rings, enemy/allied ring contrast, last-hit gold text, and floating combat text outlines.
- Aligned minimap Alt-click pings with the world-space UX pulse model.
- Added an inline favicon to avoid screenshot-script favicon 404 noise.

## Design Mapping

- `docs/ux/references/ux-target-lane-hud.png`: fixed HUD console, readable lane state, floating gold/damage emphasis.
- `docs/ux/references/ux-target-cast-feedback.png`: cast range, line preview, command pulse, and enemy emphasis.
- `docs/ux/references/ux-target-map-base.png`: minimap and world landmark direction for later map/base pass.

## Verification

- `npm run typecheck`: PASS
- `npm test -- tests/uxFeedback.test.ts`: PASS, 4 tests
- `npm test -- tests/hero.test.ts tests/items.test.ts`: PASS, 13 tests
- `npm test -- tests/fxstyle.test.ts tests/fxlayer.test.ts`: PASS, 25 tests
- `node scripts/shot.mjs "http://127.0.0.1:5180/?mode=play&hero=zola&seed=42&speed=1" docs/screenshots/ux-lane-hud.png 3500`: PASS
- `node scripts/shot.mjs "http://127.0.0.1:5180/?mode=play&hero=zola&seed=42&speed=1" docs/screenshots/ux-cast-feedback.png 1500 "(() => { const g = window.__game; const h = g.hero; if (!h) return false; g.ux.setTargeting({ abilityIndex: 0, mode: 'line', origin: h.pos, range: 900, width: 120 }); return true; })()"`: PASS
- `npm test`: PASS, 46 files and 543 tests
- `npm run build`: PASS

## Debugging Note

`npm test` initially reported a Vitest worker RPC timeout after all assertions passed. Root cause was the long synchronous loop in `tests/fullgame.test.ts`, which blocked worker task updates for about one minute. The test now yields to the event loop every 3000 ticks while preserving the same simulation assertions.

## Screenshots

- `docs/screenshots/ux-lane-hud.png`
- `docs/screenshots/ux-cast-feedback.png`

## Remaining UX Debt

- Full map/base readability pass: terrain language, high-ground edge clarity, tree walls, shop/pit/base landmarks.
- Unit and spell visual taxonomy pass: hero class silhouettes, projectile families, spell palettes, generated icons.
- Cursor icon polish beyond world-space command pulses.
- HUD/minimap final composition: current pass avoids overlap; later pass should decide whether minimap belongs lower-left, lower-right, or inside the console.
