# Spell Geometry Readability Summary

Date: 2026-06-12

## Player-Facing Changes

- Extended spell family readability from point hits to beams, rings, and persistent fields.
- Lightning beams now use `pattern === 'jagged'` instead of a raw color check, so future yellow non-lightning effects will not accidentally inherit lightning motion.
- Rings keep their main circular range outline and add rim accents: shards, jagged ticks, cloud blobs, fracture lines, halos, rune marks, sparks, or splatter.
- Fields keep low-alpha area fills and add interior accents that communicate family without blocking unit and last-hit reading.
- Beams keep their directional path and add family accents along the beam rather than covering the endpoint.

## Design Notes

- The main geometry stays conservative: range, direction, and duration remain easier to read than decorative detail.
- Pattern accents are additive and procedural. No copied Dota 1 VFX sprites, names, icons, or authored particle textures were introduced.
- The screenshot injects three beams, three rings, and three fields into a live play scene to validate camera/HUD/minimap coexistence.

## Verification

- `npm run typecheck`: passed.
- `npm test -- tests/fxlayer.test.ts tests/fxstyle.test.ts`: passed, 33 tests.
- `npm test`: passed, 48 files / 566 tests.
- `npm run build`: passed, 75 modules transformed.
- Build note: Vite reported the existing large chunk warning after minification; build still succeeded.
- Screenshot captured: `docs/screenshots/ux-spell-geometry-readability.png`.

## Remaining UX Debt

- Add cast windup telegraphs before the effect lands.
- Add ultimate-scale screen emphasis that is strong but not disorienting.
- Add terrain decals for scorch, frost, poison residue, and cracks when the asset layer is ready.
- Add sound timing once visual grammar is stable.
