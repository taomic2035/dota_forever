# Target Kind Filter UX Summary

Date: 2026-06-12
Status: implemented and verified

## Player-Facing Change

Unit-target commands now reject wrong unit kinds during hover preview, not only after click confirmation. This keeps the Dota-style targeting loop honest: the reticle tells the player whether the command can actually use the hovered unit.

## Implemented Rules

- Midas targets enemy non-hero, non-building, non-ward units only.
- Dark Ritual targets allied creeps only.
- Devour targets enemy non-hero, non-building, non-ward units only.
- Commands without `targetKind` metadata keep the previous any-kind behavior.

## Code Changes

- `src/engine/targetFilters.ts` now supports `TargetKindFilter`.
- `src/data/heroes/types.ts` and `src/data/items.ts` now allow optional `targetKind`.
- `src/main.ts` passes both `targetTeam` and `targetKind` into shared preview and confirmation target lookup.
- `src/data/heroes/batch8.ts` and `src/data/items.ts` contain the first high-impact metadata annotations.

## Verification So Far

- Red test confirmed before implementation:
  - `npm test -- tests/targetFilters.test.ts tests/targetKindMetadata.test.ts` failed because wrong-kind targets were still accepted and metadata was missing.
- Focused validation after implementation:
  - `npm test -- tests/targetFilters.test.ts tests/targetKindMetadata.test.ts`
  - `npm run typecheck`
- Screenshot validation:
  - `node scripts/shot.mjs "http://127.0.0.1:5180/?mode=play&hero=rein&seed=42&speed=1" docs/screenshots/ux-target-kind-filter.png 1500 <eval>`
  - Eval returned `item: "midas"`, `enemyKind: "hero"`, `targetMode: "unit"`, and `valid: false`.
- Full validation:
  - `npm test`: 54 test files and 600 tests passed.
  - `npm run build`: passed. Vite reported the existing large chunk warning.

## Screenshot

- `docs/screenshots/ux-target-kind-filter.png`

## Remaining UX Debt

- Split invalid feedback copy into wrong team versus wrong target type.
- Add quick cast and smart cast settings so users can choose confirmation timing.
- Audit additional hero-only, building-only, ward-only, and creep-only commands once the next feedback layer exists.
