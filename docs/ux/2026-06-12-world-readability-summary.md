# World Readability Batch Summary

Date: 2026-06-12

## Player-Facing Changes

- Added tested terrain visual semantics for river, base, ramp, tree wall, lane, jungle, and ground cells.
- Recolored the baked terrain from semantic categories instead of raw height only.
- Added lane wear, ramp hatch marks, base grid accents, and high-ground edge shading.
- Replaced fragile world shop/Boss text glyphs with vector landmark marks.
- Added world rune rings for more readable river resource points.
- Rebuilt minimap fixed landmarks from shared `landmarkVisuals` data: secret shops, pit, runes, and neutral camps.
- Added projectile family visuals: slim physical bolts, heavier glowing tower shots, and higher-contrast ability orbs.

## Design Mapping

- `docs/ux/2026-06-12-world-readability-design.md`: terrain language, landmark icons, minimap consistency, projectile families.
- `docs/ux/references/ux-target-map-base.png`: base entrance, ramp/high-ground readability, tower/base silhouettes.
- `docs/ux/references/ux-target-lane-hud.png`: lane readability and minimap/icon clarity.

## Verification

- `npm test -- tests/mapReadability.test.ts`: PASS, 7 tests.
- `npm run typecheck`: PASS during each implementation step.
- `npm test -- tests/mapReadability.test.ts tests/map.test.ts`: PASS, 18 tests.
- `npm test -- tests/projectileReadability.test.ts tests/combat.test.ts tests/buildings.test.ts`: PASS, 18 tests.
- `node scripts/shot.mjs "http://127.0.0.1:5181/?mode=play&hero=zola&seed=42&speed=1" docs/screenshots/ux-world-readability-lane.png 3500`: PASS.
- `node scripts/shot.mjs "http://127.0.0.1:5181/?mode=play&hero=zola&seed=42&speed=1" docs/screenshots/ux-world-readability-map.png 1500 "...camera center eval..."`: PASS.
- `npm test`: PASS, 48 files and 553 tests.
- `npm run build`: PASS, 74 modules transformed.

## Screenshots

- `docs/screenshots/ux-world-readability-lane.png`
- `docs/screenshots/ux-world-readability-map.png`

## Remaining UX Debt

- Final HUD/minimap placement decision: current composition avoids overlap, but minimap could later move into the console.
- Unit model taxonomy needs another pass for hero classes, neutral tiers, and summoned units.
- Spell families need distinct impact shapes beyond current projectile color/motion grammar.
- Cursor icon polish is still only represented by world-space command pulses.
