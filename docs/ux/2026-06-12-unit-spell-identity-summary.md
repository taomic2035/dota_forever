# Unit and Spell Identity Batch Summary

Date: 2026-06-12

## Player-Facing Changes

- Added unit identity metadata for hero roles, lane creep categories, neutral tiers, boss, ward, and buildings.
- Added small in-world hero role marks: shield, support cross, mage halo, carry chevron/slash, and assassin diamond.
- Added spell family metadata to the shared effect style table.
- Added fixed-size HUD ability color strips using spell family colors.
- Kept all gameplay simulation rules unchanged.

## Design Mapping

- `docs/ux/2026-06-12-unit-spell-identity-design.md`: unit role grammar and spell family grammar.
- `docs/ux/references/ux-target-lane-hud.png`: compact skill readability and in-fight unit identity.
- `docs/ux/references/ux-target-cast-feedback.png`: spell-family color consistency for future targeting and impact work.

## Verification

- `npm test -- tests/unitart.test.ts`: PASS, 16 tests.
- `npm test -- tests/fxstyle.test.ts`: PASS, 15 tests.
- `npm run typecheck`: PASS during implementation.
- `node scripts/shot.mjs "http://127.0.0.1:5182/?mode=play&hero=zola&seed=42&speed=1" docs/screenshots/ux-unit-spell-identity.png 2500 "...attackmove pulse eval..."`: PASS.
- `npm test`: PASS, 48 files and 558 tests.
- `npm run build`: PASS, 74 modules transformed.

## Screenshots

- `docs/screenshots/ux-unit-spell-identity.png`

## Remaining UX Debt

- Final generated portraits and ability icons are still not implemented.
- Spell impact shapes need deeper family-specific treatment beyond color and motion.
- Neutral camp silhouettes can be made more distinct once final camp tiers are locked.
- Cursor icon polish remains separate from world-space command pulses.
